import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { badRequest, forbidden, notFound, serverError, unauthorized } from '@/lib/api-utils'
import { getSlotLimit, checkTier } from '@/lib/subscription'
import { requestLogger } from '@/lib/logger'

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
      select: { id: true, ownerId: true, slotPromoted: true, promotedUntil: true },
    })
    if (!home) return notFound('Home not found')
    if (home.ownerId !== user.id) return forbidden('You do not own this home')

    const tier = user.subscriptionTier ?? 'free'

    if (mode === 'slot') {
      if (home.slotPromoted) {
        // Toggle off — free up the slot
        await prisma.home.update({ where: { id: home.id }, data: { slotPromoted: false } })
        return NextResponse.json({ ok: true, slotPromoted: false })
      }

      // Check slot availability
      const slotLimit = getSlotLimit(tier)
      const slotsUsed = await prisma.home.count({
        where: { ownerId: user.id, slotPromoted: true },
      })

      if (slotsUsed >= slotLimit) {
        return NextResponse.json(
          { error: 'no_slots_available', slotsUsed, slotLimit, message: 'All your promotion slots are in use.' },
          { status: 409 }
        )
      }

      await prisma.home.update({ where: { id: home.id }, data: { slotPromoted: true } })
      return NextResponse.json({ ok: true, slotPromoted: true })
    }

    // mode === 'boost' — pay-per-boost (€4.99 / 30 days)
    // TODO: gate behind Stripe payment before setting promotedUntil
    const promotedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await prisma.home.update({ where: { id: home.id }, data: { promotedUntil } })
    return NextResponse.json({ ok: true, promotedUntil: promotedUntil.toISOString() })

  } catch (error) {
    log.error({ err: error }, 'Error promoting home')
    return serverError()
  }
}
