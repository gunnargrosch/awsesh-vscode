import { describe, expect, test } from "bun:test"
import path from "node:path"
import { directories } from "./directories"

describe("directories", () => {
  test("defaults to the home dotdirs", () => {
    const result = directories("/home/tester", {})
    expect(result.configDir).toBe(path.join("/home/tester", ".config", "awsesh"))
    expect(result.dataDir).toBe(path.join("/home/tester", ".local", "share", "awsesh"))
    expect(result.awsDir).toBe(path.join("/home/tester", ".aws"))
  })

  test("honors XDG overrides for config and data but not aws", () => {
    const result = directories("/home/tester", { XDG_CONFIG_HOME: "/xdg/config", XDG_DATA_HOME: "/xdg/data" })
    expect(result.configDir).toBe(path.join("/xdg/config", "awsesh"))
    expect(result.dataDir).toBe(path.join("/xdg/data", "awsesh"))
    expect(result.awsDir).toBe(path.join("/home/tester", ".aws"))
  })

  test("honors explicit overrides", () => {
    const result = directories("/home/tester", {}, { configDir: "/custom/config", dataDir: "/custom/data", awsDir: "/custom/aws" })
    expect(result).toEqual({ configDir: "/custom/config", dataDir: "/custom/data", awsDir: "/custom/aws" })
  })

  test("overrides only the directories provided", () => {
    const result = directories("/home/tester", {}, { dataDir: "/custom/data" })
    expect(result.configDir).toBe(path.join("/home/tester", ".config", "awsesh"))
    expect(result.dataDir).toBe("/custom/data")
    expect(result.awsDir).toBe(path.join("/home/tester", ".aws"))
  })
})
