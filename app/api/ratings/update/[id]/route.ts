import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// PUT: Update an existing rating (for editing)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const ratingId = parseInt(resolvedParams.id)

    if (isNaN(ratingId)) {
      return NextResponse.json({ error: 'Invalid rating ID' }, { status: 400 })
    }

    const body = await request.json()
    const { score, comment } = body

    if (score === undefined && comment === undefined) {
      return NextResponse.json(
        { error: 'At least one field (score or comment) must be provided' },
        { status: 400 }
      )
    }

    if (score !== undefined && (score < 1 || score > 5)) {
      return NextResponse.json(
        { error: 'Score must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Check if rating exists and belongs to current user
    const existingRating = await prisma.rating.findUnique({
      where: { id: ratingId },
    })

    if (!existingRating) {
      return NextResponse.json({ error: 'Rating not found' }, { status: 404 })
    }

    if (existingRating.raterId !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own ratings' },
        { status: 403 }
      )
    }

    // Check if rating is within 1 week of creation
    const now = new Date()
    const ratingDate = new Date(existingRating.createdAt)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    if (ratingDate <= oneWeekAgo) {
      return NextResponse.json(
        { error: 'Rating can only be edited within 1 week of creation' },
        { status: 403 }
      )
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



