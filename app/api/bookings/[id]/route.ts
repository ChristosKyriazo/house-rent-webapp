import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findBookingConflicts } from '@/lib/booking-conflicts'
import { badRequest, forbidden, notFound, parsePositiveInt, parseValidDate, serverError, unauthorized } from '@/lib/api-utils'

// PATCH /api/bookings/[id] - Reschedule a booking (only for users, only if >24 hours away)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    const resolvedParams = await Promise.resolve(params)
    const bookingId = parsePositiveInt(resolvedParams.id)
    if (!bookingId) {
      return badRequest('Invalid booking ID')
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
      return notFound('Booking not found')
    }

    // Both user and owner can reschedule
    if (booking.userId !== user.id && booking.ownerId !== user.id) {
      return forbidden('Only the user or owner can reschedule this booking')
    }

    // Check if booking is scheduled
    if (booking.status !== 'scheduled') {
      return badRequest('Only scheduled bookings can be rescheduled')
    }

    // Check if booking is more than 24 hours away
    const now = new Date()
    const bookingStartTime = new Date(booking.startTime)
    const hoursUntilBooking = (bookingStartTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilBooking <= 24) {
      return badRequest('Bookings can only be rescheduled more than 24 hours in advance')
    }

    const body = await request.json()
    const { availabilityId, startTime, endTime } = body

    const parsedAvailabilityId = parsePositiveInt(availabilityId)
    const requestedStart = parseValidDate(startTime)
    const requestedEnd = parseValidDate(endTime)

    if (!parsedAvailabilityId || !requestedStart || !requestedEnd || requestedEnd <= requestedStart) {
      return badRequest('Missing or invalid required fields: availabilityId, startTime, endTime')
    }

    // Verify the new availability slot exists and is available
    const newAvailability = await prisma.availability.findUnique({
      where: { id: parsedAvailabilityId },
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
      return notFound('Availability slot not found')
    }

    // Check if the specific time slot (not the entire availability range) is available
    // We need to check if there are any bookings that overlap with the requested startTime/endTime
    // Parse the availability time range to see if the requested time fits within it
    // Check if the requested time overlaps with the availability time range
    const availabilityDate = new Date(newAvailability.date)
    const availDateOnly = new Date(availabilityDate.getFullYear(), availabilityDate.getMonth(), availabilityDate.getDate())
    const requestedDateOnly = new Date(requestedStart.getFullYear(), requestedStart.getMonth(), requestedStart.getDate())
    
    if (availDateOnly.getTime() !== requestedDateOnly.getTime()) {
      return badRequest('The selected time slot is not within the availability date')
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
      return badRequest('The selected time slot is not within the availability time range')
    }

    // Verify it's for the same home
    if (!booking.availability?.home || newAvailability.homeId !== booking.availability.home.id) {
      return badRequest('Cannot reschedule to a different property')
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const conflictState = await findBookingConflicts({
        tx,
        userId: booking.userId,
        ownerId: booking.ownerId,
        startTime: requestedStart,
        endTime: requestedEnd,
        excludeBookingId: bookingId,
      })

      if (conflictState.userHasConflict) {
        throw new Error('USER_CONFLICT')
      }
      if (conflictState.ownerHasConflict) {
        throw new Error('OWNER_CONFLICT')
      }

      if (booking.availabilityId) {
        await tx.availability.update({
          where: { id: booking.availabilityId },
          data: { isAvailable: true },
        })
      }

      await tx.availability.update({
        where: { id: parsedAvailabilityId },
        data: { isAvailable: false },
      })

      return tx.booking.update({
        where: { id: bookingId },
        data: {
          availabilityId: parsedAvailabilityId,
          startTime: requestedStart,
          endTime: requestedEnd,
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
    })

    // Transform to include home at top level for easier access
    const transformedBooking = {
      ...updatedBooking,
      home: updatedBooking.availability?.home || null,
    }

    return NextResponse.json({ booking: transformedBooking }, { status: 200 })
  } catch (error) {
    if (error instanceof Error && error.message === 'USER_CONFLICT') {
      return badRequest('You already have an appointment at this time')
    }
    if (error instanceof Error && error.message === 'OWNER_CONFLICT') {
      return badRequest('The owner/broker already has an appointment at this time')
    }
    console.error('Error rescheduling booking:', error)
    return serverError()
  }
}

// DELETE /api/bookings/[id] - Cancel a booking (only if meeting hasn't started)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    const resolvedParams = await Promise.resolve(params)
    const bookingId = parsePositiveInt(resolvedParams.id)
    if (!bookingId) {
      return badRequest('Invalid booking ID')
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
      return notFound('Booking not found')
    }

    // Verify user is either the owner or the user who booked
    if (booking.userId !== user.id && booking.ownerId !== user.id) {
      return forbidden('Only the user or owner can cancel this booking')
    }

    // Check if booking is scheduled
    if (booking.status !== 'scheduled') {
      return badRequest('Only scheduled bookings can be cancelled')
    }

    // Check if meeting has already started - cannot cancel after meeting starts
    const now = new Date()
    const bookingStartTime = new Date(booking.startTime)
    
    if (bookingStartTime <= now) {
      return badRequest('Cannot cancel a meeting that has already started')
    }

    // Free up the availability slot if it exists
    if (booking.availabilityId) {
      await prisma.availability.update({
        where: { id: booking.availabilityId },
        data: { isAvailable: true },
      })
    }

    // Update booking status to cancelled
    const cancelledBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
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
      ...cancelledBooking,
      home: cancelledBooking.availability?.home || null,
    }

    return NextResponse.json({ booking: transformedBooking }, { status: 200 })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return serverError()
  }
}

