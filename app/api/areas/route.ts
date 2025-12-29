import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/areas - get all areas (for translation purposes)
export async function GET(request: NextRequest) {
  try {
    const areas = await prisma.area.findMany({
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        nameGreek: true,
        city: true,
        cityGreek: true,
        country: true,
        countryGreek: true,
        safety: true,
        vibe: true,
      },
    })

    return NextResponse.json({ areas })
  } catch (error) {
    console.error('Get areas error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

