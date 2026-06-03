// Client-safe tier utilities — no Next.js server imports
export const TIER_RANK: Record<string, number> = { free: 0, plus: 1, pro: 2 }

export function meetsMinimumTier(userTier: string, required: string): boolean {
  return (TIER_RANK[userTier] ?? 0) >= (TIER_RANK[required] ?? 0)
}
