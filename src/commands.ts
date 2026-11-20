import { spawnSync } from "node:child_process"
import * as vscode from "vscode"
import { applyTerminalEnvironment } from "./terminal"
import { StatusBar } from "./statusBar"
import { installPlan, releasesUrl } from "./install"
import { refreshDelay } from "./schedule"
import { defaultStatusBarTemplate } from "./statusBarModel"
import { bindingMatches, removeWorkspaceBinding, saveWorkspaceBinding, workspaceBinding, type WorkspaceBinding } from "./workspace"
import { activeDirectories, type Credential, type Snapshot, type Workflow } from "./awsesh"
import { activeCredential } from "./credentialModel"
import { consoleTarget } from "./tree"

const refreshInterval = 60_000

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Transient confirmation: shows in the status bar and hides on its own. */
function flash(message: string) {
  void vscode.window.setStatusBarMessage(message, 4000)
}

async function pick(items: vscode.QuickPickItem[], placeHolder: string): Promise<vscode.QuickPickItem | undefined> {
  return vscode.window.showQuickPick(items, { placeHolder, matchOnDescription: true })
}

function withProgress<T>(title: string, task: () => Promise<T>): PromiseLike<T> {
  return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title }, task)
}

export class SeshController implements vscode.Disposable {
  private snapshot: Snapshot | undefined
  private session: string | undefined
  private timer: ReturnType<typeof setTimeout> | undefined
  private refreshTimer: ReturnType<typeof setInterval> | undefined
  private refreshPromise: Promise<void> | undefined
  private promptedBinding: string | undefined
  private readonly changeEmitter = new vscode.EventEmitter<void>()
  readonly onDidChange = this.changeEmitter.event

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly workflow: Workflow,
    private readonly statusBar: StatusBar,
  ) {}

  get current(): Snapshot | undefined {
    return this.snapshot
  }

  async initialize() {
    await this.refresh()
    await this.maybeApplyWorkspaceBinding()
    this.refreshTimer = setInterval(() => void this.refresh(true), refreshInterval)
  }

  async reconfigure() {
    this.render()
    await this.maybeApplyWorkspaceBinding()
    this.scheduleAutoRefresh()
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer)
    if (this.refreshTimer) clearInterval(this.refreshTimer)
    this.changeEmitter.dispose()
  }

  refresh(quiet = false): Promise<void> {
    this.refreshPromise ??= this.doRefresh(quiet).finally(() => {
      this.refreshPromise = undefined
    })
    return this.refreshPromise
  }

  private async doRefresh(quiet: boolean) {
    try {
      if (!this.session) {
        const base = await this.workflow.snapshot()
        this.session = base.session ?? base.lastSession ?? base.sessions[0]?.name
      }
      this.snapshot = await this.workflow.snapshot(this.session)
    } catch (error) {
      if (!quiet) void vscode.window.showErrorMessage(`Sesh: ${errorMessage(error)}`)
      return
    }
    this.render()
    this.scheduleAutoRefresh()
  }

  render() {
    const config = vscode.workspace.getConfiguration("awsesh")
    const credential = this.currentCredential()
    const template = config.get<string>("statusBar.template", defaultStatusBarTemplate) || defaultStatusBarTemplate
    this.statusBar.update(credential, config.get<number>("credentialsExpiryWarningMinutes", 15), config.get<boolean>("statusBar", true), template)
    applyTerminalEnvironment(this.context, credential, config.get<boolean>("applyToTerminal", true) && vscode.workspace.isTrusted)
    this.changeEmitter.fire()
  }

  private currentCredential(): Credential | undefined {
    return activeCredential(this.snapshot?.credentials ?? [])
  }

  private requireTrust(action: string): boolean {
    if (vscode.workspace.isTrusted) return true
    void vscode.window.showWarningMessage(`Sesh: ${action} is disabled in untrusted workspaces.`)
    return false
  }

  async switchCredentials() {
    if (!this.requireTrust("switching credentials")) return
    await this.refresh()
    const sessions = this.snapshot?.sessions ?? []
    if (sessions.length === 0) {
      void vscode.window.showWarningMessage("Sesh: no SSO sessions found. Add one with the awsesh CLI or desktop app.")
      return
    }
    const chosen = await pick(
      sessions.map((session) => ({ label: session.name, description: session.authenticated ? "signed in" : "signed out" })),
      "Select an SSO session",
    )
    if (!chosen) return
    const session = sessions.find((candidate) => candidate.name === chosen.label)
    if (!session) return
    this.session = session.name
    if (!session.authenticated && !(await this.signIn(session.name))) return

    const loaded = await withProgress(`Sesh: loading accounts for ${session.name}`, () => this.workflow.selectSession(session.name, true))
    const accountChoice = await pick(
      loaded.accounts.map((account) => ({ label: account.name, description: account.accountId })),
      "Select an account",
    )
    if (!accountChoice) return
    const account = loaded.accounts.find((candidate) => candidate.name === accountChoice.label)
    if (!account) return

    const rolesSnapshot = await withProgress(`Sesh: loading roles for ${account.name}`, () => this.workflow.loadRoles(session.name, account.accountId))
    const roles = rolesSnapshot.accounts.find((candidate) => candidate.accountId === account.accountId)?.roles ?? []
    const role = await pick(roles.map((name) => ({ label: name })), "Select a role")
    if (!role) return

    await withProgress("Sesh: setting credentials", () => this.workflow.assumeRole(session.name, account.accountId, role.label))
    await this.refresh()
    flash(`Sesh: using ${account.name} / ${role.label}`)
  }

  async setCredentials() {
    await this.switchCredentials()
  }

  async clearCredentials() {
    if (!this.requireTrust("clearing credentials")) return
    await this.refresh()
    const credentials = this.snapshot?.credentials ?? []
    if (credentials.length === 0) {
      flash("Sesh: no tracked credentials to clear.")
      return
    }
    const chosen = await pick(
      credentials.map((credential) => ({ label: credential.profileName, description: `${credential.accountName} / ${credential.roleName}` })),
      "Select a credential to remove",
    )
    if (!chosen) return
    const credential = credentials.find((candidate) => candidate.profileName === chosen.label)
    if (!credential) return
    await withProgress("Sesh: clearing credentials", () =>
      this.workflow.clearCredential(credential.accountId, credential.roleName, credential.profileName, credential.sessionName),
    )
    await this.refresh()
  }

  async signIn(sessionName?: string): Promise<boolean> {
    if (!this.requireTrust("signing in")) return false
    await this.refresh()
    let name = sessionName
    if (!name) {
      const sessions = this.snapshot?.sessions ?? []
      const chosen = await pick(sessions.map((session) => ({ label: session.name })), "Select an SSO session to sign in")
      if (!chosen) return false
      name = chosen.label
    }
    try {
      const { url, code } = await withProgress("Sesh: starting sign-in", () => this.workflow.startLogin(name))
      void vscode.env.openExternal(vscode.Uri.parse(url))
      void vscode.window.showInformationMessage(`Sesh: authorize in the browser. Code ${code}.`)
      await withProgress("Sesh: waiting for authorization", async () => {
        for (;;) {
          const result = await this.workflow.pollLogin(name)
          if (result.complete) return
        }
      })
      await this.refresh()
      flash("Sesh: signed in.")
      return true
    } catch (error) {
      void vscode.window.showErrorMessage(`Sesh: ${errorMessage(error)}`)
      return false
    }
  }

  async signOut() {
    if (!this.requireTrust("signing out")) return
    await this.refresh()
    const sessions = this.snapshot?.sessions ?? []
    const chosen = await pick(
      sessions.map((session) => ({ label: session.name, description: session.authenticated ? "signed in" : "signed out" })),
      "Select an SSO session to sign out",
    )
    if (!chosen) return
    await withProgress("Sesh: signing out", () => this.workflow.signOut(chosen.label))
    await this.refresh()
  }

  async openConsole(node?: unknown) {
    await this.refresh()
    const target = consoleTarget(node)
    const credential = this.currentCredential()
    const session = target?.session ?? credential?.sessionName
    const accountId = target?.accountId ?? credential?.accountId
    const role = target?.role ?? credential?.roleName
    if (!session || !accountId || !role) {
      void vscode.window.showWarningMessage("Sesh: no active credential.")
      return
    }
    const url = await this.workflow.consoleUrl(session, accountId, role)
    void vscode.env.openExternal(vscode.Uri.parse(url))
  }

  async copyAccountId() {
    await this.refresh()
    const credential = this.currentCredential()
    if (!credential) return
    await vscode.env.clipboard.writeText(credential.accountId)
    flash("Sesh: account ID copied.")
  }

  async copyProfile() {
    await this.refresh()
    const credential = this.currentCredential()
    if (!credential) return
    await vscode.env.clipboard.writeText(credential.profileName)
    flash("Sesh: profile name copied.")
  }

  async openConfigDir() {
    void vscode.env.openExternal(vscode.Uri.file(activeDirectories().configDir))
  }

  async openSettings() {
    void vscode.commands.executeCommand("workbench.action.openSettings", "awsesh")
  }

  async openDataDir() {
    void vscode.env.openExternal(vscode.Uri.file(activeDirectories().dataDir))
  }

  async openTui() {
    const configured = vscode.workspace.getConfiguration("awsesh").get<string>("binary", "awsesh").trim()
    const binary = configured || "awsesh"
    const probe = spawnSync(binary, ["--version"], { encoding: "utf8" })
    if (probe.error) {
      const action = await vscode.window.showWarningMessage(`Sesh: could not run "${binary}".`, "Install awsesh", "Set path")
      if (action === "Install awsesh") await this.installCli()
      else if (action === "Set path") void vscode.commands.executeCommand("workbench.action.openSettings", "awsesh.binary")
      return
    }
    this.runInTerminal(/\s/.test(binary) ? `"${binary}"` : binary)
  }

  async installCli() {
    const plan = installPlan(process.platform, spawnSync("brew", ["--version"], { encoding: "utf8" }).error === undefined)
    if (plan.kind === "brew") {
      const choice = await vscode.window.showWarningMessage(
        `Install the awsesh CLI with Homebrew?\n\n${plan.command}`,
        { modal: true },
        "Install with Homebrew",
        "Open release page",
      )
      if (choice === "Install with Homebrew") this.runInTerminal(plan.command)
      else if (choice === "Open release page") void vscode.env.openExternal(vscode.Uri.parse(releasesUrl))
      return
    }
    const action = await vscode.window.showInformationMessage(
      "The awsesh CLI installs separately. Open the releases page, or set awsesh.binary to an existing binary.",
      "Open releases",
      "Set path",
    )
    if (action === "Open releases") void vscode.env.openExternal(vscode.Uri.parse(plan.url))
    else if (action === "Set path") void vscode.commands.executeCommand("workbench.action.openSettings", "awsesh.binary")
  }

  private runInTerminal(command: string) {
    const terminal = vscode.window.terminals.find((candidate) => candidate.name === "Sesh") ?? vscode.window.createTerminal({ name: "Sesh" })
    terminal.show()
    terminal.sendText(command)
  }

  async selectSession(name: string) {
    if (!this.requireTrust("switching sessions")) return
    this.session = name
    try {
      await withProgress(`Sesh: selecting ${name}`, () => this.workflow.selectSession(name, true))
      await this.refresh()
    } catch (error) {
      const choice = await vscode.window.showErrorMessage(`Sesh: ${errorMessage(error)}`, "Sign in")
      if (choice) await this.signIn(name)
    }
  }

  async loadRoles(name: string, accountId: string) {
    if (!this.requireTrust("loading roles")) return
    try {
      await withProgress("Sesh: loading roles", () => this.workflow.loadRoles(name, accountId))
      await this.refresh()
    } catch (error) {
      void vscode.window.showErrorMessage(`Sesh: ${errorMessage(error)}`)
    }
  }

  async assumeRole(name: string, accountId: string, role: string) {
    if (!this.requireTrust("setting credentials")) return
    this.session = name
    try {
      await withProgress("Sesh: setting credentials", () => this.workflow.assumeRole(name, accountId, role))
      await this.refresh()
      flash(`Sesh: using ${role} on ${accountId}.`)
    } catch (error) {
      void vscode.window.showErrorMessage(`Sesh: ${errorMessage(error)}`)
    }
  }

  async copyProfileName(profileName: string) {
    await vscode.env.clipboard.writeText(profileName)
    flash("Sesh: profile name copied.")
  }

  async bindWorkspace() {
    if (!this.requireTrust("binding a workspace")) return
    await this.refresh()
    const credential = this.currentCredential()
    if (!credential) {
      void vscode.window.showWarningMessage("Sesh: set credentials before binding a workspace.")
      return
    }
    await saveWorkspaceBinding(credential)
    flash(`Sesh: this workspace is bound to ${credential.accountName} / ${credential.roleName}.`)
  }

  async clearWorkspaceBinding() {
    await removeWorkspaceBinding()
    flash("Sesh: workspace binding cleared.")
  }

  async applyWorkspaceProfile() {
    if (!this.requireTrust("applying a workspace profile")) return
    const binding = workspaceBinding()
    if (!binding) {
      void vscode.window.showWarningMessage("Sesh: this workspace has no Sesh binding.")
      return
    }
    await this.applyBinding(binding)
  }

  private async maybeApplyWorkspaceBinding() {
    const binding = workspaceBinding()
    if (!binding || !vscode.workspace.isTrusted) return
    if (bindingMatches(binding, this.currentCredential())) return
    const key = `${binding.session}/${binding.accountId}/${binding.role}`
    const applyOnOpen = vscode.workspace.getConfiguration("awsesh").get<boolean>("workspace.applyOnOpen", false)
    if (!applyOnOpen) {
      if (this.promptedBinding === key) return
      this.promptedBinding = key
      const choice = await vscode.window.showInformationMessage(
        `Sesh: this workspace is bound to ${binding.role} on ${binding.accountId}. Apply it?`,
        "Apply",
        "Not now",
      )
      if (choice !== "Apply") return
    }
    await this.applyBinding(binding)
  }

  private async applyBinding(binding: WorkspaceBinding) {
    this.session = binding.session
    try {
      await withProgress("Sesh: applying workspace profile", async () => {
        await this.workflow.selectSession(binding.session, true)
        await this.workflow.loadRoles(binding.session, binding.accountId, true)
        await this.workflow.assumeRole(binding.session, binding.accountId, binding.role)
      })
      await this.refresh()
      flash(`Sesh: using ${binding.role} on ${binding.accountId}.`)
    } catch (error) {
      const choice = await vscode.window.showErrorMessage(`Sesh: ${errorMessage(error)}`, "Sign in")
      if (choice) await this.signIn(binding.session)
    }
  }

  private scheduleAutoRefresh() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
    if (!vscode.workspace.isTrusted) return
    const config = vscode.workspace.getConfiguration("awsesh")
    if (!config.get<boolean>("autoRefresh", false)) return
    const credential = this.currentCredential()
    if (!credential) return
    const lead = config.get<number>("autoRefreshMinutes", 5)
    this.timer = setTimeout(() => void this.autoRefresh(credential), refreshDelay(credential.expiration, lead))
  }

  private async autoRefresh(credential: Credential) {
    try {
      await withProgress("Sesh: refreshing credentials", () =>
        this.workflow.assumeRole(credential.sessionName, credential.accountId, credential.roleName),
      )
      await this.refresh()
    } catch (error) {
      const choice = await vscode.window.showWarningMessage(`Sesh: could not refresh credentials. ${errorMessage(error)}`, "Sign in")
      if (choice) await this.signIn(credential.sessionName)
    }
  }
}
