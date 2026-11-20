import type { Credential } from "./awsesh"

/**
 * Non-secret environment for terminals: the profile name, region, and account
 * metadata. The AWS SDK and CLI read the real keys from ~/.aws/credentials.
 */
export function terminalEnvironment(credential: Credential | undefined): Record<string, string> {
  if (!credential) return {}
  const environment: Record<string, string> = {
    AWS_PROFILE: credential.profileName,
    AWSESH_ACCOUNT_ID: credential.accountId,
    AWSESH_ACCOUNT_NAME: credential.accountName,
    AWSESH_ROLE_NAME: credential.roleName,
    AWSESH_SESSION_NAME: credential.sessionName,
  }
  if (credential.region) environment.AWS_REGION = credential.region
  return environment
}
