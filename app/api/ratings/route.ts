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

    // Verify that there's a relationship between these users
    // For owner/broker rating renter: check if there's a booking that has passed (startTime < now)
    // For user rating owner: check if user has finalized inquiry with this owner
    let canRate = false
    let booking = null
    
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
      canRate = !!inquiry
    } else {
      // Owner/broker is rating renter - check if there's a booking that has passed
      // We check for bookings where:
      // - ownerId is the current user (owner/broker)
      // - userId is the rated user
      // - startTime has passed (meeting has started/passed)
      const now = new Date()
      booking = await prisma.booking.findFirst({
        where: {
          ownerId: user.id,
          userId: parseInt(ratedUserId),
          startTime: {
            lt: now, // Meeting has started/passed
          },
        },
        orderBy: {
          startTime: 'desc', // Get the most recent meeting
        },
      })
      canRate = !!booking
    }

    if (!canRate) {
      return NextResponse.json(
        { error: 'Cannot rate this user. A completed meeting is required.' },
        { status: 403 }
      )
    }

    // Additional check for brokers: they can only rate once per user
    // Owners can rate multiple times (even after finalization)
    const userRole = (user.role || 'user').toLowerCase()
    if (type === 'renter' && userRole === 'broker') {
      // Check if this broker has already rated this user
      const existingRating = await prisma.rating.findFirst({
        where: {
          raterId: user.id,
          ratedUserId: parseInt(ratedUserId),
          type: 'renter',
        },
      })
      
      if (existingRating) {
        return NextResponse.json(
          { error: 'Brokers can only rate a user once.' },
          { status: 403 }
        )
      }
    }
    // Note: Users with role "both" (owner and broker) are treated as owners and can rate multiple times

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
