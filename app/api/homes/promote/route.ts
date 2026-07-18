import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { badRequest, forbidden, notFound, serverError, unauthorized } from '@/lib/api-utils'
import { getSlotLimit, checkTier } from '@/lib/subscription'
import { requestLogger } from '@/lib/logger'
import { isChildBroker } from '@/lib/broker-hierarchy'

export async function POST(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const userRole = user.role || 'user'
    if (userRole !== 'owner' && userRole !== 'both' && userRole !== 'broker') {
      return forbidden('Only owners and brokers can promote listings')
    }

    const tierBlock = checkTier(user.subscriptionTier ?? 'free', 'plus')
    if (tierBlock) return tierBlock

    const body = await request.json()
    const { homeKey, mode } = body

    if (!homeKey || !['slot', 'boost'].includes(mode)) {
      return badRequest('homeKey and mode ("slot" | "boost") are required')
    }

    const home = await prisma.home.findUnique({
      where: { key: homeKey },
      select: { id: true, ownerId: true, slotPromoted: true, slotPromotedUntil: true, promotedUntil: true },
    })
    if (!home) return notFound('Home not found')
    if (home.ownerId !== user.id) return forbidden('You do not own this home')

    const tier = user.subscriptionTier ?? 'free'
    const now = new Date()

    if (mode === 'slot') {
      const isActive = home.slotPromoted && (!home.slotPromotedUntil || home.slotPromotedUntil > now)
      if (isActive) {
        // Toggle off — free up the slot
        await prisma.home.update({ where: { id: home.id }, data: { slotPromoted: false, slotPromotedUntil: null } })
        return NextResponse.json({ ok: true, slotPromoted: false })
      }

      // Check active (non-expired) slot count
      const slotLimit = getSlotLimit(tier)
      const slotsUsed = await prisma.home.count({
        where: {
          ownerId: user.id, slotPromoted: true,
          OR: [{ slotPromotedUntil: null }, { slotPromotedUntil: { gt: now } }],
        },
      })

      if (slotsUsed >= slotLimit) {
        return NextResponse.json(
          { error: 'no_slots_available', slotsUsed, slotLimit, message: 'All your promotion slots are in use.' },
          { status: 409 }
        )
      }

      // Set expiry: 7 days for Plus, 30 days for Pro
      const daysForTier = tier === 'pro' ? 30 : 7
      const slotPromotedUntil = new Date(Date.now() + daysForTier * 24 * 60 * 60 * 1000)
      await prisma.home.update({ where: { id: home.id }, data: { slotPromoted: true, slotPromotedUntil } })
      return NextResponse.json({ ok: true, slotPromoted: true, slotPromotedUntil: slotPromotedUntil.toISOString(), daysForTier })
    }

    // mode === 'boost' — Default (child) brokers cannot pay directly; they request from their Main broker.
    if (isChildBroker(user)) {
      return NextResponse.json(
        { error: 'boost_requires_team_approval', message: 'Boosts for your listings are paid by your team. Send a request from your listing instead.' },
        { status: 403 }
      )
    }

    // Standalone / Main brokers: pay-per-boost (requires payment integration)
    return NextResponse.json(
      { error: 'payment_required', message: 'Listing boosts require payment. Payment integration coming soon.' },
      { status: 503 }
    )

  } catch (error) {
    log.error({ err: error }, 'Error promoting home')
    return serverError()
  }
}
