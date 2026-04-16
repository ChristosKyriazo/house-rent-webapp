import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { badRequest, forbidden, notFound, parsePositiveInt, serverError, unauthorized } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    // Check if user has owner/broker role
    const userRole = user.role || 'user'
    if (userRole !== 'owner' && userRole !== 'both' && userRole !== 'broker') {
      return forbidden('Only owners and brokers can promote homes')
    }

    const body = await request.json()
    const { homeKey, days, isPremium } = body

    const parsedDays = parsePositiveInt(days)

    if (!homeKey || !parsedDays) {
      return badRequest('Missing required fields')
    }

    // Validate days
    if (parsedDays !== 7 && parsedDays !== 30) {
      return badRequest('Invalid promotion duration. Must be 7 or 30 days.')
    }

    // Find the home and verify ownership
    const home = await prisma.home.findUnique({
      where: { key: homeKey },
      select: { id: true, ownerId: true },
    })

    if (!home) {
      return notFound('Home not found')
    }

    if (home.ownerId !== user.id) {
      return forbidden('You do not own this home')
    }

    // Get current home to check existing promotions
    const currentHome = await prisma.home.findUnique({
      where: { key: homeKey },
      select: { promotedUntil: true, premiumPromotedUntil: true },
    })

    // Calculate promotion end date
    const now = new Date()
    const promotedUntil = new Date(now.getTime() + parsedDays * 24 * 60 * 60 * 1000)

    // Update home with promotion
    if (isPremium) {
      // Premium promotion: set premiumPromotedUntil
      // If standard promotion exists and is later, keep it; otherwise update it too
      const standardPromotedUntil = currentHome?.promotedUntil && currentHome.promotedUntil > promotedUntil
        ? currentHome.promotedUntil
        : promotedUntil

      await prisma.home.update({
        where: { key: homeKey },
        data: {
          premiumPromotedUntil: promotedUntil,
          promotedUntil: standardPromotedUntil,
        },
      })
    } else {
      // Standard promotion: set promotedUntil
      await prisma.home.update({
        where: { key: homeKey },
        data: {
          promotedUntil: promotedUntil,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error promoting home:', error)
    return serverError()
  }
}

