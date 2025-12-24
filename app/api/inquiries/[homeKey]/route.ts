import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getUserRatings } from '@/lib/ratings'

// GET: Get all inquiries for a specific home (only for the owner)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ homeKey: string }> | { homeKey: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an owner
    const userRole = user.role || 'user'
    if (userRole !== 'owner' && userRole !== 'both') {
      return NextResponse.json(
        { error: 'Only owners can view inquiries' },
        { status: 403 }
      )
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
      return NextResponse.json({ error: 'Home not found' }, { status: 404 })
    }

    if (home.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to view inquiries for this home' },
        { status: 403 }
      )
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
            rating: ratings.renterRating, // Use renter rating for users who inquire
          },
          approved: inquiry.approved,
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

