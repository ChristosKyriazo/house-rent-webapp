import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { unauthorized, badRequest } from '@/lib/api-utils'

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

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionTier: tier },
    select: { email: true, subscriptionTier: true },
  })

  return NextResponse.json({ ok: true, user: updated })
}
