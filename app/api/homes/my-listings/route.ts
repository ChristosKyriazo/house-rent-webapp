import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET: Get all homes owned by the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an owner
    const userRole = (user.role || 'user').toLowerCase()
    if (userRole !== 'owner' && userRole !== 'both') {
      return NextResponse.json(
        { error: 'Only owners can view their listings' },
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
          console.error('Error parsing photos:', e)
          photos = []
        }
      }

      return {
        ...home,
        photos: photos,
        createdAt: home.createdAt.toISOString(),
        updatedAt: home.updatedAt.toISOString(),
        availableFrom: home.availableFrom.toISOString(),
      }
    })

    return NextResponse.json({ homes: formattedHomes }, { status: 200 })
  } catch (error) {
    console.error('Get my listings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

