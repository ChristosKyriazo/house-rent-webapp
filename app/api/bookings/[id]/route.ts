import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH /api/bookings/[id] - Reschedule a booking (only for users, only if >24 hours away)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const bookingId = parseInt(resolvedParams.id)

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 })
    }

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        availability: {
          include: {
            home: {
              select: {
                key: true,
                id: true,
                ownerId: true,
              },
            },
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Both user and owner can reschedule
    if (booking.userId !== user.id && booking.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'Only the user or owner can reschedule this booking' },
        { status: 403 }
      )
    }

    // Check if booking is scheduled
    if (booking.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Only scheduled bookings can be rescheduled' },
        { status: 400 }
      )
    }

    // Check if booking is more than 24 hours away
    const now = new Date()
    const bookingStartTime = new Date(booking.startTime)
    const hoursUntilBooking = (bookingStartTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilBooking <= 24) {
      return NextResponse.json(
        { error: 'Bookings can only be rescheduled more than 24 hours in advance' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { availabilityId, startTime, endTime } = body

    if (!availabilityId || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: availabilityId, startTime, endTime' },
        { status: 400 }
      )
    }

    // Verify the new availability slot exists and is available
    const newAvailability = await prisma.availability.findUnique({
      where: { id: availabilityId },
      include: {
        home: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    })

    if (!newAvailability) {
      return NextResponse.json(
        { error: 'Availability slot not found' },
        { status: 404 }
      )
    }

    // Check if the specific time slot (not the entire availability range) is available
    // We need to check if there are any bookings that overlap with the requested startTime/endTime
    // Parse the availability time range to see if the requested time fits within it
    const requestedStart = new Date(startTime)
    const requestedEnd = new Date(endTime)
    
    // Check if the requested time overlaps with the availability time range
    const availabilityDate = new Date(newAvailability.date)
    const availDateOnly = new Date(availabilityDate.getFullYear(), availabilityDate.getMonth(), availabilityDate.getDate())
    const requestedDateOnly = new Date(requestedStart.getFullYear(), requestedStart.getMonth(), requestedStart.getDate())
    
    if (availDateOnly.getTime() !== requestedDateOnly.getTime()) {
      return NextResponse.json(
        { error: 'The selected time slot is not within the availability date' },
        { status: 400 }
      )
    }
    
    // Parse availability time range
    const [availStartHour, availStartMin] = newAvailability.startTime.split(':').map(Number)
    const [availEndHour, availEndMin] = newAvailability.endTime.split(':').map(Number)
    const availStartMinutes = availStartHour * 60 + availStartMin
    const availEndMinutes = availEndHour * 60 + availEndMin
    
    const requestedStartMinutes = requestedStart.getHours() * 60 + requestedStart.getMinutes()
    const requestedEndMinutes = requestedEnd.getHours() * 60 + requestedEnd.getMinutes()
    
    // Check if requested time is within availability range
    if (requestedStartMinutes < availStartMinutes || requestedEndMinutes > availEndMinutes) {
      return NextResponse.json(
        { error: 'The selected time slot is not within the availability time range' },
        { status: 400 }
      )
    }
    
    // Check if there are any bookings that overlap with this specific time slot
    // Check user's bookings separately from owner's bookings for clarity
    const userOverlappingBookings = await prisma.booking.findMany({
      where: {
        userId: booking.userId,
        status: 'scheduled',
        id: {
          not: bookingId, // Exclude the current booking
        },
        startTime: {
          lt: requestedEnd, // Existing booking starts before requested end
        },
        endTime: {
          gt: requestedStart, // Existing booking ends after requested start
        },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
      },
    })
    
    const ownerOverlappingBookings = await prisma.booking.findMany({
      where: {
        ownerId: booking.ownerId,
        status: 'scheduled',
        id: {
          not: bookingId, // Exclude the current booking
        },
        startTime: {
          lt: requestedEnd, // Existing booking starts before requested end
        },
        endTime: {
          gt: requestedStart, // Existing booking ends after requested start
        },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
      },
    })
    
    // Debug logging
    console.log('Reschedule conflict check:', {
      bookingId,
      requestedStart: requestedStart.toISOString(),
      requestedEnd: requestedEnd.toISOString(),
      userOverlappingCount: userOverlappingBookings.length,
      ownerOverlappingCount: ownerOverlappingBookings.length,
      userOverlapping: userOverlappingBookings.map(b => ({
        id: b.id,
        start: b.startTime,
        end: b.endTime,
      })),
      ownerOverlapping: ownerOverlappingBookings.map(b => ({
        id: b.id,
        start: b.startTime,
        end: b.endTime,
      })),
    })
    
    if (userOverlappingBookings.length > 0) {
      return NextResponse.json(
        { error: 'You already have an appointment at this time' },
        { status: 400 }
      )
    }
    
    if (ownerOverlappingBookings.length > 0) {
      return NextResponse.json(
        { error: 'The owner/broker already has an appointment at this time' },
        { status: 400 }
      )
    }

    // Verify it's for the same home
    if (!booking.availability?.home || newAvailability.homeId !== booking.availability.home.id) {
      return NextResponse.json(
        { error: 'Cannot reschedule to a different property' },
        { status: 400 }
      )
    }

    // Free up the old availability slot (if it exists)
    if (booking.availabilityId) {
      await prisma.availability.update({
        where: { id: booking.availabilityId },
        data: { isAvailable: true },
      })
    }

    // Mark new availability as booked
    await prisma.availability.update({
      where: { id: availabilityId },
      data: { isAvailable: false },
    })

    // Update the booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        availabilityId: availabilityId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
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
    })

    // Transform to include home at top level for easier access
    const transformedBooking = {
      ...updatedBooking,
      home: updatedBooking.availability?.home || null,
    }

    return NextResponse.json({ booking: transformedBooking }, { status: 200 })
  } catch (error) {
    console.error('Error rescheduling booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

