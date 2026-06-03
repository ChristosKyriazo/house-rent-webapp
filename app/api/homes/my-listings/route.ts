import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { requestLogger } from '@/lib/logger'

// GET: Get all homes owned by the current user
export async function GET(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an owner (brokers are treated like owners)
    const userRole = (user.role || 'user').toLowerCase()
    if (userRole !== 'owner' && userRole !== 'both' && userRole !== 'broker') {
      return NextResponse.json(
        { error: 'Only owners and brokers can view their listings' },
        { status: 403 }
      )
    }

            // Get all homes owned by the user (including finalized ones)
            const homes = await prisma.home.findMany({
              where: {
                ownerId: user.id,
              },
              orderBy: { createdAt: 'desc' },
              include: {
                owner: {
                  select: { id: true, email: true, name: true },
                },
                _count: {
                  select: {
                    inquiries: { where: { dismissed: false, finalized: false } },
                  },
                },
              },
            })

    // Parse photos from JSON strings and serialize dates
    const formattedHomes = homes.map(home => {
      let photos: string[] = []
      if (home.photos) {
        try {
          const parsed = JSON.parse(home.photos)
          photos = Array.isArray(parsed) ? parsed : []
        } catch (e) {
          log.error({ err: e }, 'Error parsing photos')
          photos = []
        }
      }

      return {
        ...home,
        photos: photos,
        inquiryCount: home._count.inquiries,
        createdAt: home.createdAt.toISOString(),
        updatedAt: home.updatedAt.toISOString(),
        availableFrom: home.availableFrom.toISOString(),
      }
    })

    const slotsUsed = formattedHomes.filter(h => h.slotPromoted).length
    return NextResponse.json({ homes: formattedHomes, slotsUsed }, { status: 200 })
  } catch (error) {
    log.error({ err: error }, 'Get my listings error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

