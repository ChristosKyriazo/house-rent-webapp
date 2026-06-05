import { NextResponse } from 'next/server'
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

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return unauthorized()

  const tierBlock = checkTier(user.subscriptionTier ?? 'free', 'pro')
  if (tierBlock) return tierBlock

  const homes = await prisma.home.findMany({
    where: { ownerId: user.id },
    select: { id: true, key: true, title: true, titleGreek: true, city: true, listingType: true, pricePerMonth: true, createdAt: true, finalized: true },
  })
  if (homes.length === 0) {
    return NextResponse.json({ homes: [], totals: { today: 0, thisWeek: 0, thisMonth: 0 }, topListing: null, funnel: { views: 0, saves: 0, inquiries: 0, approved: 0, finalized: 0 }, timeSeries: [] })
  }

  const homeIds = homes.map(h => h.id)
  const now = new Date()
  const [today, thisWeek, thisMonth] = [startOf('day'), startOf('week'), startOf('month')]
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    viewsToday, viewsWeek, viewsMonth,
    viewsByHome, inquiriesByHome, savesByHome,
    approvedByHome, finalizedByHome,
    views30d,
  ] = await Promise.all([
    prisma.listingView.count({ where: { homeId: { in: homeIds }, viewedAt: { gte: today } } }),
    prisma.listingView.count({ where: { homeId: { in: homeIds }, viewedAt: { gte: thisWeek } } }),
    prisma.listingView.count({ where: { homeId: { in: homeIds }, viewedAt: { gte: thisMonth } } }),
    prisma.listingView.groupBy({ by: ['homeId'], where: { homeId: { in: homeIds }, viewedAt: { gte: thisMonth } }, _count: { id: true } }),
    prisma.inquiry.groupBy({ by: ['homeId'], where: { homeId: { in: homeIds } }, _count: { id: true } }),
    prisma.savedHome.groupBy({ by: ['homeId'], where: { homeId: { in: homeIds } }, _count: { id: true } }),
    prisma.inquiry.groupBy({ by: ['homeId'], where: { homeId: { in: homeIds }, approved: true }, _count: { id: true } }),
    prisma.inquiry.groupBy({ by: ['homeId'], where: { homeId: { in: homeIds }, finalized: true }, _count: { id: true } }),
    prisma.listingView.findMany({ where: { homeId: { in: homeIds }, viewedAt: { gte: thirtyDaysAgo } }, select: { viewedAt: true } }),
  ])

  const viewMap = new Map(viewsByHome.map(r => [r.homeId, r._count.id]))
  const inquiryMap = new Map(inquiriesByHome.map(r => [r.homeId, r._count.id]))
  const saveMap = new Map(savesByHome.map(r => [r.homeId, r._count.id]))
  const approvedMap = new Map(approvedByHome.map(r => [r.homeId, r._count.id]))
  const finalizedMap = new Map(finalizedByHome.map(r => [r.homeId, r._count.id]))

  const portfolioAvgRate = viewsMonth > 0
    ? [...inquiryMap.values()].reduce((a, b) => a + b, 0) / viewsMonth * 100
    : 0

  const rows = homes.map(h => {
    const viewsThisMonth = viewMap.get(h.id) ?? 0
    const inquiries = inquiryMap.get(h.id) ?? 0
    const saves = saveMap.get(h.id) ?? 0
    const approved = approvedMap.get(h.id) ?? 0
    const finalizedCount = finalizedMap.get(h.id) ?? 0
    const inquiryRate = viewsThisMonth > 0 ? (inquiries / viewsThisMonth * 100).toFixed(1) : '0.0'
    const daysOnMarket = Math.floor((now.getTime() - h.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    const listingInquiryRate = viewsThisMonth > 0 ? (inquiries / viewsThisMonth * 100) : 0

    let status: 'red' | 'yellow' | 'green' = 'yellow'
    if (finalizedCount > 0 || approved > 0) status = 'green'
    else if (viewsThisMonth >= 30 && inquiries === 0 && daysOnMarket >= 21) status = 'red'
    else if (listingInquiryRate >= portfolioAvgRate) status = 'green'

    return {
      key: h.key,
      title: h.title,
      titleGreek: h.titleGreek,
      city: h.city,
      listingType: h.listingType,
      pricePerMonth: h.pricePerMonth,
      finalized: h.finalized,
      daysOnMarket,
      viewsThisMonth,
      inquiries,
      saves,
      approved,
      finalizedCount,
      inquiryRate,
      status,
    }
  }).sort((a, b) => b.viewsThisMonth - a.viewsThisMonth)

  // Portfolio funnel totals
  const totalSaves = [...saveMap.values()].reduce((a, b) => a + b, 0)
  const totalInquiries = [...inquiryMap.values()].reduce((a, b) => a + b, 0)
  const totalApproved = [...approvedMap.values()].reduce((a, b) => a + b, 0)
  const totalFinalized = [...finalizedMap.values()].reduce((a, b) => a + b, 0)

  // 30-day time series
  const timeSeries: { date: string; views: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    timeSeries.push({ date: d.toISOString().split('T')[0], views: 0 })
  }
  for (const v of views30d) {
    const dateStr = v.viewedAt.toISOString().split('T')[0]
    const entry = timeSeries.find(t => t.date === dateStr)
    if (entry) entry.views++
  }

  const topListing = rows[0] ?? null

  return NextResponse.json({
    homes: rows,
    totals: { today: viewsToday, thisWeek: viewsWeek, thisMonth: viewsMonth },
    topListing,
    funnel: { views: viewsMonth, saves: totalSaves, inquiries: totalInquiries, approved: totalApproved, finalized: totalFinalized },
    timeSeries,
  })
}
