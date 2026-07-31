import { TIER_RANK } from '@/lib/subscription'

// Monthly AI-search allowances. Shared by the /api/ai-prompt-usage route (which
// enforces them) and the usage assistant (which reports on them) so the two can
// never drift apart.
export const FREE_MONTHLY_LIMIT = 10
export const PAID_MONTHLY_LIMIT = 20

export function isPaidTier(tier: string | null): boolean {
  return (TIER_RANK[tier ?? 'free'] ?? 0) > 0
}

export function monthlyLimitFor(tier: string | null): number {
  return isPaidTier(tier) ? PAID_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT
}

// The monthly counter resets lazily: a period is considered expired once
// `resetAt` is in the past (or was never set). Returns whether a reset is due
// and when the next period ends.
export function getMonthlyReset(resetAt: Date | null): { needsReset: boolean; nextReset: Date } {
  const now = new Date()
  const next = new Date(now)
  next.setMonth(next.getMonth() + 1)
  if (!resetAt || resetAt <= now) return { needsReset: true, nextReset: next }
  return { needsReset: false, nextReset: resetAt }
}
