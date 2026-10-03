import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requestLogger } from '@/lib/logger'
import { athensDate, athensDayRange, athensHour } from '@/lib/athens-time'

/**
 * Booking reminders + housekeeping. Called hourly by .github/workflows/cron.yml with the
 * `x-cron-secret` header (it was never called by anything before — reminders never sent).
 *
 * 1. **Renters** — one reminder per meeting starting 20–28 h from now. The wide window plus
 *    per-meeting dedupe (notification.data.bookingKey) means a late or skipped run never
 *    misses or repeats a reminder; the old exact one-hour window at +24 h needed perfect
 *    hourly timing.
 * 2. **Owners/brokers** — from 18:00 Athens time, one summary per owner per day of
 *    tomorrow's meetings, counted in Athens time (the server runs in UTC) and stored with the
 *    notification, so the text doesn't drift as days pass.
 * 3. **Completion** — meetings that ended more than an hour ago go from `scheduled` to
 *    `completed`; nothing did this before, so past meetings showed as scheduled forever.
 */

const OWNER_REMINDER_FROM_HOUR = 18

export async function POST(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const cronSecret = request.headers.get('x-cron-secret')
    if (!cronSecret || !process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()
    const H = 60 * 60 * 1000

    // ── 1. Renter reminders ────────────────────────────────────────────────
    const upcoming = await prisma.booking.findMany({
      where: { status: 'scheduled', startTime: { gt: new Date(now.getTime() + 20 * H), lte: new Date(now.getTime() + 28 * H) } },
      select: {
        key: true, userId: true, title: true, startTime: true,
        home: { select: { key: true } },
        availability: { select: { home: { select: { key: true } } } },
      },
    })
    const alreadyReminded = new Set(
      (await prisma.notification.findMany({
        where: { type: 'booking_reminder', role: 'user', recipientId: { in: upcoming.map(b => b.userId) }, createdAt: { gte: new Date(now.getTime() - 3 * 24 * H) } },
        select: { data: true },
      }))
        .map(n => (n.data as { bookingKey?: string } | null)?.bookingKey)
        .filter(Boolean),
    )
    const userNotifications: Prisma.NotificationCreateManyInput[] = upcoming
      .filter(b => !alreadyReminded.has(b.key))
      .map(b => ({
        recipientId: b.userId,
        role: 'user',
        type: 'booking_reminder',
        homeKey: b.home?.key ?? b.availability?.home?.key ?? null,
        data: { bookingKey: b.key, title: b.title, startTime: b.startTime.toISOString() },
      }))

    // ── 2. Owner summaries for tomorrow (Athens time) ──────────────────────
    const ownerNotifications: Prisma.NotificationCreateManyInput[] = []
    if (athensHour(now) >= OWNER_REMINDER_FROM_HOUR) {
      const today = athensDate(now)
      const tomorrowRange = athensDayRange(new Date(now.getTime() + 24 * H))
      const counts = await prisma.booking.groupBy({
        by: ['ownerId'],
        where: { status: 'scheduled', startTime: { gte: tomorrowRange.start, lt: tomorrowRange.end } },
        _count: { id: true },
      })
      const ownerIds = counts.map(c => c.ownerId)
      const remindedToday = new Set(
        (await prisma.notification.findMany({
          where: { type: 'booking_reminder', role: 'owner', recipientId: { in: ownerIds }, createdAt: { gte: new Date(now.getTime() - 24 * H) } },
          select: { recipientId: true, data: true },
        }))
          .filter(n => (n.data as { date?: string } | null)?.date === today)
          .map(n => n.recipientId),
      )
      for (const c of counts) {
        if (remindedToday.has(c.ownerId)) continue
        ownerNotifications.push({
          recipientId: c.ownerId,
          role: 'owner',
          type: 'booking_reminder',
          homeKey: null,
          data: { date: today, count: c._count.id },
        })
      }
    }

    if (userNotifications.length + ownerNotifications.length > 0) {
      await prisma.notification.createMany({ data: [...userNotifications, ...ownerNotifications] })
    }

    // ── 3. Mark finished meetings completed ────────────────────────────────
    const completed = await prisma.booking.updateMany({
      where: { status: 'scheduled', endTime: { lt: new Date(now.getTime() - H) } },
      data: { status: 'completed' },
    })

    log.info({ userReminders: userNotifications.length, ownerReminders: ownerNotifications.length, completed: completed.count }, 'Reminders processed')
    return NextResponse.json({
      userReminders: userNotifications.length,
      ownerReminders: ownerNotifications.length,
      completed: completed.count,
    })
  } catch (error) {
    log.error({ err: error }, 'Error processing reminders')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
