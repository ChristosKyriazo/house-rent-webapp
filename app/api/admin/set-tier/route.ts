import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const VALID_TIERS = ['free', 'plus', 'pro'] as const
type Tier = (typeof VALID_TIERS)[number]

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { userEmail?: string; tier?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { userEmail, tier } = body
  if (!userEmail || !tier) {
    return NextResponse.json({ error: 'userEmail and tier are required' }, { status: 400 })
  }
  if (!VALID_TIERS.includes(tier as Tier)) {
    return NextResponse.json({ error: `tier must be one of: ${VALID_TIERS.join(', ')}` }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { email: userEmail },
    data: { subscriptionTier: tier },
    select: { email: true, subscriptionTier: true },
  })

  return NextResponse.json({ ok: true, user })
}
