import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { TIER_RANK } from '@/lib/subscription'
import { getStripe, AI_PACKS, type AiPackSize } from '@/lib/stripe'

const FREE_MONTHLY_LIMIT = 10
const PAID_MONTHLY_LIMIT = 20

function isPaidTier(tier: string | null) {
  return (TIER_RANK[tier ?? 'free'] ?? 0) > 0
}

function getMonthlyReset(resetAt: Date | null): { needsReset: boolean; nextReset: Date } {
  const now = new Date()
  const next = new Date(now)
  next.setMonth(next.getMonth() + 1)
  if (!resetAt || resetAt <= now) return { needsReset: true, nextReset: next }
  return { needsReset: false, nextReset: resetAt }
}

// GET /api/ai-prompt-usage — return current usage state for the logged-in user
export async function GET() {
  const user = await getCurrentUser().catch(() => null)
  if (!user) return NextResponse.json({ guest: true, limit: FREE_MONTHLY_LIMIT, used: 0, remaining: FREE_MONTHLY_LIMIT, canSearch: true })

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { subscriptionTier: true, aiSearchMonthlyCount: true, aiSearchMonthlyResetAt: true, aiSearchPackCount: true },
  })
  if (!dbUser) return NextResponse.json({ guest: true, limit: FREE_MONTHLY_LIMIT, used: 0, remaining: FREE_MONTHLY_LIMIT, canSearch: true })

  const paid = isPaidTier(dbUser.subscriptionTier)
  const monthlyLimit = paid ? PAID_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT

  const { needsReset } = getMonthlyReset(dbUser.aiSearchMonthlyResetAt)
  const monthlyUsed = needsReset ? 0 : dbUser.aiSearchMonthlyCount
  const packLeft = dbUser.aiSearchPackCount
  const monthlyLeft = Math.max(0, monthlyLimit - monthlyUsed)

  return NextResponse.json({
    used: monthlyUsed, limit: monthlyLimit,
    remaining: monthlyLeft, packCredits: packLeft,
    canSearch: monthlyLeft > 0 || packLeft > 0,
    isPaid: paid,
  })
}

// POST /api/ai-prompt-usage — consume one search or add pack credits
export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const action: string = body.action ?? 'consume'

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { subscriptionTier: true, aiSearchMonthlyCount: true, aiSearchMonthlyResetAt: true, aiSearchPackCount: true },
  })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Purchase pack — redirect to Stripe Checkout. Credits are granted by the
  // checkout.session.completed webhook, never here: the user has not paid yet.
  if (action === 'purchase') {
    const size = String(body.pack ?? '')
    const pack = AI_PACKS[size as AiPackSize]
    if (!pack) {
      return NextResponse.json(
        { error: 'invalid_pack', message: `pack must be one of: ${Object.keys(AI_PACKS).join(', ')}` },
        { status: 400 }
      )
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'stripe_not_configured', message: 'STRIPE_SECRET_KEY is not set on this server.' },
        { status: 503 }
      )
    }

    const origin = request.headers.get('origin') ?? 'https://dev.kaparro.com'

    // Resolve the caller's path against our own origin and keep it only if it
    // stayed there. A bare prefix check would pass "//evil.com" and "/\evil.com",
    // turning Stripe's post-payment redirect into an open redirect.
    const rawReturn = typeof body.returnPath === 'string' ? body.returnPath : ''
    let returnPath = '/homes/search'
    if (rawReturn) {
      try {
        const resolved = new URL(rawReturn, origin)
        if (resolved.origin === origin) returnPath = resolved.pathname
      } catch { /* keep default */ }
    }

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: pack.amountCents,
          product_data: { name: `${pack.credits} AI searches` },
        },
      }],
      metadata: {
        userId: user.id.toString(),
        aiPackSize: size,
      },
      success_url: `${origin}${returnPath}?pack=success`,
      cancel_url: `${origin}${returnPath}?pack=canceled`,
    })

    return NextResponse.json({ checkoutUrl: session.url })
  }

  // Consume one search — same monthly mechanism for both free and paid users
  const paid = isPaidTier(dbUser.subscriptionTier)
  const monthlyLimit = paid ? PAID_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT

  const { needsReset, nextReset } = getMonthlyReset(dbUser.aiSearchMonthlyResetAt)
  const monthlyUsed = needsReset ? 0 : dbUser.aiSearchMonthlyCount
  const monthlyLeft = monthlyLimit - monthlyUsed
  const packLeft = dbUser.aiSearchPackCount

  if (monthlyLeft <= 0 && packLeft <= 0) {
    return NextResponse.json({ error: 'limit_reached', canSearch: false }, { status: 402 })
  }

  // Use atomic conditional updates to prevent race conditions (double-spending)
  if (needsReset) {
    // Reset period atomically: only one request wins the race to reset
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { aiSearchMonthlyCount: 1, aiSearchMonthlyResetAt: nextReset },
      select: { aiSearchMonthlyCount: true, aiSearchPackCount: true },
    })
    const newLeft = Math.max(0, monthlyLimit - updated.aiSearchMonthlyCount)
    return NextResponse.json({ ok: true, remaining: newLeft, packCredits: updated.aiSearchPackCount, canSearch: newLeft > 0 || updated.aiSearchPackCount > 0 })
  }

  if (monthlyLeft > 0) {
    // Atomic: only increment if the current count is still within the limit
    const atomicResult = await prisma.user.updateMany({
      where: { id: user.id, aiSearchMonthlyCount: { lt: monthlyLimit } },
      data: { aiSearchMonthlyCount: { increment: 1 } },
    })
    if (atomicResult.count === 0) {
      // Monthly credits ran out between our read and write — try pack credits
      const packResult = await prisma.user.updateMany({
        where: { id: user.id, aiSearchPackCount: { gt: 0 } },
        data: { aiSearchPackCount: { decrement: 1 } },
      })
      if (packResult.count === 0) {
        return NextResponse.json({ error: 'limit_reached', canSearch: false }, { status: 402 })
      }
    }
  } else {
    // Pack credits path: atomic decrement only if count > 0
    const packResult = await prisma.user.updateMany({
      where: { id: user.id, aiSearchPackCount: { gt: 0 } },
      data: { aiSearchPackCount: { decrement: 1 } },
    })
    if (packResult.count === 0) {
      return NextResponse.json({ error: 'limit_reached', canSearch: false }, { status: 402 })
    }
  }

  const updated = await prisma.user.findUnique({
    where: { id: user.id },
    select: { aiSearchMonthlyCount: true, aiSearchPackCount: true },
  })
  const newLeft = Math.max(0, monthlyLimit - (updated?.aiSearchMonthlyCount ?? monthlyLimit))
  return NextResponse.json({ ok: true, remaining: newLeft, packCredits: updated?.aiSearchPackCount ?? 0, canSearch: newLeft > 0 || (updated?.aiSearchPackCount ?? 0) > 0 })
}
