import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getUserRatings } from '@/lib/ratings'
import { extractFiltersHybrid } from '@/lib/filter-extraction'
import OpenAI from 'openai'

// Helper function to remove Greek accents (for city/area matching)
function removeGreekAccents(str: string): string {
  const accentMap: Record<string, string> = {
    'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω',
    'ὰ': 'α', 'ὲ': 'ε', 'ὴ': 'η', 'ὶ': 'ι', 'ὸ': 'ο', 'ὺ': 'υ', 'ὼ': 'ω',
    'ᾶ': 'α', 'ῆ': 'η', 'ῖ': 'ι', 'ῦ': 'υ', 'ῶ': 'ω',
    'ᾳ': 'α', 'ῃ': 'η', 'ῳ': 'ω',
    'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω',
    'Ὰ': 'Α', 'Ὲ': 'Ε', 'Ὴ': 'Η', 'Ὶ': 'Ι', 'Ὸ': 'Ο', 'Ὺ': 'Υ', 'Ὼ': 'Ω',
    'ᾼ': 'Α', 'ῌ': 'Η', 'ῼ': 'Ω',
  }
  
  return str
    .split('')
    .map(char => accentMap[char] || char)
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// Initialize OpenAI client (using cheapest model: gpt-3.5-turbo)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

// POST /api/homes/ai-search - AI-powered home search with match percentages
export async function POST(request: NextRequest) {
  // Initialize logging variables
  let userId: number | null = null
  let filterExtractionPrompt: string | null = null
  let filterExtractionResponse: string | null = null
  let extractedFiltersJson: string | null = null
  let homesCountBeforeFilter = 0
  let homesCountAfterFilter = 0
  let matchCalculationPrompt: string | null = null
  let matchCalculationResponse: string | null = null
  let finalHomesCount = 0
  let errorMessage: string | null = null
  let userQuery: string = 'unknown'

  try {
    const body = await request.json()
    const { query, type } = body
    userQuery = query || 'unknown'

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    // Get user ID if available
    try {
      const user = await getCurrentUser()
      if (user) {
        userId = user.id
      }
    } catch (error) {
      // User not logged in, continue without userId
    }

    // Check if OpenAI is available
    if (!openai) {
      errorMessage = 'OpenAI package not installed'
      return NextResponse.json(
        { error: 'OpenAI package not installed. Please run: npm install openai' },
        { status: 500 }
      )
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      errorMessage = 'OpenAI API key not configured'
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file' },
        { status: 500 }
      )
    }

    // Step 1: Extract hard filters using AI only
    const extractedFiltersResult = await extractFiltersHybrid(query, openai)
    console.log('Extracted filters:', JSON.stringify(extractedFiltersResult, null, 2))
    
    // Extract the filters (without the prompt/response fields) for use in filtering
    const extractedFilters: any = { ...extractedFiltersResult }
    delete extractedFilters.filterExtractionPrompt
    delete extractedFilters.filterExtractionResponse
    
    // Capture filter extraction data for logging
    filterExtractionPrompt = (extractedFiltersResult as any).filterExtractionPrompt || null
    filterExtractionResponse = (extractedFiltersResult as any).filterExtractionResponse || null
    extractedFiltersJson = JSON.stringify(extractedFilters)

    // Step 2: Build database query with extracted filters
    let where: any = {}
    
    // Filter by listing type if provided
    if (type) {
      if (type === 'buy') {
        where.listingType = 'sell'
      } else if (type === 'rent') {
        where.listingType = 'rent'
      } else {
        where.listingType = type
      }
    }

    // Apply ALL extracted filters to database query (skip null values)
    // Only create filter objects if we have actual values to filter by
    
    if (extractedFilters.minBedrooms !== undefined && extractedFilters.minBedrooms !== null) {
      where.bedrooms = { ...where.bedrooms, gte: extractedFilters.minBedrooms }
    }
    if (extractedFilters.maxBedrooms !== undefined && extractedFilters.maxBedrooms !== null) {
      where.bedrooms = { ...where.bedrooms, lte: extractedFilters.maxBedrooms }
    }

    if (extractedFilters.minBathrooms !== undefined && extractedFilters.minBathrooms !== null) {
      where.bathrooms = { ...where.bathrooms, gte: extractedFilters.minBathrooms }
    }
    if (extractedFilters.maxBathrooms !== undefined && extractedFilters.maxBathrooms !== null) {
      where.bathrooms = { ...where.bathrooms, lte: extractedFilters.maxBathrooms }
    }

    if (extractedFilters.minPrice !== undefined && extractedFilters.minPrice !== null) {
      where.pricePerMonth = { ...where.pricePerMonth, gte: extractedFilters.minPrice }
    }
    if (extractedFilters.maxPrice !== undefined && extractedFilters.maxPrice !== null) {
      where.pricePerMonth = { ...where.pricePerMonth, lte: extractedFilters.maxPrice }
    }

    if (extractedFilters.minSize !== undefined && extractedFilters.minSize !== null) {
      where.sizeSqMeters = { ...where.sizeSqMeters, gte: extractedFilters.minSize }
    }
    if (extractedFilters.maxSize !== undefined && extractedFilters.maxSize !== null) {
      where.sizeSqMeters = { ...where.sizeSqMeters, lte: extractedFilters.maxSize }
    }

    // NOTE: Do NOT filter by parking, heatingCategory, or heatingAgent if user requests them
    // Instead, include all houses (even with null values) and let AI penalize missing info in match percentage
    // This allows houses with missing information to still appear in results, just with lower scores
    
    // if (extractedFilters.parking !== undefined && extractedFilters.parking !== null) {
    //   where.parking = extractedFilters.parking
    // }

    // if (extractedFilters.heatingCategory && extractedFilters.heatingCategory !== null) {
    //   where.heatingCategory = extractedFilters.heatingCategory
    // }

    // if (extractedFilters.heatingAgent && extractedFilters.heatingAgent !== null) {
    //   where.heatingAgent = extractedFilters.heatingAgent
    // }

    if (extractedFilters.minFloor !== undefined && extractedFilters.minFloor !== null) {
      where.floor = { ...where.floor, gte: extractedFilters.minFloor }
    }
    if (extractedFilters.maxFloor !== undefined && extractedFilters.maxFloor !== null) {
      where.floor = { ...where.floor, lte: extractedFilters.maxFloor }
    }

    if (extractedFilters.minYearBuilt !== undefined && extractedFilters.minYearBuilt !== null) {
      where.yearBuilt = { ...where.yearBuilt, gte: extractedFilters.minYearBuilt }
    }
    if (extractedFilters.maxYearBuilt !== undefined && extractedFilters.maxYearBuilt !== null) {
      where.yearBuilt = { ...where.yearBuilt, lte: extractedFilters.maxYearBuilt }
    }

    if (extractedFilters.minYearRenovated !== undefined && extractedFilters.minYearRenovated !== null) {
      where.yearRenovated = { ...where.yearRenovated, gte: extractedFilters.minYearRenovated }
    }
    if (extractedFilters.maxYearRenovated !== undefined && extractedFilters.maxYearRenovated !== null) {
      where.yearRenovated = { ...where.yearRenovated, lte: extractedFilters.maxYearRenovated }
    }

    // Distance filters will be applied in JavaScript after fetching
    // City/area/country filters will be applied in JavaScript for better Greek/English matching
    // Don't add them to where clause - we'll filter in JavaScript

    // Exclude owner's own houses if user is also an owner
    try {
      const user = await getCurrentUser()
      if (user) {
        const userRole = (user.role || 'user').toLowerCase()
        if (userRole === 'owner' || userRole === 'both') {
          where.ownerId = { not: user.id }
        }
      }
    } catch (error) {
      // If getCurrentUser fails (user not logged in), continue without filtering
    }

    // Step 3: Fetch homes with filters applied (reduces dataset before AI processing)
    // Note: City/area/country filters will be applied in JavaScript for better Greek/English matching
    let homes = await prisma.home.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, email: true, name: true },
        },
      },
    })
    
    homesCountBeforeFilter = homes.length
    console.log(`Found ${homes.length} homes after initial database filters`)

    // Step 4: Apply city/area/country filters with Greek/English matching
    // Always fetch areas for matching (needed for Greek/English translation)
    const allAreas = await prisma.area.findMany({
      select: {
        name: true,
        nameGreek: true,
        city: true,
        cityGreek: true,
        country: true,
        countryGreek: true,
      },
    })

    // Create bidirectional maps for matching (English <-> Greek)
    const cityMap = new Map<string, Set<string>>()
    const countryMap = new Map<string, Set<string>>()
    const areaNameMap = new Map<string, Set<string>>()
    
    allAreas.forEach(area => {
      if (area.city && area.cityGreek) {
        const cityLower = area.city.toLowerCase()
        const cityGreekLower = area.cityGreek.toLowerCase()
        
        if (!cityMap.has(cityLower)) {
          cityMap.set(cityLower, new Set())
        }
        cityMap.get(cityLower)!.add(cityGreekLower)
        
        if (!cityMap.has(cityGreekLower)) {
          cityMap.set(cityGreekLower, new Set())
        }
        cityMap.get(cityGreekLower)!.add(cityLower)
      }
      if (area.country && area.countryGreek) {
        const countryLower = area.country.toLowerCase()
        const countryGreekLower = area.countryGreek.toLowerCase()
        
        if (!countryMap.has(countryLower)) {
          countryMap.set(countryLower, new Set())
        }
        countryMap.get(countryLower)!.add(countryGreekLower)
        
        if (!countryMap.has(countryGreekLower)) {
          countryMap.set(countryGreekLower, new Set())
        }
        countryMap.get(countryGreekLower)!.add(countryLower)
      }
      if (area.name && area.nameGreek) {
        const nameLower = area.name.toLowerCase()
        const nameGreekLower = area.nameGreek.toLowerCase()
        
        if (!areaNameMap.has(nameLower)) {
          areaNameMap.set(nameLower, new Set())
        }
        areaNameMap.get(nameLower)!.add(nameGreekLower)
        
        if (!areaNameMap.has(nameGreekLower)) {
          areaNameMap.set(nameGreekLower, new Set())
        }
        areaNameMap.get(nameGreekLower)!.add(nameLower)
      }
    })

    // Filter homes by city with Greek/English matching (skip if null)
    if (extractedFilters.city && extractedFilters.city !== null) {
      const filterCity = extractedFilters.city.toLowerCase().trim()
      const filterCityNormalized = removeGreekAccents(filterCity)
      
      // Get all possible city name variations from map
      const possibleCityNames = new Set<string>([filterCity])
      if (cityMap.has(filterCity)) {
        cityMap.get(filterCity)!.forEach(name => possibleCityNames.add(name))
      }
      
      // Also add Greek variations if available
      const allCityVariations = new Set<string>([filterCity, filterCityNormalized])
      possibleCityNames.forEach(name => {
        allCityVariations.add(name)
        allCityVariations.add(removeGreekAccents(name))
      })
      
      homes = homes.filter(home => {
        if (!home.city) return false
        const homeCity = home.city.toLowerCase().trim()
        const homeCityNormalized = removeGreekAccents(homeCity)
        
        // Direct match (case-insensitive)
        if (homeCity === filterCity) return true
        
        // Normalized match (handles accents)
        if (homeCityNormalized === filterCityNormalized) return true
        
        // Check if home city matches any variation
        if (allCityVariations.has(homeCity)) return true
        if (allCityVariations.has(homeCityNormalized)) return true
        
        // Check bidirectional mapping
        if (cityMap.has(homeCity) && cityMap.get(homeCity)!.has(filterCity)) return true
        if (cityMap.has(filterCity) && cityMap.get(filterCity)!.has(homeCity)) return true
        
        return false
      })
      
      console.log(`After city filter "${extractedFilters.city}": ${homes.length} homes remaining`)
      console.log(`Filtered city variations:`, Array.from(allCityVariations))
      console.log(`Sample home cities:`, homes.slice(0, 5).map(h => h.city))
    }

    // Filter homes by country with Greek/English matching (skip if null)
    if (extractedFilters.country && extractedFilters.country !== null) {
      const filterCountry = extractedFilters.country.toLowerCase().trim()
      const filterCountryNormalized = removeGreekAccents(filterCountry)
      
      // Get all possible country name variations
      const possibleCountryNames = new Set<string>([filterCountry])
      if (countryMap.has(filterCountry)) {
        countryMap.get(filterCountry)!.forEach(name => possibleCountryNames.add(name))
      }
      
      homes = homes.filter(home => {
        if (!home.country) return false
        const homeCountry = home.country.toLowerCase().trim()
        const homeCountryNormalized = removeGreekAccents(homeCountry)
        
        // Direct match
        if (possibleCountryNames.has(homeCountry)) return true
        
        // Normalized match
        if (homeCountryNormalized === filterCountryNormalized) return true
        
        // Check bidirectional mapping
        if (countryMap.has(homeCountry) && countryMap.get(homeCountry)!.has(filterCountry)) return true
        if (countryMap.has(filterCountry) && countryMap.get(filterCountry)!.has(homeCountry)) return true
        
        return false
      })
    }

    // Filter homes by area with Greek/English matching (skip if null)
    if (extractedFilters.area && extractedFilters.area !== null) {
      const filterArea = extractedFilters.area.toLowerCase().trim()
      const filterAreaNormalized = removeGreekAccents(filterArea)
      
      // Get all possible area name variations
      const possibleAreaNames = new Set<string>([filterArea])
      if (areaNameMap.has(filterArea)) {
        areaNameMap.get(filterArea)!.forEach(name => possibleAreaNames.add(name))
      }
      
      homes = homes.filter(home => {
        if (!home.area) return false
        const homeArea = home.area.toLowerCase().trim()
        const homeAreaNormalized = removeGreekAccents(homeArea)
        
        // Direct match
        if (possibleAreaNames.has(homeArea)) return true
        
        // Normalized match
        if (homeAreaNormalized === filterAreaNormalized) return true
        
        // Check bidirectional mapping
        if (areaNameMap.has(homeArea) && areaNameMap.get(homeArea)!.has(filterArea)) return true
        if (areaNameMap.has(filterArea) && areaNameMap.get(filterArea)!.has(homeArea)) return true
        
        return false
      })
    }

    // Apply distance filters (after fetching homes)
    // IMPORTANT: Do NOT exclude houses with null distances - include them but they will be penalized in AI scoring
    // Only filter houses that have distance values that don't meet the criteria
    if (extractedFilters.maxClosestMetro !== undefined && extractedFilters.maxClosestMetro !== null) {
      homes = homes.filter(home => 
        home.closestMetro === null || home.closestMetro <= extractedFilters.maxClosestMetro!
      )
    }
    if (extractedFilters.maxClosestBus !== undefined && extractedFilters.maxClosestBus !== null) {
      homes = homes.filter(home => 
        home.closestBus === null || home.closestBus <= extractedFilters.maxClosestBus!
      )
    }
    if (extractedFilters.maxClosestSchool !== undefined && extractedFilters.maxClosestSchool !== null) {
      homes = homes.filter(home => 
        home.closestSchool === null || home.closestSchool <= extractedFilters.maxClosestSchool!
      )
    }
    if (extractedFilters.maxClosestKindergarten !== undefined && extractedFilters.maxClosestKindergarten !== null) {
      homes = homes.filter(home => 
        home.closestKindergarten === null || home.closestKindergarten <= extractedFilters.maxClosestKindergarten!
      )
    }
    if (extractedFilters.maxClosestHospital !== undefined && extractedFilters.maxClosestHospital !== null) {
      homes = homes.filter(home => 
        home.closestHospital === null || home.closestHospital <= extractedFilters.maxClosestHospital!
      )
    }
    if (extractedFilters.maxClosestPark !== undefined && extractedFilters.maxClosestPark !== null) {
      homes = homes.filter(home => 
        home.closestPark === null || home.closestPark <= extractedFilters.maxClosestPark!
      )
    }

    if (homes.length === 0) {
      return NextResponse.json(
        { 
          homes: [],
          message: 'No homes found matching your criteria'
        },
        { status: 200 }
      )
    }

    // Fetch area data for all homes
    const areaNames = homes
      .map(home => home.area)
      .filter((area): area is string => area !== null)
    
    const areas = await prisma.area.findMany({
      where: {
        name: { in: areaNames.length > 0 ? areaNames : undefined }
      },
      select: {
        name: true,
        safety: true,
        vibe: true,
      },
    })

    // Create area lookup map for safety/vibe data
    const areaSafetyVibeMap = new Map<string, { safety: number | null; vibe: string | null }>()
    areas.forEach(area => {
      areaSafetyVibeMap.set(area.name, {
        safety: area.safety,
        vibe: area.vibe,
      })
    })

    // Fetch owner ratings for all homes
    const ownerIds = [...new Set(homes.map(home => home.ownerId))]
    const ownerRatingsMap = new Map<number, { ownerRating: number | null; ownerCount: number }>()
    
    for (const ownerId of ownerIds) {
      const ratings = await getUserRatings(ownerId)
      ownerRatingsMap.set(ownerId, {
        ownerRating: ratings.ownerRating,
        ownerCount: ratings.ownerCount,
      })
    }

    // Prepare home data for AI analysis
    const homesData = homes.map(home => {
      const areaData = home.area ? areaSafetyVibeMap.get(home.area) : null
      const ownerRating = ownerRatingsMap.get(home.ownerId)
      
      return {
        id: home.id,
        key: home.key,
        title: home.title,
        description: home.description || '',
        city: home.city,
        country: home.country,
        area: home.area || '',
        listingType: home.listingType,
        pricePerMonth: home.pricePerMonth,
        bedrooms: home.bedrooms,
        bathrooms: home.bathrooms,
        floor: home.floor,
        heatingCategory: home.heatingCategory || '',
        heatingAgent: home.heatingAgent || '',
        sizeSqMeters: home.sizeSqMeters,
        yearBuilt: home.yearBuilt,
        yearRenovated: home.yearRenovated,
        availableFrom: home.availableFrom.toISOString(),
        parking: home.parking,
        closestMetro: home.closestMetro,
        closestBus: home.closestBus,
        closestSchool: home.closestSchool,
        closestKindergarten: home.closestKindergarten,
        closestHospital: home.closestHospital,
        closestPark: home.closestPark,
        closestUniversity: home.closestUniversity,
        areaSafety: areaData?.safety || null,
        areaVibe: areaData?.vibe || null,
        ownerRating: ownerRating?.ownerRating || null,
        ownerRatingCount: ownerRating?.ownerCount || 0,
      }
    })

    // Check if only location filters were extracted (city, country, area)
    // AND the query is simple (just location, no other semantic meaning)
    // If so, all matching properties should get 100%
    const queryLower = query.toLowerCase().trim()
    const isSimpleLocationQuery = 
      queryLower === extractedFilters.city?.toLowerCase() ||
      queryLower === extractedFilters.country?.toLowerCase() ||
      queryLower === extractedFilters.area?.toLowerCase() ||
      (extractedFilters.city && queryLower.includes(extractedFilters.city.toLowerCase()) && queryLower.split(/\s+/).length <= 2)
    
    const hasOnlyLocationFilters = 
      (extractedFilters.city || extractedFilters.country || extractedFilters.area) &&
      !extractedFilters.minPrice && !extractedFilters.maxPrice &&
      !extractedFilters.minBedrooms && !extractedFilters.maxBedrooms &&
      !extractedFilters.minBathrooms && !extractedFilters.maxBathrooms &&
      !extractedFilters.minSize && !extractedFilters.maxSize &&
      extractedFilters.parking === undefined &&
      !extractedFilters.heatingCategory && !extractedFilters.heatingAgent &&
      !extractedFilters.minFloor && !extractedFilters.maxFloor &&
      !extractedFilters.minYearBuilt && !extractedFilters.maxYearBuilt &&
      !extractedFilters.minYearRenovated && !extractedFilters.maxYearRenovated
    
    // Only force 100% if query is simple (just location) AND only location filters extracted
    const shouldForce100 = hasOnlyLocationFilters && isSimpleLocationQuery

    // Create AI prompt to calculate match percentages
    // Use the ORIGINAL user query and compare against ALL house data (including safety/vibe)
    const systemPrompt = `Calculate match percentage (0-100) for each property by comparing the user's original query against ALL property attributes.

CRITICAL RULE: If the user query ONLY mentions something that matches 100% with a value of the properties (e.g., "athens", "athens greece", "i want a house with 1 bathroom") and ALL properties in the list match that information, they MUST ALL get 100% match.

IMPORTANT RULES:
- Compare the user's query against ALL property data: location, price, size, bedrooms, bathrooms, floor, heating, parking, year built/renovated, availability, area safety, area vibe, owner rating, proximity to amenities, listing type, description
- If the user query ONLY mentions specific information that describe a house (e.g., "athens","i want 1 bathroom","i want the house to be on the second floor) → ALL matching properties get 100%
- If the user query mentions location + soft criteria (e.g., "athens children", "athens family") → Consider area vibe and safety scores, properties with matching vibe/safety score higher
- SAFETY RULE: Area safety should ONLY be a prominent factor when the query specifically mentions: kids, children, elderly, seniors, elderly people, people in need, vulnerable, family with children, etc. If safety is NOT specifically mentioned in relation to these groups, do NOT let safety significantly influence match percentages (only minor influence, 1-5 points difference at most)
- If the user query mentions specific features (e.g., "athens parking", "athens 2 bedrooms") → Consider those specific attributes
- Properties have already been filtered by hard filters (city, price, bedrooms, etc.), so focus on matching the semantic meaning of the query

CRITICAL: Missing Information Handling:
- If a property has null/undefined/missing values for attributes the user requested (e.g., user asks for "parking" but property has parking: null, or user asks for "garage" but property has parking: null), DO NOT exclude it from results
- Instead, PENALIZE it in the match percentage (subtract 10-20 points) for missing requested information
- Properties with the requested information should score higher than those without it
- Missing information (null/undefined) should score higher than explicitly false values
- This applies to ALL attributes: parking, heating, floor, year built, size, amenities, DISTANCES, etc.
- DISTANCE-SPECIFIC: If the user query mentions proximity/distance requirements (e.g., "close to metro", "near school", "near uni", "far from hospital", "within 2km of park"):
  * Properties with null distance values should be PENALIZED (subtract 15-25 points) and placed LAST in priority
  * CRITICAL: Properties with SMALLER distance values should score HIGHER than properties with LARGER distance values
  * Distance should be a PRIMARY ranking factor when proximity is mentioned (major influence on match percentage)
  * Example: "near uni" → 0.5km = 95-100%, 1km = 90-95%, 2km = 80-90%, 5km = 60-75%, null = 50-60%
- Example: User asks "athens parking" → Athens houses WITH parking (parking: true) get 90-100%, Athens houses with MISSING parking info (parking: null) get 70-80%, Athens houses WITHOUT parking (parking: false) get 50-60%
- Example: User asks "athens garage" → Same logic as parking (garage = parking)
- Example: User asks "athens central heating" → Houses WITH central heating get 90-100%, houses with MISSING heating info (heatingCategory: null) get 70-80%, houses with different heating get 50-60%
- Example: User asks "athens close to metro" → Athens houses WITH metro distance: closestMetro 0.5km gets 95-100%, 1km gets 90-95%, 2km gets 80-90%, 5km gets 60-75%, null gets 50-60% (SMALLER distances = HIGHER scores)
- Example: User asks "athens near school" → Athens houses WITH school distance: closestSchool 0.5km gets 95-100%, 1km gets 90-95%, 2km gets 80-90%, 5km gets 60-75%, null gets 50-60% (SMALLER distances = HIGHER scores)
- Example: User asks "near uni" or "close to university" → Houses with closestUniversity 0.5km get 95-100%, 1km get 90-95%, 2km get 80-90%, 5km get 60-75%, null get 50-60% (SMALLER distances = HIGHER scores)

Consider ALL attributes when calculating match:
- Location (city, country, area) - exact match = 100% if ONLY location is mentioned
- CRITICAL: Greek and English location names are EQUIVALENT - "athens" = "Αθήνα", "thessaloniki" = "Θεσσαλονίκη", "greece" = "Ελλάδα", etc. Do NOT penalize match percentage if the query uses one language and the property data uses the other. They should be treated as 100% match for location purposes.
- DISTANCE/PROXIMITY - When query mentions "near", "close to", "within X km", etc.:
  * DISTANCE IS THE ABSOLUTE PRIMARY FACTOR - it OVERRIDES all other factors (vibe, area type, etc.)
  * Properties with SMALLER distance values should ALWAYS score HIGHER than properties with LARGER distance values, REGARDLESS of other attributes
  * Other factors (vibe, area type) can only create small variations (2-5 points) WITHIN the same distance range
  * Example: "near uni" → 0.5km = 95-100%, 1km = 90-95%, 2km = 80-90%, 5km = 60-75%, 5.6km = 55-70%
  * A house 1km away should NEVER score lower than a house 5.6km away when proximity is mentioned
- Area safety (0-10 scale) - ONLY use as a prominent factor when query mentions: kids, children, elderly, seniors, elderly people, people in need, vulnerable, family with children, etc. If NOT mentioned, safety should have MINIMAL influence (1-5 points difference at most, not a major factor)
- Area vibe (e.g., "family-friendly", "vibrant", "quiet") - match vibe keywords from query but give a little bit more importance to the first word of vibe and then the second
- Price, size, bedrooms, bathrooms - match if mentioned in query
- Parking, heating, amenities - match if mentioned in query, PENALIZE if missing (null/undefined)
- Owner rating - higher rating = better match
- Description - semantic match with query

Return JSON only:
{
  "matches": [
    {"id": 1, "matchPercentage": 100},
    {"id": 2, "matchPercentage": 100}
  ]
}`

    const userPrompt = `User's Original Query: "${query}"

Properties (already filtered by hard filters like city, price, bedrooms, etc.):
${JSON.stringify(homesData, null, 2)}

Calculate match percentage (0-100) for each property by comparing the user's query "${query}" against ALL property attributes including safety, vibe, location, price, size, amenities, owner rating, and description.

CRITICAL: If the query "${query}" ONLY mentions specific information that matches 100% with property values (e.g., "athens", "1 bathroom", "second floor") and ALL properties in the list match that information, they MUST ALL get 100%.

CRITICAL: GREEK/ENGLISH LOCATION EQUIVALENCE - Greek and English location names are EQUIVALENT and should be treated as 100% match:
- "athens" = "Αθήνα" (same location, 100% match)
- "thessaloniki" = "Θεσσαλονίκη" (same location, 100% match)
- "greece" = "Ελλάδα" (same location, 100% match)
- If the query says "athens" and a property has city: "Αθήνα", it's a 100% location match
- If the query says "Αθήνα" and a property has city: "Athens", it's a 100% location match
- Do NOT reduce match percentage due to language differences in location names

MISSING INFORMATION: If a property has null/undefined values for attributes the user requested, PENALIZE it (subtract 10-20 points) but DO NOT exclude it. Properties with missing info should score lower than those with the information.

DISTANCE-SPECIFIC RULE: If the query mentions proximity/distance requirements (e.g., "close to metro", "near school", "near uni", "within X km of Y"):
1. Properties with null distance values for those specific amenities should be PENALIZED more heavily (subtract 15-25 points) and placed LAST in priority
2. CRITICAL: When "near", "close to", or proximity is mentioned, properties with SMALLER distance values should ALWAYS score HIGHER than properties with LARGER distance values, REGARDLESS of other factors (vibe, safety, etc.)
3. DISTANCE IS THE PRIMARY RANKING FACTOR - Other factors (vibe, area type, etc.) should only create small variations WITHIN the same distance range, but should NEVER cause a farther property to score higher than a closer one
4. Example: Query "near uni" → House 0.5km from university should score 95-100%, house 1km should score 90-95%, house 2km should score 80-90%, house 5km should score 60-75%, house 5.6km should score 55-70%
5. A house 1km away should ALWAYS score higher (90-95%) than a house 5.6km away (55-70%), even if the 5.6km house has better vibe or other attributes
6. The closer the distance, the higher the match percentage should be - this is NON-NEGOTIABLE when proximity is mentioned

Examples:
- Query "athens" → ALL Athens properties (whether city is "Athens" or "Αθήνα") MUST get 100% (they all match the location, no other criteria)
- Query "Αθήνα" → ALL Athens properties (whether city is "Athens" or "Αθήνα") MUST get 100% (same as above, Greek/English are equivalent)
- Query "i want 1 bathroom" → ALL properties with 1 bathroom MUST get 100% (they all match the bathroom count)
- Query "i want the house to be on the second floor" → ALL properties on floor 2 MUST get 100% (they all match the floor)
- Query "athens parking" → Athens properties WITH parking (parking: true) get 90-100%, Athens properties with MISSING parking info (parking: null) get 70-80%, Athens properties WITHOUT parking (parking: false) get 50-60%
- Query "athens garage" → Same as parking (garage = parking)
- Query "athens children" → Athens properties with family-friendly vibe or high safety should score higher (90-100%), others lower (70-85%) - Safety is prominent here because "children" is mentioned
- Query "athens elderly" → Athens properties with high safety scores should score higher (90-100%), others lower (70-85%) - Safety is prominent here because "elderly" is mentioned
- Query "athens safe" → Safety should have MINIMAL influence (1-5 points difference) since no vulnerable groups are mentioned - Focus on other criteria instead
- Query "athens" → Safety should have MINIMAL influence (1-5 points difference) - All Athens properties should score similarly regardless of safety
- Query "athens 2 bedrooms" → Athens properties with 2 bedrooms get 100%, others get lower scores
- Query "i am a student looking for a house in athens near uni and nightlife parties" → 
  * DISTANCE TO UNIVERSITY IS THE ABSOLUTE PRIMARY FACTOR - it OVERRIDES all other factors
  * Athens properties with closestUniversity 0.5-1km get 90-100% (very close to uni, highest priority)
  * Athens properties with closestUniversity 1-2km get 85-95% (close to uni)
  * Athens properties with closestUniversity 2-5km get 70-85% (moderate distance, lower priority)
  * Athens properties with closestUniversity 5-6km get 55-70% (far from uni, much lower priority)
  * Athens properties with closestUniversity >6km get 50-65% (very far from uni, lowest priority)
  * Properties with vibrant/student-friendly vibe can add 2-5 bonus points WITHIN the same distance range, but should NEVER make a 5.6km house score higher than a 1km house
  * Properties with null closestUniversity get 50-60% (missing distance info, lowest priority)
  * CRITICAL: A house 1km away (Kerameikos) should ALWAYS score 85-95%, while a house 5.6km away (Neos Kosmos) should ALWAYS score 55-70%, regardless of area vibe or other attributes

Return JSON:
{
  "matches": [
    {"id": 1, "matchPercentage": 100},
    {"id": 2, "matchPercentage": 100}
  ]
}`

    // Capture match calculation prompt for logging
    matchCalculationPrompt = `System: ${systemPrompt}\n\nUser: ${userPrompt}`

    // Call OpenAI API for match percentage calculation
    let matchResults: Array<{ id: number; matchPercentage: number }> = []
    
    console.log('=== AI MATCH PERCENTAGE CALCULATION ===')
    console.log('System Prompt:', systemPrompt)
    console.log('User Prompt (first 500 chars):', userPrompt.substring(0, 500))
    console.log('Number of homes to analyze:', homesData.length)
    
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Cheapest model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent results
        response_format: { type: 'json_object' }, // Force JSON response
      })

      const responseContent = completion.choices[0]?.message?.content
      matchCalculationResponse = responseContent || null
      console.log('AI Response (raw):', responseContent)
      
      if (responseContent) {
        try {
          const parsed = JSON.parse(responseContent)
          console.log('AI Response (parsed):', JSON.stringify(parsed, null, 2))
          // Extract matches array from response
          matchResults = parsed.matches || parsed.results || []
          console.log('Extracted match results:', matchResults.length, 'matches')
          console.log('Homes sent to AI:', homesData.length)
          console.log('Match results:', matchResults)
          
          // If AI didn't return matches for all homes, add missing ones with 0% match
          const matchedIds = new Set(matchResults.map((r: any) => r.id))
          const missingHomes = homesData.filter(home => !matchedIds.has(home.id))
          if (missingHomes.length > 0) {
            console.log(`Warning: AI didn't return matches for ${missingHomes.length} homes. Adding them with 0% match.`)
            missingHomes.forEach(home => {
              matchResults.push({ id: home.id, matchPercentage: 0 })
            })
          }
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError, 'Response:', responseContent)
          // Fallback: assign equal percentages if parsing fails
          matchResults = homesData.map(home => ({ id: home.id, matchPercentage: 50 }))
        }
      } else {
        // No response from AI, assign default percentages
        console.log('No response from AI, assigning default percentages')
        matchResults = homesData.map(home => ({ id: home.id, matchPercentage: 50 }))
      }
      console.log('=== END MATCH PERCENTAGE CALCULATION ===')
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError)
      matchCalculationResponse = openaiError instanceof Error ? openaiError.message : String(openaiError)
      console.log('=== END MATCH PERCENTAGE CALCULATION (ERROR) ===')
      // Fallback: assign equal percentages if API fails
      matchResults = homesData.map(home => ({ id: home.id, matchPercentage: 50 }))
    }

    // Create match percentage map
    const matchMap = new Map<number, number>()
    matchResults.forEach(result => {
      matchMap.set(result.id, Math.max(0, Math.min(100, result.matchPercentage)))
    })
    
    // If only location filters were used AND query is simple (just location), force all to 100%
    if (shouldForce100 && homesData.length > 0) {
      console.log('Simple location-only query detected - forcing all matches to 100%')
      homesData.forEach(home => {
        matchMap.set(home.id, 100)
      })
    }

    // Post-process: Enforce distance-based ranking when proximity is mentioned
    // Check if query mentions proximity to university
    const mentionsUniversityProximity = 
      /near\s+(uni|university|universities)/i.test(query) ||
      /close\s+to\s+(uni|university|universities)/i.test(query) ||
      /(uni|university).*near/i.test(query) ||
      /(uni|university).*close/i.test(query)
    
    if (mentionsUniversityProximity) {
      console.log('University proximity detected in query - enforcing distance-based ranking')
      
      // Get all homes with university distance
      const homesWithUniDistance = homes.filter(h => h.closestUniversity !== null && h.closestUniversity !== undefined)
      
      if (homesWithUniDistance.length > 0) {
        // Sort by distance (closest first)
        homesWithUniDistance.sort((a, b) => (a.closestUniversity || Infinity) - (b.closestUniversity || Infinity))
        
        // Assign distance-based scores: closer = higher score
        homesWithUniDistance.forEach((home, index) => {
          const distance = home.closestUniversity || Infinity
          let distanceScore = 0
          
          if (distance <= 0.5) distanceScore = 98
          else if (distance <= 1.0) distanceScore = 93
          else if (distance <= 2.0) distanceScore = 85
          else if (distance <= 3.0) distanceScore = 75
          else if (distance <= 5.0) distanceScore = 65
          else if (distance <= 6.0) distanceScore = 60
          else distanceScore = 55
          
          // Get AI's original score
          const aiScore = matchMap.get(home.id) || 50
          
          // Distance is PRIMARY: use distance score as base, add small bonus from AI (max 5 points)
          const finalScore = Math.min(100, distanceScore + Math.min(5, Math.max(0, aiScore - 50) / 10))
          
          console.log(`Home ${home.id} (${home.area}): distance=${distance}km, distanceScore=${distanceScore}, aiScore=${aiScore}, finalScore=${finalScore}`)
          matchMap.set(home.id, finalScore)
        })
        
        // Homes without university distance get penalized
        homes.filter(h => h.closestUniversity === null || h.closestUniversity === undefined).forEach(home => {
          const aiScore = matchMap.get(home.id) || 50
          matchMap.set(home.id, Math.max(50, Math.min(60, aiScore - 20))) // Penalize by 20 points, cap at 60%
        })
      }
    }

    // Attach match percentages to homes and sort by match percentage (highest first)
    const homesWithMatches = homes.map(home => ({
      ...home,
      matchPercentage: matchMap.get(home.id) || 0,
    })).sort((a, b) => b.matchPercentage - a.matchPercentage)

    finalHomesCount = homesWithMatches.length
    homesCountAfterFilter = homes.length
    
    console.log(`=== AI SEARCH SUMMARY ===`)
    console.log(`Homes before filtering: ${homesCountBeforeFilter}`)
    console.log(`Homes after filtering: ${homesCountAfterFilter}`)
    console.log(`Final homes returned: ${finalHomesCount}`)
    console.log(`Match results count: ${matchResults.length}`)
    console.log(`Homes with matches: ${homesWithMatches.length}`)
    if (homesWithMatches.length > 0) {
      console.log(`Match percentages:`, homesWithMatches.map(h => ({ id: h.id, city: h.city, match: h.matchPercentage })))
    }
    console.log(`=== END AI SEARCH SUMMARY ===`)

    // Log to database (async, don't wait for it)
    prisma.aISearchLog.create({
      data: {
        userId,
        userQuery: query,
        filterExtractionPrompt,
        filterExtractionResponse,
        extractedFilters: extractedFiltersJson,
        homesCountBeforeFilter,
        homesCountAfterFilter,
        matchCalculationPrompt,
        matchCalculationResponse,
        finalHomesCount,
        error: errorMessage,
      },
    }).catch((logError) => {
      console.error('Failed to log AI search to database:', logError)
    })

    return NextResponse.json(
      { 
        homes: homesWithMatches,
        message: 'AI search completed'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('AI search error:', error)
    errorMessage = error instanceof Error ? error.message : String(error)
    
    // Log error to database
    prisma.aISearchLog.create({
      data: {
        userId,
        userQuery: userQuery || 'unknown',
        filterExtractionPrompt,
        filterExtractionResponse,
        extractedFilters: extractedFiltersJson,
        homesCountBeforeFilter,
        homesCountAfterFilter,
        matchCalculationPrompt,
        matchCalculationResponse,
        finalHomesCount,
        error: errorMessage,
      },
    }).catch((logError) => {
      console.error('Failed to log AI search error to database:', logError)
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

