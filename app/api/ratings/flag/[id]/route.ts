import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, forbidden, notFound, parsePositiveInt, serverError, unauthorized } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'

// POST /api/ratings/flag/[id]
// Lets the rated party flag a suspicious or retaliatory rating for admin review.
// Does NOT hide the rating — marks it so admins can inspect and act.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { id: rawId } = await Promise.resolve(params)
    const ratingId = parsePositiveInt(rawId)
    if (!ratingId) return badRequest('Invalid rating ID')

    let body: { reason?: string } = {}
    try { body = await request.json() } catch { /* reason is optional */ }

    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : null

    const rating = await prisma.rating.findUnique({
      where: { id: ratingId },
      select: {
        id: true, flagged: true, raterId: true,
        ratedUserId: true, ratedHomeId: true,
        ratedHome: { select: { ownerId: true } },
      },
    })
    if (!rating) return notFound('Rating not found')

    // Only the rated party can flag (ratedUser or the home owner)
    const isRatedUser = rating.ratedUserId === user.id
    const isHomeOwner = rating.ratedHome?.ownerId === user.id
    if (!isRatedUser && !isHomeOwner) {
      return forbidden('Only the rated party can flag a rating')
    }

    // Prevent the rater from flagging their own rating
    if (rating.raterId === user.id) {
      return forbidden('You cannot flag your own rating')
    }

    if (rating.flagged) {
      return NextResponse.json({ message: 'Already flagged' }, { status: 200 })
    }

    const updated = await prisma.rating.update({
      where: { id: ratingId },
      data: { flagged: true, flagReason: reason, flaggedAt: new Date() },
      select: { id: true, flagged: true, flaggedAt: true },
    })

    log.info({ ratingId, flaggedBy: user.id, reason }, 'Rating flagged for review')

    return NextResponse.json({ rating: updated }, { status: 200 })
  } catch (error) {
    log.error({ err: error }, 'Flag rating error')
    return serverError()
  }
}
