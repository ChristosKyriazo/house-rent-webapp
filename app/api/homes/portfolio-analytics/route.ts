import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { checkTier } from '@/lib/subscription'
import { unauthorized } from '@/lib/api-utils'

function startOf(unit: 'day' | 'week' | 'month'): Date {
  const now = new Date()
  if (unit === 'day') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (unit === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d
  }
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function prevPeriodStart(period: 'day' | 'week' | 'month', current: Date): Date {
  if (period === 'day') return new Date(current.getTime() - 24 * 60 * 60 * 1000)
  if (period === 'week') return new Date(current.getTime() - 7 * 24 * 60 * 60 * 1000)
  const d = new Date(current); d.setMonth(d.getMonth() - 1); return d
}

const EMPTY = (period: string) => NextResponse.json({
  period,
  homes: [],
  totals: { views: 0, inquiries: 0, schedules: 0, prevViews: 0 },
  funnel: { views: 0, saves: 0, inquiries: 0, approved: 0, finalized: 0 },
  timeSeries: [],
  topSources: [],
})

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()

  const tierBlock = checkTier(user.subscriptionTier ?? 'free', 'plus')
  if (tierBlock) return tierBlock

  const period = (request.nextUrl.searchParams.get('period') ?? 'month') as 'day' | 'week' | 'month'
  const periodStart = period === 'day' ? startOf('day') : period === 'week' ? startOf('week') : startOf('month')
  const prevStart = prevPeriodStart(period, periodStart)

  const homes = await prisma.home.findMany({
    where: { ownerId: user.id },
    select: {
      id: true, key: true, title: true, titleGreek: true,
      city: true, listingType: true, pricePerMonth: true,
      createdAt: true, finalized: true,
      slotPromoted: true, slotPromotedUntil: true, promotedUntil: true,
    },
  })
  if (homes.length === 0) return EMPTY(period)

  const homeIds = homes.map(h => h.id)
  const now = new Date()

  const [
    periodViewsByHome,
    totalPeriodViews,
    prevPeriodViews,
    allInquiriesByHome,
    periodInquiriesByHome,
    totalPeriodInquiries,
    savesByHome,
    periodSavesTotal,
    approvedByHome,
    finalizedByHome,
    periodBookingsByHome,
    avgDurationByHome,
    periodViewTimestamps,
    portfolioSources,
  ] = await Promise.all([
    prisma.listingView.groupBy({
      by: ['homeId'],
      where: { homeId: { in: homeIds }, viewedAt: { gte: periodStart } },
      _count: { id: true },
    }),
    prisma.listingView.count({ where: { homeId: { in: homeIds }, viewedAt: { gte: periodStart } } }),
    prisma.listingView.count({ where: { homeId: { in: homeIds }, viewedAt: { gte: prevStart, lt: periodStart } } }),
    prisma.inquiry.groupBy({ by: ['homeId'], where: { homeId: { in: homeIds } }, _count: { id: true } }),
    prisma.inquiry.groupBy({ by: ['homeId'], where: { homeId: { in: homeIds }, createdAt: { gte: periodStart } }, _count: { id: true } }),
    prisma.inquiry.count({ where: { homeId: { in: homeIds }, createdAt: { gte: periodStart } } }),
    prisma.savedHome.groupBy({ by: ['homeId'], where: { homeId: { in: homeIds } }, _count: { id: true } }),
    prisma.savedHome.count({ where: { homeId: { in: homeIds }, createdAt: { gte: periodStart } } }),
    prisma.inquiry.groupBy({ by: ['homeId'], where: { homeId: { in: homeIds }, approved: true }, _count: { id: true } }),
    prisma.inquiry.groupBy({ by: ['homeId'], where: { homeId: { in: homeIds }, finalized: true }, _count: { id: true } }),
    prisma.booking.groupBy({
      by: ['homeId'],
      where: { homeId: { in: homeIds }, createdAt: { gte: periodStart }, status: { not: 'cancelled' } },
      _count: { id: true },
    }),
    prisma.listingView.groupBy({
      by: ['homeId'],
      where: { homeId: { in: homeIds }, durationSeconds: { not: null }, viewedAt: { gte: periodStart } },
      _avg: { durationSeconds: true },
    }),
    prisma.listingView.findMany({
      where: { homeId: { in: homeIds }, viewedAt: { gte: periodStart } },
      select: { viewedAt: true },
    }),
    prisma.listingView.groupBy({
      by: ['source'],
      where: { homeId: { in: homeIds }, viewedAt: { gte: periodStart } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
  ])

  const viewMap = new Map(periodViewsByHome.map(r => [r.homeId, r._count.id]))
  const allInquiryMap = new Map(allInquiriesByHome.map(r => [r.homeId, r._count.id]))
  const periodInquiryMap = new Map(periodInquiriesByHome.map(r => [r.homeId, r._count.id]))
  const saveMap = new Map(savesByHome.map(r => [r.homeId, r._count.id]))
  const approvedMap = new Map(approvedByHome.map(r => [r.homeId, r._count.id]))
  const finalizedMap = new Map(finalizedByHome.map(r => [r.homeId, r._count.id]))
  const bookingMap = new Map(periodBookingsByHome.map(r => [r.homeId, r._count.id]))
  const avgDurMap = new Map(avgDurationByHome.map(r => [r.homeId, r._avg.durationSeconds]))
  const totalPeriodSchedules = [...bookingMap.values()].reduce((a, b) => a + b, 0)

  const portfolioAvgRate = totalPeriodViews > 0 ? (totalPeriodInquiries / totalPeriodViews * 100) : 0

  const rows = homes.map(h => {
    const viewsInPeriod = viewMap.get(h.id) ?? 0
    const inquiriesInPeriod = periodInquiryMap.get(h.id) ?? 0
    const schedulesInPeriod = bookingMap.get(h.id) ?? 0
    const inquiriesTotal = allInquiryMap.get(h.id) ?? 0
    const savesTotal = saveMap.get(h.id) ?? 0
    const approved = approvedMap.get(h.id) ?? 0
    const finalizedCount = finalizedMap.get(h.id) ?? 0
    const rawAvg = avgDurMap.get(h.id)
    const avgDurationSeconds = rawAvg != null ? Math.round(rawAvg) : null
    const inquiryRate = viewsInPeriod > 0 ? (inquiriesInPeriod / viewsInPeriod * 100).toFixed(1) : '0.0'
    const daysOnMarket = Math.floor((now.getTime() - h.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    const listingRate = viewsInPeriod > 0 ? (inquiriesInPeriod / viewsInPeriod * 100) : 0

    const isPromoted =
      (h.slotPromoted && (h.slotPromotedUntil === null || h.slotPromotedUntil > now)) ||
      (h.promotedUntil !== null && h.promotedUntil > now)

    let status: 'red' | 'yellow' | 'green' = 'yellow'
    if (finalizedCount > 0 || approved > 0) status = 'green'
    else if (viewsInPeriod >= 30 && inquiriesInPeriod === 0 && daysOnMarket >= 21) status = 'red'
    else if (listingRate >= portfolioAvgRate && (viewsInPeriod > 0 || inquiriesInPeriod > 0)) status = 'green'

    return {
      key: h.key, title: h.title, titleGreek: h.titleGreek,
      city: h.city, listingType: h.listingType, pricePerMonth: h.pricePerMonth,
      finalized: h.finalized, isPromoted,
      daysOnMarket, viewsInPeriod, inquiriesInPeriod, schedulesInPeriod,
      inquiriesTotal, savesTotal, approved, finalizedCount,
      inquiryRate, avgDurationSeconds, status,
    }
  }).sort((a, b) => b.viewsInPeriod - a.viewsInPeriod)

  // Period-aware time series
  const timeSeries: { label: string; views: number }[] = []
  if (period === 'day') {
    for (let h = 0; h < 24; h++) timeSeries.push({ label: `${String(h).padStart(2, '0')}:00`, views: 0 })
  } else {
    const buckets = period === 'week' ? 7 : 30
    for (let i = buckets - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i)
      timeSeries.push({ label: d.toISOString().split('T')[0], views: 0 })
    }
  }
  const tsMap = new Map(timeSeries.map(t => [t.label, t]))
  for (const v of periodViewTimestamps) {
    const key = period === 'day'
      ? `${String(v.viewedAt.getHours()).padStart(2, '0')}:00`
      : v.viewedAt.toISOString().split('T')[0]
    const entry = tsMap.get(key)
    if (entry) entry.views++
  }

  const topListing = rows[0] ? {
    key: rows[0].key, title: rows[0].title, titleGreek: rows[0].titleGreek,
    viewsInPeriod: rows[0].viewsInPeriod, inquiriesInPeriod: rows[0].inquiriesInPeriod,
    inquiryRate: rows[0].inquiryRate,
  } : null

  // All-time funnel totals
  const totalApproved = [...approvedMap.values()].reduce((a, b) => a + b, 0)
  const totalFinalized = [...finalizedMap.values()].reduce((a, b) => a + b, 0)

  return NextResponse.json({
    period,
    homes: rows,
    totals: { views: totalPeriodViews, inquiries: totalPeriodInquiries, schedules: totalPeriodSchedules, prevViews: prevPeriodViews },
    topListing,
    funnel: { views: totalPeriodViews, saves: periodSavesTotal, inquiries: totalPeriodInquiries, approved: totalApproved, finalized: totalFinalized },
    timeSeries,
    topSources: portfolioSources.map(s => ({ source: s.source ?? 'direct', count: s._count.id })),
  })
}
