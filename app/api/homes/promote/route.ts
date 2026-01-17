import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user has owner/broker role
    const userRole = user.role || 'user'
    if (userRole !== 'owner' && userRole !== 'both' && userRole !== 'broker') {
      return NextResponse.json(
        { error: 'Only owners and brokers can promote homes' },
        { status: 403 }
      )
    }

    // Check subscription (must be Plus or Unlimited)
    const subscription = user.subscription || 1
    if (subscription === 1) {
      return NextResponse.json(
        { error: 'Free plan does not include promotion feature. Please upgrade to Plus or Unlimited.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { homeKey, days, isPremium } = body

    if (!homeKey || !days) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate days
    if (days !== 7 && days !== 30) {
      return NextResponse.json(
        { error: 'Invalid promotion duration. Must be 7 or 30 days.' },
        { status: 400 }
      )
    }

    // Premium promotion (30 days) only for Unlimited
    if (isPremium && subscription !== 3) {
      return NextResponse.json(
        { error: 'Premium promotion (30 days) is only available for Unlimited subscription.' },
        { status: 403 }
      )
    }

    // Find the home and verify ownership
    const home = await prisma.home.findUnique({
      where: { key: homeKey },
      select: { id: true, ownerId: true },
    })

    if (!home) {
      return NextResponse.json(
        { error: 'Home not found' },
        { status: 404 }
      )
    }

    if (home.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'You do not own this home' },
        { status: 403 }
      )
    }

    // Get current home to check existing promotions
    const currentHome = await prisma.home.findUnique({
      where: { key: homeKey },
      select: { promotedUntil: true, premiumPromotedUntil: true },
    })

    // Calculate promotion end date
    const now = new Date()
    const promotedUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

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
    return NextResponse.json(
      { error: 'Failed to promote home' },
      { status: 500 }
    )
  }
}

