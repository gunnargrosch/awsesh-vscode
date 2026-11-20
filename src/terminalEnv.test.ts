import { describe, expect, test } from "bun:test"
import { terminalEnvironment } from "./terminalEnv"
import type { Credential } from "./awsesh"

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

describe("terminalEnvironment", () => {
  test("is empty without a credential", () => {
    expect(terminalEnvironment(undefined)).toEqual({})
  })

  test("maps the profile and account metadata", () => {
    expect(terminalEnvironment(credential)).toEqual({
      AWS_PROFILE: "default",
      AWS_REGION: "eu-north-1",
      AWSESH_ACCOUNT_ID: "111122223333",
      AWSESH_ACCOUNT_NAME: "Dev",
      AWSESH_ROLE_NAME: "AdministratorAccess",
      AWSESH_SESSION_NAME: "Test Org",
    })
  })

  test("omits the region when the credential has none", () => {
    const environment = terminalEnvironment({ ...credential, region: undefined })
    expect("AWS_REGION" in environment).toBe(false)
    expect(environment.AWS_PROFILE).toBe("default")
  })
})
