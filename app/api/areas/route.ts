import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
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

// POST /api/areas - create a new area (owners/brokers only)
export async function POST(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    const role = user?.role || 'user'
    if (!user || (role !== 'owner' && role !== 'both' && role !== 'broker')) {
      return NextResponse.json({ error: 'Only owners can create areas' }, { status: 403 })
    }

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Return existing area instead of duplicating
    const existing = await prisma.area.findFirst({
      where: { OR: [{ name }, { nameGreek: name }] },
      select: { id: true, key: true, name: true, nameGreek: true, city: true, cityGreek: true, country: true, countryGreek: true },
    })
    if (existing) return NextResponse.json({ area: existing })

    const isGreek = /[Ͱ-Ͽἀ-῿]/.test(name)
    const city = typeof body.city === 'string' ? body.city.trim() || null : null
    const country = typeof body.country === 'string' ? body.country.trim() || null : null

    // Resolve canonical city/country + Greek variants from existing areas so the new
    // area is discoverable regardless of which language the search form uses.
    const [cityRef, countryRef] = await Promise.all([
      city ? prisma.area.findFirst({ where: { OR: [{ city }, { cityGreek: city }] }, select: { city: true, cityGreek: true } }) : null,
      country ? prisma.area.findFirst({ where: { OR: [{ country }, { countryGreek: country }] }, select: { country: true, countryGreek: true } }) : null,
    ])

    const area = await prisma.area.create({
      data: {
        name,
        nameGreek: isGreek ? name : null,
        city: cityRef?.city || city,
        cityGreek: cityRef?.cityGreek || null,
        country: countryRef?.country || country,
        countryGreek: countryRef?.countryGreek || null,
      },
      select: { id: true, key: true, name: true, nameGreek: true, city: true, cityGreek: true, country: true, countryGreek: true },
    })

    return NextResponse.json({ area }, { status: 201 })
  } catch (error) {
    log.error({ err: error }, 'Create area error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

