import { NextResponse } from 'next/server'
import type { Prisma, PrismaClient } from '@prisma/client'

export const TIER_RANK: Record<string, number> = { free: 0, plus: 1, pro: 2 }

export function getSlotLimit(tier: string): number {
  if (tier === 'pro') return 5
  if (tier === 'plus') return 2
  return 0
}

export function getListingLimit(tier: string): number {
  if (tier === 'free') return 1
  if (tier === 'plus') return 10
  return Number.MAX_SAFE_INTEGER // pro = unlimited
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

type Tx = Prisma.TransactionClient | PrismaClient

/**
 * Reconcile a user's listings & promotion slots to the limits of `tier`, without any interactive
 * selection. Used when a plan is changed *on someone's behalf* — e.g. a Main broker changing a team
 * member's tier, or a cascade dropping a member to free.
 *
 * - Downgrade: hide the least-recently-updated listings beyond the new limit; revoke excess slots.
 * - Upgrade:   restore the most-recently-hidden listings up to the new limit.
 *
 * (The self-serve /api/subscription/upgrade route keeps its own keepKeys-driven selection so the
 * owner can choose which of *their own* listings to keep; this helper is the non-interactive path.)
 */
export async function enforceTierListingLimits(tx: Tx, userId: number, tier: string): Promise<void> {
  const listingLimit = getListingLimit(tier)
  const slotLimit = getSlotLimit(tier)
  const now = new Date()

  // Revoke promotion slots beyond the new limit (keep the least-recently-updated within budget).
  const activeSlots = await tx.home.findMany({
    where: {
      ownerId: userId,
      slotPromoted: true,
      OR: [{ slotPromotedUntil: null }, { slotPromotedUntil: { gt: now } }],
    },
    orderBy: { updatedAt: 'asc' },
    select: { id: true },
  })
  if (activeSlots.length > slotLimit) {
    await tx.home.updateMany({
      where: { id: { in: activeSlots.slice(slotLimit).map((h) => h.id) } },
      data: { slotPromoted: false },
    })
  }

  const visible = await tx.home.count({ where: { ownerId: userId, overlimitHiddenAt: null } })

  if (listingLimit === Number.MAX_SAFE_INTEGER) {
    // Unlimited (pro): restore everything that was hidden for being over-limit.
    await tx.home.updateMany({
      where: { ownerId: userId, overlimitHiddenAt: { not: null } },
      data: { overlimitHiddenAt: null },
    })
    return
  }

  if (visible > listingLimit) {
    // Hide the excess — keep the most-recently-updated listings visible.
    const excess = await tx.home.findMany({
      where: { ownerId: userId, overlimitHiddenAt: null },
      orderBy: { updatedAt: 'desc' },
      skip: listingLimit,
      select: { id: true },
    })
    if (excess.length > 0) {
      await tx.home.updateMany({
        where: { id: { in: excess.map((h) => h.id) } },
        data: { overlimitHiddenAt: now, slotPromoted: false },
      })
    }
  } else if (visible < listingLimit) {
    // Room freed up: restore the most-recently-hidden listings first.
    const toRestore = await tx.home.findMany({
      where: { ownerId: userId, overlimitHiddenAt: { not: null } },
      orderBy: { overlimitHiddenAt: 'desc' },
      take: listingLimit - visible,
      select: { id: true },
    })
    if (toRestore.length > 0) {
      await tx.home.updateMany({
        where: { id: { in: toRestore.map((h) => h.id) } },
        data: { overlimitHiddenAt: null },
      })
    }
  }
}
