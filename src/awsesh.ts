import * as vscode from "vscode"
import { createAwsesh, createWorkflow } from "@awsesh/core"
import { directories, type Directories } from "./directories"

export { directories } from "./directories"
export type { Directories } from "./directories"

export type Workflow = ReturnType<typeof createWorkflow>
export type Snapshot = Awaited<ReturnType<Workflow["snapshot"]>>
export type Session = Snapshot["sessions"][number]
export type Account = Snapshot["accounts"][number]
export type Credential = Snapshot["credentials"][number]

/** Directories the extension reads and writes, honoring the optional overrides from settings. */
export function activeDirectories(): Directories {
  const config = vscode.workspace.getConfiguration("awsesh")
  return directories(undefined, undefined, {
    configDir: config.get<string>("configDir") || undefined,
    dataDir: config.get<string>("dataDir") || undefined,
    awsDir: config.get<string>("awsDir") || undefined,
  })
}

export function createClient(): Workflow {
  return createWorkflow(createAwsesh(activeDirectories()))
}
