import { NextResponse } from 'next/server'

const TIER_RANK: Record<string, number> = { free: 0, plus: 1, pro: 2 }

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
