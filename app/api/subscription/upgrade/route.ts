import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { unauthorized, badRequest } from '@/lib/api-utils'
import { getSlotLimit, getListingLimit, TIER_RANK } from '@/lib/subscription'

// TODO: replace body with Stripe Checkout session redirect when payments are live
const VALID_TIERS = ['free', 'plus', 'pro'] as const
type Tier = (typeof VALID_TIERS)[number]

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()

  let body: { tier?: string }
  try {
    body = await request.json()
  } catch {
    return badRequest('Invalid JSON')
  }

  const { tier } = body
  if (!tier || !VALID_TIERS.includes(tier as Tier)) {
    return badRequest(`tier must be one of: ${VALID_TIERS.join(', ')}`)
  }

  const newTier = tier as Tier
  const currentTier = (user.subscriptionTier ?? 'free') as Tier
  const isDowngrade = (TIER_RANK[newTier] ?? 0) < (TIER_RANK[currentTier] ?? 0)

  if (!isDowngrade) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionTier: newTier },
      select: { email: true, subscriptionTier: true },
    })
    return NextResponse.json({ ok: true, user: updated, slotsRevoked: 0, listingsOverLimit: 0, newSlotLimit: getSlotLimit(newTier) })
  }

  // Downgrade path — revoke excess promo slots atomically
  const newSlotLimit = getSlotLimit(newTier)
  const newListingLimit = getListingLimit(newTier)

  const now = new Date()
  const [activeSlots, listingCount] = await Promise.all([
    prisma.home.findMany({
      where: { ownerId: user.id, slotPromoted: true, OR: [{ slotPromotedUntil: null }, { slotPromotedUntil: { gt: now } }] },
      orderBy: { updatedAt: 'asc' },
      select: { id: true },
    }),
    prisma.home.count({ where: { ownerId: user.id } }),
  ])

  const listingsOverLimit = Math.max(0, listingCount - newListingLimit)
  let slotsRevoked = 0

  const updated = await prisma.$transaction(async (tx) => {
    if (activeSlots.length > newSlotLimit) {
      const toRevoke = activeSlots.slice(newSlotLimit).map(h => h.id)
      await tx.home.updateMany({
        where: { id: { in: toRevoke } },
        data: { slotPromoted: false },
      })
      slotsRevoked = toRevoke.length
    }
    return tx.user.update({
      where: { id: user.id },
      data: { subscriptionTier: newTier },
      select: { email: true, subscriptionTier: true },
    })
  })

  return NextResponse.json({ ok: true, user: updated, slotsRevoked, listingsOverLimit, newSlotLimit })
}
