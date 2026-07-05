import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findBookingConflicts } from '@/lib/booking-conflicts'
import { badRequest, parsePositiveInt, parseValidDate, serverError, unauthorized, validateBody } from '@/lib/api-utils'
import { createBookingSchema } from '@/lib/schemas'
import { requestLogger } from '@/lib/logger'
import { features } from '@/lib/features'

// GET /api/bookings - Get all bookings for the current user
export async function GET(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    const searchParams = request.nextUrl.searchParams
    const inquiryIdParam = searchParams.get('inquiryId')

    // When filtering by inquiry (approved listings → slot picker), return bookings directly.
    // Include bookings with inquiryId set, plus "orphan" rows (inquiryId null) that still belong to this
    // inquiry's home or user↔owner pair — e.g. booked without ?inquiryId= or availability row removed.
    if (inquiryIdParam) {
      const inquiryId = parseInt(inquiryIdParam, 10)
      if (!isNaN(inquiryId)) {
        const bookingInclude = {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              occupation: true,
              role: true,
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
                  titleGreek: true,
                  street: true,
                  streetGreek: true,
                  city: true,
                  country: true,
                },
              },
            },
          },
        } as const

        const inquiryRow = await prisma.inquiry.findUnique({
          where: { id: inquiryId },
          select: {
            id: true,
            userId: true,
            homeId: true,
            home: {
              select: {
                ownerId: true,
                key: true,
                title: true,
                titleGreek: true,
                street: true,
                streetGreek: true,
                city: true,
                country: true,
              },
            },
          },
        })
        const fallbackHome = inquiryRow?.home ?? null

        const access = [{ userId: user.id }, { ownerId: user.id }] as const

        const [directRows, homeOrphans] = await Promise.all([
          prisma.booking.findMany({
            where: {
              inquiryId,
              OR: [...access],
            },
            include: bookingInclude,
            orderBy: { startTime: 'asc' },
          }),
          inquiryRow
            ? prisma.booking.findMany({
                where: {
                  inquiryId: null,
                  OR: [...access],
                  NOT: { status: 'cancelled' },
                  availability: { homeId: inquiryRow.homeId },
                },
                include: bookingInclude,
                orderBy: { startTime: 'asc' },
              })
            : Promise.resolve([]),
        ])

        const byId = new Map<number, (typeof directRows)[0]>()
        for (const b of directRows) byId.set(b.id, b)
        for (const b of homeOrphans) {
          if (!byId.has(b.id)) byId.set(b.id, b)
        }

        const merged = [...byId.values()].sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )

        const transformedBookings = merged.map((booking) => ({
          ...booking,
          home: booking.availability?.home ?? fallbackHome,
          availabilityId: booking.availabilityId,
          inquiryId: booking.inquiryId,
          userId: booking.userId,
        }))

        return NextResponse.json({ bookings: transformedBookings }, { status: 200 })
      }
    }

    // Build where clause
    const whereClause: Record<string, unknown> = {
      OR: [
        { userId: user.id }, // Bookings where user is the attendee
        { ownerId: user.id }, // Bookings where user is the owner
      ],
    }
    
    // Add inquiryId filter if provided
    if (inquiryIdParam) {
      const inquiryId = parseInt(inquiryIdParam)
      if (!isNaN(inquiryId)) {
        whereClause.inquiryId = inquiryId
      }
    }
    
    // First, get all bookings to find their availabilityIds
    const allBookings = await prisma.booking.findMany({
      where: whereClause,
      select: {
        id: true,
        availabilityId: true,
        inquiryId: true,
        status: true,
      },
    })

    // Separate orphan bookings (listing deleted → availabilityId set to null via SetNull cascade)
    const orphanBookingIds = allBookings
      .filter(b => b.availabilityId === null)
      .map(b => b.id)

    // Get valid availabilityIds for non-orphan bookings
    const availabilityIds = allBookings
      .map(b => b.availabilityId)
      .filter((id): id is number => id !== null)

    let validAvailabilityIds = new Set<number>()

    if (availabilityIds.length > 0) {
      // Resolve availabilities → homes to exclude stale availability records
      const allAvailabilities = await prisma.availability.findMany({
        where: { id: { in: availabilityIds } },
        select: { id: true, homeId: true },
      })

      const homeIds = allAvailabilities
        .map(a => a.homeId)
        .filter((id): id is number => id !== null)

      const validHomes = await prisma.home.findMany({
        where: { id: { in: homeIds } },
        select: { id: true },
      })

      const validHomeIds = new Set(validHomes.map(h => h.id))

      validAvailabilityIds = new Set(
        allAvailabilities
          .filter(a => a.homeId !== null && validHomeIds.has(a.homeId))
          .map(a => a.id)
      )
    }

    if (validAvailabilityIds.size === 0 && orphanBookingIds.length === 0) {
      return NextResponse.json({ bookings: [] }, { status: 200 })
    }

    // Build availability filter — include both valid-home bookings and orphan (null) bookings
    const availabilityOrClauses: Record<string, unknown>[] = []
    if (validAvailabilityIds.size > 0) {
      availabilityOrClauses.push({ availabilityId: { in: Array.from(validAvailabilityIds) } })
    }
    if (orphanBookingIds.length > 0) {
      availabilityOrClauses.push({ id: { in: orphanBookingIds } })
    }

    // Build where clause for final booking query
    const userOrClauses = [
      { userId: user.id },
      { ownerId: user.id },
    ]
    const finalWhereClause: Record<string, unknown> = {
      AND: [
        { OR: userOrClauses },
        { OR: availabilityOrClauses },
      ],
    }

    // Add inquiryId filter if provided
    if (inquiryIdParam) {
      const inquiryId = parseInt(inquiryIdParam)
      if (!isNaN(inquiryId)) {
        (finalWhereClause.AND as Record<string, unknown>[]).push({ inquiryId })
      }
    }

    // Now fetch bookings with full details
    const bookings = await prisma.booking.findMany({
      where: finalWhereClause,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            occupation: true,
            role: true,
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

    // Orphan bookings (availability=null) have no home reference — surface them without one
    const transformedBookings = bookings
      .map(booking => ({
        ...booking,
        home: booking.availability?.home ?? null,
        availabilityId: booking.availabilityId,
        inquiryId: booking.inquiryId,
        userId: booking.userId,
      }))


    return NextResponse.json({ bookings: transformedBookings }, { status: 200 })
  } catch (error) {
    log.error({ err: error }, 'Error fetching bookings')
    return serverError()
  }
}

// POST /api/bookings - Create a new booking
export async function POST(request: NextRequest) {
  const log = requestLogger(request)
  try {
    if (!features.bookings) {
      return NextResponse.json({ error: 'Bookings are currently disabled' }, { status: 503 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    const rawBody = await request.json()
    const { data: body, error: validationError } = validateBody(createBookingSchema, rawBody)
    if (validationError) return validationError

    const { ownerId, inquiryId, availabilityId, title, description, startTime, endTime, location } = body

    // If availabilityId is provided, get ownerId and homeKey from the availability
    let finalOwnerId = ownerId
    let finalHomeId: number | null = null
    let homeKey: string | null = null
    let ownerKey: string | null = null

    const parsedAvailabilityId = availabilityId ? parsePositiveInt(availabilityId) : null
    const parsedStartTime = parseValidDate(startTime)
    const parsedEndTime = parseValidDate(endTime)

    if (!parsedStartTime || !parsedEndTime || parsedEndTime <= parsedStartTime) {
      return badRequest('Invalid appointment time range')
    }

    // Resolve the home and owner server-side from the availability or inquiry.
    // The client-sent ownerId is never trusted when home context exists — otherwise
    // a caller could pair their own inquiry with someone else's ownerId and poison
    // that owner's calendar.
    if (parsedAvailabilityId) {
      const availability = await prisma.availability.findUnique({
        where: { id: parsedAvailabilityId },
        include: {
          home: {
            select: {
              id: true,
              ownerId: true,
              key: true,
              owner: { select: { key: true } },
            },
          },
        },
      })
      if (availability) {
        finalOwnerId = availability.home.ownerId
        finalHomeId = availability.home.id
        homeKey = availability.home.key
        ownerKey = availability.home.owner.key
      }
    } else if (inquiryId) {
      const inquiry = await prisma.inquiry.findUnique({
        where: { id: inquiryId },
        include: {
          home: {
            select: {
              id: true,
              ownerId: true,
              key: true,
              owner: { select: { key: true } },
            },
          },
        },
      })
      if (inquiry) {
        finalOwnerId = inquiry.home.ownerId
        finalHomeId = inquiry.home.id
        homeKey = inquiry.home.key
        ownerKey = inquiry.home.owner.key
      }
    }

    if (!finalOwnerId) {
      return badRequest('Owner ID is required')
    }

    // Every booking must resolve to a home via a valid availability or inquiry —
    // otherwise a client could create bookings against arbitrary owners.
    if (!finalHomeId) {
      return badRequest('Booking must reference a valid availability or inquiry')
    }

    // Verify the current user has an approved, non-finalized inquiry for this home
    const approvedInquiry = await prisma.inquiry.findFirst({
      where: {
        userId: user.id,
        homeId: finalHomeId,
        approved: true,
        finalized: false,
        dismissed: false,
      },
      select: { id: true },
    })
    if (!approvedInquiry) {
      return NextResponse.json({ error: 'You must have an approved inquiry to book a viewing' }, { status: 403 })
    }

    // inquiryId is already validated by Zod as number | null | undefined
    let finalInquiryId: number | null = body.inquiryId ?? null

    if (finalInquiryId === null && parsedAvailabilityId) {
      const av = await prisma.availability.findUnique({
        where: { id: parsedAvailabilityId },
        select: { homeId: true },
      })
      if (av) {
        if (finalHomeId === null) finalHomeId = av.homeId
        const match = await prisma.inquiry.findFirst({
          where: {
            userId: user.id,
            homeId: av.homeId,
            approved: true,
            finalized: false,
            dismissed: false,
          },
          select: { id: true },
        })
        if (match) finalInquiryId = match.id
      }
    }

    const booking = await prisma.$transaction(async (tx) => {
      const conflictState = await findBookingConflicts({
        tx,
        userId: user.id,
        ownerId: finalOwnerId,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
      })

      if (conflictState.userHasConflict) {
        throw new Error('USER_CONFLICT')
      }
      if (conflictState.ownerHasConflict) {
        throw new Error('OWNER_CONFLICT')
      }

      return tx.booking.create({
        data: {
          userId: user.id,
          ownerId: finalOwnerId,
          homeId: finalHomeId,
          inquiryId: finalInquiryId,
          availabilityId: parsedAvailabilityId,
          title,
          description: description || null,
          startTime: parsedStartTime,
          endTime: parsedEndTime,
          location: location || null,
          status: 'scheduled',
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              key: true,
            },
          },
          availability: {
            include: {
              home: {
                select: {
                  key: true,
                },
              },
            },
          },
        },
      })
    }, {
      isolationLevel: 'Serializable',
    })

    // Create notification for owner/broker about the new booking
    try {
      // Get homeKey if not already set
      const finalHomeKey = homeKey || booking.availability?.home?.key || null
      const finalOwnerKey = ownerKey || booking.owner.key || null
      
      if (finalHomeKey && finalOwnerId) {
        await prisma.notification.create({
          data: {
            recipientId: finalOwnerId,
            role: 'owner',
            type: 'booking_created',
            homeKey: finalHomeKey,
            userId: user.id,
            ownerKey: finalOwnerKey,
            inquiryId: finalInquiryId,
          },
        })
      }
    } catch (error) {
      log.error({ err: error }, 'Failed to create booking notification')
      // Don't fail the booking creation if notification fails
    }

    // Renter no longer needs "owner set availability" nudges for this home
    try {
      const hk = homeKey || booking.availability?.home?.key
      if (hk) {
        await prisma.notification.updateMany({
          where: {
            recipientId: user.id,
            type: 'availability_set',
            homeKey: hk,
            deleted: false,
          },
          data: { deleted: true },
        })
      }
    } catch (e) {
      log.error({ err: e }, 'Failed to clear availability_set notifications')
    }

    return NextResponse.json({ booking }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'USER_CONFLICT') {
      return badRequest('You already have an appointment at this time')
    }
    if (error instanceof Error && error.message === 'OWNER_CONFLICT') {
      return badRequest('The owner/broker already has an appointment at this time')
    }
    log.error({ err: error }, 'Error creating booking')
    return serverError()
  }
}

