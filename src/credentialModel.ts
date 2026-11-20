import type { Credential } from "./awsesh"

/** The credential the extension should treat as active right now. */
export function activeCredential(credentials: Credential[], now: number = Date.now()): Credential | undefined {
  const live = credentials.filter((credential) => new Date(credential.expiration).getTime() > now)
  return live.find((credential) => credential.isDefault) ?? live.at(-1)
}
