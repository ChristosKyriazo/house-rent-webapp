import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { TIER_RANK } from '@/lib/subscription'

const FREE_MONTHLY_LIMIT = 10
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

  // Purchase pack (requires payment integration)
  if (action === 'purchase') {
    return NextResponse.json(
      { error: 'payment_required', message: 'Credit pack purchases require payment. Payment integration coming soon.' },
      { status: 503 }
    )
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
