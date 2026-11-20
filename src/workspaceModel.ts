import type { Credential } from "./awsesh"

export interface WorkspaceBinding {
  session: string
  accountId: string
  role: string
}

export function toBinding(session?: string, accountId?: string, role?: string): WorkspaceBinding | undefined {
  if (!session || !accountId || !role) return undefined
  return { session, accountId, role }
}

export function bindingMatches(binding: WorkspaceBinding, credential: Credential | undefined): boolean {
  return (
    credential !== undefined &&
    credential.sessionName === binding.session &&
    credential.accountId === binding.accountId &&
    credential.roleName === binding.role
  )
}
