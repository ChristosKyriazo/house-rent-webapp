import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { unauthorized, badRequest } from '@/lib/api-utils'
import { getSlotLimit, getListingLimit, TIER_RANK } from '@/lib/subscription'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import { getChildCount, isMainBroker } from '@/lib/broker-hierarchy'

const VALID_TIERS = ['free', 'plus', 'pro'] as const
type Tier = (typeof VALID_TIERS)[number]

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()

  let body: { tier?: string; keepKeys?: string[] }
  try {
    body = await request.json()
  } catch {
    return badRequest('Invalid JSON')
  }

  const { tier, keepKeys } = body
  if (!tier || !VALID_TIERS.includes(tier as Tier)) {
    return badRequest(`tier must be one of: ${VALID_TIERS.join(', ')}`)
  }

  const newTier = tier as Tier
  const currentTier = (user.subscriptionTier ?? 'free') as Tier
  const isDowngrade = (TIER_RANK[newTier] ?? 0) < (TIER_RANK[currentTier] ?? 0)

  // ── Upgrade: restore hidden listings then redirect to Stripe Checkout ───────
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

  // ── Block downgrade for a Main broker who still has team members ──────────────
  if (isMainBroker(user)) {
    const childCount = await getChildCount(user.id)
    if (childCount > 0) {
      return NextResponse.json(
        {
          error: 'team_members_present',
          childCount,
          message: `You have ${childCount} broker${childCount === 1 ? '' : 's'} on your team. Remove them before downgrading.`,
        },
        { status: 409 }
      )
    }
  }

  // ── Downgrade: check if listing selection is required ────────────────────────
  const newListingLimit = getListingLimit(newTier)
  const newSlotLimit = getSlotLimit(newTier)

  // Count currently visible (non-hidden) listings
  const visibleListings = await prisma.home.findMany({
    where: { ownerId: user.id, overlimitHiddenAt: null },
    orderBy: [
      // Sort by inquiry activity descending — most-engaged listings pre-selected
      { updatedAt: 'desc' },
    ],
    select: {
      id: true,
      key: true,
      title: true,
      titleGreek: true,
      city: true,
      area: true,
      pricePerMonth: true,
      listingType: true,
      bedrooms: true,
      _count: { select: { inquiries: { where: { dismissed: false } } } },
    },
  })

  const excess = Math.max(0, visibleListings.length - newListingLimit)

  // If there are excess listings and the caller has not supplied a keepKeys selection,
  // ask the UI to show the selection modal before we apply the downgrade.
  if (excess > 0 && !keepKeys) {
    return NextResponse.json({
      needsSelection: true,
      listings: visibleListings.map(l => ({
        ...l,
        inquiryCount: l._count.inquiries,
        _count: undefined,
      })),
      newLimit: newListingLimit,
      excess,
    })
  }

  // ── Cancel active Stripe subscription ────────────────────────────────────────
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
    }
  }

  // ── Apply downgrade in a single transaction ───────────────────────────────────
  const now = new Date()
  const activeSlots = await prisma.home.findMany({
    where: {
      ownerId: user.id,
      slotPromoted: true,
      OR: [{ slotPromotedUntil: null }, { slotPromotedUntil: { gt: now } }],
    },
    orderBy: { updatedAt: 'asc' },
    select: { id: true },
  })

  let slotsRevoked = 0
  let listingsHidden = 0

  const updated = await prisma.$transaction(async (tx) => {
    // Revoke excess promotion slots
    if (activeSlots.length > newSlotLimit) {
      const toRevoke = activeSlots.slice(newSlotLimit).map(h => h.id)
      await tx.home.updateMany({
        where: { id: { in: toRevoke } },
        data: { slotPromoted: false },
      })
      slotsRevoked = toRevoke.length
    }

    // Hide listings that the user did not select to keep
    if (excess > 0 && keepKeys && keepKeys.length > 0) {
      const toHide = visibleListings
        .filter(l => !keepKeys.includes(l.key))
        .map(l => l.id)

      if (toHide.length > 0) {
        await tx.home.updateMany({
          where: { id: { in: toHide } },
          data: {
            overlimitHiddenAt: now,
            slotPromoted: false, // always un-promote hidden listings
          },
        })
        listingsHidden = toHide.length
      }
    }

    return tx.user.update({
      where: { id: user.id },
      data: { subscriptionTier: newTier },
      select: { email: true, subscriptionTier: true },
    })
  })

  return NextResponse.json({
    ok: true,
    user: updated,
    slotsRevoked,
    listingsHidden,
    newSlotLimit,
  })
}
