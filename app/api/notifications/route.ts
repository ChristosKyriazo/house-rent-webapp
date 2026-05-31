import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { translations } from '@/lib/translations'
import {
  badRequest,
  parsePositiveInt,
  serverError,
  unauthorized,
} from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'
import {
  deleteNotificationForUser,
  markAllNotificationsAsViewed,
  NotificationServiceError,
} from '@/lib/services/notification-service'

// GET: Get notifications for the current user (excluding deleted ones)
export async function GET(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    // Get language from query parameter (default to 'en')
    const searchParams = request.nextUrl.searchParams
    const language = (searchParams.get('language') || 'en') as 'el' | 'en'
    const t = translations[language]

    // Get all non-deleted notifications for this user
    const notificationsRaw = await prisma.notification.findMany({
      where: {
        recipientId: user.id,
        deleted: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Hide "availability_set" once the user has a scheduled viewing for that home (no need to keep nudging)
    const userScheduledBookings = await prisma.booking.findMany({
      where: { userId: user.id, status: 'scheduled' },
      include: {
        availability: { include: { home: { select: { key: true } } } },
      },
    })
    const homeKeysWithScheduledBooking = new Set<string>()
    for (const b of userScheduledBookings) {
      const k = b.availability?.home?.key
      if (k) homeKeysWithScheduledBooking.add(k)
    }
    const inquiryIdsForOrphans = [
      ...new Set(
        userScheduledBookings
          .filter((b) => !b.availability?.home?.key && b.inquiryId)
          .map((b) => b.inquiryId!)
      ),
    ]
    if (inquiryIdsForOrphans.length > 0) {
      const inqRows = await prisma.inquiry.findMany({
        where: { id: { in: inquiryIdsForOrphans } },
        include: { home: { select: { key: true } } },
      })
      for (const row of inqRows) {
        if (row.home?.key) homeKeysWithScheduledBooking.add(row.home.key)
      }
    }

    const notifications = notificationsRaw.filter((n) => {
      if (n.type !== 'availability_set' || !n.homeKey) return true
      return !homeKeysWithScheduledBooking.has(n.homeKey)
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
      .filter(n => (n.type === 'inquiry' || n.type === 'finalize' || n.type === 'rejected') && n.userId)
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

    // Pre-fetch everything needed for booking_reminder notifications to avoid N+1
    const reminderHomeKeys = [...new Set(
      notifications.filter(n => n.type === 'booking_reminder' && n.homeKey).map(n => n.homeKey!)
    )]
    const reminderHomes = reminderHomeKeys.length > 0
      ? await prisma.home.findMany({ where: { key: { in: reminderHomeKeys } }, select: { id: true, key: true } })
      : []
    const reminderHomeMap = new Map(reminderHomes.map(h => [h.key, h.id]))

    const now48h = new Date(Date.now() + 48 * 60 * 60 * 1000)
    const reminderBookings = reminderHomes.length > 0
      ? await prisma.booking.findMany({
          where: {
            status: 'scheduled',
            startTime: { gte: new Date(), lt: now48h },
            availability: { is: { homeId: { in: reminderHomes.map(h => h.id) } } },
          },
          select: { id: true, startTime: true, endTime: true, title: true, userId: true, ownerId: true, availabilityId: true,
            availability: { select: { homeId: true } } },
          orderBy: { startTime: 'asc' },
        })
      : []

    // Pre-fetch tomorrow's booking counts per owner (for owner reminders)
    const ownerReminderIds = [...new Set(
      notifications.filter(n => n.type === 'booking_reminder' && n.role === 'owner').map(n => n.recipientId)
    )]
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0)
    const dayAfter = new Date(tomorrow); dayAfter.setDate(dayAfter.getDate() + 1)
    const tomorrowCountMap = new Map<number, number>()
    if (ownerReminderIds.length > 0) {
      const counts = await prisma.booking.groupBy({
        by: ['ownerId'],
        where: { ownerId: { in: ownerReminderIds }, status: 'scheduled', startTime: { gte: tomorrow, lt: dayAfter } },
        _count: { id: true },
      })
      for (const c of counts) tomorrowCountMap.set(c.ownerId, c._count.id)
    }

    // Format notifications for response (synchronous — all data pre-fetched above)
    const formattedNotifications = notifications.map((notif) => {
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
        if (notif.role === 'owner') {
          const rejUser = notif.userId ? userMap.get(notif.userId) : null
          const userName = rejUser?.name || rejUser?.email.split('@')[0] || t.aUser
          message = t.notificationRejectedOwner.replace('{userName}', userName).replace('{propertyTitle}', propertyTitle)
        } else {
          message = t.notificationRejected.replace('{propertyTitle}', propertyTitle)
        }
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
        // Uses pre-fetched reminderBookings / tomorrowCountMap — no per-notification queries
        if (notif.homeKey) {
          const homeId = reminderHomeMap.get(notif.homeKey)
          if (homeId !== undefined) {
            const booking = reminderBookings.find(b =>
              b.availability?.homeId === homeId &&
              (notif.role === 'user' ? b.userId === notif.recipientId : b.ownerId === notif.recipientId)
            )
            if (booking) {
              if (notif.role === 'user') {
                const bookingTime = new Date(booking.startTime).toLocaleTimeString(
                  language === 'el' ? 'el-GR' : 'en-US',
                  { hour: '2-digit', minute: '2-digit' }
                )
                message = t.notificationBookingReminder.replace('{title}', booking.title).replace('{time}', bookingTime)
              } else {
                const count = tomorrowCountMap.get(notif.recipientId) ?? 0
                message = t.notificationOwnerBookingReminder.replace('{count}', count.toString()).replace('{plural}', count !== 1 ? 's' : '')
              }
            } else {
              message = notif.role === 'user'
                ? t.notificationBookingReminder.replace('{title}', propertyTitle).replace('{time}', '')
                : t.notificationOwnerBookingReminder.replace('{count}', '0').replace('{plural}', 's')
            }
          } else {
            message = notif.role === 'user'
              ? t.notificationBookingReminder.replace('{title}', propertyTitle).replace('{time}', '')
              : t.notificationOwnerBookingReminder.replace('{count}', '0').replace('{plural}', 's')
          }
        } else if (notif.role === 'owner') {
          const count = tomorrowCountMap.get(notif.recipientId) ?? 0
          message = t.notificationOwnerBookingReminder.replace('{count}', count.toString()).replace('{plural}', count !== 1 ? 's' : '')
        } else {
          message = t.notificationBookingReminder.replace('{title}', '').replace('{time}', '')
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
    })

    // Count unviewed notifications
    const unviewedCount = formattedNotifications.filter(n => !n.viewed).length

    return NextResponse.json({ 
      notifications: formattedNotifications, 
      count: formattedNotifications.length,
      unviewedCount: unviewedCount
    }, { status: 200 })
  } catch (error) {
    log.error({ err: error }, 'Get notifications error')
    return serverError()
  }
}

// DELETE: Mark a notification as deleted
export async function DELETE(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    const searchParams = request.nextUrl.searchParams
    const notificationId = parsePositiveInt(searchParams.get('id'))

    if (!notificationId) {
      return badRequest('Notification ID required')
    }

    await deleteNotificationForUser(notificationId, user.id)

    return NextResponse.json({ message: 'Notification deleted' }, { status: 200 })
  } catch (error) {
    if (error instanceof NotificationServiceError && error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    log.error({ err: error }, 'Delete notification error')
    return serverError()
  }
}

// PATCH: Mark notifications as viewed
export async function PATCH(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    const body = await request.json()
    const { markAllAsViewed } = body

    if (markAllAsViewed) {
      await markAllNotificationsAsViewed(user.id)

      return NextResponse.json({ message: 'All notifications marked as viewed' }, { status: 200 })
    }

    return badRequest('Invalid request')
  } catch (error) {
    log.error({ err: error }, 'Mark notifications as viewed error')
    return serverError()
  }
}
