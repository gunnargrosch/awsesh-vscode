import * as assert from "node:assert"
import * as vscode from "vscode"

const extensionId = "gunnargrosch.awsesh-vscode"

interface SeshApi {
  ready: Promise<void>
  controller: { current: unknown }
  tree: { getChildren: (node?: vscode.TreeItem) => vscode.TreeItem[] }
}

async function api(): Promise<SeshApi> {
  const extension = vscode.extensions.getExtension(extensionId)
  assert.ok(extension, "extension is installed")
  const exported = (await extension.activate()) as SeshApi
  await exported.ready
  return exported
}

suite("Sesh extension", () => {
  test("activates and registers the commands", async () => {
    await api()
    const commands = await vscode.commands.getCommands(true)
    for (const id of [
      "awsesh.switchCredentials",
      "awsesh.bindWorkspace",
      "awsesh.clearWorkspaceBinding",
      "awsesh.applyWorkspaceProfile",
      "awsesh.openTui",
      "awsesh.refresh",
      "awsesh.assumeRole",
    ]) {
      assert.ok(commands.includes(id), `missing command: ${id}`)
    }
  })

  test("builds the tree from the isolated session fixture", async () => {
    const { tree, controller } = await api()
    assert.ok(controller.current, "snapshot loaded from the isolated home")
    const roots = tree.getChildren()
    const labels = roots.map((item) => (typeof item.label === "string" ? item.label : ""))
    assert.ok(labels.includes("Test Org"), `session node present: ${labels.join(", ")}`)
    assert.ok(labels.includes("Credentials"), "credentials group present")
    const session = roots.find((item) => item.label === "Test Org")
    assert.ok(session, "session node found")
    const accounts = tree.getChildren(session)
    assert.ok(
      accounts.some((item) => item.label === "Dev"),
      "seeded account is listed",
    )
  })
})
