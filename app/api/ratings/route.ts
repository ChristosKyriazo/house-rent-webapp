import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET: Get ratings for current user or a specific user by userId query param
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userIdParam = searchParams.get('userId')

    let targetUserId: number
    if (userIdParam) {
      // Fetch ratings for specific user (public view)
      targetUserId = parseInt(userIdParam)
      if (isNaN(targetUserId)) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
      }
    } else {
      // Get current user's ratings (requires authentication)
      const user = await getCurrentUser()
      if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }
      targetUserId = user.id
    }

    const { getUserRatings } = await import('@/lib/ratings')
    const ratings = await getUserRatings(targetUserId)
    return NextResponse.json({ ratings }, { status: 200 })
  } catch (error) {
    console.error('Get ratings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create or update a rating
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ratedUserId, type, score, comment } = body

    if (!ratedUserId || !type || score === undefined) {
      return NextResponse.json(
        { error: 'ratedUserId, type, and score are required' },
        { status: 400 }
      )
    }

    if (score < 1 || score > 5) {
      return NextResponse.json(
        { error: 'Score must be between 1 and 5' },
        { status: 400 }
      )
    }

    if (type !== 'owner' && type !== 'renter') {
      return NextResponse.json(
        { error: 'Type must be "owner" or "renter"' },
        { status: 400 }
      )
    }

    // Verify that there's a finalized inquiry between these users
    // For owner rating renter: find finalized inquiry where owner is rater and user is rated
    // For user rating owner: find finalized inquiry where user is rater and owner is rated
    let inquiryExists = false
    if (type === 'owner') {
      // User is rating owner - check if user has finalized inquiry with this owner
      const inquiry = await prisma.inquiry.findFirst({
        where: {
          userId: user.id,
          home: {
            ownerId: parseInt(ratedUserId),
          },
          finalized: true,
        },
      })
      inquiryExists = !!inquiry
    } else {
      // Owner is rating renter - check if owner has finalized inquiry with this user
      const inquiry = await prisma.inquiry.findFirst({
        where: {
          userId: parseInt(ratedUserId),
          home: {
            ownerId: user.id,
          },
          finalized: true,
        },
      })
      inquiryExists = !!inquiry
    }

    if (!inquiryExists) {
      return NextResponse.json(
        { error: 'No finalized inquiry found between these users' },
        { status: 403 }
      )
    }

    // Always create a new rating (allow multiple ratings between same users)
    // Note: This requires removing the unique constraint from the schema
    const rating = await prisma.rating.create({
      data: {
        raterId: user.id,
        ratedUserId: parseInt(ratedUserId),
        type: type,
        score: score,
        comment: comment || null,
      },
    })

    return NextResponse.json({ rating }, { status: 200 })
  } catch (error) {
    console.error('Create rating error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
