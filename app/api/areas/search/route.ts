import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/areas/search?q=query&limit=10
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ areas: [] })
    }

    // Search for areas that match the query
    // For SQLite, we'll use contains which is case-sensitive, but that's acceptable
    // For PostgreSQL in production, we could use mode: 'insensitive'
    const areas = await prisma.area.findMany({
      where: {
        name: {
          contains: query,
        },
      },
      take: limit,
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        key: true,
        name: true,
        nameGreek: true,
        city: true,
        country: true,
        safety: true,
        vibe: true,
      },
    })

    return NextResponse.json({ areas })
  } catch (error) {
    console.error('Search areas error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

