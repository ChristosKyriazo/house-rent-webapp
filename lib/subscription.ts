import { NextResponse } from 'next/server'

export const TIER_RANK: Record<string, number> = { free: 0, plus: 1, pro: 2 }

export function getSlotLimit(tier: string): number {
  if (tier === 'pro') return 5
  if (tier === 'plus') return 2
  return 0
}

export function getListingLimit(tier: string): number {
  if (tier === 'free') return 3
  return Number.MAX_SAFE_INTEGER
}

export function meetsMinimumTier(userTier: string, required: string): boolean {
  return (TIER_RANK[userTier] ?? 0) >= (TIER_RANK[required] ?? 0)
}

export function checkTier(userTier: string, required: string): NextResponse | null {
  if (!meetsMinimumTier(userTier, required)) {
    return NextResponse.json(
      {
        error: 'subscription_required',
        requiredTier: required,
        message: `This feature requires a ${required} subscription.`,
      },
      { status: 402 }
    )
  }
  return null
}
