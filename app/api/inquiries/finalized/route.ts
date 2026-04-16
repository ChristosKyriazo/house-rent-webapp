import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { serverError, unauthorized } from '@/lib/api-utils'

// GET: Get all finalized inquiries for the current user (for rating purposes)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    const searchParams = request.nextUrl.searchParams
    const roleParam = searchParams.get('role') // 'owner' or 'user'

    // Determine the effective role for filtering
    const effectiveRole = (user.role === 'both' && roleParam) ? roleParam : (user.role || 'user')

    let finalizedInquiries

    if (effectiveRole === 'owner') {
      // Owner view: Get finalized inquiries for their homes
      const ownerHomes = await prisma.home.findMany({
        where: { ownerId: user.id },
        select: { id: true },
      })

      const homeIds = ownerHomes.map(home => home.id)

      finalizedInquiries = await prisma.inquiry.findMany({
        where: {
          homeId: { in: homeIds },
          finalized: true,
        },
        include: {
          user: {
            select: {
              id: true,
              key: true,
              name: true,
              email: true,
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
              owner: {
                select: {
                  id: true,
                  key: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    } else {
      // User view: Get their own finalized inquiries
      finalizedInquiries = await prisma.inquiry.findMany({
        where: {
          userId: user.id,
          finalized: true,
        },
        include: {
          user: {
            select: {
              id: true,
              key: true,
              name: true,
              email: true,
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
              owner: {
                select: {
                  id: true,
                  key: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    }

    // Check which ones already have ratings
    // Since we allow multiple ratings, check if there's at least one rating
    const inquiryIds = finalizedInquiries.map(iq => iq.id)
    const existingRatings = await prisma.rating.findMany({
      where: {
        raterId: user.id,
        type: effectiveRole === 'owner' ? 'renter' : 'owner', // Owner rates renter, user rates owner
      },
    })

    const ratedUserIds = new Set(existingRatings.map(r => r.ratedUserId))
    // Get the most recent rating for each user (for the re-rating button logic)
    const ratingMap = new Map<number, Date>()
    existingRatings.forEach(rating => {
      const existing = ratingMap.get(rating.ratedUserId)
      // Store the most recent rating date (createdAt, since we're creating new ratings now)
      if (!existing || new Date(rating.createdAt) > existing) {
        ratingMap.set(rating.ratedUserId, new Date(rating.createdAt))
      }
    })

    // Format response
    const formattedInquiries = finalizedInquiries.map(inquiry => {
      const otherUser = effectiveRole === 'owner' ? inquiry.user : inquiry.home.owner
      const alreadyRated = ratedUserIds.has(otherUser.id)
      const lastRatingDate = ratingMap.get(otherUser.id)

      return {
        id: inquiry.id,
        key: inquiry.key,
        home: inquiry.home,
        otherUser: {
          id: otherUser.id,
          key: otherUser.key,
          name: otherUser.name,
          email: otherUser.email,
        },
        finalizedAt: inquiry.updatedAt,
        alreadyRated: alreadyRated,
        // Use the most recent rating's creation date for re-rating button logic
        lastRatingDate: lastRatingDate ? lastRatingDate.toISOString() : undefined,
      }
    })

    return NextResponse.json({ finalizedInquiries: formattedInquiries }, { status: 200 })
  } catch (error) {
    console.error('Get finalized inquiries error:', error)
    return serverError()
  }
}




