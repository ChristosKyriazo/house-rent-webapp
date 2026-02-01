import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { removeGreekAccents } from '@/lib/utils'

// GET /api/cities/search?q=query&limit=10&country=Greece
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const country = searchParams.get('country') || null

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ cities: [] })
    }

    // Build base where clause for country filter
    let countryFilter: any = null
    if (country && country.trim().length > 0) {
      const countryValue = country.trim()
      const countryExists = await prisma.area.findFirst({
        where: {
          OR: [
            { country: countryValue },
            { countryGreek: countryValue },
          ],
        },
        select: { id: true },
      })

      if (countryExists) {
        countryFilter = {
          OR: [
            { country: countryValue },
            { countryGreek: countryValue },
          ],
        }
      }
    }

    // Fetch all areas (or filtered by country)
    let allAreas = await prisma.area.findMany({
      where: countryFilter ? { AND: [countryFilter] } : undefined,
      select: {
        city: true,
        cityGreek: true,
        country: true,
        countryGreek: true,
      },
    })

    // Get unique cities
    const cityMap = new Map<string, { city: string; cityGreek: string | null; country: string; countryGreek: string | null }>()
    allAreas.forEach(area => {
      if (area.city) {
        const key = area.city.toLowerCase()
        if (!cityMap.has(key)) {
          cityMap.set(key, {
            city: area.city,
            cityGreek: area.cityGreek,
            country: area.country || '',
            countryGreek: area.countryGreek || null,
          })
        }
      }
    })

    // Filter cities with case-insensitive and accent-insensitive matching
    const queryLower = query.toLowerCase().trim()
    const queryNormalized = removeGreekAccents(queryLower)
    
    const filteredCities = Array.from(cityMap.values()).filter(cityData => {
      const cityLower = cityData.city.toLowerCase()
      const cityNormalized = removeGreekAccents(cityLower)
      const cityMatch = cityLower.includes(queryLower) || cityNormalized.includes(queryNormalized)
      
      if (cityData.cityGreek) {
        const cityGreekLower = cityData.cityGreek.toLowerCase()
        const cityGreekNormalized = removeGreekAccents(cityGreekLower)
        const cityGreekMatch = cityGreekLower.includes(queryLower) || cityGreekNormalized.includes(queryNormalized)
        return cityMatch || cityGreekMatch
      }
      
      return cityMatch
    })

    // Sort and limit results
    const cities = filteredCities
      .sort((a, b) => {
        const aCityLower = a.city.toLowerCase()
        const aCityGreekLower = a.cityGreek?.toLowerCase() || ''
        const aCityGreekNormalized = removeGreekAccents(aCityGreekLower)
        
        const bCityLower = b.city.toLowerCase()
        const bCityGreekLower = b.cityGreek?.toLowerCase() || ''
        const bCityGreekNormalized = removeGreekAccents(bCityGreekLower)
        
        const aStarts = aCityLower.startsWith(queryLower) || 
                       aCityGreekLower.startsWith(queryLower) || 
                       aCityGreekNormalized.startsWith(queryNormalized)
        const bStarts = bCityLower.startsWith(queryLower) || 
                       bCityGreekLower.startsWith(queryLower) || 
                       bCityGreekNormalized.startsWith(queryNormalized)
        
        if (aStarts && !bStarts) return -1
        if (!aStarts && bStarts) return 1
        return a.city.localeCompare(b.city)
      })
      .slice(0, limit)

    return NextResponse.json({ cities })
  } catch (error) {
    console.error('Search cities error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}




