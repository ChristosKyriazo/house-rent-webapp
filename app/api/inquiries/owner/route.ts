import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET: Get all inquiries for homes owned by the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an owner (brokers are treated like owners)
    const userRole = user.role || 'user'
    if (userRole !== 'owner' && userRole !== 'both' && userRole !== 'broker') {
      return NextResponse.json(
        { error: 'Only owners and brokers can view inquiries' },
        { status: 403 }
      )
    }

    // Get all homes owned by the user
    const ownerHomes = await prisma.home.findMany({
      where: { ownerId: user.id },
      select: {
        id: true,
        key: true,
        title: true,
        street: true,
        city: true,
        country: true,
      },
    })

    const homeIds = ownerHomes.map(home => home.id)

    // Get all inquiries for these homes (excluding approved and dismissed)
    const inquiries = await prisma.inquiry.findMany({
      where: {
        homeId: { in: homeIds },
        approved: false,
        dismissed: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        home: {
          select: {
            id: true,
            key: true,
            title: true,
            city: true,
            country: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Group inquiries by home
    const inquiriesByHome = ownerHomes.map(home => {
      const homeInquiries = inquiries.filter(inq => inq.homeId === home.id)
      return {
        home: {
          id: home.id,
          key: home.key,
          title: home.title,
          street: home.street,
          city: home.city,
          country: home.country,
        },
        inquiryCount: homeInquiries.length,
      }
    })

    // Filter out homes with no inquiries and sort by inquiry count (most inquiries first)
    const homesWithInquiries = inquiriesByHome
      .filter(item => item.inquiryCount > 0)
      .sort((a, b) => b.inquiryCount - a.inquiryCount)

    return NextResponse.json(
      { homesWithInquiries, totalInquiries: inquiries.length },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get owner inquiries error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

