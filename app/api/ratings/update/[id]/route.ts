import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, forbidden, notFound, parsePositiveInt, serverError, unauthorized } from '@/lib/api-utils'

// PUT: Update an existing rating (for editing)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    const resolvedParams = await Promise.resolve(params)
    const ratingId = parsePositiveInt(resolvedParams.id)
    if (!ratingId) {
      return badRequest('Invalid rating ID')
    }

    const body = await request.json()
    const { score, comment } = body

    if (score === undefined && comment === undefined) {
      return badRequest('At least one field (score or comment) must be provided')
    }

    if (score !== undefined && (score < 1 || score > 5)) {
      return badRequest('Score must be between 1 and 5')
    }

    // Check if rating exists and belongs to current user
    const existingRating = await prisma.rating.findUnique({
      where: { id: ratingId },
    })

    if (!existingRating) {
      return notFound('Rating not found')
    }

    if (existingRating.raterId !== user.id) {
      return forbidden('You can only edit your own ratings')
    }

    // Check if rating is within 3 days of creation
    const now = new Date()
    const ratingDate = new Date(existingRating.createdAt)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    
    if (ratingDate <= threeDaysAgo) {
      return forbidden('Rating can only be edited within 3 days of creation')
    }

    // Update the rating
    const updatedRating = await prisma.rating.update({
      where: { id: ratingId },
      data: {
        ...(score !== undefined && { score }),
        ...(comment !== undefined && { comment: comment || null }),
      },
    })

    return NextResponse.json({ rating: updatedRating }, { status: 200 })
  } catch (error) {
    console.error('Update rating error:', error)
    return serverError()
  }
}









