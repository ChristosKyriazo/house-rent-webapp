import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findBookingConflicts } from '@/lib/booking-conflicts'
import { badRequest, parsePositiveInt, parseValidDate, serverError, unauthorized } from '@/lib/api-utils'

// GET /api/bookings - Get all bookings for the current user
export async function GET(request: NextRequest) {
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
                  street: true,
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
                street: true,
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
    const whereClause: any = {
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

    // Get all valid availabilityIds that exist
    const availabilityIds = allBookings
      .map(b => b.availabilityId)
      .filter((id): id is number => id !== null)
    
    if (availabilityIds.length === 0) {
      return NextResponse.json({ bookings: [] }, { status: 200 })
    }

    // First, get all availabilities to find their homeIds
    const allAvailabilities = await prisma.availability.findMany({
      where: {
        id: { in: availabilityIds },
      },
      select: {
        id: true,
        homeId: true,
      },
    })

    // Get all valid homeIds that exist
    const homeIds = allAvailabilities
      .map(a => a.homeId)
      .filter((id): id is number => id !== null)
    
    const validHomes = await prisma.home.findMany({
      where: {
        id: { in: homeIds },
      },
      select: { id: true },
    })
    
    const validHomeIds = new Set(validHomes.map(h => h.id))
    
    // Filter availabilities to only those with valid homes
    const validAvailabilityIds = new Set(
      allAvailabilities
        .filter(a => a.homeId !== null && validHomeIds.has(a.homeId))
        .map(a => a.id)
    )

    // Build where clause for final booking query
    const finalWhereClause: any = {
      OR: [
        { userId: user.id }, // Bookings where user is the attendee
        { ownerId: user.id }, // Bookings where user is the owner
      ],
      availabilityId: { in: Array.from(validAvailabilityIds) },
    }
    
    // Add inquiryId filter if provided
    if (inquiryIdParam) {
      const inquiryId = parseInt(inquiryIdParam)
      if (!isNaN(inquiryId)) {
        finalWhereClause.inquiryId = inquiryId
      }
    }
    
    // Now fetch bookings only for valid availabilities
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

    // Transform bookings to include home at the top level for easier access
    // Filter out any bookings with null availability or null home (safety check)
    const transformedBookings = bookings
      .filter(booking => booking.availability !== null && booking.availability.home !== null)
      .map(booking => ({
        ...booking,
        home: booking.availability!.home!,
        availabilityId: booking.availabilityId,
        inquiryId: booking.inquiryId,
        userId: booking.userId,
      }))


    return NextResponse.json({ bookings: transformedBookings }, { status: 200 })
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return serverError()
  }
}

// POST /api/bookings - Create a new booking
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    const body = await request.json()
    const { ownerId, inquiryId, availabilityId, title, description, startTime, endTime, location } = body

    if (!title || !startTime || !endTime) {
      return badRequest('Missing required fields')
    }

    // If availabilityId is provided, get ownerId and homeKey from the availability
    let finalOwnerId = ownerId
    let homeKey: string | null = null
    let ownerKey: string | null = null
    
    const parsedAvailabilityId = availabilityId ? parsePositiveInt(availabilityId) : null
    const parsedOwnerId = ownerId ? parsePositiveInt(ownerId) : null
    const parsedStartTime = parseValidDate(startTime)
    const parsedEndTime = parseValidDate(endTime)

    if (!parsedStartTime || !parsedEndTime || parsedEndTime <= parsedStartTime) {
      return badRequest('Invalid appointment time range')
    }

    if (availabilityId && !parsedOwnerId) {
      const availability = await prisma.availability.findUnique({
        where: { id: parsedAvailabilityId ?? -1 },
        include: { 
          home: { 
            select: { 
              ownerId: true,
              key: true,
              owner: {
                select: {
                  key: true,
                },
              },
            } 
          } 
        },
      })
      if (availability) {
        finalOwnerId = availability.home.ownerId
        homeKey = availability.home.key
        ownerKey = availability.home.owner.key
      }
    } else if (finalOwnerId) {
      // If ownerId is provided but we don't have homeKey, try to get it from inquiryId
      if (inquiryId) {
        const inquiry = await prisma.inquiry.findUnique({
          where: { id: inquiryId },
          include: {
            home: {
              select: {
                key: true,
                owner: {
                  select: {
                    key: true,
                  },
                },
              },
            },
          },
        })
        if (inquiry) {
          homeKey = inquiry.home.key
          ownerKey = inquiry.home.owner.key
        }
      }
    }

    if (!finalOwnerId) {
      return badRequest('Owner ID is required')
    }

    const rawInq = body.inquiryId
    let finalInquiryId: number | null =
      rawInq !== undefined && rawInq !== null && rawInq !== '' && Number.isFinite(Number(rawInq))
        ? parseInt(String(rawInq), 10)
        : null

    if (finalInquiryId === null && parsedAvailabilityId) {
      const av = await prisma.availability.findUnique({
        where: { id: parsedAvailabilityId },
        select: { homeId: true },
      })
      if (av) {
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
      console.error('Failed to create booking notification:', error)
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
      console.error('Failed to clear availability_set notifications:', e)
    }

    return NextResponse.json({ booking }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'USER_CONFLICT') {
      return badRequest('You already have an appointment at this time')
    }
    if (error instanceof Error && error.message === 'OWNER_CONFLICT') {
      return badRequest('The owner/broker already has an appointment at this time')
    }
    console.error('Error creating booking:', error)
    return serverError()
  }
}

