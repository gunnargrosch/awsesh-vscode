import { describe, expect, test } from "bun:test"
import { applyTerminalEnvironment } from "./terminal"
import type { Credential } from "./awsesh"

type Context = Parameters<typeof applyTerminalEnvironment>[0]

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

function fakeContext() {
  const calls: Array<[string, string]> = []
  let cleared = 0
  const context = {
    environmentVariableCollection: {
      clear() {
        cleared++
        calls.length = 0
      },
      replace(key: string, value: string) {
        calls.push([key, value])
      },
    },
  }
  return {
    context: context as unknown as Context,
    calls,
    clearedCount: () => cleared,
  }
}

describe("applyTerminalEnvironment", () => {
  test("clears but sets nothing when disabled", () => {
    const { context, calls, clearedCount } = fakeContext()
    applyTerminalEnvironment(context, credential, false)
    expect(calls).toEqual([])
    expect(clearedCount()).toBe(1)
  })

  test("applies the profile when enabled", () => {
    const { context, calls } = fakeContext()
    applyTerminalEnvironment(context, credential, true)
    expect(calls).toContainEqual(["AWS_PROFILE", "default"])
    expect(calls).toContainEqual(["AWS_REGION", "eu-north-1"])
    expect(calls).toContainEqual(["AWSESH_ROLE_NAME", "AdministratorAccess"])
  })
})
