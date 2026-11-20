import * as vscode from "vscode"
import type { Credential } from "./awsesh"
import { toBinding, type WorkspaceBinding } from "./workspaceModel"

export { bindingMatches } from "./workspaceModel"
export type { WorkspaceBinding } from "./workspaceModel"

export function workspaceBinding(): WorkspaceBinding | undefined {
  const config = vscode.workspace.getConfiguration("awsesh")
  return toBinding(config.get<string>("workspace.session"), config.get<string>("workspace.accountId"), config.get<string>("workspace.role"))
}

export async function saveWorkspaceBinding(credential: Credential) {
  const config = vscode.workspace.getConfiguration("awsesh")
  await config.update("workspace.session", credential.sessionName, vscode.ConfigurationTarget.Workspace)
  await config.update("workspace.accountId", credential.accountId, vscode.ConfigurationTarget.Workspace)
  await config.update("workspace.role", credential.roleName, vscode.ConfigurationTarget.Workspace)
}

export async function removeWorkspaceBinding() {
  const config = vscode.workspace.getConfiguration("awsesh")
  await config.update("workspace.session", undefined, vscode.ConfigurationTarget.Workspace)
  await config.update("workspace.accountId", undefined, vscode.ConfigurationTarget.Workspace)
  await config.update("workspace.role", undefined, vscode.ConfigurationTarget.Workspace)
}
