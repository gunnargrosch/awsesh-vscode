import { describe, expect, test } from "bun:test"
import { refreshDelay } from "./schedule"

const now = Date.UTC(2026, 0, 1, 12, 0, 0)

describe("refreshDelay", () => {
  test("waits until the lead time before expiry", () => {
    const expiration = new Date(now + 60 * 60_000).toISOString()
    expect(refreshDelay(expiration, 5, now)).toBe(55 * 60_000)
  })

  test("clamps to one second when already due", () => {
    const expiration = new Date(now + 60_000).toISOString()
    expect(refreshDelay(expiration, 5, now)).toBe(1_000)
  })

  test("clamps to the maximum timeout for far-future expiries", () => {
    const expiration = new Date(now + 100 * 24 * 60 * 60_000).toISOString()
    expect(refreshDelay(expiration, 5, now)).toBe(2_147_483_647)
  })
})
