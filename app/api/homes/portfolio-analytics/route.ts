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
    select: { id: true, key: true, title: true, titleGreek: true, city: true, listingType: true, pricePerMonth: true },
  })
  if (homes.length === 0) return NextResponse.json({ homes: [], totals: { today: 0, thisWeek: 0, thisMonth: 0 }, topListing: null })

  const homeIds = homes.map(h => h.id)
  const [today, thisWeek, thisMonth] = [startOf('day'), startOf('week'), startOf('month')]

  const [viewsToday, viewsWeek, viewsMonth, viewsByHome, inquiriesByHome, savesByHome] = await Promise.all([
    prisma.listingView.count({ where: { homeId: { in: homeIds }, viewedAt: { gte: today } } }),
    prisma.listingView.count({ where: { homeId: { in: homeIds }, viewedAt: { gte: thisWeek } } }),
    prisma.listingView.count({ where: { homeId: { in: homeIds }, viewedAt: { gte: thisMonth } } }),
    prisma.listingView.groupBy({
      by: ['homeId'],
      where: { homeId: { in: homeIds }, viewedAt: { gte: thisMonth } },
      _count: { id: true },
    }),
    prisma.inquiry.groupBy({
      by: ['homeId'],
      where: { homeId: { in: homeIds } },
      _count: { id: true },
    }),
    prisma.savedHome.groupBy({
      by: ['homeId'],
      where: { homeId: { in: homeIds } },
      _count: { id: true },
    }),
  ])

  const viewMap = new Map(viewsByHome.map(r => [r.homeId, r._count.id]))
  const inquiryMap = new Map(inquiriesByHome.map(r => [r.homeId, r._count.id]))
  const saveMap = new Map(savesByHome.map(r => [r.homeId, r._count.id]))

  const rows = homes.map(h => ({
    key: h.key,
    title: h.title,
    titleGreek: h.titleGreek,
    city: h.city,
    listingType: h.listingType,
    pricePerMonth: h.pricePerMonth,
    viewsThisMonth: viewMap.get(h.id) ?? 0,
    inquiries: inquiryMap.get(h.id) ?? 0,
    saves: saveMap.get(h.id) ?? 0,
    inquiryRate: viewMap.get(h.id)
      ? ((inquiryMap.get(h.id) ?? 0) / viewMap.get(h.id)! * 100).toFixed(1)
      : '0.0',
  })).sort((a, b) => b.viewsThisMonth - a.viewsThisMonth)

  const topListing = rows[0] ?? null

  return NextResponse.json({
    homes: rows,
    totals: { today: viewsToday, thisWeek: viewsWeek, thisMonth: viewsMonth },
    topListing,
  })
}
