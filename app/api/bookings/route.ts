import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/bookings - Get all bookings for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { userId: user.id }, // Bookings where user is the attendee
          { ownerId: user.id }, // Bookings where user is the owner
        ],
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            occupation: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            occupation: true,
          },
        },
        availability: {
          include: {
            home: {
              select: {
                key: true,
                title: true,
                street: true,
                city: true,
                country: true,
              },
            },
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    // Transform bookings to include home at the top level for easier access
    const transformedBookings = bookings.map(booking => ({
      ...booking,
      home: booking.availability?.home || null,
    }))


    return NextResponse.json({ bookings: transformedBookings }, { status: 200 })
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/bookings - Create a new booking
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ownerId, inquiryId, availabilityId, title, description, startTime, endTime, location } = body

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // If availabilityId is provided, get ownerId from the availability
    let finalOwnerId = ownerId
    if (availabilityId && !ownerId) {
      const availability = await prisma.availability.findUnique({
        where: { id: availabilityId },
        include: { home: { select: { ownerId: true } } },
      })
      if (availability) {
        finalOwnerId = availability.home.ownerId
      }
    }

    if (!finalOwnerId) {
      return NextResponse.json(
        { error: 'Owner ID is required' },
        { status: 400 }
      )
    }

    // Check for existing bookings that overlap with this time slot
    // Check for user's existing bookings
    const userExistingBookings = await prisma.booking.findMany({
      where: {
        userId: user.id,
        status: 'scheduled',
        startTime: {
          lt: new Date(endTime), // Existing booking starts before new booking ends
        },
        endTime: {
          gt: new Date(startTime), // Existing booking ends after new booking starts
        },
      },
    })

    // Check for owner's existing bookings
    const ownerExistingBookings = await prisma.booking.findMany({
      where: {
        ownerId: finalOwnerId,
        status: 'scheduled',
        startTime: {
          lt: new Date(endTime), // Existing booking starts before new booking ends
        },
        endTime: {
          gt: new Date(startTime), // Existing booking ends after new booking starts
        },
      },
    })

    if (userExistingBookings.length > 0) {
      return NextResponse.json(
        { error: 'You already have an appointment at this time' },
        { status: 400 }
      )
    }

    if (ownerExistingBookings.length > 0) {
      return NextResponse.json(
        { error: 'The owner/broker already has an appointment at this time' },
        { status: 400 }
      )
    }

    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        ownerId: finalOwnerId,
        inquiryId: inquiryId || null,
        availabilityId: availabilityId || null,
        title,
        description: description || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location: location || null,
        status: 'scheduled',
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ booking }, { status: 201 })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

