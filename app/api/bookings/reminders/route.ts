import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Booking Reminders API
 * 
 * This endpoint should be called periodically (e.g., via cron job) to:
 * 1. Send 24-hour reminders to users about their upcoming bookings
 * 2. Send 1-day reminders to owners about meetings the following day
 */
export async function POST(request: NextRequest) {
  try {
    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    const dayAfterTomorrow = new Date(tomorrow)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

    // Find bookings that start in 24 hours (for user reminders)
    const bookingsIn24Hours = await prisma.booking.findMany({
      where: {
        status: 'scheduled',
        startTime: {
          gte: in24Hours,
          lt: new Date(in24Hours.getTime() + 60 * 60 * 1000), // Within 1 hour window
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        home: {
          select: {
            key: true,
            title: true,
          },
        },
      },
    })

    // Find bookings tomorrow (for owner reminders)
    const bookingsTomorrow = await prisma.booking.findMany({
      where: {
        status: 'scheduled',
        startTime: {
          gte: tomorrow,
          lt: dayAfterTomorrow,
        },
      },
      include: {
        owner: {
          select: {
            id: true,
          },
        },
      },
    })

    // Group tomorrow's bookings by owner
    const ownerBookingsMap = new Map<number, typeof bookingsTomorrow>()
    bookingsTomorrow.forEach(booking => {
      if (!ownerBookingsMap.has(booking.ownerId)) {
        ownerBookingsMap.set(booking.ownerId, [])
      }
      ownerBookingsMap.get(booking.ownerId)!.push(booking)
    })

    // Create notifications for users (24-hour reminders)
    // Only create if notification doesn't already exist
    const userNotifications = []
    for (const booking of bookingsIn24Hours) {
      const existing = await prisma.notification.findFirst({
        where: {
          recipientId: booking.userId,
          type: 'booking_reminder',
          homeKey: booking.home?.key || null,
          createdAt: {
            gte: new Date(now.getTime() - 2 * 60 * 60 * 1000), // Within last 2 hours
          },
        },
      })

      if (!existing) {
        userNotifications.push({
          recipientId: booking.userId,
          role: 'user' as const,
          type: 'booking_reminder' as const,
          homeKey: booking.home?.key || null,
          ownerKey: null,
        })
      }
    }

    // Create notifications for owners (1-day reminders about tomorrow's meetings)
    const ownerNotifications: Array<{
      recipientId: number
      role: 'owner'
      type: 'booking_reminder'
      homeKey: string | null
      ownerKey: null
    }> = []
    
    for (const [ownerId, bookings] of ownerBookingsMap.entries()) {
      const owner = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true },
      })
      
      if (owner && bookings.length > 0) {
        // Check if reminder already exists
        const existing = await prisma.notification.findFirst({
          where: {
            recipientId: ownerId,
            type: 'booking_reminder',
            role: 'owner',
            createdAt: {
              gte: new Date(now.getTime() - 2 * 60 * 60 * 1000), // Within last 2 hours
            },
          },
        })

        if (!existing) {
          ownerNotifications.push({
            recipientId: ownerId,
            role: 'owner',
            type: 'booking_reminder',
            homeKey: bookings[0].home?.key || null,
            ownerKey: null,
          })
        }
      }
    }

    // Insert all notifications
    if (userNotifications.length > 0 || ownerNotifications.length > 0) {
      await prisma.notification.createMany({
        data: [...userNotifications, ...ownerNotifications],
      })
    }

    return NextResponse.json({
      message: 'Reminders processed',
      userReminders: userNotifications.length,
      ownerReminders: ownerNotifications.length,
    }, { status: 200 })
  } catch (error) {
    console.error('Error processing reminders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

