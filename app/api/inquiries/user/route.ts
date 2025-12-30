import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET: Get all homes that the current user has inquired about
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all inquiries for this user (excluding approved, dismissed, and finalized)
    const inquiries = await prisma.inquiry.findMany({
      where: { 
        userId: user.id,
        approved: false,
        dismissed: false,
        finalized: false, // Exclude finalized inquiries
      },
      include: {
        home: {
          select: {
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Most recent first
      },
    })

    // Format the response
    const homes = inquiries.map(inquiry => {
      // Parse photos from JSON string
      let photos: string[] = []
      if (inquiry.home.photos) {
        try {
          const parsed = JSON.parse(inquiry.home.photos)
          photos = Array.isArray(parsed) ? parsed : []
        } catch (e) {
          console.error('Error parsing photos:', e)
          photos = []
        }
      }

      return {
        id: inquiry.home.id,
        key: inquiry.home.key,
        title: inquiry.home.title,
        street: inquiry.home.street,
        city: inquiry.home.city,
        country: inquiry.home.country,
        area: inquiry.home.area,
        price: inquiry.home.pricePerMonth,
        size: inquiry.home.sizeSqMeters,
        bedrooms: inquiry.home.bedrooms,
        bathrooms: inquiry.home.bathrooms,
        listingType: inquiry.home.listingType,
        photos: photos,
        inquiryDate: inquiry.createdAt,
      }
    })

    return NextResponse.json({ homes, totalInquiries: homes.length }, { status: 200 })
  } catch (error) {
    console.error('Get user inquiries error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

