import { prisma } from '@/lib/prisma'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import { logger } from '@/lib/logger'

/**
 * Per-seat team billing.
 *
 * A Main (parent) broker holds ONE Stripe subscription. Its line items are quantity-based, one
 * per paid tier:
 *   - price_pro  quantity = 1 (the owner's own Pro seat) + number of Pro child brokers
 *   - price_plus quantity = number of Plus child brokers
 *   - Free child brokers add no seat (€0).
 *
 * Whenever the team changes (a member accepts, has their tier changed, or leaves) we reconcile the
 * subscription's items to these targets and let Stripe prorate the delta onto the owner's existing
 * payment method — no new Checkout per member.
 */

type SeatCounts ={ pro: number; plus: number }

type ChildTier = { subscriptionTier: string | null }

/**
 * Pure: target Stripe item quantities for an owner's subscription, given their child brokers.
 * The owner always occupies one Pro seat (team-building requires Pro), so `pro` starts at 1.
 * Free members contribute nothing.
 */
export function getSeatCounts(children: ChildTier[]): SeatCounts {
  let pro = 1 // the owner's own Pro seat
  let plus = 0
  for (const c of children) {
    if (c.subscriptionTier === 'pro') pro += 1
    else if (c.subscriptionTier === 'plus') plus += 1
  }
  return { pro, plus }
}

/**
 * Reconcile the owner's Stripe subscription items to the current team composition.
 *
 * Best-effort: any failure is logged (Sentry via pino) rather than thrown, so a Stripe hiccup can
 * never corrupt membership state — the caller has already committed the DB change. A follow-up
 * reconciliation can repair drift.
 */
export async function syncOwnerSeats(ownerId: number): Promise<void> {
  try {
    const pricePro = STRIPE_PRICES.pro
    const pricePlus = STRIPE_PRICES.plus
    if (!pricePro || !pricePlus) {
      logger.warn({ ownerId }, 'syncOwnerSeats: Stripe price IDs not configured — skipping seat sync')
      return
    }

    // The owner's active managed subscription (they always have one — team-building requires Pro).
    const txn = await prisma.transaction.findFirst({
      where: { userId: ownerId, stripeSubscriptionId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { stripeSubscriptionId: true },
    })
    const subscriptionId = txn?.stripeSubscriptionId
    if (!subscriptionId) {
      logger.warn({ ownerId }, 'syncOwnerSeats: no active subscription found — skipping seat sync')
      return
    }

    const children = await prisma.user.findMany({
      where: { parentBrokerId: ownerId, brokerCategory: 'child' },
      select: { subscriptionTier: true },
    })
    const target = getSeatCounts(children)
    const targetByPrice: Record<string, number> = { [pricePro]: target.pro, [pricePlus]: target.plus }

    const stripe = getStripe()
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    if (subscription.status === 'canceled') {
      logger.warn({ ownerId, subscriptionId }, 'syncOwnerSeats: subscription is canceled — skipping seat sync')
      return
    }

    // Map existing items by their price id (there should be at most one item per price).
    const existingByPrice = new Map<string, { id: string; quantity: number }>()
    for (const item of subscription.items.data) {
      existingByPrice.set(item.price.id, { id: item.id, quantity: item.quantity ?? 0 })
    }

    const items: Array<{ id?: string; price?: string; quantity?: number; deleted?: boolean }> = []
    for (const [price, qty] of Object.entries(targetByPrice)) {
      const existing = existingByPrice.get(price)
      if (qty > 0) {
        if (existing) {
          if (existing.quantity !== qty) items.push({ id: existing.id, quantity: qty })
        } else {
          items.push({ price, quantity: qty })
        }
      } else if (existing) {
        // Target is 0 (e.g. no Plus members left) — remove the item. The Pro item never hits 0.
        items.push({ id: existing.id, deleted: true })
      }
    }

    if (items.length === 0) return // already in sync

    await stripe.subscriptions.update(subscriptionId, {
      items,
      proration_behavior: 'create_prorations',
    })
    logger.info({ ownerId, subscriptionId, target }, 'syncOwnerSeats: reconciled team seats')
  } catch (err) {
    logger.error({ err, ownerId }, 'syncOwnerSeats: failed to reconcile team seats')
  }
}
