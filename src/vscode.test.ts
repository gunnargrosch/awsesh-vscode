import { describe, expect, mock, test } from "bun:test"
import type { Account, Credential } from "./awsesh"

const updates: Array<{ key: string; value: unknown; target: number }> = []
const values: Record<string, string | undefined> = {
  "workspace.session": "Test Org",
  "workspace.accountId": "111122223333",
  "workspace.role": "AdministratorAccess",
}

const item = {
  text: "",
  tooltip: "" as unknown,
  color: undefined as unknown,
  command: "",
  name: "",
  visible: false,
  show() {
    this.visible = true
  },
  hide() {
    this.visible = false
  },
  dispose() {},
}

mock.module("vscode", () => ({
  ConfigurationTarget: { Workspace: 2 },
  StatusBarAlignment: { Left: 1 },
  ThemeColor: class {
    constructor(readonly id: string) {}
  },
  TreeItem: class {
    label: string
    collapsibleState?: number
    contextValue?: string
    description?: string
    tooltip?: unknown
    iconPath?: unknown
    command?: unknown
    constructor(label: string, collapsibleState?: number) {
      this.label = label
      this.collapsibleState = collapsibleState
    }
  },
  TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
  ThemeIcon: class {
    constructor(readonly id: string) {}
  },
  EventEmitter: class {
    event = () => () => {}
    fire() {}
    dispose() {}
  },
  window: { createStatusBarItem: () => item },
  workspace: {
    getConfiguration: () => ({
      get: (key: string) => values[key],
      update: async (key: string, value: unknown, target: number) => {
        updates.push({ key, value, target })
      },
    }),
  },
}))

const { workspaceBinding, saveWorkspaceBinding, removeWorkspaceBinding } = await import("./workspace")
const { StatusBar } = await import("./statusBar")
const { RoleNode, CredentialNode, consoleTarget } = await import("./tree")

const credential: Credential = {
  profileName: "default",
  accountId: "111122223333",
  accountName: "Dev",
  roleName: "AdministratorAccess",
  sessionName: "Test Org",
  expiration: "2026-01-01T00:00:00.000Z",
  isDefault: true,
  region: "eu-north-1",
}

const account: Account = {
  accountId: "111122223333",
  name: "Dev",
  roles: ["AdministratorAccess"],
  rolesLoaded: true,
  region: "eu-north-1",
  preferredRole: "AdministratorAccess",
  profiles: {},
  lastProfile: "default",
  pinned: false,
  group: undefined,
}

describe("workspace binding storage", () => {
  test("reads a complete binding from the configuration", () => {
    expect(workspaceBinding()).toEqual({ session: "Test Org", accountId: "111122223333", role: "AdministratorAccess" })
  })

  test("saves the credential to workspace-scoped settings", async () => {
    updates.length = 0
    await saveWorkspaceBinding(credential)
    expect(updates).toEqual([
      { key: "workspace.session", value: "Test Org", target: 2 },
      { key: "workspace.accountId", value: "111122223333", target: 2 },
      { key: "workspace.role", value: "AdministratorAccess", target: 2 },
    ])
  })

  test("clears all three values", async () => {
    updates.length = 0
    await removeWorkspaceBinding()
    expect(updates).toEqual([
      { key: "workspace.session", value: undefined, target: 2 },
      { key: "workspace.accountId", value: undefined, target: 2 },
      { key: "workspace.role", value: undefined, target: 2 },
    ])
  })
})

describe("StatusBar", () => {
  test("shows the account and role and routes clicks to the switch command", () => {
    item.visible = false
    const bar = new StatusBar()
    bar.update(credential, 15, true)
    expect(item.text).toBe("$(credit-card) Dev / AdministratorAccess")
    expect(item.command).toBe("awsesh.switchCredentials")
    expect(item.visible).toBe(true)
    bar.dispose()
  })

  test("hides when disabled", () => {
    item.visible = true
    const bar = new StatusBar()
    bar.update(credential, 15, false)
    expect(item.visible).toBe(false)
    bar.dispose()
  })
})

describe("consoleTarget", () => {
  test("reads the account and role from a role node", () => {
    expect(consoleTarget(new RoleNode("AdministratorAccess", "Test Org", account))).toEqual({
      session: "Test Org",
      accountId: "111122223333",
      role: "AdministratorAccess",
    })
  })

  test("reads the account and role from a credential node", () => {
    expect(consoleTarget(new CredentialNode(credential))).toEqual({
      session: "Test Org",
      accountId: "111122223333",
      role: "AdministratorAccess",
    })
  })

  test("ignores nodes without a concrete account and role", () => {
    expect(consoleTarget(undefined)).toBeUndefined()
    expect(consoleTarget({})).toBeUndefined()
  })
})
