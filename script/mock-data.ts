import { createHash } from "node:crypto"
import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"

/**
 * Writes a mock awsesh home (config, data, token) with generic data, so the
 * extension can be run in a throwaway VS Code profile for screenshots or manual
 * testing without touching real state or AWS.
 */
const root = path.resolve(import.meta.dir, "..")
const home = path.join(root, ".mock", "home")
const config = path.join(home, ".config", "awsesh")
const data = path.join(home, ".local", "share", "awsesh")

const session = {
  name: "Demo Org",
  startUrl: "https://demo.awsapps.com/start",
  ssoRegion: "eu-north-1",
  defaultRegion: "eu-north-1",
}

const accounts = [
  { accountId: "111122223333", name: "Dev", roles: ["AdministratorAccess", "PowerUserAccess", "ReadOnlyAccess"], rolesLoaded: true },
  { accountId: "444455556666", name: "Production", roles: ["ReadOnlyAccess"], rolesLoaded: true },
  { accountId: "777788889999", name: "Sandbox", roles: ["AdministratorAccess"], rolesLoaded: true },
]

const credentials = [
  {
    profileName: "default",
    accountId: "111122223333",
    accountName: "Dev",
    roleName: "AdministratorAccess",
    sessionName: "Demo Org",
    expiration: new Date(Date.now() + 55 * 60_000).toISOString(),
    isDefault: true,
    region: "eu-north-1",
  },
]

async function writeJSON(target: string, value: unknown) {
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`)
}

await rm(home, { recursive: true, force: true })
await writeJSON(path.join(config, "sessions", "Demo Org.json"), session)
await writeJSON(path.join(data, "storage", "accounts", "Demo Org.json"), { accounts, lastUpdated: Date.now() })
await writeJSON(path.join(data, "storage", "credentials", "active.json"), credentials)
const hash = createHash("sha256").update(session.startUrl).digest("hex").slice(0, 16)
await writeJSON(path.join(data, "storage", "token", `${hash}.json`), {
  token: "mock-token",
  expiresAt: new Date(Date.now() + 8 * 3600_000).toISOString(),
  startUrl: session.startUrl,
})

const workspace = path.join(root, ".mock", "workspace")
await mkdir(path.join(workspace, ".vscode"), { recursive: true })
await writeJSON(path.join(workspace, ".vscode", "settings.json"), {
  "awsesh.configDir": config,
  "awsesh.dataDir": data,
  "awsesh.awsDir": path.join(home, ".aws"),
})

console.log(`Mock home written to ${home}`)
console.log(`Open this folder in VS Code: ${workspace}`)
console.log(`  XDG_CONFIG_HOME=${path.join(home, ".config")}`)
console.log(`  XDG_DATA_HOME=${path.join(home, ".local", "share")}`)
