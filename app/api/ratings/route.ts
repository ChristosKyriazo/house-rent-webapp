import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, forbidden, serverError, unauthorized, validateBody } from '@/lib/api-utils'
import { createRatingSchema } from '@/lib/schemas'
import { requestLogger } from '@/lib/logger'
import { hasRatedBooking, hasRatedFinalization } from '@/lib/ratings'

export async function POST(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const rawBody = await request.json()
    const { data: body, error: validationError } = validateBody(createRatingSchema, rawBody)
    if (validationError) return validationError

    const type = body.type

    // ── Viewing: tenant rates broker ────────────────────────────────────────
    if (type === 'viewing_broker') {
      const booking = await prisma.booking.findFirst({
        where: { id: body.bookingId, userId: user.id, status: { not: 'cancelled' } },
        include: { home: { select: { owner: { select: { id: true, role: true } } } } },
      })
      if (!booking) return forbidden('No valid booking found')
      if (booking.home?.owner.role !== 'broker') return forbidden('Listing is not managed by a broker')
      if (booking.ownerId !== body.ratedUserId) return forbidden('You can only rate the broker on this booking')
      if (await hasRatedBooking(user.id, body.bookingId, 'viewing_broker')) {
        return forbidden('You have already rated this broker for this booking')
      }
      const rating = await prisma.rating.create({
        data: { type, raterId: user.id, ratedUserId: body.ratedUserId, bookingId: body.bookingId, scores: body.scores, comment: body.comment ?? null },
      })
      return NextResponse.json({ rating }, { status: 201 })
    }

    // ── Viewing: owner/broker rates tenant ──────────────────────────────────
    if (type === 'viewing_tenant') {
      const booking = await prisma.booking.findFirst({
        where: { id: body.bookingId, ownerId: user.id, userId: body.ratedUserId, status: { not: 'cancelled' } },
      })
      if (!booking) return forbidden('No valid booking found for this tenant')
      if (await hasRatedBooking(user.id, body.bookingId, 'viewing_tenant')) {
        return forbidden('You have already rated this tenant for this booking')
      }
      const rating = await prisma.rating.create({
        data: { type, raterId: user.id, ratedUserId: body.ratedUserId, bookingId: body.bookingId, scores: body.scores, comment: body.comment ?? null },
      })
      return NextResponse.json({ rating }, { status: 201 })
    }

    // ── Move-in: tenant rates house ─────────────────────────────────────────
    if (type === 'movein_house') {
      const fin = await prisma.finalization.findFirst({
        where: { id: body.finalizationId, tenantId: user.id, status: 'confirmed' },
      })
      if (!fin) return forbidden('No confirmed finalization found')
      if (fin.homeId !== body.ratedHomeId) return forbidden('Home does not match finalization')
      if (await hasRatedFinalization(user.id, body.finalizationId, 'movein_house')) {
        return forbidden('You have already submitted a move-in rating for this finalization')
      }
      const rating = await prisma.rating.create({
        data: { type, raterId: user.id, ratedHomeId: body.ratedHomeId, finalizationId: body.finalizationId, scores: body.scores, comment: body.comment ?? null },
      })
      return NextResponse.json({ rating }, { status: 201 })
    }

    // ── Move-out: tenant rates house ────────────────────────────────────────
    if (type === 'moveout_house') {
      const fin = await prisma.finalization.findFirst({
        where: { id: body.finalizationId, tenantId: user.id, status: 'confirmed' },
      })
      if (!fin) return forbidden('No confirmed finalization found')
      if (fin.homeId !== body.ratedHomeId) return forbidden('Home does not match finalization')
      if (await hasRatedFinalization(user.id, body.finalizationId, 'moveout_house')) {
        return forbidden('You have already submitted a move-out rating for this finalization')
      }
      const rating = await prisma.rating.create({
        data: { type, raterId: user.id, ratedHomeId: body.ratedHomeId, finalizationId: body.finalizationId, scores: body.scores, comment: body.comment ?? null },
      })
      return NextResponse.json({ rating }, { status: 201 })
    }

    // ── Move-out: owner rates tenant ────────────────────────────────────────
    if (type === 'moveout_tenant') {
      const fin = await prisma.finalization.findFirst({
        where: { id: body.finalizationId, landlordId: user.id, tenantId: body.ratedUserId, status: 'confirmed' },
      })
      if (!fin) return forbidden('No confirmed finalization found')
      if (await hasRatedFinalization(user.id, body.finalizationId, 'moveout_tenant')) {
        return forbidden('You have already rated this tenant for this finalization')
      }
      const rating = await prisma.rating.create({
        data: { type, raterId: user.id, ratedUserId: body.ratedUserId, finalizationId: body.finalizationId, scores: body.scores, comment: body.comment ?? null },
      })
      return NextResponse.json({ rating }, { status: 201 })
    }

    return badRequest('Unknown rating type')
  } catch (error) {
    log.error({ err: error }, 'Create rating error')
    return serverError()
  }
}
