import { describe, expect, test } from "bun:test"
import type { Credential } from "./awsesh"
import { activeCredential } from "./credentialModel"

const now = Date.parse("2026-01-01T12:00:00.000Z")

function credential(overrides: Partial<Credential>): Credential {
  return {
    profileName: "default",
    accountId: "111122223333",
    accountName: "Dev",
    roleName: "AdministratorAccess",
    sessionName: "Test Org",
    expiration: "2026-01-01T13:00:00.000Z",
    isDefault: false,
    region: "eu-north-1",
    ...overrides,
  }
}

describe("activeCredential", () => {
  test("ignores an expired credential", () => {
    const expired = credential({ expiration: "2025-12-31T00:00:00.000Z", isDefault: true })
    expect(activeCredential([expired], now)).toBeUndefined()
  })

  test("prefers the default credential", () => {
    const other = credential({ profileName: "other" })
    const preferred = credential({ isDefault: true })
    expect(activeCredential([other, preferred], now)?.profileName).toBe("default")
  })

  test("falls back to the last live credential", () => {
    const first = credential({ profileName: "first" })
    const second = credential({ profileName: "second" })
    expect(activeCredential([first, second], now)?.profileName).toBe("second")
  })
})
