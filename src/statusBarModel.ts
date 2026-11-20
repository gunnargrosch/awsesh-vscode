import type { Credential } from "./awsesh"

export interface StatusBarView {
  text: string
  tooltip: string
  warning: boolean
}

export const defaultStatusBarTemplate = "$(credit-card) {account} / {role}"

function render(template: string, credential: Credential): string {
  const values: Record<string, string> = {
    account: credential.accountName,
    accountId: credential.accountId,
    role: credential.roleName,
    profile: credential.profileName,
    session: credential.sessionName,
    region: credential.region ?? "",
  }
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? values[key] : match)).trim()
}

export function statusBarView(credential: Credential | undefined, warnMinutes: number, now: number = Date.now(), template: string = defaultStatusBarTemplate): StatusBarView {
  if (!credential) {
    return { text: "$(credit-card) Sesh", tooltip: "No active credential. Click to switch.", warning: false }
  }
  const expiry = new Date(credential.expiration)
  return {
    text: render(template, credential),
    tooltip: `${credential.sessionName}\nProfile ${credential.profileName}\nExpires ${expiry.toLocaleString()}`,
    warning: expiry.getTime() - now < warnMinutes * 60_000,
  }
}
