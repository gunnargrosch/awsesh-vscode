import * as vscode from "vscode"
import { createClient, type Workflow } from "./awsesh"
import { SeshController } from "./commands"
import { StatusBar } from "./statusBar"
import { SeshTreeProvider } from "./tree"

export interface SeshApi {
  controller: SeshController
  tree: SeshTreeProvider
  ready: Promise<void>
}

/** Builds the controller, tree, and command wiring. The workflow is injectable for tests. */
export function startSesh(context: vscode.ExtensionContext, workflow: Workflow): SeshApi {
  const controller = new SeshController(context, workflow, new StatusBar())
  const tree = new SeshTreeProvider(() => controller.current)

  type CommandHandler = Parameters<typeof vscode.commands.registerCommand>[1]
  const register = (id: string, handler: CommandHandler) => {
    context.subscriptions.push(vscode.commands.registerCommand(id, handler))
  }

  register("awsesh.switchCredentials", () => controller.switchCredentials())
  register("awsesh.setCredentials", () => controller.setCredentials())
  register("awsesh.clearCredentials", () => controller.clearCredentials())
  register("awsesh.signIn", () => controller.signIn())
  register("awsesh.signOut", () => controller.signOut())
  register("awsesh.openConsole", (node?: vscode.TreeItem) => controller.openConsole(node))
  register("awsesh.copyAccountId", () => controller.copyAccountId())
  register("awsesh.copyProfile", () => controller.copyProfile())
  register("awsesh.openConfigDir", () => controller.openConfigDir())
  register("awsesh.openSettings", () => controller.openSettings())
  register("awsesh.openDataDir", () => controller.openDataDir())
  register("awsesh.openTui", () => controller.openTui())
  register("awsesh.installCli", () => controller.installCli())
  register("awsesh.bindWorkspace", () => controller.bindWorkspace())
  register("awsesh.clearWorkspaceBinding", () => controller.clearWorkspaceBinding())
  register("awsesh.applyWorkspaceProfile", () => controller.applyWorkspaceProfile())
  register("awsesh.refresh", () => controller.refresh())

  register("awsesh.selectSession", (name: string) => controller.selectSession(name))
  register("awsesh.loadRoles", (name: string, accountId: string) => controller.loadRoles(name, accountId))
  register("awsesh.assumeRole", (name: string, accountId: string, role: string) => controller.assumeRole(name, accountId, role))
  register("awsesh.copyProfileName", (profileName: string) => controller.copyProfileName(profileName))

  context.subscriptions.push(
    controller,
    vscode.window.registerTreeDataProvider("awsesh.sesh", tree),
    controller.onDidChange(() => tree.refresh()),
    vscode.window.onDidChangeWindowState((state) => {
      if (state.focused) void controller.refresh(true)
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("awsesh")) void controller.reconfigure()
    }),
    vscode.workspace.onDidGrantWorkspaceTrust(() => void controller.reconfigure()),
  )

  const ready = controller.initialize()
  return { controller, tree, ready }
}

export function activate(context: vscode.ExtensionContext): SeshApi {
  return startSesh(context, createClient())
}

export function deactivate() {}
