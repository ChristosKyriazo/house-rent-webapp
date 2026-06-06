import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, forbidden, notFound, parsePositiveInt, serverError, unauthorized } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'

// PUT: Update an existing rating (comment only, within 3 days of submission)
export async function PUT(
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

    const body = await request.json()
    const { comment } = body

    if (comment === undefined) return badRequest('comment is required')

    const existingRating = await prisma.rating.findUnique({ where: { id: ratingId } })
    if (!existingRating) return notFound('Rating not found')
    if (existingRating.raterId !== user.id) return forbidden('You can only edit your own ratings')

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    if (new Date(existingRating.createdAt) <= threeDaysAgo) {
      return forbidden('Ratings can only be edited within 3 days of submission')
    }

    const updatedRating = await prisma.rating.update({
      where: { id: ratingId },
      data: { comment: comment || null },
    })

    return NextResponse.json({ rating: updatedRating })
  } catch (error) {
    log.error({ err: error }, 'Update rating error')
    return serverError()
  }
}
