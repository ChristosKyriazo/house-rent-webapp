import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { serverError, unauthorized } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'

// GET: Returns all pending rating actions for the current user
// Covers:
//   - viewing ratings (booking completed, not yet rated)
//   - move-in house rating (3 days after moveInDate, not yet rated)
//   - move-out house + mutual ratings (moveOutDate passed OR manually triggered, not yet rated)
export async function GET(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const now = new Date()
    const pending: Array<{
      actionType: string
      finalizationId?: number
      bookingId?: number
      ratedUserId?: number
      ratedHomeId?: number
      homeKey: string
      homeTitle: string
      counterpartName: string | null
      dueDate?: string
    }> = []

    // ── Viewing ratings pending ──────────────────────────────────────────────
    // Bookings that completed where user hasn't yet rated the other party
    const completedBookings = await prisma.booking.findMany({
      where: {
        OR: [{ userId: user.id }, { ownerId: user.id }],
        status: { in: ['scheduled', 'completed'] },
        endTime: { lt: now },
      },
      include: {
        home: { select: { key: true, title: true, titleGreek: true, owner: { select: { id: true, role: true, name: true } } } },
        user: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, role: true } },
        ratings: { where: { raterId: user.id } },
      },
    })

    for (const booking of completedBookings) {
      if (!booking.home) continue
      const isTenant = booking.userId === user.id
      const isOwnerOrBroker = booking.ownerId === user.id

      if (isTenant && booking.home.owner.role === 'broker') {
        const alreadyRated = booking.ratings.some(r => r.type === 'viewing_broker')
        if (!alreadyRated) {
          pending.push({
            actionType: 'viewing_broker',
            bookingId: booking.id,
            ratedUserId: booking.ownerId,
            homeKey: booking.home.key,
            homeTitle: booking.home.title,
            counterpartName: booking.owner.name,
          })
        }
      }

      if (isOwnerOrBroker) {
        const alreadyRated = booking.ratings.some(r => r.type === 'viewing_tenant')
        if (!alreadyRated) {
          pending.push({
            actionType: 'viewing_tenant',
            bookingId: booking.id,
            ratedUserId: booking.userId,
            homeKey: booking.home.key,
            homeTitle: booking.home.title,
            counterpartName: booking.user.name,
          })
        }
      }
    }

    // ── Finalization-based ratings pending ───────────────────────────────────
    const finalizations = await prisma.finalization.findMany({
      where: {
        status: 'confirmed',
        OR: [{ tenantId: user.id }, { landlordId: user.id }],
      },
      include: {
        home: { select: { key: true, title: true, titleGreek: true } },
        landlord: { select: { id: true, name: true } },
        tenant: { select: { id: true, name: true } },
        ratings: { where: { raterId: user.id } },
      },
    })

    for (const fin of finalizations) {
      const isTenant = fin.tenantId === user.id
      const isLandlord = fin.landlordId === user.id

      const moveInPlus3 = new Date(fin.moveInDate)
      moveInPlus3.setDate(moveInPlus3.getDate() + 3)

      if (isTenant && now >= moveInPlus3) {
        const alreadyRated = fin.ratings.some(r => r.type === 'movein_house')
        if (!alreadyRated) {
          pending.push({
            actionType: 'movein_house',
            finalizationId: fin.id,
            ratedHomeId: fin.homeId,
            homeKey: fin.home.key,
            homeTitle: fin.home.title,
            counterpartName: fin.landlord.name,
            dueDate: moveInPlus3.toISOString(),
          })
        }
      }

      if (fin.moveOutDate && now >= fin.moveOutDate) {
        if (isTenant) {
          const alreadyRated = fin.ratings.some(r => r.type === 'moveout_house')
          if (!alreadyRated) {
            pending.push({
              actionType: 'moveout_house',
              finalizationId: fin.id,
              ratedHomeId: fin.homeId,
              homeKey: fin.home.key,
              homeTitle: fin.home.title,
              counterpartName: fin.landlord.name,
              dueDate: fin.moveOutDate.toISOString(),
            })
          }
        }

        if (isLandlord) {
          const alreadyRated = fin.ratings.some(r => r.type === 'moveout_tenant')
          if (!alreadyRated) {
            pending.push({
              actionType: 'moveout_tenant',
              finalizationId: fin.id,
              ratedUserId: fin.tenantId,
              homeKey: fin.home.key,
              homeTitle: fin.home.title,
              counterpartName: fin.tenant.name,
              dueDate: fin.moveOutDate.toISOString(),
            })
          }
        }
      }
    }

    return NextResponse.json({ pending })
  } catch (error) {
    log.error({ err: error }, 'Get pending ratings error')
    return serverError()
  }
}
