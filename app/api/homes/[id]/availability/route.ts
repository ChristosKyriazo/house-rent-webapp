import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Get availability for a home
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

    // Get availability slots
    const availabilities = await prisma.availability.findMany({
      where: {
        homeId: home.id,
        date: {
          gte: new Date(), // Only future dates
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    // Get ALL scheduled bookings that conflict with this home's availability
    // This includes:
    // 1. Bookings for this home
    // 2. Bookings for the current user (regardless of home)
    // 3. Bookings for the owner (regardless of home)
    
    // Get bookings for this home
    const homeBookings = await prisma.booking.findMany({
      where: {
        status: 'scheduled',
        availability: {
          homeId: home.id,
        },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        availabilityId: true,
        userId: true,
        ownerId: true,
      },
    })
    
    // Get all bookings for the current user (across all homes)
    const userBookings = await prisma.booking.findMany({
      where: {
        status: 'scheduled',
        userId: user.id,
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        availabilityId: true,
        userId: true,
        ownerId: true,
      },
    })
    
    // Get all bookings for the owner (across all homes)
    const ownerBookings = await prisma.booking.findMany({
      where: {
        status: 'scheduled',
        ownerId: home.ownerId,
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        availabilityId: true,
        userId: true,
        ownerId: true,
      },
    })
    
    // Combine all bookings and remove duplicates
    const allBookingsMap = new Map()
    ;[...homeBookings, ...userBookings, ...ownerBookings].forEach(booking => {
      allBookingsMap.set(booking.id, booking)
    })
    const allBookings = Array.from(allBookingsMap.values())
    
    console.log(`Found ${allBookings.length} scheduled bookings (home: ${homeBookings.length}, user: ${userBookings.length}, owner: ${ownerBookings.length})`)

    // Attach all bookings to each availability for frontend checking
    // We include bookings that overlap with the availability's date/time range
    const availabilitiesWithBookings = availabilities.map(availability => {
      const availabilityDate = new Date(availability.date)
      const availDateOnly = new Date(availabilityDate.getFullYear(), availabilityDate.getMonth(), availabilityDate.getDate())
      
      // Parse availability time range
      const [availStartHour, availStartMin] = availability.startTime.split(':').map(Number)
      const [availEndHour, availEndMin] = availability.endTime.split(':').map(Number)
      const availStartMinutes = availStartHour * 60 + availStartMin
      const availEndMinutes = availEndHour * 60 + availEndMin
      
      // Filter bookings that overlap with this availability
      const overlappingBookings = allBookings.filter(booking => {
        const bookingStart = new Date(booking.startTime)
        const bookingEnd = new Date(booking.endTime)
        
        // Check if booking is on the same date (normalize to avoid timezone issues)
        const bookingDateOnly = new Date(bookingStart.getFullYear(), bookingStart.getMonth(), bookingStart.getDate())
        if (bookingDateOnly.getTime() !== availDateOnly.getTime()) {
          return false
        }
        
        // Check if booking time overlaps with availability time range
        // Use minutes from midnight for accurate comparison
        const bookingStartMinutes = bookingStart.getHours() * 60 + bookingStart.getMinutes()
        const bookingEndMinutes = bookingEnd.getHours() * 60 + bookingEnd.getMinutes()
        
        // Check for overlap: booking starts before availability ends AND booking ends after availability starts
        // This ensures we catch any booking that overlaps with the availability window
        const hasOverlap = (bookingStartMinutes < availEndMinutes && bookingEndMinutes > availStartMinutes)
        
        return hasOverlap
      })
      
      return {
        ...availability,
        bookings: overlappingBookings,
      }
    })

    // Return all availabilities with all relevant bookings
    // The frontend will check bookings to determine which specific time slots are booked
    return NextResponse.json({ availabilities: availabilitiesWithBookings }, { status: 200 })
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: Update availability (mark as booked)
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
    const homeKey = resolvedParams.id

    const body = await request.json()
    const { availabilityId, isAvailable } = body

    if (!availabilityId) {
      return NextResponse.json(
        { error: 'Availability ID is required' },
        { status: 400 }
      )
    }

    // Update availability
    const availability = await prisma.availability.update({
      where: { id: availabilityId },
      data: { isAvailable: isAvailable !== undefined ? isAvailable : false },
    })

    return NextResponse.json({ availability }, { status: 200 })
  } catch (error) {
    console.error('Error updating availability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create availability slots for a home
export async function POST(
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

    const body = await request.json()
    const { inquiryId, slots } = body

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json(
        { error: 'At least one availability slot is required' },
        { status: 400 }
      )
    }

    // Find the home
    const home = await prisma.home.findUnique({
      where: { key: homeKey },
      select: { id: true, ownerId: true },
    })

    if (!home) {
      return NextResponse.json({ error: 'Home not found' }, { status: 404 })
    }

    // Verify user is the owner
    if (home.ownerId !== user.id && user.role !== 'broker') {
      return NextResponse.json(
        { error: 'Only the owner can set availability' },
        { status: 403 }
      )
    }

    // Create availability slots
    const createdSlots = await Promise.all(
      slots.map((slot: { date: string; startTime: string; endTime: string }) =>
        prisma.availability.create({
          data: {
            homeId: home.id,
            inquiryId: inquiryId ? parseInt(inquiryId) : null,
            date: new Date(slot.date),
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAvailable: true,
          },
        })
      )
    )

    return NextResponse.json(
      { message: 'Availability set successfully', slots: createdSlots },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating availability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

