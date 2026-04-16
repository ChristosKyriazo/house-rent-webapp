import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, serverError, unauthorized } from '@/lib/api-utils'

// GET: Get all approved inquiries
// For owners: shows all inquiries they approved with user info
// For users: shows all inquiries they made that were approved with owner/contact info
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    // Get the selected role from query parameter (for users with 'both' role)
    const searchParams = request.nextUrl.searchParams
    const selectedRole = searchParams.get('role') // 'owner' or 'user'
    if (selectedRole && selectedRole !== 'owner' && selectedRole !== 'user') {
      return badRequest('Invalid role. Must be "owner" or "user"')
    }
    
    const userRole = (user.role || 'user').toLowerCase()
    
    // Determine which role to use for filtering
    // If user has 'both' role and selectedRole is provided, use selectedRole
    // Otherwise use the user's actual role
    // Brokers are treated like owners
    let displayRole = userRole
    if (userRole === 'both' && selectedRole) {
      displayRole = selectedRole.toLowerCase()
    }
    // Treat brokers as owners
    if (userRole === 'broker') {
      displayRole = 'owner'
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
          finalized: false, // Exclude finalized inquiries
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
              ownerId: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc', // Most recently approved first
        },
      })

      // Get all pending finalization notifications for these inquiries
      const inquiryIds = inquiries.map(inq => inq.id)
      const pendingFinalizations = await prisma.notification.findMany({
        where: {
          inquiryId: { in: inquiryIds },
          type: 'finalize',
          deleted: false,
        },
        select: {
          inquiryId: true,
        },
      })
      const pendingFinalizationInquiryIds = new Set(pendingFinalizations.map(n => n.inquiryId).filter((id): id is number => id !== null))

      // Get all bookings for these inquiries, including inquiryId=null rows tied via availability.homeId + renter
      const bookings = await prisma.booking.findMany({
        where: {
          OR: [
            { inquiryId: { in: inquiryIds } },
            {
              inquiryId: null,
              ownerId: user.id,
              NOT: { status: 'cancelled' },
              availability: { homeId: { in: homeIds } },
            },
          ],
        },
        select: {
          inquiryId: true,
          userId: true,
          startTime: true,
          endTime: true,
          availability: { select: { homeId: true } },
        },
      })

      const bookingsByInquiry = new Map<number, typeof bookings>()
      bookings.forEach((booking) => {
        let targetId: number | null = booking.inquiryId
        if (!targetId && booking.availability?.homeId != null) {
          const hid = booking.availability.homeId
          const match = inquiries.find(
            (iq) => iq.home.id === hid && iq.user.id === booking.userId
          )
          if (match) targetId = match.id
        }
        if (targetId) {
          if (!bookingsByInquiry.has(targetId)) {
            bookingsByInquiry.set(targetId, [])
          }
          bookingsByInquiry.get(targetId)!.push(booking)
        }
      })

      // Get all availabilities for these homes (reuse homeIds from above)
      const availabilities = await prisma.availability.findMany({
        where: {
          homeId: { in: homeIds },
        },
        select: {
          homeId: true,
        },
      })

      // Group availabilities by homeId
      const availabilitiesByHome = new Map<number, number>()
      availabilities.forEach(avail => {
        availabilitiesByHome.set(avail.homeId, (availabilitiesByHome.get(avail.homeId) || 0) + 1)
      })

      // Format response for owner
      const now = new Date()
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

        // Determine status
        let status: 'approved' | 'waiting_for_schedule' | 'scheduled' | 'pre_finalization' | 'awaiting_finalization' = 'approved'
        
        if (pendingFinalizationInquiryIds.has(inquiry.id)) {
          status = 'awaiting_finalization'
        } else {
          const inquiryBookings = bookingsByInquiry.get(inquiry.id) || []
          if (inquiryBookings.length > 0) {
            // Check if meeting has passed
            const latestBooking = inquiryBookings.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())[0]
            const meetingEndTime = new Date(latestBooking.endTime)
            if (now > meetingEndTime) {
              status = 'pre_finalization'
            } else {
              status = 'scheduled'
            }
          } else {
            // Check if availability has been set
            const hasAvailability = (availabilitiesByHome.get(inquiry.home.id) || 0) > 0
            if (hasAvailability) {
              status = 'waiting_for_schedule'
            } else {
              status = 'approved'
            }
          }
        }
        return {
          id: inquiry.id,
          key: inquiry.key,
          finalized: inquiry.finalized || false,
          waitingForFinalization: pendingFinalizationInquiryIds.has(inquiry.id),
          status: status,
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
            ownerId: inquiry.home.ownerId,
          },
          user: {
            id: inquiry.user.id,
            name: inquiry.user.name,
            email: inquiry.user.email,
            role: inquiry.user.role,
          },
          owner: undefined, // Don't show owner's own info
          contactInfo: contactInfo, // Show user's contact info from slot pick
          approvedAt: inquiry.updatedAt,
          createdAt: inquiry.createdAt,
        }
      })

      return NextResponse.json({ approvedInquiries, totalCount: approvedInquiries.length }, { status: 200 })
    } else {
      // User view: Get all inquiries the user made that were approved
      // First, get all inquiries to find their homeIds
      const allInquiries = await prisma.inquiry.findMany({
        where: {
          userId: user.id,
          approved: true,
          finalized: false,
        },
        select: {
          id: true,
          homeId: true,
        },
      })

      // Get all valid homeIds that exist
      const homeIds = allInquiries.map(i => i.homeId).filter((id): id is number => id !== null)
      const validHomes = await prisma.home.findMany({
        where: {
          id: { in: homeIds },
        },
        select: { id: true },
      })
      const validHomeIds = new Set(validHomes.map(h => h.id))

      // Now fetch inquiries only for valid homes
      const inquiries = await prisma.inquiry.findMany({
        where: {
          userId: user.id,
          approved: true,
          finalized: false,
          homeId: { in: Array.from(validHomeIds) },
        },
        include: {
          home: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  occupation: true,
                },
              },
            },
          },
        },
        orderBy: {
          updatedAt: 'desc', // Most recently approved first
        },
      })

      // Get all pending finalization notifications for these inquiries (for users)
      const inquiryIds = inquiries.map(inq => inq.id)
      const pendingFinalizations = await prisma.notification.findMany({
        where: {
          inquiryId: { in: inquiryIds },
          type: 'finalize',
          deleted: false,
          role: 'user', // Only notifications sent to users
        },
        select: {
          inquiryId: true,
        },
      })
      const pendingFinalizationInquiryIds = new Set(pendingFinalizations.map(n => n.inquiryId).filter((id): id is number => id !== null))

      const homeIdsForUsers = inquiries.map(inq => inq.home!.id)

      // Get all bookings for these inquiries, including inquiryId=null rows tied via availability.homeId
      const bookings = await prisma.booking.findMany({
        where: {
          OR: [
            { inquiryId: { in: inquiryIds } },
            {
              inquiryId: null,
              userId: user.id,
              NOT: { status: 'cancelled' },
              availability: { homeId: { in: homeIdsForUsers } },
            },
          ],
        },
        select: {
          inquiryId: true,
          startTime: true,
          endTime: true,
          availability: { select: { homeId: true } },
        },
      })

      const bookingsByInquiry = new Map<number, typeof bookings>()
      bookings.forEach((booking) => {
        let targetId: number | null = booking.inquiryId
        if (!targetId && booking.availability?.homeId != null) {
          const match = inquiries.find((iq) => iq.homeId === booking.availability!.homeId)
          if (match) targetId = match.id
        }
        if (targetId) {
          if (!bookingsByInquiry.has(targetId)) {
            bookingsByInquiry.set(targetId, [])
          }
          bookingsByInquiry.get(targetId)!.push(booking)
        }
      })

      // Get all availabilities for these homes
      const availabilities = await prisma.availability.findMany({
        where: {
          homeId: { in: homeIdsForUsers },
        },
        select: {
          homeId: true,
        },
      })

      // Group availabilities by homeId
      const availabilitiesByHome = new Map<number, number>()
      availabilities.forEach(avail => {
        availabilitiesByHome.set(avail.homeId, (availabilitiesByHome.get(avail.homeId) || 0) + 1)
      })

      // Format response for user
      const now = new Date()
      const approvedInquiries = inquiries.map(inquiry => {
        // TypeScript: we've filtered to only valid homes, so home is guaranteed to exist
        const home = inquiry.home!
        
        // Parse photos from JSON string
        let photos: string[] = []
        if (home.photos) {
          try {
            const parsed = JSON.parse(home.photos)
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

        // Determine status for users
        let status: 'approved' | 'waiting_for_schedule' | 'scheduled' | 'pre_finalization' | 'awaiting_finalization' = 'approved'
        
        if (pendingFinalizationInquiryIds.has(inquiry.id)) {
          status = 'awaiting_finalization'
        } else {
          const inquiryBookings = bookingsByInquiry.get(inquiry.id) || []
          if (inquiryBookings.length > 0) {
            // Check if meeting has passed
            const latestBooking = inquiryBookings.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())[0]
            const meetingEndTime = new Date(latestBooking.endTime)
            if (now > meetingEndTime) {
              status = 'pre_finalization'
            } else {
              status = 'scheduled'
            }
          } else {
            // Check if availability has been set
            const hasAvailability = (availabilitiesByHome.get(inquiry.home!.id) || 0) > 0
            if (hasAvailability) {
              status = 'waiting_for_schedule'
            } else {
              status = 'approved'
            }
          }
        }
        return {
          id: inquiry.id,
          key: inquiry.key,
          finalized: inquiry.finalized || false,
          waitingForFinalization: pendingFinalizationInquiryIds.has(inquiry.id),
          status: status,
          home: {
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
            photos: photos,
            ownerId: home.ownerId,
          },
          owner: {
            id: home.owner.id,
            name: home.owner.name,
            email: home.owner.email,
            occupation: home.owner.occupation,
          },
          user: undefined, // Don't show user's own info
          contactInfo: contactInfo,
          approvedAt: inquiry.updatedAt,
          createdAt: inquiry.createdAt,
        }
      })

      return NextResponse.json({ approvedInquiries, totalCount: approvedInquiries.length }, { status: 200 })
    }
  } catch (error) {
    console.error('Get approved inquiries error:', error)
    return serverError()
  }
}

