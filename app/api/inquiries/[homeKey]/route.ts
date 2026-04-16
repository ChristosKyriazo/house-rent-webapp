import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getUserRatings } from '@/lib/ratings'
import { forbidden, notFound, serverError, unauthorized } from '@/lib/api-utils'

// GET: Get all inquiries for a specific home (only for the owner)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ homeKey: string }> | { homeKey: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    // Check if user is an owner (brokers are treated like owners)
    const userRole = user.role || 'user'
    if (userRole !== 'owner' && userRole !== 'both' && userRole !== 'broker') {
      return forbidden('Only owners and brokers can view inquiries')
    }

    const resolvedParams = await Promise.resolve(params)
    const homeKey = resolvedParams.homeKey

    // Find the home and verify ownership
    const home = await prisma.home.findFirst({
      where: {
        OR: [
          { key: homeKey },
          { id: isNaN(Number(homeKey)) ? -1 : Number(homeKey) }
        ]
      },
      select: {
        id: true,
        key: true,
        title: true,
        street: true,
        city: true,
        country: true,
        ownerId: true,
      },
    })

    if (!home) {
      return notFound('Home not found')
    }

    if (home.ownerId !== user.id) {
      return forbidden('Not authorized to view inquiries for this home')
    }

    // Get all inquiries for this home, ordered by creation date (oldest first)
    // Include both approved and unapproved inquiries
    const inquiries = await prisma.inquiry.findMany({
      where: {
        homeId: home.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // Oldest first
      },
    })

    // Get ratings for each user
    const inquiriesWithRatings = await Promise.all(
      inquiries.map(async (inquiry) => {
        const ratings = await getUserRatings(inquiry.user.id)
        return {
          id: inquiry.id,
          key: inquiry.key,
          user: {
            id: inquiry.user.id,
            name: inquiry.user.name,
            email: inquiry.user.email,
            role: inquiry.user.role,
            rating: ratings.renterRating, // Use renter rating for users who inquire (null if not rated)
          },
          approved: inquiry.approved,
          dismissed: inquiry.dismissed,
          contactInfo: inquiry.contactInfo,
          createdAt: inquiry.createdAt,
        }
      })
    )

    return NextResponse.json(
      {
        home: {
          id: home.id,
          key: home.key,
          title: home.title,
          street: home.street,
          city: home.city,
          country: home.country,
        },
        inquiries: inquiriesWithRatings,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get home inquiries error:', error)
    return serverError()
  }
}

