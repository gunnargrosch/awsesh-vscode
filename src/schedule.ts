const MAX_TIMEOUT = 2_147_483_647

/**
 * Milliseconds to wait before refreshing a credential that expires at `expiration`,
 * leading by `leadMinutes`. Clamped to [1s, the max setTimeout delay].
 */
export function refreshDelay(expiration: string, leadMinutes: number, now: number = Date.now()): number {
  const target = new Date(expiration).getTime() - now - leadMinutes * 60_000
  return Math.max(1_000, Math.min(target, MAX_TIMEOUT))
}
