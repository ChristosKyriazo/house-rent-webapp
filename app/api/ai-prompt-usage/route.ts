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

  const updateData: Record<string, unknown> = needsReset
    ? { aiSearchMonthlyCount: 1, aiSearchMonthlyResetAt: nextReset }
    : monthlyLeft > 0
      ? { aiSearchMonthlyCount: { increment: 1 } }
      : { aiSearchPackCount: { decrement: 1 } }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
    select: { aiSearchMonthlyCount: true, aiSearchPackCount: true },
  })
  const newLeft = Math.max(0, monthlyLimit - updated.aiSearchMonthlyCount)
  return NextResponse.json({ ok: true, remaining: newLeft, packCredits: updated.aiSearchPackCount, canSearch: newLeft > 0 || updated.aiSearchPackCount > 0 })
}
