import { describe, expect, test } from "bun:test"
import { statusBarView } from "./statusBarModel"
import type { Credential } from "./awsesh"

const now = Date.UTC(2026, 0, 1, 12, 0, 0)

function credential(overrides: Partial<Credential> = {}): Credential {
  return {
    profileName: "default",
    accountId: "111122223333",
    accountName: "Dev",
    roleName: "AdministratorAccess",
    sessionName: "Test Org",
    expiration: new Date(now + 60 * 60_000).toISOString(),
    isDefault: true,
    region: "eu-north-1",
    ...overrides,
  }
}

describe("statusBarView", () => {
  test("shows an idle label with no credential", () => {
    const view = statusBarView(undefined, 15, now)
    expect(view.text).toContain("Sesh")
    expect(view.warning).toBe(false)
  })

  test("shows the account and role", () => {
    const view = statusBarView(credential(), 15, now)
    expect(view.text).toBe("$(credit-card) Dev / AdministratorAccess")
    expect(view.tooltip).toContain("default")
    expect(view.tooltip).toContain("Test Org")
    expect(view.warning).toBe(false)
  })

  test("warns within the lead window", () => {
    const view = statusBarView(credential({ expiration: new Date(now + 5 * 60_000).toISOString() }), 15, now)
    expect(view.warning).toBe(true)
  })

  test("does not warn outside the lead window", () => {
    const view = statusBarView(credential({ expiration: new Date(now + 30 * 60_000).toISOString() }), 15, now)
    expect(view.warning).toBe(false)
  })

  test("renders a custom template with placeholders", () => {
    expect(statusBarView(credential(), 15, now, "{account} / {role}").text).toBe("Dev / AdministratorAccess")
    expect(statusBarView(credential(), 15, now, "{account}").text).toBe("Dev")
    expect(statusBarView(credential(), 15, now, "{role} ({accountId})").text).toBe("AdministratorAccess (111122223333)")
    expect(statusBarView(credential(), 15, now, "{session}: {profile}").text).toBe("Test Org: default")
  })

  test("leaves unknown placeholders and trims the result", () => {
    expect(statusBarView(credential(), 15, now, "  {account} / {nope}  ").text).toBe("Dev / {nope}")
  })
})
