import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const homeSelect = {
  id: true,
  key: true,
  title: true,
  street: true,
  city: true,
  country: true,
  area: true,
  pricePerMonth: true,
  sizeSqMeters: true,
  bedrooms: true,
  bathrooms: true,
  listingType: true,
  photos: true,
} as const

// GET: Current user's active inquiries (pending — not approved/dismissed/finalized).
// Loads inquiries and homes in two steps so orphaned inquiries (home deleted) don't crash Prisma.
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const inquiries = await prisma.inquiry.findMany({
      where: {
        userId: user.id,
        approved: false,
        dismissed: false,
        finalized: false,
      },
      select: {
        homeId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const homeIds = [...new Set(inquiries.map((i) => i.homeId))]
    if (homeIds.length === 0) {
      return NextResponse.json({ homes: [], totalInquiries: 0 }, { status: 200 })
    }

    const homeRows = await prisma.home.findMany({
      where: { id: { in: homeIds } },
      select: homeSelect,
    })
    const homeById = new Map(homeRows.map((h) => [h.id, h]))

    const homesPayload = inquiries
      .map((inquiry) => {
        const home = homeById.get(inquiry.homeId)
        if (!home) {
          return null
        }

        let photos: string[] = []
        if (home.photos) {
          try {
            const parsed = JSON.parse(home.photos)
            photos = Array.isArray(parsed) ? parsed : []
          } catch (e) {
            console.error('Error parsing photos:', e)
            photos = []
          }
        }

        return {
          id: home.id,
          key: home.key,
          title: home.title,
          street: home.street,
          city: home.city,
          country: home.country,
          area: home.area,
          price: home.pricePerMonth,
          size: home.sizeSqMeters,
          bedrooms: home.bedrooms,
          bathrooms: home.bathrooms,
          listingType: home.listingType,
          photos,
          inquiryDate: inquiry.createdAt,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)

    if (process.env.NODE_ENV === 'development' && homesPayload.length < inquiries.length) {
      console.warn(
        `[inquiries/me] Skipped ${inquiries.length - homesPayload.length} inquiry(ies) whose home no longer exists`
      )
    }

    return NextResponse.json(
      { homes: homesPayload, totalInquiries: homesPayload.length },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get user inquiries error:', error)
    const details = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' ? { details } : {}),
      },
      { status: 500 }
    )
  }
}
