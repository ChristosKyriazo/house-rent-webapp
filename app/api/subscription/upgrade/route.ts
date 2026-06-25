import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { unauthorized, badRequest } from '@/lib/api-utils'
import { getSlotLimit, getListingLimit, TIER_RANK } from '@/lib/subscription'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'

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

  // ── Upgrade: redirect to Stripe Checkout ──────────────────────────────────
  if (!isDowngrade) {
    if (newTier === 'free') {
      return badRequest('Cannot upgrade to free tier')
    }

    const priceId = STRIPE_PRICES[newTier]
    if (!priceId) {
      return NextResponse.json(
        { error: 'stripe_not_configured', message: `STRIPE_PRICE_ID_${newTier.toUpperCase()} is not set.` },
        { status: 503 }
      )
    }

    const origin = request.headers.get('origin') ?? 'https://dev.kaparro.com'

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        userId: user.id.toString(),
        targetTier: newTier,
      },
      success_url: `${origin}/upgrade?success=true&tier=${newTier}`,
      cancel_url:  `${origin}/upgrade?canceled=true`,
    })

    return NextResponse.json({ checkoutUrl: session.url })
  }

  // ── Downgrade: cancel Stripe subscription then apply immediately ─────────
  const activeTransaction = await prisma.transaction.findFirst({
    where: { userId: user.id, stripeSubscriptionId: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { stripeSubscriptionId: true },
  })
  if (activeTransaction?.stripeSubscriptionId) {
    try {
      await getStripe().subscriptions.cancel(activeTransaction.stripeSubscriptionId)
    } catch (err) {
      console.error('Failed to cancel Stripe subscription on downgrade:', err)
      // Non-fatal: DB tier updated regardless; Stripe retains until period end.
    }
  }

  const newSlotLimit = getSlotLimit(newTier)
  const newListingLimit = getListingLimit(newTier)

  const now = new Date()
  const [activeSlots, listingCount] = await Promise.all([
    prisma.home.findMany({
      where: {
        ownerId: user.id,
        slotPromoted: true,
        OR: [{ slotPromotedUntil: null }, { slotPromotedUntil: { gt: now } }],
      },
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
