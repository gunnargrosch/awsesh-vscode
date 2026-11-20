import * as vscode from "vscode"
import type { Account, Credential, Session, Snapshot } from "./awsesh"

class SessionNode extends vscode.TreeItem {
  constructor(
    readonly session: Session,
    active: boolean,
  ) {
    super(session.name, active && session.authenticated ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None)
    this.contextValue = "session"
    this.description = session.authenticated ? "signed in" : "signed out"
    this.tooltip = session.startUrl
    this.iconPath = new vscode.ThemeIcon(active ? "check" : "account")
    if (!active) this.command = { command: "awsesh.selectSession", title: "Select session", arguments: [session.name] }
  }
}

class AccountNode extends vscode.TreeItem {
  constructor(
    readonly account: Account,
    readonly session: string,
  ) {
    super(account.name, account.rolesLoaded && account.roles.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None)
    this.contextValue = "account"
    this.description = account.accountId
    this.iconPath = new vscode.ThemeIcon("account")
    if (!account.rolesLoaded) this.command = { command: "awsesh.loadRoles", title: "Load roles", arguments: [session, account.accountId] }
  }
}

export class RoleNode extends vscode.TreeItem {
  constructor(
    readonly role: string,
    readonly session: string,
    readonly account: Account,
  ) {
    super(role, vscode.TreeItemCollapsibleState.None)
    this.contextValue = "role"
    this.description = account.name
    this.iconPath = new vscode.ThemeIcon("key")
    this.command = { command: "awsesh.assumeRole", title: "Set credentials", arguments: [session, account.accountId, role] }
  }
}

class CredentialsGroupNode extends vscode.TreeItem {
  constructor(count: number) {
    super("Credentials", count > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None)
    this.contextValue = "credential-group"
    this.description = count > 0 ? String(count) : "none"
    this.iconPath = new vscode.ThemeIcon("credit-card")
  }
}

export class CredentialNode extends vscode.TreeItem {
  constructor(readonly credential: Credential) {
    super(credential.profileName, vscode.TreeItemCollapsibleState.None)
    this.contextValue = "credential"
    this.description = `${credential.accountName} / ${credential.roleName}`
    this.tooltip = `${credential.sessionName}\nExpires ${new Date(credential.expiration).toLocaleString()}`
    this.iconPath = new vscode.ThemeIcon(credential.isDefault ? "star-full" : "key")
    this.command = { command: "awsesh.copyProfileName", title: "Copy profile name", arguments: [credential.profileName] }
  }
}

export interface ConsoleTarget {
  session: string
  accountId: string
  role: string
}

/** The account and role a tree node opens the console for, when it has both. */
export function consoleTarget(node: unknown): ConsoleTarget | undefined {
  if (node instanceof RoleNode) {
    return { session: node.session, accountId: node.account.accountId, role: node.role }
  }
  if (node instanceof CredentialNode) {
    const { sessionName, accountId, roleName } = node.credential
    return { session: sessionName, accountId, role: roleName }
  }
  return undefined
}

export class SeshTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly emitter = new vscode.EventEmitter<void>()
  readonly onDidChangeTreeData = this.emitter.event

  constructor(private readonly getSnapshot: () => Snapshot | undefined) {}

  refresh() {
    this.emitter.fire()
  }

  getTreeItem(element: vscode.TreeItem) {
    return element
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    const snapshot = this.getSnapshot()
    if (!snapshot) return []
    if (!element) {
      const nodes: vscode.TreeItem[] = snapshot.sessions.map((session) => new SessionNode(session, session.name === snapshot.session))
      nodes.push(new CredentialsGroupNode(snapshot.credentials.length))
      return nodes
    }
    if (element instanceof SessionNode) {
      if (element.session.name !== snapshot.session) return []
      return snapshot.accounts.map((account) => new AccountNode(account, element.session.name))
    }
    if (element instanceof AccountNode) {
      return element.account.roles.map((role) => new RoleNode(role, element.session, element.account))
    }
    if (element instanceof CredentialsGroupNode) {
      return snapshot.credentials.map((credential) => new CredentialNode(credential))
    }
    return []
  }
}
