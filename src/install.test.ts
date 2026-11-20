import { describe, expect, test } from "bun:test"
import { brewCommand, installPlan, releasesUrl } from "./install"

describe("installPlan", () => {
  test("uses Homebrew on macOS and Linux when available", () => {
    expect(installPlan("darwin", true)).toEqual({ kind: "brew", command: brewCommand })
    expect(installPlan("linux", true)).toEqual({ kind: "brew", command: brewCommand })
  })

  test("falls back to the releases page without Homebrew", () => {
    expect(installPlan("darwin", false)).toEqual({ kind: "link", url: releasesUrl })
    expect(installPlan("linux", false)).toEqual({ kind: "link", url: releasesUrl })
  })

  test("links to releases on Windows", () => {
    expect(installPlan("win32", true)).toEqual({ kind: "link", url: releasesUrl })
    expect(installPlan("win32", false)).toEqual({ kind: "link", url: releasesUrl })
  })
})
