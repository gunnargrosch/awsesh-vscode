import os from "node:os"
import path from "node:path"

export interface Directories {
  configDir: string
  dataDir: string
  awsDir: string
}

export interface DirectoryOverrides {
  configDir?: string
  dataDir?: string
  awsDir?: string
}

/** Mirrors packages/desktop/bridge/index.ts so the extension shares state with the CLI, TUI, and desktop app. */
export function directories(home: string = os.homedir(), env: NodeJS.ProcessEnv = process.env, overrides: DirectoryOverrides = {}): Directories {
  return {
    configDir: overrides.configDir ?? path.join(env.XDG_CONFIG_HOME ?? path.join(home, ".config"), "awsesh"),
    dataDir: overrides.dataDir ?? path.join(env.XDG_DATA_HOME ?? path.join(home, ".local", "share"), "awsesh"),
    awsDir: overrides.awsDir ?? path.join(home, ".aws"),
  }
}
