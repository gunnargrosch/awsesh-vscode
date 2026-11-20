import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { runTests } from "@vscode/test-electron"

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, "../..")
  const extensionTestsPath = path.resolve(__dirname, "./suite/index")
  const workspace = path.resolve(extensionDevelopmentPath, "test/workspace")

  const home = fs.mkdtempSync(path.join(os.tmpdir(), "sesh-it-home-"))
  const config = path.join(home, ".config")
  const data = path.join(home, ".local", "share")
  fs.mkdirSync(path.join(config, "awsesh", "sessions"), { recursive: true })
  fs.mkdirSync(path.join(data, "awsesh", "storage", "accounts"), { recursive: true })
  fs.writeFileSync(
    path.join(config, "awsesh", "sessions", "Test Org.json"),
    JSON.stringify({ name: "Test Org", startUrl: "https://test.awsapps.com/start", ssoRegion: "eu-north-1", defaultRegion: "eu-north-1" }),
  )
  fs.writeFileSync(
    path.join(data, "awsesh", "storage", "accounts", "Test Org.json"),
    JSON.stringify({
      accounts: [{ accountId: "111122223333", name: "Dev", roles: ["AdministratorAccess", "ReadOnlyAccess"], rolesLoaded: true }],
      lastUpdated: Date.now(),
    }),
  )

  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [workspace, "--disable-extensions", "--disable-workspace-trust"],
      extensionTestsEnv: {
        HOME: home,
        XDG_CONFIG_HOME: config,
        XDG_DATA_HOME: data,
      },
    })
  } catch (error) {
    console.error(error)
    console.error("Integration tests failed")
    process.exit(1)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
}

void main()
