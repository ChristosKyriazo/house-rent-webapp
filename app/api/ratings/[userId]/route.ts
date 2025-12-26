import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: Get all individual ratings for a specific user by type
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> | { userId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const userId = parseInt(resolvedParams.userId)

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // 'owner' or 'renter'

    if (!type || (type !== 'owner' && type !== 'renter')) {
      return NextResponse.json(
        { error: 'Type parameter is required and must be "owner" or "renter"' },
        { status: 400 }
      )
    }

    // Fetch all ratings for this user with the specified type
    const ratings = await prisma.rating.findMany({
      where: {
        ratedUserId: userId,
        type: type,
      },
      include: {
        rater: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Most recent first
      },
    })

    return NextResponse.json({ ratings }, { status: 200 })
  } catch (error) {
    console.error('Get user ratings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

