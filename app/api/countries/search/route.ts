import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { removeGreekAccents } from '@/lib/utils'

// GET /api/countries/search?q=query&limit=10
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ countries: [] })
    }

    // Fetch all areas to get unique countries
    const allAreas = await prisma.area.findMany({
      select: {
        country: true,
        countryGreek: true,
      },
    })

    // Get unique countries
    const countryMap = new Map<string, { country: string; countryGreek: string | null }>()
    allAreas.forEach(area => {
      if (area.country) {
        const key = area.country.toLowerCase()
        if (!countryMap.has(key)) {
          countryMap.set(key, {
            country: area.country,
            countryGreek: area.countryGreek,
          })
        }
      }
    })

    // Filter countries with case-insensitive and accent-insensitive matching
    const queryLower = query.toLowerCase().trim()
    const queryNormalized = removeGreekAccents(queryLower)
    
    const filteredCountries = Array.from(countryMap.values()).filter(countryData => {
      const countryLower = countryData.country.toLowerCase()
      const countryNormalized = removeGreekAccents(countryLower)
      const countryMatch = countryLower.includes(queryLower) || countryNormalized.includes(queryNormalized)
      
      if (countryData.countryGreek) {
        const countryGreekLower = countryData.countryGreek.toLowerCase()
        const countryGreekNormalized = removeGreekAccents(countryGreekLower)
        const countryGreekMatch = countryGreekLower.includes(queryLower) || countryGreekNormalized.includes(queryNormalized)
        return countryMatch || countryGreekMatch
      }
      
      return countryMatch
    })

    // Sort and limit results
    const countries = filteredCountries
      .sort((a, b) => {
        const aCountryLower = a.country.toLowerCase()
        const aCountryGreekLower = a.countryGreek?.toLowerCase() || ''
        const aCountryGreekNormalized = removeGreekAccents(aCountryGreekLower)
        
        const bCountryLower = b.country.toLowerCase()
        const bCountryGreekLower = b.countryGreek?.toLowerCase() || ''
        const bCountryGreekNormalized = removeGreekAccents(bCountryGreekLower)
        
        const aStarts = aCountryLower.startsWith(queryLower) || 
                       aCountryGreekLower.startsWith(queryLower) || 
                       aCountryGreekNormalized.startsWith(queryNormalized)
        const bStarts = bCountryLower.startsWith(queryLower) || 
                       bCountryGreekLower.startsWith(queryLower) || 
                       bCountryGreekNormalized.startsWith(queryNormalized)
        
        if (aStarts && !bStarts) return -1
        if (!aStarts && bStarts) return 1
        return a.country.localeCompare(b.country)
      })
      .slice(0, limit)

    return NextResponse.json({ countries })
  } catch (error) {
    console.error('Search countries error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}




