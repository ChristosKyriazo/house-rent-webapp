import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { translations } from '@/lib/translations'

// GET: Get notifications for the current user (excluding deleted ones)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get language from query parameter (default to 'en')
    const searchParams = request.nextUrl.searchParams
    const language = (searchParams.get('language') || 'en') as 'el' | 'en'
    const t = translations[language]

    // Get all non-deleted notifications for this user
    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: user.id,
        deleted: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get home titles for notifications that have homeKey
    const homeKeys = notifications
      .filter(n => n.homeKey)
      .map(n => n.homeKey!)
      .filter((key, index, self) => self.indexOf(key) === index) // Unique keys

    const homes = homeKeys.length > 0 
      ? await prisma.home.findMany({
          where: { key: { in: homeKeys } },
          select: { key: true, title: true },
        })
      : []

    const homeMap = new Map(homes.map(h => [h.key, h.title]))

    // Get user information for owner notifications (inquiry type) and finalize notifications
    const userIds = notifications
      .filter(n => (n.type === 'inquiry' || n.type === 'finalize') && n.userId)
      .map(n => n.userId!)
      .filter((id, index, self) => self.indexOf(id) === index) // Unique IDs

    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : []

    const userMap = new Map(users.map(u => [u.id, u]))

    // Get inquiries for finalize notifications to get sender info
    const inquiryIds = notifications
      .filter(n => n.type === 'finalize' && n.inquiryId)
      .map(n => n.inquiryId!)
      .filter((id, index, self) => self.indexOf(id) === index)

    const inquiries = inquiryIds.length > 0
      ? await prisma.inquiry.findMany({
          where: { id: { in: inquiryIds } },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            home: {
              select: {
                owner: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        })
      : []

    const inquiryMap = new Map(inquiries.map(i => [i.id, i]))

    // Format notifications for response
    const formattedNotifications = await Promise.all(notifications.map(async (notif) => {
      const homeTitle = notif.homeKey ? homeMap.get(notif.homeKey) : null
      
      let message = ''
      const propertyTitle = homeTitle || (notif.type === 'inquiry' ? t.yourProperty : t.theProperty)
      
      if (notif.type === 'inquiry') {
        // For owners: show who inquired
        if (notif.userId) {
          const inquiryUser = userMap.get(notif.userId)
          const userName = inquiryUser?.name || inquiryUser?.email.split('@')[0] || t.aUser
          message = t.notificationInquiry.replace('{userName}', userName).replace('{propertyTitle}', propertyTitle)
        } else {
          message = t.notificationInquiryGeneric.replace('{propertyTitle}', propertyTitle)
        }
      } else if (notif.type === 'approved') {
        // For users: show their inquiry was approved
        message = t.notificationApproved.replace('{propertyTitle}', propertyTitle)
      } else if (notif.type === 'dismissed') {
        // For users: show their inquiry was dismissed
        message = t.notificationDismissed.replace('{propertyTitle}', propertyTitle)
      } else if (notif.type === 'rejected') {
        // For users: show their offer was rejected
        message = t.notificationRejected.replace('{propertyTitle}', propertyTitle)
      } else if (notif.type === 'finalize') {
        // For finalize: show who wants to finalize
        if (notif.inquiryId) {
          const inquiry = inquiryMap.get(notif.inquiryId)
          if (inquiry) {
            // Determine sender: if recipient is owner, sender is user; if recipient is user, sender is owner
            const sender = notif.role === 'owner' ? inquiry.user : inquiry.home.owner
            const senderName = sender.name || sender.email.split('@')[0] || t.someone
            message = t.notificationFinalize.replace('{senderName}', senderName).replace('{propertyTitle}', propertyTitle)
          } else {
            message = t.notificationFinalizeGeneric.replace('{propertyTitle}', propertyTitle)
          }
        } else {
          message = t.notificationFinalizeRequest.replace('{propertyTitle}', propertyTitle)
        }
      } else if (notif.type === 'rate') {
        // For rate: prompt user to rate the other party
        if (notif.inquiryId) {
          const inquiry = inquiryMap.get(notif.inquiryId)
          if (inquiry) {
            // Determine who to rate: if recipient is owner, rate the user; if recipient is user, rate the owner
            const toRate = notif.role === 'owner' ? inquiry.user : inquiry.home.owner
            const toRateName = toRate.name || toRate.email.split('@')[0] || t.someone
            message = t.notificationRate.replace('{userName}', toRateName).replace('{propertyTitle}', propertyTitle)
          } else {
            // Fallback based on role
            if (notif.role === 'owner') {
              message = t.notificationRateUser.replace('{propertyTitle}', propertyTitle)
            } else {
              message = t.notificationRateOwner.replace('{propertyTitle}', propertyTitle)
            }
          }
        } else {
          // Fallback based on role
          if (notif.role === 'owner') {
            message = t.notificationRateUser.replace('{propertyTitle}', propertyTitle)
          } else {
            message = t.notificationRateOwner.replace('{propertyTitle}', propertyTitle)
          }
        }
      } else if (notif.type === 'availability_set') {
        // For users: owner has set availability
        message = t.notificationAvailabilitySet.replace('{propertyTitle}', propertyTitle)
      } else if (notif.type === 'booking_created') {
        // For owners: show that a user has booked a slot
        if (notif.userId) {
          const bookingUser = userMap.get(notif.userId)
          const userName = bookingUser?.name || bookingUser?.email.split('@')[0] || t.aUser
          message = t.notificationBookingCreated.replace('{userName}', userName).replace('{propertyTitle}', propertyTitle)
        } else {
          message = t.notificationBookingCreatedGeneric.replace('{propertyTitle}', propertyTitle)
        }
      } else if (notif.type === 'booking_reminder') {
        // For booking reminders: fetch booking details
        if (notif.homeKey) {
          const home = await prisma.home.findUnique({
            where: { key: notif.homeKey },
            select: { id: true },
          })
          
          if (home) {
            // Find the booking for this home and recipient
            const booking = await prisma.booking.findFirst({
              where: {
                availability: {
                  is: {
                    homeId: home.id,
                  },
                },
                status: 'scheduled',
                startTime: {
                  gte: new Date(),
                  lt: new Date(Date.now() + 48 * 60 * 60 * 1000), // Within next 48 hours
                },
                ...(notif.role === 'user' 
                  ? { userId: notif.recipientId }
                  : { ownerId: notif.recipientId }
                ),
              },
              orderBy: { startTime: 'asc' },
              take: 1,
            })

            if (booking) {
              if (notif.role === 'user') {
                // User reminder: show booking time
                const bookingTime = new Date(booking.startTime).toLocaleTimeString(
                  language === 'el' ? 'el-GR' : 'en-US',
                  { hour: '2-digit', minute: '2-digit' }
                )
                message = t.notificationBookingReminder
                  .replace('{title}', booking.title)
                  .replace('{time}', bookingTime)
              } else {
                // Owner reminder: count tomorrow's bookings
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                tomorrow.setHours(0, 0, 0, 0)
                const dayAfter = new Date(tomorrow)
                dayAfter.setDate(dayAfter.getDate() + 1)

                const tomorrowBookings = await prisma.booking.count({
                  where: {
                    ownerId: notif.recipientId,
                    status: 'scheduled',
                    startTime: {
                      gte: tomorrow,
                      lt: dayAfter,
                    },
                  },
                })

                if (tomorrowBookings > 0) {
                  message = t.notificationOwnerBookingReminder
                    .replace('{count}', tomorrowBookings.toString())
                    .replace('{plural}', tomorrowBookings > 1 ? 's' : '')
                } else {
                  message = t.notificationOwnerBookingReminder
                    .replace('{count}', '0')
                    .replace('{plural}', 's')
                }
              }
            } else {
              // Fallback message
              message = notif.role === 'user' 
                ? t.notificationBookingReminder.replace('{title}', propertyTitle).replace('{time}', '')
                : t.notificationOwnerBookingReminder.replace('{count}', '0').replace('{plural}', 's')
            }
          } else {
            message = notif.role === 'user' 
              ? t.notificationBookingReminder.replace('{title}', propertyTitle).replace('{time}', '')
              : t.notificationOwnerBookingReminder.replace('{count}', '0').replace('{plural}', 's')
          }
        } else {
          // For owner reminders without homeKey, count all tomorrow's bookings
          if (notif.role === 'owner') {
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            tomorrow.setHours(0, 0, 0, 0)
            const dayAfter = new Date(tomorrow)
            dayAfter.setDate(dayAfter.getDate() + 1)

            const tomorrowBookings = await prisma.booking.count({
              where: {
                ownerId: notif.recipientId,
                status: 'scheduled',
                startTime: {
                  gte: tomorrow,
                  lt: dayAfter,
                },
              },
            })

            message = t.notificationOwnerBookingReminder
              .replace('{count}', tomorrowBookings.toString())
              .replace('{plural}', tomorrowBookings > 1 ? 's' : '')
          } else {
            message = t.notificationBookingReminder.replace('{title}', '').replace('{time}', '')
          }
        }
      }

      return {
        id: notif.id,
        type: notif.type,
        message: message,
        homeKey: notif.homeKey || '',
        inquiryId: notif.inquiryId || null,
        createdAt: notif.createdAt,
        viewed: notif.viewed || false,
      }
    }))

    // Count unviewed notifications
    const unviewedCount = formattedNotifications.filter(n => !n.viewed).length

    return NextResponse.json({ 
      notifications: formattedNotifications, 
      count: formattedNotifications.length,
      unviewedCount: unviewedCount
    }, { status: 200 })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Mark a notification as deleted
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const notificationId = searchParams.get('id')

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }

    // Mark notification as deleted (don't actually delete it)
    await prisma.notification.update({
      where: {
        id: parseInt(notificationId),
        recipientId: user.id, // Ensure user can only delete their own notifications
      },
      data: {
        deleted: true,
      },
    })

    return NextResponse.json({ message: 'Notification deleted' }, { status: 200 })
  } catch (error) {
    console.error('Delete notification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: Mark notifications as viewed
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { markAllAsViewed } = body

    if (markAllAsViewed) {
      // Mark all unviewed notifications for this user as viewed
      await prisma.notification.updateMany({
        where: {
          recipientId: user.id,
          viewed: false,
          deleted: false,
        },
        data: {
          viewed: true,
        },
      })

      return NextResponse.json({ message: 'All notifications marked as viewed' }, { status: 200 })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Mark notifications as viewed error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create a notification (called when inquiries are created/approved/dismissed)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { recipientId, role, type, homeKey, userId, ownerKey } = body

    if (!recipientId || !role || !type) {
      return NextResponse.json(
        { error: 'recipientId, role, and type are required' },
        { status: 400 }
      )
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        recipientId: parseInt(recipientId),
        role: role,
        type: type,
        homeKey: homeKey || null,
        userId: userId ? parseInt(userId) : null,
        ownerKey: ownerKey || null,
      },
    })

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    console.error('Create notification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
