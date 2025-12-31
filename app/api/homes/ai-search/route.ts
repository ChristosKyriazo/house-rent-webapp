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
    const { query, type, excludeInquired, excludeApproved } = body
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

    // Apply exclude filters for inquired and approved listings BEFORE AI processing
    // Note: excludeInquired and excludeApproved come from the request body
    // IMPORTANT: Apply this BEFORE preparing homesData for AI to avoid processing excluded homes
    if (excludeInquired || excludeApproved) {
      try {
        // Get user ID - try to get current user if not already set
        let currentUserId = userId
        if (!currentUserId) {
          try {
            const user = await getCurrentUser()
            if (user) {
              currentUserId = user.id
            }
          } catch (error) {
            // User not logged in, can't exclude
            console.log('User not logged in, cannot apply exclude filters')
          }
        }

        if (currentUserId) {
          const userInquiries = await prisma.inquiry.findMany({
            where: {
              userId: currentUserId,
            },
            select: {
              homeId: true,
              approved: true,
              dismissed: true,
              finalized: true,
            },
          })

          console.log(`[EXCLUDE FILTER] User ID: ${currentUserId}, excludeInquired: ${excludeInquired}, excludeApproved: ${excludeApproved}`)
          console.log(`[EXCLUDE FILTER] Found ${userInquiries.length} total inquiries for user`)
          console.log(`[EXCLUDE FILTER] Inquiry details:`, userInquiries.map(inq => ({
            homeId: inq.homeId,
            approved: inq.approved,
            dismissed: inq.dismissed,
            finalized: inq.finalized
          })))

          let excludeHomeIds: number[] = []

          if (excludeInquired) {
            // Exclude homes where user has inquired (not dismissed, not finalized)
            const inquiredHomeIds = userInquiries
              .filter(inq => inq.dismissed === false && inq.finalized === false)
              .map(inq => inq.homeId)
            excludeHomeIds.push(...inquiredHomeIds)
            console.log(`[EXCLUDE FILTER] Exclude inquired: found ${inquiredHomeIds.length} inquired homes (not dismissed, not finalized)`, inquiredHomeIds)
          }

          if (excludeApproved) {
            // Exclude homes where user has approved inquiries (not dismissed, not finalized)
            // An inquiry is "approved" when the owner has approved it (approved = true)
            const allApprovedInquiries = userInquiries.filter(inq => inq.approved === true)
            console.log(`[EXCLUDE FILTER] All inquiries with approved=true:`, allApprovedInquiries.map(inq => ({
              homeId: inq.homeId,
              approved: inq.approved,
              dismissed: inq.dismissed,
              finalized: inq.finalized
            })))
            
            const approvedHomeIds = userInquiries
              .filter(inq => inq.approved === true && inq.dismissed === false && inq.finalized === false)
              .map(inq => inq.homeId)
            excludeHomeIds.push(...approvedHomeIds)
            console.log(`[EXCLUDE FILTER] Exclude approved: found ${approvedHomeIds.length} approved homes (approved=true, dismissed=false, finalized=false)`, approvedHomeIds)
          }

          // Remove duplicates
          excludeHomeIds = [...new Set(excludeHomeIds)]
          console.log(`[EXCLUDE FILTER] Total unique home IDs to exclude: ${excludeHomeIds.length}`, excludeHomeIds)

          // Filter out excluded homes
          if (excludeHomeIds.length > 0) {
            const beforeCount = homes.length
            const beforeHomeIds = homes.map(h => h.id)
            console.log(`[EXCLUDE FILTER] Before filtering: ${beforeCount} homes`, beforeHomeIds)
            
            const excludedHomeIds = homes.filter(home => excludeHomeIds.includes(home.id)).map(h => h.id)
            homes = homes.filter(home => !excludeHomeIds.includes(home.id))
            
            const afterHomeIds = homes.map(h => h.id)
            console.log(`[EXCLUDE FILTER] Excluded ${excludeHomeIds.length} homes (inquired/approved), ${beforeCount} -> ${homes.length} homes remaining`)
            console.log(`[EXCLUDE FILTER] Excluded home IDs:`, excludedHomeIds)
            console.log(`[EXCLUDE FILTER] Remaining home IDs:`, afterHomeIds)
            
            // Verify exclusion worked
            const stillIncluded = excludeHomeIds.filter(id => afterHomeIds.includes(id))
            if (stillIncluded.length > 0) {
              console.error(`[EXCLUDE FILTER] ERROR: These home IDs should have been excluded but are still present:`, stillIncluded)
            }
          } else {
            console.log('[EXCLUDE FILTER] No homes to exclude based on exclude filters')
          }
        } else {
          console.log('User not logged in, exclude filters cannot be applied')
        }
      } catch (error) {
        console.error('Error fetching inquiries for exclude filter:', error)
        // Continue without excluding if there's an error
      }
    } else {
      console.log('Exclude filters not requested (excludeInquired:', excludeInquired, ', excludeApproved:', excludeApproved, ')')
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

    // Parse photos for each home
    const homesWithPhotos = homes.map(home => {
      let photos: string[] = []
      if (home.photos) {
        try {
          const parsed = JSON.parse(home.photos)
          photos = Array.isArray(parsed) ? parsed : []
        } catch (e) {
          console.error('Error parsing photos for home', home.id, ':', e)
          photos = []
        }
      }
      return { ...home, parsedPhotos: photos }
    })

    // Check if query mentions visual features that require photo analysis
    const queryLowerForVisual = query.toLowerCase()
    const visualKeywords = ['view', 'views', 'looks', 'appearance', 'beautiful', 'nice looking', 'pretty', 'aesthetic', 'modern', 'traditional', 'style', 'design', 'decor', 'interior', 'exterior', 'balcony', 'terrace', 'garden', 'pool', 'sea view', 'mountain view', 'city view', 'water view', 'ocean view', 'panoramic', 'scenic']
    const needsPhotoAnalysis = visualKeywords.some(keyword => queryLowerForVisual.includes(keyword))

    // Analyze photos using OpenAI Vision API if visual features are mentioned
    const photoAnalysisMap = new Map<number, string>()
    if (needsPhotoAnalysis) {
      console.log('Query mentions visual features - analyzing photos with OpenAI Vision API')
      
      for (const home of homesWithPhotos) {
        if (home.parsedPhotos && home.parsedPhotos.length > 0) {
          try {
            // Use first 3 photos for analysis (to save tokens)
            const photosToAnalyze = home.parsedPhotos.slice(0, 3)
            
            // Convert photo URLs to base64 or use URLs directly
            // For now, we'll use URLs (assuming they're publicly accessible)
            const imageUrls = photosToAnalyze.map(photo => {
              // If photo is a relative path, convert to absolute URL
              if (photo.startsWith('/')) {
                return `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${photo}`
              }
              return photo
            })

            const visionResponse = await openai.chat.completions.create({
              model: 'gpt-4o-mini', // Vision-capable model
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `Analyze these property photos and describe: 1) Views (sea, mountain, city, water, panoramic, etc.), 2) Visual style (modern, traditional, aesthetic), 3) Interior/exterior features (balcony, terrace, garden, pool, etc.), 4) Overall appearance. Be specific about views and visual characteristics. User query: "${query}"`
                    },
                    ...imageUrls.map(url => ({
                      type: 'image_url' as const,
                      image_url: { url }
                    }))
                  ]
                }
              ],
              max_tokens: 300
            })

            const analysis = visionResponse.choices[0]?.message?.content || ''
            photoAnalysisMap.set(home.id, analysis)
            console.log(`Photo analysis for home ${home.id}:`, analysis.substring(0, 100))
          } catch (error) {
            console.error(`Error analyzing photos for home ${home.id}:`, error)
            // Continue without photo analysis for this home
          }
        }
      }
    }

    // Prepare home data for AI analysis
    const homesData = homesWithPhotos.map(home => {
      const areaData = home.area ? areaSafetyVibeMap.get(home.area) : null
      const ownerRating = ownerRatingsMap.get(home.ownerId)
      const photoAnalysis = photoAnalysisMap.get(home.id) || null
      
      // Parse area vibe to extract characteristics
      const areaVibe = areaData?.vibe || ''
      const isSuburban = /suburban|residential|quiet|family/i.test(areaVibe)
      const isUrban = /urban|central|city|downtown/i.test(areaVibe)
      const isUpscale = /upscale|luxury|premium|exclusive/i.test(areaVibe)
      const isNearWater = /water|coastal|seaside|beach|marina/i.test(areaVibe) || /water|coastal|seaside|beach|marina/i.test(home.area || '')
      
      // Determine floor height category
      const floorHeight = home.floor || null
      const isHighFloor = floorHeight !== null && floorHeight >= 5
      const isLowFloor = floorHeight !== null && floorHeight <= 2
      
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
        floorHeight: isHighFloor ? 'high' : isLowFloor ? 'low' : null, // 'high', 'low', or null
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
        areaCharacteristics: {
          isSuburban,
          isUrban,
          isUpscale,
          isNearWater,
        },
        ownerRating: ownerRating?.ownerRating || null,
        ownerRatingCount: ownerRating?.ownerCount || 0,
        photoAnalysis: photoAnalysis, // Visual analysis from photos
        hasPhotos: home.parsedPhotos.length > 0,
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

SCORING DISTRIBUTION RULE: When multiple properties match the query, distribute scores across a RANGE (e.g., 60-100%), NOT binary (100% or 0%). Properties should have DIFFERENT scores based on how well they match, with the best matches getting 85-100%, good matches getting 70-85%, acceptable matches getting 60-70%, and poor matches getting 50-60%. Only use 0% for properties that completely don't match the query.

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
- DISTANCE-SPECIFIC: If the user query mentions proximity/distance requirements (e.g., "close to metro", "near school", "easy access to schools", "near uni", "kids can play near", "playground nearby", "far from hospital", "within 2km of park"):
  * Properties with null distance values should be PENALIZED (subtract 15-25 points) and placed LAST in priority
  * CRITICAL: Properties with SMALLER distance values should score HIGHER than properties with LARGER distance values
  * Distance should be a PRIMARY ranking factor when proximity is mentioned (major influence on match percentage)
  * Example: "near uni" → 0.5km = 95-100%, 1km = 90-95%, 2km = 80-90%, 5km = 60-75%, null = 50-60%
  * Example: "easy access to schools" or "near school" → closestSchool 0.5km = 95-100%, 1km = 90-95%, 2km = 80-90%, 3km = 70-80%, 5km = 60-70%, null = 50-60%
  * Example: "kids can play near" or "playground nearby" or "park nearby" → closestPark 0.5km = 95-100%, 1km = 90-95%, 2km = 80-90%, 3km = 70-80%, 5km = 60-70%, null = 50-60%
- Example: User asks "athens parking" → Athens houses WITH parking (parking: true) get 90-100%, Athens houses with MISSING parking info (parking: null) get 70-80%, Athens houses WITHOUT parking (parking: false) get 50-60%
- Example: User asks "athens garage" → Same logic as parking (garage = parking)
- CRITICAL: When parking is marked as "essential", "required", "must have", "need", "necessary", or similar strong language:
  * Houses WITH parking (parking: true) get 90-100%
  * Houses with MISSING parking info (parking: null) get 40-55% (HEAVY penalty, not just 10-20 points)
  * Houses WITHOUT parking (parking: false) get 20-35% (VERY HEAVY penalty, should be near bottom)
  * Properties without parking should NEVER be the top result when parking is essential
  * Example: "parking is essential" → House with parking: 90-100%, House with null parking: 40-55%, House without parking: 20-35%
- Example: User asks "athens central heating" → Houses WITH central heating get 90-100%, houses with MISSING heating info (heatingCategory: null) get 70-80%, houses with different heating get 50-60%
- Example: User asks "athens close to metro" → Athens houses WITH metro distance: closestMetro 0.5km gets 95-100%, 1km gets 90-95%, 2km gets 80-90%, 5km gets 60-75%, null gets 50-60% (SMALLER distances = HIGHER scores)
- Example: User asks "athens near school" or "easy access to schools" → Athens houses WITH school distance: closestSchool 0.5km gets 95-100%, 1km gets 90-95%, 2km gets 80-90%, 3km gets 70-80%, 5km gets 60-70%, null gets 50-60% (SMALLER distances = HIGHER scores)
- Example: User asks "near uni" or "close to university" → Houses with closestUniversity 0.5km get 95-100%, 1km get 90-95%, 2km get 80-90%, 5km get 60-75%, null get 50-60% (SMALLER distances = HIGHER scores)
- Example: User asks "kids can play near" or mentions playground/park → Houses with closestPark 0.5km get 95-100%, 1km get 90-95%, 2km get 80-90%, 3km get 70-80%, 5km get 60-70%, null get 50-60% (SMALLER distances = HIGHER scores)

Consider ALL attributes when calculating match:
- Location (city, country, area) - exact match = 100% if ONLY location is mentioned
- CRITICAL: Greek and English location names are EQUIVALENT - "athens" = "Αθήνα", "thessaloniki" = "Θεσσαλονίκη", "greece" = "Ελλάδα", etc. Do NOT penalize match percentage if the query uses one language and the property data uses the other. They should be treated as 100% match for location purposes.
- DISTANCE/PROXIMITY - When query mentions "near", "close to", "easy access to", "within X km", "kids can play near", "playground nearby", etc.:
  * DISTANCE IS THE ABSOLUTE PRIMARY FACTOR - it OVERRIDES all other factors (vibe, area type, etc.)
  * Properties with SMALLER distance values should ALWAYS score HIGHER than properties with LARGER distance values, REGARDLESS of other attributes
  * Other factors (vibe, area type) can only create small variations (2-5 points) WITHIN the same distance range
  * Example: "near uni" → 0.5km = 95-100%, 1km = 90-95%, 2km = 80-90%, 5km = 60-75%, 5.6km = 55-70%
  * Example: "easy access to schools" → 0.5km = 95-100%, 1km = 90-95%, 2km = 80-90%, 3km = 70-80%, 5km = 60-70%
  * Example: "kids can play near" or "playground nearby" → 0.5km = 95-100%, 1km = 90-95%, 2km = 80-90%, 3km = 70-80%, 5km = 60-70%
  * A house 1km away should NEVER score lower than a house 5.6km away when proximity is mentioned
  * When kids/children are mentioned AND school/park proximity is mentioned, school and park distances become PRIMARY factors alongside safety
  * SPECIAL CASE - PETS: When user mentions pets (dog, cat, animal, etc.), park distance should be given EXTRA BONUS points (+10 points) even if park is not explicitly mentioned, as pets need parks for exercise
  * SPECIAL CASE - ELDERLY/PEOPLE IN NEED: When user mentions elderly, seniors, people in need, vulnerable, disabled, etc., hospital distance should be given EXTRA BONUS points (+10 points) even if hospital is not explicitly mentioned, as they may need medical access
- Area safety (0-10 scale) - ONLY use as a prominent factor when query mentions: kids, children, elderly, seniors, elderly people, people in need, vulnerable, family with children, etc. If NOT mentioned, safety should have MINIMAL influence (1-5 points difference at most, not a major factor)
- Area vibe (e.g., "family-friendly", "vibrant", "quiet") - match vibe keywords from query but give a little bit more importance to the first word of vibe and then the second
- Area characteristics (isSuburban, isUrban, isUpscale, isNearWater) - match if query mentions these characteristics (e.g., "suburban", "urban", "upscale", "near water", "coastal", "seaside")
- Floor height (high/low) - match if query mentions floor height preferences (e.g., "high floors", "upper floors", "low floor", "ground floor")
- Photo analysis (visual features) - if photoAnalysis is provided, use it to match visual queries (view, looks, appearance, style, design, balcony, terrace, garden, pool, etc.). Properties with matching visual features from photos should score higher. If hasPhotos is false, penalize slightly for visual queries.
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

Calculate match percentage (0-100) for each property by comparing the user's query "${query}" against ALL property attributes including safety, vibe, location, price, size, amenities, owner rating, description, area characteristics (suburban, urban, upscale, near water), floor height (high/low), and photo analysis (visual features from photos).

CRITICAL: If the query "${query}" ONLY mentions specific information that matches 100% with property values (e.g., "athens", "1 bathroom", "second floor") and ALL properties in the list match that information, they MUST ALL get 100%.

CRITICAL: SCORING DISTRIBUTION - When multiple properties match the query, distribute scores across a RANGE (e.g., 60-100%), NOT binary (100% or 0%). Properties should have DIFFERENT scores based on how well they match:
- Best matches (meet all criteria, close distances, high safety when needed): 85-100%
- Good matches (meet most criteria, moderate distances): 70-85%
- Acceptable matches (meet some criteria, farther distances): 60-70%
- Poor matches (meet few criteria, missing important info): 50-60%
- Only use 0% for properties that completely don't match the query

CRITICAL: GREEK/ENGLISH LOCATION EQUIVALENCE - Greek and English location names are EQUIVALENT and should be treated as 100% match:
- "athens" = "Αθήνα" (same location, 100% match)
- "thessaloniki" = "Θεσσαλονίκη" (same location, 100% match)
- "greece" = "Ελλάδα" (same location, 100% match)
- If the query says "athens" and a property has city: "Αθήνα", it's a 100% location match
- If the query says "Αθήνα" and a property has city: "Athens", it's a 100% location match
- Do NOT reduce match percentage due to language differences in location names

MISSING INFORMATION: If a property has null/undefined values for attributes the user requested, PENALIZE it (subtract 10-20 points) but DO NOT exclude it. Properties with missing info should score lower than those with the information.

DISTANCE-SPECIFIC RULE: If the query mentions proximity/distance requirements (e.g., "close to metro", "near school", "easy access to schools", "near uni", "kids can play near", "playground nearby", "within X km of Y"):
1. Properties with null distance values for those specific amenities should be PENALIZED more heavily (subtract 15-25 points) and placed LAST in priority
2. CRITICAL: When "near", "close to", "easy access to", "kids can play near", or proximity is mentioned, properties with SMALLER distance values should ALWAYS score HIGHER than properties with LARGER distance values, REGARDLESS of other factors (vibe, safety, etc.)
3. DISTANCE IS THE PRIMARY RANKING FACTOR - Other factors (vibe, area type, etc.) should only create small variations WITHIN the same distance range, but should NEVER cause a farther property to score higher than a closer one
4. Example: Query "near uni" → House 0.5km from university should score 95-100%, house 1km should score 90-95%, house 2km should score 80-90%, house 5km should score 60-75%, house 5.6km should score 55-70%
5. Example: Query "easy access to schools" → House 0.5km from school should score 95-100%, house 1km should score 90-95%, house 2km should score 80-90%, house 3km should score 70-80%, house 5km should score 60-70%
6. Example: Query "kids can play near" or "playground nearby" → House 0.5km from park should score 95-100%, house 1km should score 90-95%, house 2km should score 80-90%, house 3km should score 70-80%, house 5km should score 60-70%
7. A house 1km away should ALWAYS score higher (90-95%) than a house 5.6km away (55-70%), even if the 5.6km house has better vibe or other attributes
8. The closer the distance, the higher the match percentage should be - this is NON-NEGOTIABLE when proximity is mentioned
9. When kids/children are mentioned AND school/park proximity is mentioned, school and park distances become PRIMARY factors alongside safety - they should have EQUAL or GREATER weight than safety

VISUAL FEATURES EXAMPLES:
- Query "view" or "sea view" or "mountain view" or "city view" → Check photoAnalysis field. Properties with matching views in photoAnalysis get 90-100%, properties without matching views get 60-80%, properties without photos (hasPhotos: false) get 50-70%
- Query "beautiful" or "nice looking" or "modern style" or "aesthetic" → Check photoAnalysis field. Properties with matching visual characteristics get 85-100%, others get lower scores
- Query "balcony" or "terrace" or "garden" or "pool" → Check photoAnalysis field. Properties with these features visible in photos get 90-100%, others get lower scores

AREA CHARACTERISTICS EXAMPLES:
- Query "suburban near water" or "suburban near water" → Properties with isSuburban: true AND isNearWater: true get 90-100%, properties with only one match get 70-85%, others get 50-70%
- Query "upscale with high floors" or "upscale high floors" → Properties with isUpscale: true AND floorHeight: 'high' get 90-100%, properties with only one match get 70-85%, others get 50-70%
- Query "suburban" → Properties with isSuburban: true get 85-100%, others get 60-80%
- Query "near water" or "coastal" or "seaside" → Properties with isNearWater: true get 85-100%, others get 60-80%
- Query "urban" or "city center" → Properties with isUrban: true get 85-100%, others get 60-80%

FLOOR HEIGHT EXAMPLES:
- Query "high floors" or "upper floors" or "high floor" → Properties with floorHeight: 'high' get 85-100%, others get 60-80%
- Query "low floor" or "ground floor" → Properties with floorHeight: 'low' get 85-100%, others get 60-80%

BASIC EXAMPLES:
- Query "athens" → ALL Athens properties (whether city is "Athens" or "Αθήνα") MUST get 100% (they all match the location, no other criteria)
- Query "Αθήνα" → ALL Athens properties (whether city is "Athens" or "Αθήνα") MUST get 100% (same as above, Greek/English are equivalent)
- Query "i want 1 bathroom" → ALL properties with 1 bathroom MUST get 100% (they all match the bathroom count)
- Query "i want the house to be on the second floor" → ALL properties on floor 2 MUST get 100% (they all match the floor)
- Query "athens parking" → Athens properties WITH parking (parking: true) get 90-100%, Athens properties with MISSING parking info (parking: null) get 70-80%, Athens properties WITHOUT parking (parking: false) get 50-60%
- Query "athens garage" → Same as parking (garage = parking)
- Query "parking is essential" or "parking required" or "must have parking" or "need parking" → 
  * Properties WITH parking (parking: true) get 90-100% (top priority)
  * Properties with MISSING parking info (parking: null) get 40-55% (HEAVY penalty, should be near bottom)
  * Properties WITHOUT parking (parking: false) get 20-35% (VERY HEAVY penalty, should be at bottom)
  * Properties without parking should NEVER rank higher than properties with parking when parking is essential
- Query "athens children" → Athens properties with family-friendly vibe or high safety should score higher (90-100%), others lower (70-85%) - Safety is prominent here because "children" is mentioned
- Query "athens elderly" → Athens properties with high safety scores should score higher (90-100%), others lower (70-85%) - Safety is prominent here because "elderly" is mentioned
- Query "athens safe" → Safety should have MINIMAL influence (1-5 points difference) since no vulnerable groups are mentioned - Focus on other criteria instead
- Query "athens" → Safety should have MINIMAL influence (1-5 points difference) - All Athens properties should score similarly regardless of safety
- Query "athens 2 bedrooms" → Athens properties with 2 bedrooms get 100%, others get lower scores
- Query "i want a house with my 2 sons and me, in a safe neighborhood so the kids can play near and easy access to schools...the rent should be 800 at most and a parking would be good but not essential" →
  * Safety is prominent (kids mentioned) - properties with high safety (7-10) get +10-15 points, medium safety (5-7) get +5-10 points, low safety (<5) get -5-10 points
  * School distance is PRIMARY - closestSchool 0.5km = +20 points, 1km = +15 points, 2km = +10 points, 3km = +5 points, 5km = 0 points, >5km = -5 points, null = -15 points
  * Park distance is PRIMARY (kids can play near) - closestPark 0.5km = +20 points, 1km = +15 points, 2km = +10 points, 3km = +5 points, 5km = 0 points, >5km = -5 points, null = -15 points
  * Parking is nice-to-have (not essential) - properties with parking get +5 points, without parking get 0 points, null parking get -5 points
  * Price already filtered (max 800), so all properties match price
  * Final scores should be DISTRIBUTED across a range (e.g., 60-100%), NOT binary (100% or 0%)
  * Properties with BOTH close school AND close park should score highest (90-100%)
  * Properties with close school OR close park should score medium-high (75-90%)
  * Properties with neither close school nor close park should score lower (60-75%)
- Query "parking is essential" or "parking required" or "must have parking" or "need parking" or "we need parking" →
  * Properties WITH parking (parking: true) get 85-100% (top priority, can be highest)
  * Properties with MISSING parking info (parking: null) get 40-55% (HEAVY penalty - subtract 40-50 points from base score)
  * Properties WITHOUT parking (parking: false) get 20-35% (VERY HEAVY penalty - subtract 60-70 points from base score)
  * Properties without parking should NEVER rank in top results when parking is essential
  * Example: A property that would score 90% without considering parking should score: with parking = 90-95%, null parking = 45-50%, without parking = 25-30%
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

    // Post-process: Enforce distance-based ranking with priority system
    // Priority order: metro > bus > university > school > park > kindergarten > hospital
    // Metro and bus are ALWAYS considered (even if not mentioned) as they help house value
    
    // Helper function to calculate distance score
    const calculateDistanceScore = (distance: number | null, preferCloser: boolean = true): number => {
      if (distance === null || distance === undefined) return 0
      
      if (preferCloser) {
        // Closer = better
        if (distance <= 0.5) return 20
        else if (distance <= 1.0) return 15
        else if (distance <= 2.0) return 10
        else if (distance <= 3.0) return 5
        else if (distance <= 5.0) return 0
        else return -5
      } else {
        // Further = better (user wants to be away)
        if (distance >= 5.0) return 20
        else if (distance >= 3.0) return 15
        else if (distance >= 2.0) return 10
        else if (distance >= 1.0) return 5
        else if (distance >= 0.5) return 0
        else return -5
      }
    }
    
    // Detect which distances are mentioned and if user wants to be further away
    const userQueryLower = query.toLowerCase()
    const wantsFurtherAway = /(far|away|distance|avoid|not near|not close)/i.test(query)
    
    // Detect special cases that should boost certain distances
    const hasPets = /pet|pets|dog|dogs|cat|cats|animal|animals/i.test(query)
    const hasElderlyOrPeopleInNeed = /elderly|senior|seniors|people in need|person in need|vulnerable|disabled|disability/i.test(query)
    
    // Check mentions for each distance type
    const mentionsMetro = /metro|subway|underground|train station/i.test(query)
    const mentionsBus = /bus|bus stop|bus station/i.test(query)
    const mentionsUniversity = /(uni|university|universities|college)/i.test(query)
    const mentionsSchool = /school|schools|education/i.test(query)
    // Park is mentioned OR user has pets (pets need parks)
    const mentionsPark = /park|parks|playground|playgrounds|nature|green|greenery|kids?\s+can\s+play/i.test(query) || hasPets
    const mentionsKindergarten = /kindergarten|kindergartens|nursery|nurseries/i.test(query)
    // Hospital is mentioned OR user has elderly/people in need (they need hospitals)
    const mentionsHospital = /hospital|hospitals|medical|clinic/i.test(query) || hasElderlyOrPeopleInNeed
    
    // Priority weights (higher = more important when multiple are mentioned)
    // Priority order: metro(7) > bus(6) > university(5) > school(4) > park(3) > kindergarten(2) > hospital(1)
    const distancePriorities: Array<{
      name: string
      field: 'closestMetro' | 'closestBus' | 'closestUniversity' | 'closestSchool' | 'closestPark' | 'closestKindergarten' | 'closestHospital'
      mentioned: boolean
      alwaysConsider: boolean
      priority: number
    }> = [
      { name: 'metro', field: 'closestMetro', mentioned: mentionsMetro, alwaysConsider: true, priority: 7 },
      { name: 'bus', field: 'closestBus', mentioned: mentionsBus, alwaysConsider: true, priority: 6 },
      { name: 'university', field: 'closestUniversity', mentioned: mentionsUniversity, alwaysConsider: false, priority: 5 },
      { name: 'school', field: 'closestSchool', mentioned: mentionsSchool, alwaysConsider: false, priority: 4 },
      { name: 'park', field: 'closestPark', mentioned: mentionsPark, alwaysConsider: false, priority: 3 },
      { name: 'kindergarten', field: 'closestKindergarten', mentioned: mentionsKindergarten, alwaysConsider: false, priority: 2 },
      { name: 'hospital', field: 'closestHospital', mentioned: mentionsHospital, alwaysConsider: false, priority: 1 },
    ]
    
    // Filter to only distances that should be considered
    const distancesToConsider = distancePriorities.filter(d => d.alwaysConsider || d.mentioned)
    
    // Sort by priority (highest first)
    distancesToConsider.sort((a, b) => b.priority - a.priority)
    
    console.log('Distance priority system:', distancesToConsider.map(d => `${d.name}(${d.priority})`).join(' > '))
    console.log('Wants further away:', wantsFurtherAway)
    
    // Apply distance scoring with priority
    homes.forEach((home) => {
      let totalDistanceBonus = 0
      let appliedDistances = 0
      
      // Apply each distance in priority order
      for (const distanceInfo of distancesToConsider) {
        const distance = home[distanceInfo.field] as number | null
        
        if (distance !== null && distance !== undefined) {
          let distanceScore = calculateDistanceScore(distance, !wantsFurtherAway)
          
          // Special bonuses for pets (park) and elderly/people in need (hospital)
          if (distanceInfo.name === 'park' && hasPets && !mentionsPark) {
            // User has pets but didn't explicitly mention park - give extra bonus
            distanceScore += 10 // Extra 10 points for park distance when pets are mentioned
            console.log(`Home ${home.id}: Extra bonus for park (pets detected): +10`)
          }
          if (distanceInfo.name === 'hospital' && hasElderlyOrPeopleInNeed && !mentionsHospital) {
            // User has elderly/people in need but didn't explicitly mention hospital - give extra bonus
            distanceScore += 10 // Extra 10 points for hospital distance when elderly/people in need are mentioned
            console.log(`Home ${home.id}: Extra bonus for hospital (elderly/people in need detected): +10`)
          }
          
          // Weight by priority (higher priority = more influence)
          const weightedScore = distanceScore * (distanceInfo.priority / 7) // Normalize to 0-1 scale
          totalDistanceBonus += weightedScore
          appliedDistances++
          
          console.log(`Home ${home.id}: ${distanceInfo.name} distance=${distance}km, score=${distanceScore}, weighted=${weightedScore.toFixed(2)}`)
        } else {
          // Penalize missing distance data (less penalty for lower priority)
          const penalty = -5 * (distanceInfo.priority / 7)
          totalDistanceBonus += penalty
          console.log(`Home ${home.id}: ${distanceInfo.name} missing, penalty=${penalty.toFixed(2)}`)
        }
      }
      
      // Get current score
      const currentScore = matchMap.get(home.id) || 50
      
      // Add distance bonus (normalize by number of distances considered)
      const normalizedBonus = appliedDistances > 0 ? totalDistanceBonus / appliedDistances : 0
      const finalScore = Math.min(100, Math.max(0, currentScore + normalizedBonus))
      
      console.log(`Home ${home.id} (${home.area}): currentScore=${currentScore}, distanceBonus=${normalizedBonus.toFixed(2)}, finalScore=${finalScore.toFixed(2)}`)
      matchMap.set(home.id, finalScore)
    })
    
    // Post-process: Enforce parking essential penalty
    const parkingQueryLower = query.toLowerCase()
    const parkingEssential = /parking.*essential|parking.*required|parking.*must|must.*parking|need.*parking|parking.*necessary/i.test(parkingQueryLower)
    
    if (parkingEssential) {
      console.log('Parking essential detected - applying heavy penalties')
      
      homes.forEach((home) => {
        const currentScore = matchMap.get(home.id) || 50
        
        if (home.parking === true) {
          // Has parking - keep score or slightly boost
          const finalScore = Math.min(100, currentScore + 5)
          matchMap.set(home.id, finalScore)
          console.log(`Home ${home.id}: has parking, score=${currentScore} -> ${finalScore}`)
        } else if (home.parking === null || home.parking === undefined) {
          // Missing parking info - HEAVY penalty (40-50 points)
          const finalScore = Math.max(20, Math.min(55, currentScore - 45))
          matchMap.set(home.id, finalScore)
          console.log(`Home ${home.id}: null parking, score=${currentScore} -> ${finalScore} (heavy penalty)`)
        } else if (home.parking === false) {
          // No parking - VERY HEAVY penalty (60-70 points)
          const finalScore = Math.max(15, Math.min(35, currentScore - 65))
          matchMap.set(home.id, finalScore)
          console.log(`Home ${home.id}: no parking, score=${currentScore} -> ${finalScore} (very heavy penalty)`)
        }
      })
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

