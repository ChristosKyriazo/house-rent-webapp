import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/areas/search?q=query&limit=10&city=Athens&country=Greece
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const city = searchParams.get('city') || null
    const country = searchParams.get('country') || null

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ areas: [] })
    }

    // First, check if the provided city/country values exist in the database
    // This helps us decide whether to apply filters or not
    let cityFilter: any = null
    let countryFilter: any = null

    if (city && city.trim().length > 0) {
      const cityValue = city.trim()
      // Check if this city exists in either English or Greek fields
      const cityExists = await prisma.area.findFirst({
        where: {
          OR: [
            { city: cityValue },
            { cityGreek: cityValue },
          ],
        },
        select: { id: true },
      })

      // Only apply city filter if the city exists in the database
      if (cityExists) {
        cityFilter = {
          OR: [
            { city: cityValue },
            { cityGreek: cityValue },
          ],
        }
      }
    }

    if (country && country.trim().length > 0) {
      const countryValue = country.trim()
      // Check if this country exists in either English or Greek fields
      const countryExists = await prisma.area.findFirst({
        where: {
          OR: [
            { country: countryValue },
            { countryGreek: countryValue },
          ],
        },
        select: { id: true },
      })

      // Only apply country filter if the country exists in the database
      if (countryExists) {
        countryFilter = {
          OR: [
            { country: countryValue },
            { countryGreek: countryValue },
          ],
        }
      }
    }

    // Build where clause with optional city and country filters
    const whereClause: any = {
      name: {
        contains: query,
      },
    }

    // Add filters only if they were found in the database
    if (cityFilter) {
      whereClause.AND = whereClause.AND || []
      whereClause.AND.push(cityFilter)
    }

    if (countryFilter) {
      whereClause.AND = whereClause.AND || []
      whereClause.AND.push(countryFilter)
    }

    // Search for areas that match the query and filters
    // For SQLite, we'll use contains which is case-sensitive, but that's acceptable
    // For PostgreSQL in production, we could use mode: 'insensitive'
    const areas = await prisma.area.findMany({
      where: whereClause,
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
        cityGreek: true,
        country: true,
        countryGreek: true,
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

