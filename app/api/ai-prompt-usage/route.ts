import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { TIER_RANK } from '@/lib/subscription'

const FREE_LIMIT = 3
const PAID_MONTHLY_LIMIT = 20
const PACK_SIZES: Record<string, number> = { '10': 10, '25': 25, '50': 50 }

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
  if (!user) return NextResponse.json({ guest: true, limit: FREE_LIMIT, used: 0, remaining: FREE_LIMIT, canSearch: true })

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { subscriptionTier: true, aiSearchCount: true, aiSearchMonthlyCount: true, aiSearchMonthlyResetAt: true, aiSearchPackCount: true },
  })
  if (!dbUser) return NextResponse.json({ guest: true, limit: FREE_LIMIT, used: 0, remaining: FREE_LIMIT, canSearch: true })

  const paid = isPaidTier(dbUser.subscriptionTier)

  if (paid) {
    const { needsReset } = getMonthlyReset(dbUser.aiSearchMonthlyResetAt)
    const monthlyUsed = needsReset ? 0 : dbUser.aiSearchMonthlyCount
    const packLeft = dbUser.aiSearchPackCount
    const monthlyLeft = Math.max(0, PAID_MONTHLY_LIMIT - monthlyUsed)
    return NextResponse.json({
      used: monthlyUsed, limit: PAID_MONTHLY_LIMIT,
      remaining: monthlyLeft, packCredits: packLeft,
      canSearch: monthlyLeft > 0 || packLeft > 0,
      isPaid: true,
    })
  }

  const packLeft = dbUser.aiSearchPackCount
  const freeLeft = Math.max(0, FREE_LIMIT - dbUser.aiSearchCount)
  return NextResponse.json({
    used: dbUser.aiSearchCount, limit: FREE_LIMIT,
    remaining: freeLeft, packCredits: packLeft,
    canSearch: freeLeft > 0 || packLeft > 0,
    isPaid: false,
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
    select: { subscriptionTier: true, aiSearchCount: true, aiSearchMonthlyCount: true, aiSearchMonthlyResetAt: true, aiSearchPackCount: true },
  })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Purchase pack (Stripe not yet live — grant immediately in test mode)
  if (action === 'purchase') {
    const packSize = PACK_SIZES[String(body.pack ?? '10')]
    if (!packSize) return NextResponse.json({ error: 'Invalid pack size' }, { status: 400 })
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { aiSearchPackCount: { increment: packSize } },
      select: { aiSearchPackCount: true },
    })
    return NextResponse.json({ ok: true, packCredits: updated.aiSearchPackCount })
  }

  // Consume one search
  const paid = isPaidTier(dbUser.subscriptionTier)

  if (paid) {
    const { needsReset, nextReset } = getMonthlyReset(dbUser.aiSearchMonthlyResetAt)
    const monthlyUsed = needsReset ? 0 : dbUser.aiSearchMonthlyCount
    const monthlyLeft = PAID_MONTHLY_LIMIT - monthlyUsed
    const packLeft = dbUser.aiSearchPackCount

    if (monthlyLeft <= 0 && packLeft <= 0) {
      return NextResponse.json({ error: 'limit_reached', canSearch: false }, { status: 402 })
    }

    const updateData: Record<string, unknown> = needsReset
      ? { aiSearchMonthlyCount: 1, aiSearchMonthlyResetAt: nextReset }
      : monthlyLeft > 0
        ? { aiSearchMonthlyCount: { increment: 1 } }
        : { aiSearchPackCount: { decrement: 1 } }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: { aiSearchMonthlyCount: true, aiSearchPackCount: true, aiSearchMonthlyResetAt: true },
    })
    const newMonthlyLeft = Math.max(0, PAID_MONTHLY_LIMIT - updated.aiSearchMonthlyCount)
    return NextResponse.json({ ok: true, remaining: newMonthlyLeft, packCredits: updated.aiSearchPackCount, canSearch: newMonthlyLeft > 0 || updated.aiSearchPackCount > 0 })
  }

  // Free user
  const freeLeft = FREE_LIMIT - dbUser.aiSearchCount
  const packLeft = dbUser.aiSearchPackCount
  if (freeLeft <= 0 && packLeft <= 0) {
    return NextResponse.json({ error: 'limit_reached', canSearch: false }, { status: 402 })
  }

  const updateData = freeLeft > 0
    ? { aiSearchCount: { increment: 1 } }
    : { aiSearchPackCount: { decrement: 1 } }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
    select: { aiSearchCount: true, aiSearchPackCount: true },
  })
  const newFreeLeft = Math.max(0, FREE_LIMIT - updated.aiSearchCount)
  return NextResponse.json({ ok: true, remaining: newFreeLeft, packCredits: updated.aiSearchPackCount, canSearch: newFreeLeft > 0 || updated.aiSearchPackCount > 0 })
}
