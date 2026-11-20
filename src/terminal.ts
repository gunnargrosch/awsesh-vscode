import type { ExtensionContext } from "vscode"
import type { Credential } from "./awsesh"
import { terminalEnvironment } from "./terminalEnv"

export function applyTerminalEnvironment(context: ExtensionContext, credential: Credential | undefined, enabled: boolean) {
  const collection = context.environmentVariableCollection
  collection.clear()
  if (!enabled) return
  for (const [key, value] of Object.entries(terminalEnvironment(credential))) collection.replace(key, value)
}
