import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { removeGreekAccents } from '@/lib/utils'

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

    // Build base where clause for city and country filters
    const baseWhere: any = {}
    
    // Add filters only if they were found in the database
    if (cityFilter || countryFilter) {
      baseWhere.AND = []
      if (cityFilter) {
        baseWhere.AND.push(cityFilter)
      }
      if (countryFilter) {
        baseWhere.AND.push(countryFilter)
      }
    }

    // Fetch all areas (or filtered areas) and filter in JavaScript for case-insensitive matching
    // This is necessary because SQLite's contains is case-sensitive and doesn't handle Greek well
    let allAreas = await prisma.area.findMany({
      where: Object.keys(baseWhere).length > 0 ? baseWhere : undefined,
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

    // Filter areas with case-insensitive and accent-insensitive matching for both English and Greek names
    const queryLower = query.toLowerCase().trim()
    const queryNormalized = removeGreekAccents(queryLower)
    
    const filteredAreas = allAreas.filter(area => {
      // Check English name (case-insensitive)
      const nameMatch = area.name?.toLowerCase().includes(queryLower) || false
      
      // Check Greek name (case-insensitive and accent-insensitive)
      const nameGreekLower = area.nameGreek?.toLowerCase() || ''
      const nameGreekNormalized = removeGreekAccents(nameGreekLower)
      const nameGreekMatch = nameGreekLower.includes(queryLower) || nameGreekNormalized.includes(queryNormalized)
      
      return nameMatch || nameGreekMatch
    })

    // Remove duplicates by area name (keep first occurrence)
    const seenNames = new Set<string>()
    const uniqueAreas = filteredAreas.filter(area => {
      if (!area.name) return false
      if (seenNames.has(area.name)) {
        return false
      }
      seenNames.add(area.name)
      return true
    })

    // Sort and limit results
    const areas = uniqueAreas
      .sort((a, b) => {
        // Prioritize matches that start with the query (with or without accents)
        const aNameLower = a.name?.toLowerCase() || ''
        const aNameGreekLower = a.nameGreek?.toLowerCase() || ''
        const aNameGreekNormalized = removeGreekAccents(aNameGreekLower)
        
        const bNameLower = b.name?.toLowerCase() || ''
        const bNameGreekLower = b.nameGreek?.toLowerCase() || ''
        const bNameGreekNormalized = removeGreekAccents(bNameGreekLower)
        
        const aStarts = aNameLower.startsWith(queryLower) || 
                       aNameGreekLower.startsWith(queryLower) || 
                       aNameGreekNormalized.startsWith(queryNormalized)
        const bStarts = bNameLower.startsWith(queryLower) || 
                       bNameGreekLower.startsWith(queryLower) || 
                       bNameGreekNormalized.startsWith(queryNormalized)
        
        if (aStarts && !bStarts) return -1
        if (!aStarts && bStarts) return 1
        // Then sort alphabetically
        return (a.name || '').localeCompare(b.name || '')
      })
      .slice(0, limit)

    return NextResponse.json({ areas })
  } catch (error) {
    console.error('Search areas error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

