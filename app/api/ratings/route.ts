import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, forbidden, parsePositiveInt, serverError, unauthorized } from '@/lib/api-utils'

// GET: Get ratings for current user or a specific user by userId query param
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userIdParam = searchParams.get('userId')

    let targetUserId: number
    if (userIdParam) {
      // Fetch ratings for specific user (public view)
      const parsedUserId = parsePositiveInt(userIdParam)
      if (!parsedUserId) {
        return badRequest('Invalid user ID')
      }
      targetUserId = parsedUserId
    } else {
      // Get current user's ratings (requires authentication)
      const user = await getCurrentUser()
      if (!user) {
        return unauthorized()
      }
      targetUserId = user.id
    }

    const { getUserRatings } = await import('@/lib/ratings')
    const ratings = await getUserRatings(targetUserId)
    return NextResponse.json({ ratings }, { status: 200 })
  } catch (error) {
    console.error('Get ratings error:', error)
    return serverError()
  }
}

// POST: Create or update a rating
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    const body = await request.json()
    const { ratedUserId, type, score, comment } = body
    const parsedRatedUserId = parsePositiveInt(ratedUserId)

    if (!parsedRatedUserId || !type || score === undefined) {
      return badRequest('ratedUserId, type, and score are required')
    }

    if (score < 1 || score > 5) {
      return badRequest('Score must be between 1 and 5')
    }

    if (type !== 'owner' && type !== 'renter') {
      return badRequest('Type must be "owner" or "renter"')
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
            ownerId: parsedRatedUserId,
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
          userId: parsedRatedUserId,
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
      return forbidden('Cannot rate this user. A completed meeting is required.')
    }

    // Additional check for brokers: they can only rate once per user
    // Owners can rate multiple times (even after finalization)
    const userRole = (user.role || 'user').toLowerCase()
    if (type === 'renter' && userRole === 'broker') {
      // Check if this broker has already rated this user
      const existingRating = await prisma.rating.findFirst({
        where: {
          raterId: user.id,
          ratedUserId: parsedRatedUserId,
          type: 'renter',
        },
      })
      
      if (existingRating) {
        return forbidden('Brokers can only rate a user once.')
      }
    }
    // Note: Users with role "both" (owner and broker) are treated as owners and can rate multiple times

    // Always create a new rating (allow multiple ratings between same users)
    // Note: This requires removing the unique constraint from the schema
    const rating = await prisma.rating.create({
      data: {
        raterId: user.id,
        ratedUserId: parsedRatedUserId,
        type: type,
        score: score,
        comment: comment || null,
      },
    })

    return NextResponse.json({ rating }, { status: 200 })
  } catch (error) {
    console.error('Create rating error:', error)
    return serverError()
  }
}
