// Aggregated only — never returns individual viewer identities
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { checkTier } from '@/lib/subscription'
import { unauthorized, forbidden, notFound } from '@/lib/api-utils'

const MIN_VIEWS_FOR_DURATION = 10

function startOf(unit: 'day' | 'week' | 'month'): Date {
  const now = new Date()
  if (unit === 'day') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
  if (unit === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    d.setHours(0, 0, 0, 0)
    return d
  }
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const tierBlock = checkTier(user.subscriptionTier ?? 'free', 'plus')
    if (tierBlock) return tierBlock

    const resolvedParams = await Promise.resolve(params)
    const homeKey = resolvedParams.id

    const home = await prisma.home.findFirst({
      where: { OR: [{ key: homeKey }, { id: isNaN(Number(homeKey)) ? -1 : Number(homeKey) }] },
      select: { id: true, key: true, ownerId: true },
    })
    if (!home) return notFound('Home not found')
    if (home.ownerId !== user.id) return forbidden('You do not own this home')

    const [today, thisWeek, thisMonth] = [startOf('day'), startOf('week'), startOf('month')]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [viewsToday, viewsWeek, viewsMonth, viewsWeekRaw, viewsMonthRaw, durationRows, saves, sources, inquiryCount] =
      await Promise.all([
        prisma.listingView.count({ where: { homeId: home.id, viewedAt: { gte: today } } }),
        prisma.listingView.count({ where: { homeId: home.id, viewedAt: { gte: thisWeek } } }),
        prisma.listingView.count({ where: { homeId: home.id, viewedAt: { gte: thisMonth } } }),

        prisma.listingView.findMany({
          where: { homeId: home.id, viewedAt: { gte: thisWeek } },
          select: { userId: true, sessionId: true },
        }),

        prisma.listingView.findMany({
          where: { homeId: home.id, viewedAt: { gte: thisMonth } },
          select: { userId: true, sessionId: true },
        }),

        prisma.listingView.findMany({
          where: { homeId: home.id, viewedAt: { gte: thirtyDaysAgo }, durationSeconds: { not: null } },
          select: { durationSeconds: true },
        }),

        prisma.savedHome.count({ where: { homeId: home.id } }),

        prisma.listingView.groupBy({
          by: ['source'],
          where: { homeId: home.id },
          _count: { source: true },
          orderBy: { _count: { source: 'desc' } },
          take: 5,
        }),

        prisma.inquiry.count({ where: { homeId: home.id } }),
      ])

    const uniqueViewers = (rows: { userId: number | null; sessionId: string | null }[]) => {
      const loggedIn = new Set<number>()
      const anon = new Set<string>()
      for (const r of rows) {
        if (r.userId !== null) loggedIn.add(r.userId)
        else if (r.sessionId) anon.add(r.sessionId)
      }
      return loggedIn.size + anon.size
    }

    const durations = durationRows.map(r => r.durationSeconds as number)
    const avgDuration =
      durations.length >= MIN_VIEWS_FOR_DURATION
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null

    const durationCaptureRate =
      viewsMonth > 0 ? Math.round((durationRows.length / viewsMonth) * 100) : 0

    const inquiryRate =
      viewsMonth > 0 ? ((inquiryCount / viewsMonth) * 100).toFixed(1) : '0.0'

    return NextResponse.json({
      views: { today: viewsToday, thisWeek: viewsWeek, thisMonth: viewsMonth },
      uniqueViewers: { thisWeek: uniqueViewers(viewsWeekRaw), thisMonth: uniqueViewers(viewsMonthRaw) },
      avgDurationSeconds: avgDuration,
      durationCaptureRate,
      saves,
      topSources: sources.map(s => ({ source: s.source ?? 'direct', count: s._count.source })),
      inquiryRate,
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
