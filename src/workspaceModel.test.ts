import { describe, expect, test } from "bun:test"
import { bindingMatches, toBinding } from "./workspaceModel"
import type { Credential } from "./awsesh"

const binding = { session: "Test Org", accountId: "111122223333", role: "AdministratorAccess" }

const credential: Credential = {
  profileName: "default",
  accountId: "111122223333",
  accountName: "Dev",
  roleName: "AdministratorAccess",
  sessionName: "Test Org",
  expiration: "2026-01-01T00:00:00.000Z",
  isDefault: true,
}

describe("toBinding", () => {
  test("returns a binding only when all three fields are present", () => {
    expect(toBinding("Test Org", "111122223333", "AdministratorAccess")).toEqual(binding)
    expect(toBinding("Test Org", undefined, "AdministratorAccess")).toBeUndefined()
    expect(toBinding("Test Org", "111122223333", undefined)).toBeUndefined()
    expect(toBinding("", "111122223333", "AdministratorAccess")).toBeUndefined()
    expect(toBinding(undefined, undefined, undefined)).toBeUndefined()
  })
})

describe("bindingMatches", () => {
  test("matches on session, account, and role", () => {
    expect(bindingMatches(binding, credential)).toBe(true)
  })

  test("rejects a different role, account, session, or no credential", () => {
    expect(bindingMatches(binding, { ...credential, roleName: "ReadOnlyAccess" })).toBe(false)
    expect(bindingMatches(binding, { ...credential, accountId: "965195185999" })).toBe(false)
    expect(bindingMatches(binding, { ...credential, sessionName: "Other Org" })).toBe(false)
    expect(bindingMatches(binding, undefined)).toBe(false)
  })
})
