import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET: Get all approved inquiries
// For owners: shows all inquiries they approved with user info
// For users: shows all inquiries they made that were approved with owner/contact info
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the selected role from query parameter (for users with 'both' role)
    const searchParams = request.nextUrl.searchParams
    const selectedRole = searchParams.get('role') // 'owner' or 'user'
    
    const userRole = (user.role || 'user').toLowerCase()
    
    // Determine which role to use for filtering
    // If user has 'both' role and selectedRole is provided, use selectedRole
    // Otherwise use the user's actual role
    let displayRole = userRole
    if (userRole === 'both' && selectedRole) {
      displayRole = selectedRole.toLowerCase()
    }

    if (displayRole === 'owner') {
      // Owner view: Get all approved inquiries for homes owned by the user
      const ownerHomes = await prisma.home.findMany({
        where: { ownerId: user.id },
        select: { id: true },
      })

      const homeIds = ownerHomes.map(home => home.id)

      const inquiries = await prisma.inquiry.findMany({
        where: {
          homeId: { in: homeIds },
          approved: true,
        },
        select: {
          id: true,
          key: true,
          finalized: true,
          contactInfo: true,
          updatedAt: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
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
          updatedAt: 'desc', // Most recently approved first
        },
      })

      // Format response for owner
      const approvedInquiries = inquiries.map(inquiry => {
        // Parse photos from JSON string
        let photos: string[] = []
        if (inquiry.home.photos) {
          try {
            const parsed = JSON.parse(inquiry.home.photos)
            photos = Array.isArray(parsed) ? parsed : []
          } catch (e) {
            photos = []
          }
        }

        // Parse contact info
        let contactInfo = null
        if (inquiry.contactInfo) {
          try {
            contactInfo = JSON.parse(inquiry.contactInfo)
          } catch (e) {
            contactInfo = null
          }
        }

        return {
          id: inquiry.id,
          key: inquiry.key,
          finalized: inquiry.finalized || false,
          home: {
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
          },
          user: {
            id: inquiry.user.id,
            name: inquiry.user.name,
            email: inquiry.user.email,
            role: inquiry.user.role,
          },
          contactInfo: contactInfo,
          approvedAt: inquiry.updatedAt,
          createdAt: inquiry.createdAt,
        }
      })

      return NextResponse.json({ approvedInquiries, totalCount: approvedInquiries.length }, { status: 200 })
    } else {
      // User view: Get all inquiries the user made that were approved
      const inquiries = await prisma.inquiry.findMany({
        where: {
          userId: user.id,
          approved: true,
        },
        select: {
          id: true,
          key: true,
          finalized: true,
          contactInfo: true,
          updatedAt: true,
          createdAt: true,
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
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          updatedAt: 'desc', // Most recently approved first
        },
      })

      // Format response for user
      const approvedInquiries = inquiries.map(inquiry => {
        // Parse photos from JSON string
        let photos: string[] = []
        if (inquiry.home.photos) {
          try {
            const parsed = JSON.parse(inquiry.home.photos)
            photos = Array.isArray(parsed) ? parsed : []
          } catch (e) {
            photos = []
          }
        }

        // Parse contact info
        let contactInfo = null
        if (inquiry.contactInfo) {
          try {
            contactInfo = JSON.parse(inquiry.contactInfo)
          } catch (e) {
            contactInfo = null
          }
        }

        return {
          id: inquiry.id,
          key: inquiry.key,
          finalized: inquiry.finalized || false,
          home: {
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
          },
          contactInfo: contactInfo,
          approvedAt: inquiry.updatedAt,
          createdAt: inquiry.createdAt,
        }
      })

      return NextResponse.json({ approvedInquiries, totalCount: approvedInquiries.length }, { status: 200 })
    }
  } catch (error) {
    console.error('Get approved inquiries error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

