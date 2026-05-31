import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requestLogger } from '@/lib/logger'

// GET /api/areas - get all areas (for translation purposes)
export async function GET(request: NextRequest) {
  const log = requestLogger(request)
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

    return NextResponse.json(
      { areas },
      { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' } }
    )
  } catch (error) {
    log.error({ err: error }, 'Get areas error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

