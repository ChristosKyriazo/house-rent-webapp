import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStripe, AI_PACKS, type AiPackSize } from '@/lib/stripe'
import { getListingLimit } from '@/lib/subscription'
import { applyBoost } from '@/lib/broker-hierarchy'
import type Stripe from 'stripe'

// Raw body required for Stripe signature verification — do not parse as JSON
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing stripe signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const rawBody = await request.text()
    event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Webhook signature invalid: ${message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const userId = session.metadata?.userId
    if (!userId) {
      return NextResponse.json({ received: true })
    }
    const userIdInt = parseInt(userId, 10)

    // ── Broker team boost (approved request or proactive) ─────────────────────
    const boostRequestKey = session.metadata?.boostRequestKey
    if (boostRequestKey) {
      await prisma.$transaction(async (tx) => {
        const seen = await tx.transaction.findUnique({ where: { stripeEventId: event.id } })
        if (seen) return

        const boostRequest = await tx.boostRequest.findUnique({
          where: { key: boostRequestKey },
          select: { id: true, homeId: true, requesterId: true, days: true, status: true, home: { select: { key: true } } },
        })
        if (!boostRequest || boostRequest.status === 'paid') return

        await tx.transaction.create({
          data: {
            userId: userIdInt,
            stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
            stripeEventId: event.id,
            amount: session.amount_total ?? 0,
            currency: session.currency ?? 'eur',
            status: session.payment_status === 'paid' ? 'succeeded' : session.payment_status ?? 'unknown',
          },
        })

        await applyBoost(boostRequest.homeId, boostRequest.days, tx)
        await tx.boostRequest.update({
          where: { id: boostRequest.id },
          data: {
            status: 'paid',
            decidedAt: new Date(),
            stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
          },
        })

        // Notify the Default (child) broker whose listing was boosted.
        await tx.notification.create({
          data: { recipientId: boostRequest.requesterId, role: 'broker', type: 'boost_approved', homeKey: boostRequest.home.key, userId: userIdInt },
        })
      })

      return NextResponse.json({ received: true })
    }

    // ── One-off AI credit pack ────────────────────────────────────────────────
    const aiPackSize = session.metadata?.aiPackSize
    if (aiPackSize) {
      const pack = AI_PACKS[aiPackSize as AiPackSize]
      if (!pack) {
        return NextResponse.json({ received: true })
      }

      // The unique constraint on stripeEventId is what makes this idempotent:
      // a redelivered event fails the create and rolls back the increment, so
      // credits are never granted twice for one payment.
      await prisma.$transaction(async (tx) => {
        const seen = await tx.transaction.findUnique({ where: { stripeEventId: event.id } })
        if (seen) return

        await tx.transaction.create({
          data: {
            userId: userIdInt,
            stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
            stripeEventId: event.id,
            amount: session.amount_total ?? pack.amountCents,
            currency: session.currency ?? 'eur',
            status: session.payment_status === 'paid' ? 'succeeded' : session.payment_status ?? 'unknown',
          },
        })

        await tx.user.update({
          where: { id: userIdInt },
          data: { aiSearchPackCount: { increment: pack.credits } },
        })
      })

      return NextResponse.json({ received: true })
    }

    // ── Subscription tier upgrade ─────────────────────────────────────────────
    const targetTier = session.metadata?.targetTier
    if (!targetTier) {
      return NextResponse.json({ received: true })
    }

    const newLimit = getListingLimit(targetTier)

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userIdInt },
        data: { subscriptionTier: targetTier },
      })

      await tx.transaction.upsert({
        where: { stripeEventId: event.id },
        create: {
          userId: userIdInt,
          stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
          stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
          stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
          stripeEventId: event.id,
          amount: session.amount_total ?? 0,
          currency: session.currency ?? 'eur',
          status: session.payment_status === 'paid' ? 'succeeded' : session.payment_status ?? 'unknown',
          subscriptionTier: targetTier,
        },
        update: {},
      })

      // Restore hidden listings up to the new tier's limit.
      // Pro is unlimited (Number.MAX_SAFE_INTEGER), so all hidden listings are restored.
      // For Plus (10), restore as many as fit alongside currently visible listings.
      const currentlyVisible = await tx.home.count({
        where: { ownerId: userIdInt, overlimitHiddenAt: null },
      })

      const slotsAvailable = newLimit === Number.MAX_SAFE_INTEGER
        ? Number.MAX_SAFE_INTEGER
        : Math.max(0, newLimit - currentlyVisible)

      if (slotsAvailable > 0) {
        const toRestore = await tx.home.findMany({
          where: { ownerId: userIdInt, overlimitHiddenAt: { not: null } },
          orderBy: { overlimitHiddenAt: 'desc' }, // restore most-recently-hidden first
          take: slotsAvailable === Number.MAX_SAFE_INTEGER ? undefined : slotsAvailable,
          select: { id: true },
        })

        if (toRestore.length > 0) {
          await tx.home.updateMany({
            where: { id: { in: toRestore.map(h => h.id) } },
            data: { overlimitHiddenAt: null },
          })
        }
      }
    })
  }

  // ── Subscription cancelled externally: drop the user to free and cascade to their team ──
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const txn = await prisma.transaction.findFirst({
      where: { stripeSubscriptionId: subscription.id },
      orderBy: { createdAt: 'desc' },
      select: { userId: true },
    })
    if (txn?.userId) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: txn.userId }, data: { subscriptionTier: 'free' } })
        // A Main broker losing their subscription cascades free tier onto all their Default (child) brokers.
        await tx.user.updateMany({
          where: { parentBrokerId: txn.userId, brokerCategory: 'child' },
          data: { subscriptionTier: 'free' },
        })
      })
    }
  }

  return NextResponse.json({ received: true })
}
