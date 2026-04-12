import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

type RatingRow = Awaited<ReturnType<typeof prisma.rating.findMany>>[number]
type HomeRating = RatingRow & {
  inquiryId: number
  homeKey: string
  homeTitle: string
  ratingType: 'owner' | 'renter'
  isBrokerOwned?: boolean
}

// GET: Get all ratings for a specific house
// Returns ratings made by both owner and user for finalized inquiries on this home
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ homeKey: string }> | { homeKey: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const homeKey = resolvedParams.homeKey

    // Find the home
    const home = await prisma.home.findUnique({
      where: { key: homeKey },
      select: {
        id: true,
        key: true,
        title: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    })

    if (!home) {
      return NextResponse.json({ error: 'Home not found' }, { status: 404 })
    }

    // Get all finalized inquiries for this home
    const finalizedInquiries = await prisma.inquiry.findMany({
      where: {
        homeId: home.id,
        finalized: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        home: {
          select: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // Get all ratings between the owner and users for this home
    // Fetch ALL ratings (not just the first one) to show re-ratings
    const ratings: HomeRating[] = []
    for (const inquiry of finalizedInquiries) {
      // Get all ratings from user to owner
      const userToOwnerRatings = await prisma.rating.findMany({
        where: {
          raterId: inquiry.user.id,
          ratedUserId: inquiry.home.owner.id,
          type: 'owner',
        },
        include: {
          rater: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          ratedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc', // Most recent first
        },
      })

      // Get all ratings from owner to user (owner rates user/renter, so type is 'renter')
      const ownerToUserRatings = await prisma.rating.findMany({
        where: {
          raterId: inquiry.home.owner.id,
          ratedUserId: inquiry.user.id,
          type: 'renter',
        },
        include: {
          rater: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          ratedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc', // Most recent first
        },
      })

      // Add all user-to-owner ratings
      // If owner is a broker, don't include broker info (ratings are for the house, not the broker)
      userToOwnerRatings.forEach(rating => {
        ratings.push({
          ...rating,
          inquiryId: inquiry.id,
          homeKey: home.key,
          homeTitle: home.title,
          ratingType: 'owner', // User rates owner (for reference)
          isBrokerOwned: home.owner.role === 'broker', // Flag to indicate if house is broker-owned
        })
      })

      // Add all owner-to-user ratings
      ownerToUserRatings.forEach(rating => {
        ratings.push({
          ...rating,
          inquiryId: inquiry.id,
          homeKey: home.key,
          homeTitle: home.title,
          ratingType: 'renter', // Owner rates renter (for reference)
        })
      })
    }
    
    // Sort all ratings by creation date (most recent first)
    ratings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ ratings }, { status: 200 })
  } catch (error) {
    console.error('Get home ratings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

