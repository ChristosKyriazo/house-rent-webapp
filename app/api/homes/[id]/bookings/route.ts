import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Get scheduled bookings for a specific home (for owners/brokers)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const homeKey = resolvedParams.id

    // Find the home
    const home = await prisma.home.findUnique({
      where: { key: homeKey },
      select: { id: true, ownerId: true },
    })

    if (!home) {
      return NextResponse.json({ error: 'Home not found' }, { status: 404 })
    }

    // Check if user is the owner or broker
    const userRole = (user.role || 'user').toLowerCase()
    const isOwner = user.id === home.ownerId || userRole === 'broker' || userRole === 'both'

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only owners and brokers can view bookings for this home' },
        { status: 403 }
      )
    }

    // Get all availabilities for this home
    const availabilities = await prisma.availability.findMany({
      where: {
        homeId: home.id,
      },
      select: {
        id: true,
      },
    })

    const availabilityIds = availabilities.map(a => a.id)

    if (availabilityIds.length === 0) {
      return NextResponse.json({ bookings: [] }, { status: 200 })
    }

    // Get all scheduled bookings for this home's availabilities
    const bookings = await prisma.booking.findMany({
      where: {
        status: 'scheduled',
        availabilityId: { in: availabilityIds },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            occupation: true,
          },
        },
        availability: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    // Transform bookings to include home info
    const transformedBookings = bookings
      .filter(booking => booking.availability !== null)
      .map(booking => ({
        id: booking.id,
        title: booking.title,
        description: booking.description,
        startTime: booking.startTime,
        endTime: booking.endTime,
        location: booking.location,
        status: booking.status,
        user: booking.user,
        date: booking.availability?.date,
        availabilityStartTime: booking.availability?.startTime,
        availabilityEndTime: booking.availability?.endTime,
      }))

    return NextResponse.json({ bookings: transformedBookings }, { status: 200 })
  } catch (error) {
    console.error('Error fetching bookings for home:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


