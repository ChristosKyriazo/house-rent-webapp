import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { extractFiltersHybrid } from '@/lib/filter-extraction'
import { removeGreekAccents } from '@/lib/utils'
import { createLocationMaps, matchesLocation, getLocationVariations, calculateDistanceScore, getDistanceFields, calculateVibeScore, calculateSafetyScore, calculateParkingScore, calculateDescriptionBonus } from '@/lib/ai-search-helpers'
import OpenAI from 'openai'

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
  let hardFiltersJson: string | null = null
  let softFiltersJson: string | null = null
  let metroCategory: string | null = null
  let busCategory: string | null = null
  let schoolCategory: string | null = null
  let hospitalCategory: string | null = null
  let parkCategory: string | null = null
  let universityCategory: string | null = null
  let homesCountBeforeFilter = 0
  let homesCountAfterFilter = 0
  let finalHomesCount = 0
  let avgDescriptionPhotoScore: number | null = null
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
    const extractedFiltersResult: any = await extractFiltersHybrid(query, openai)
    
    // Extract the filters (reasoning is extracted but not returned to client)
    let extractedFilters: any = {}
    
    // Handle new format with reasoning
    if (extractedFiltersResult.filters) {
      extractedFilters = extractedFiltersResult.filters
    } else {
      // Fallback to old format
      extractedFilters = { ...extractedFiltersResult }
    }
    
    // Remove prompt/response fields
    delete extractedFilters.filterExtractionPrompt
    delete extractedFilters.filterExtractionResponse
    
    // Capture filter extraction data for logging
    filterExtractionPrompt = (extractedFiltersResult as any).filterExtractionPrompt || null
    filterExtractionResponse = (extractedFiltersResult as any).filterExtractionResponse || null
    
    // Separate filters into hard filters, soft filters, and distances for logging
    const hardFilters: any = {}
    const softFilters: any = {}
    
    // Hard filters: city, country, area, districts, listingType, price, bedrooms, bathrooms, size, parking (if not soft), floor, yearBuilt, yearRenovated, heatingCategory, heatingAgent
    if (extractedFilters.city !== undefined && extractedFilters.city !== null) hardFilters.city = extractedFilters.city
    if (extractedFilters.country !== undefined && extractedFilters.country !== null) hardFilters.country = extractedFilters.country
    if (extractedFilters.area !== undefined && extractedFilters.area !== null) hardFilters.area = extractedFilters.area
    if ((extractedFilters as any).districts !== undefined && (extractedFilters as any).districts !== null) hardFilters.districts = (extractedFilters as any).districts
    if (extractedFilters.listingType !== undefined && extractedFilters.listingType !== null) hardFilters.listingType = extractedFilters.listingType
    if ((extractedFilters as any).listingtype !== undefined && (extractedFilters as any).listingtype !== null) hardFilters.listingtype = (extractedFilters as any).listingtype
    if (extractedFilters.minPrice !== undefined && extractedFilters.minPrice !== null) hardFilters.minPrice = extractedFilters.minPrice
    if (extractedFilters.maxPrice !== undefined && extractedFilters.maxPrice !== null) hardFilters.maxPrice = extractedFilters.maxPrice
    if (extractedFilters.minBedrooms !== undefined && extractedFilters.minBedrooms !== null) hardFilters.minBedrooms = extractedFilters.minBedrooms
    if (extractedFilters.maxBedrooms !== undefined && extractedFilters.maxBedrooms !== null) hardFilters.maxBedrooms = extractedFilters.maxBedrooms
    if (extractedFilters.minBathrooms !== undefined && extractedFilters.minBathrooms !== null) hardFilters.minBathrooms = extractedFilters.minBathrooms
    if (extractedFilters.maxBathrooms !== undefined && extractedFilters.maxBathrooms !== null) hardFilters.maxBathrooms = extractedFilters.maxBathrooms
    if (extractedFilters.minSize !== undefined && extractedFilters.minSize !== null) hardFilters.minSize = extractedFilters.minSize
    if (extractedFilters.maxSize !== undefined && extractedFilters.maxSize !== null) hardFilters.maxSize = extractedFilters.maxSize
    // Parking is hard filter only if not a soft preference
    if (extractedFilters.parking !== undefined && extractedFilters.parking !== null && (extractedFilters as any).parkingSoftPreference !== true) {
      hardFilters.parking = extractedFilters.parking
    }
    if (extractedFilters.minFloor !== undefined && extractedFilters.minFloor !== null) hardFilters.minFloor = extractedFilters.minFloor
    if (extractedFilters.maxFloor !== undefined && extractedFilters.maxFloor !== null) hardFilters.maxFloor = extractedFilters.maxFloor
    if (extractedFilters.minYearBuilt !== undefined && extractedFilters.minYearBuilt !== null) hardFilters.minYearBuilt = extractedFilters.minYearBuilt
    if (extractedFilters.maxYearBuilt !== undefined && extractedFilters.maxYearBuilt !== null) hardFilters.maxYearBuilt = extractedFilters.maxYearBuilt
    if (extractedFilters.minYearRenovated !== undefined && extractedFilters.minYearRenovated !== null) hardFilters.minYearRenovated = extractedFilters.minYearRenovated
    if (extractedFilters.maxYearRenovated !== undefined && extractedFilters.maxYearRenovated !== null) hardFilters.maxYearRenovated = extractedFilters.maxYearRenovated
    if (extractedFilters.heatingCategory !== undefined && extractedFilters.heatingCategory !== null) hardFilters.heatingCategory = extractedFilters.heatingCategory
    if (extractedFilters.heatingAgent !== undefined && extractedFilters.heatingAgent !== null) hardFilters.heatingAgent = extractedFilters.heatingAgent
    
    // Soft filters: preferredAreas, vibePreference, Safety, parkingSoftPreference
    if (extractedFilters.preferredAreas !== undefined && extractedFilters.preferredAreas !== null) softFilters.preferredAreas = extractedFilters.preferredAreas
    if (extractedFilters.vibePreference !== undefined && extractedFilters.vibePreference !== null) softFilters.vibePreference = extractedFilters.vibePreference
    if (extractedFilters.Safety !== undefined && extractedFilters.Safety !== null) softFilters.Safety = extractedFilters.Safety
    if ((extractedFilters as any).parkingSoftPreference !== undefined && (extractedFilters as any).parkingSoftPreference !== null) {
      softFilters.parkingSoftPreference = (extractedFilters as any).parkingSoftPreference
    }
    
    // Extract individual distance categories
    metroCategory = extractedFilters.Metro !== undefined && extractedFilters.Metro !== null ? extractedFilters.Metro : null
    busCategory = extractedFilters.Bus !== undefined && extractedFilters.Bus !== null ? extractedFilters.Bus : null
    schoolCategory = extractedFilters.School !== undefined && extractedFilters.School !== null ? extractedFilters.School : null
    hospitalCategory = extractedFilters.Hospital !== undefined && extractedFilters.Hospital !== null ? extractedFilters.Hospital : null
    parkCategory = extractedFilters.Park !== undefined && extractedFilters.Park !== null ? extractedFilters.Park : null
    universityCategory = extractedFilters.University !== undefined && extractedFilters.University !== null ? extractedFilters.University : null
    
    hardFiltersJson = Object.keys(hardFilters).length > 0 ? JSON.stringify(hardFilters) : null
    softFiltersJson = Object.keys(softFilters).length > 0 ? JSON.stringify(softFilters) : null

    // TEST LOG - DELETE AFTER: Show AI JSON response
    console.log('\n========== AI FILTER EXTRACTION JSON ==========')
    console.log('Hard Filters:', hardFiltersJson)
    console.log('Soft Filters:', softFiltersJson)
    console.log('Metro:', metroCategory)
    console.log('Bus:', busCategory)
    console.log('School:', schoolCategory)
    console.log('Hospital:', hospitalCategory)
    console.log('Park:', parkCategory)
    console.log('University:', universityCategory)
    console.log('================================================\n')

    // Step 2: Build database query with extracted filters
    let where: any = {}
    
    // Filter by listing type if provided (from request or extracted filters)
    // Check both camelCase (listingType) and lowercase (listingtype) from AI response
    const listingTypeFilter = extractedFilters.listingType || (extractedFilters as any).listingtype || type
    if (listingTypeFilter) {
      const listingTypeLower = listingTypeFilter.toLowerCase()
      if (listingTypeLower === 'buy') {
        where.listingType = 'sell'
      } else if (listingTypeLower === 'rent') {
        where.listingType = 'rent'
      } else {
        where.listingType = listingTypeLower
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

    // Parking is a HARD FILTER - if user mentions parking, filter database to only show matching homes
    // UNLESS it's marked as a soft preference (e.g., "parking would be nice but not essential")
    if (extractedFilters.parking !== undefined && extractedFilters.parking !== null) {
      const isSoftPreference = (extractedFilters as any).parkingSoftPreference === true
      if (!isSoftPreference) {
        // Only apply as hard filter if NOT a soft preference
        where.parking = extractedFilters.parking
      }
      // If it's a soft preference, we'll handle it in scoring instead
    }
    
    // NOTE: Do NOT filter by heatingCategory or heatingAgent if user requests them
    // Instead, include all houses (even with null values) and let AI penalize missing info in match percentage
    // This allows houses with missing information to still appear in results, just with lower scores

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

    // Step 4: Apply city/area/country filters with Greek/English matching
    // Always fetch areas for matching (needed for Greek/English translation and district filtering)
    const allAreas = await prisma.area.findMany({
      select: {
        name: true,
        nameGreek: true,
        city: true,
        cityGreek: true,
        country: true,
        countryGreek: true,
        district: true,
      },
    })

    // Create bidirectional maps for matching (English <-> Greek)
    const { cityMap, countryMap, areaNameMap } = createLocationMaps(allAreas)

    // Filter homes by city with Greek/English matching
    if (extractedFilters.city) {
      const allCityVariations = getLocationVariations(extractedFilters.city, cityMap)
      homes = homes.filter(home => 
        matchesLocation(home.city, extractedFilters.city!, cityMap, allCityVariations)
      )
      
      // If no homes found, check if city name might actually be an area
      if (homes.length === 0 && !extractedFilters.area) {
        const cityNameLower = extractedFilters.city.toLowerCase()
        const cityNameNormalized = removeGreekAccents(cityNameLower)
        const matchingArea = allAreas.find(a => {
          if (a.name && removeGreekAccents(a.name.toLowerCase()) === cityNameNormalized) return true
          if (a.nameGreek && removeGreekAccents(a.nameGreek.toLowerCase()) === cityNameNormalized) return true
          return false
        })
        if (matchingArea) {
          // Convert city filter to area filter
          extractedFilters.area = matchingArea.name || matchingArea.nameGreek || extractedFilters.city
          extractedFilters.city = null
          // Re-fetch homes without city filter
          homes = await prisma.home.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { owner: { select: { id: true, email: true, name: true } } },
          })
      }
      }
    }

    // Filter homes by country with Greek/English matching
    if (extractedFilters.country) {
      const countryVariations = getLocationVariations(extractedFilters.country, countryMap)
      homes = homes.filter(home => 
        matchesLocation(home.country, extractedFilters.country!, countryMap, countryVariations)
      )
      }
      
    // Filter homes by area with Greek/English matching
    if (extractedFilters.area) {
      const areaVariations = getLocationVariations(extractedFilters.area, areaNameMap)
      // Add normalized variations
      areaVariations.forEach(name => {
        areaVariations.add(removeGreekAccents(name))
      })
      
      homes = homes.filter(home => 
        matchesLocation(home.area, extractedFilters.area!, areaNameMap, areaVariations)
      )
      
      // If no homes found, check if area might have been extracted as city instead
      if (homes.length === 0 && !extractedFilters.city) {
        const filterAreaNormalized = removeGreekAccents(extractedFilters.area.toLowerCase())
        const matchingArea = allAreas.find(a => {
          if (a.name && removeGreekAccents(a.name.toLowerCase()) === filterAreaNormalized) return true
          if (a.nameGreek && removeGreekAccents(a.nameGreek.toLowerCase()) === filterAreaNormalized) return true
        return false
      })
        if (matchingArea && matchingArea.city) {
          // Convert area filter to city filter
          extractedFilters.city = matchingArea.city || matchingArea.cityGreek || null
          extractedFilters.area = null
          // Re-fetch homes without area filter
          homes = await prisma.home.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { owner: { select: { id: true, email: true, name: true } } },
          })
        }
      }
    }

    // Filter homes by districts (hard filter - multiple districts = OR condition)
    if ((extractedFilters as any).districts && Array.isArray((extractedFilters as any).districts) && (extractedFilters as any).districts.length > 0) {
      const requestedDistricts = (extractedFilters as any).districts as string[]
      
      // Get available districts from DB, filtered by city if city is provided
      let availableDistricts = allAreas
        .filter(a => a.district !== null && a.district !== undefined)
        .map(a => a.district!)
      
      // If city is provided, filter districts by city
      if (extractedFilters.city) {
        const cityVariations = getLocationVariations(extractedFilters.city, cityMap)
        const cityAreas = allAreas.filter(a => 
          matchesLocation(a.city, extractedFilters.city!, cityMap, cityVariations)
        )
        availableDistricts = cityAreas
          .filter(a => a.district !== null && a.district !== undefined)
          .map(a => a.district!)
      }
      
      // Remove duplicates
      availableDistricts = [...new Set(availableDistricts)]
      
      // Match requested districts with available districts (flexible matching)
      const matchedDistricts: string[] = []
      for (const requestedDistrict of requestedDistricts) {
        const requestedNormalized = removeGreekAccents(requestedDistrict.toLowerCase().trim())
        const matched = availableDistricts.find(available => {
          const availableNormalized = removeGreekAccents(available.toLowerCase().trim())
          return availableNormalized === requestedNormalized || 
                 availableNormalized.includes(requestedNormalized) ||
                 requestedNormalized.includes(availableNormalized)
        })
        if (matched) {
          matchedDistricts.push(matched)
        }
      }
      
      if (matchedDistricts.length > 0) {
        // Filter homes by matching districts through their areas
        const areasInDistricts = allAreas
          .filter(a => matchedDistricts.includes(a.district!))
          .map(a => a.name)
        
        if (areasInDistricts.length > 0) {
          homes = homes.filter(home => 
            home.area !== null && areasInDistricts.includes(home.area)
          )
        } else {
          // No areas found in requested districts
          homes = []
        }
      } else {
        // No districts matched - return empty results
        homes = []
      }
    }

    // NOTE: Distance categories are NO LONGER used as hard filters
    // Instead, they are used only for scoring/ranking in post-processing
    // All homes are returned, but match percentages are adjusted based on distance categories
    // - Essential: Extra importance to 0-1km, good importance to 1-2km, less importance beyond
    // - Strong: Even importance to 0-2km, less importance beyond
    // - Avoid: Penalize homes within 3km, reward homes further away
    // - Not important/Not mentioned: No distance-based scoring

    // Apply exclude filters for inquired and approved listings
    // Note: excludeInquired and excludeApproved come from the request body
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

          let excludeHomeIds: number[] = []

          if (excludeInquired) {
            // Exclude homes where user has inquired (not dismissed, not finalized)
            const inquiredHomeIds = userInquiries
              .filter(inq => inq.dismissed === false && inq.finalized === false)
              .map(inq => inq.homeId)
            excludeHomeIds.push(...inquiredHomeIds)
          }

          if (excludeApproved) {
            // Exclude homes where user has approved inquiries (not dismissed, not finalized)
            const approvedHomeIds = userInquiries
              .filter(inq => inq.approved === true && inq.dismissed === false && inq.finalized === false)
              .map(inq => inq.homeId)
            excludeHomeIds.push(...approvedHomeIds)
          }

          // Remove duplicates and filter out excluded homes
          excludeHomeIds = [...new Set(excludeHomeIds)]
          if (excludeHomeIds.length > 0) {
            homes = homes.filter(home => !excludeHomeIds.includes(home.id))
          }
        }
      } catch (error) {
        console.error('Error fetching inquiries for exclude filter:', error)
        // Continue without excluding if there's an error
      }
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

    // Check if ONLY hard filters were extracted (no soft criteria)
    // Hard filters: location (city/country/area), price, bedrooms, bathrooms, size, floor, year built/renovated, 
    // heating category/agent, parking, listing type
    // Soft criteria: distance categories, vibe preference
    // If ONLY hard filters are present, all matching properties should get 100%
    
    const hasHardFilters = 
      extractedFilters.city || extractedFilters.country || extractedFilters.area ||
      ((extractedFilters as any).districts && Array.isArray((extractedFilters as any).districts) && (extractedFilters as any).districts.length > 0) ||
      extractedFilters.listingType || (extractedFilters as any).listingtype ||
      extractedFilters.minPrice || extractedFilters.maxPrice ||
      extractedFilters.minBedrooms || extractedFilters.maxBedrooms ||
      extractedFilters.minBathrooms || extractedFilters.maxBathrooms ||
      extractedFilters.minSize || extractedFilters.maxSize ||
      extractedFilters.parking !== undefined ||
      extractedFilters.heatingCategory || extractedFilters.heatingAgent ||
      extractedFilters.minFloor || extractedFilters.maxFloor ||
      extractedFilters.minYearBuilt || extractedFilters.maxYearBuilt ||
      extractedFilters.minYearRenovated || extractedFilters.maxYearRenovated
    
    // Check if country is the ONLY hard filter - if so, return nothing
    const onlyCountryFilter = extractedFilters.country && 
      !extractedFilters.city && !extractedFilters.area &&
      !((extractedFilters as any).districts && Array.isArray((extractedFilters as any).districts) && (extractedFilters as any).districts.length > 0) &&
      !extractedFilters.listingType && !(extractedFilters as any).listingtype &&
      !extractedFilters.minPrice && !extractedFilters.maxPrice &&
      !extractedFilters.minBedrooms && !extractedFilters.maxBedrooms &&
      !extractedFilters.minBathrooms && !extractedFilters.maxBathrooms &&
      !extractedFilters.minSize && !extractedFilters.maxSize &&
      extractedFilters.parking === undefined &&
      !extractedFilters.heatingCategory && !extractedFilters.heatingAgent &&
      !extractedFilters.minFloor && !extractedFilters.maxFloor &&
      !extractedFilters.minYearBuilt && !extractedFilters.maxYearBuilt &&
      !extractedFilters.minYearRenovated && !extractedFilters.maxYearRenovated
    
    // Check if we have soft criteria (distance categories, safety, vibe preference, or parking soft preference)
    const parkingSoftPreference = (extractedFilters as any).parkingSoftPreference === true
    const hasSoftCriteria = 
      (extractedFilters.Metro && extractedFilters.Metro !== 'Not mentioned') ||
      (extractedFilters.Bus && extractedFilters.Bus !== 'Not mentioned') ||
      (extractedFilters.School && extractedFilters.School !== 'Not mentioned') ||
      (extractedFilters.Hospital && extractedFilters.Hospital !== 'Not mentioned') ||
      (extractedFilters.Park && extractedFilters.Park !== 'Not mentioned') ||
      (extractedFilters.University && extractedFilters.University !== 'Not mentioned') ||
      (extractedFilters.Safety && extractedFilters.Safety !== 'Not mentioned') ||
      extractedFilters.vibePreference ||
      parkingSoftPreference
    
    // If we have hard filters but NO soft criteria, all matching properties get 100%
    const shouldForce100 = hasHardFilters && !hasSoftCriteria

    // PROGRAMMATIC MATCH CALCULATION (replaces AI match calculation)
    // Calculate match percentages based on distance scores and vibe matching
    const matchMap = new Map<number, number>()
    
    if (shouldForce100) {
      // All properties get 100% if only hard filters
      homes.forEach(home => {
        matchMap.set(home.id, 100)
      })
    } else {
      // Calculate scores programmatically
      const vibePreference = extractedFilters.vibePreference || null
      const safetyCategory = extractedFilters.Safety || null
      
      // Get distance fields
      const distanceFields = getDistanceFields(extractedFilters)
      const distancesToConsider = distanceFields.filter(d => 
        d.category && d.category !== 'Not important' && d.category !== 'Not mentioned' && d.category !== null
      )
      
      // TEST LOG - DELETE AFTER: Show calculation inputs
      console.log('\n========== CALCULATION INPUTS ==========')
      console.log('Vibe Preference:', vibePreference)
      console.log('Safety Category:', safetyCategory)
      console.log('Distances to Consider:', distancesToConsider.map(d => ({ field: d.name, category: d.category })))
      console.log('========================================\n')

      // Calculate raw scores for each home
      const rawScores = new Map<number, number>()
      let minScore = Infinity
      let maxScore = -Infinity
      
      // TEST LOG - DELETE AFTER: Track calculation details
      const calculationDetails: Array<{
        homeId: number
        homeTitle: string
        distanceScores: Array<{ field: string; distance: number | null; score: number }>
        avgDistanceScore: number
        safety: number | null
        safetyScore: number
        parking: boolean | null
        parkingScore: number
        propertyVibes: string[]
        vibeScore: number
        rawScore: number
        finalScaledScore?: number
      }> = []
      
      homes.forEach((home) => {
        let rawScore = 0 // Start from 0, build up
        
        // Calculate distance scores with priority logic for Metro/Bus
        let totalDistanceScore = 0
        let distanceCount = 0
        const distanceScores: Array<{ field: string; distance: number | null; score: number }> = []
        
        // Check if both Metro and Bus are Essential or Strong
        const metroInfo = distancesToConsider.find(d => d.field === 'closestMetro')
        const busInfo = distancesToConsider.find(d => d.field === 'closestBus')
        const hasMetro = !!metroInfo
        const hasBus = !!busInfo
        const bothEssential = hasMetro && hasBus && 
          metroInfo?.category === 'Essential' && busInfo?.category === 'Essential'
        const bothStrong = hasMetro && hasBus && 
          metroInfo?.category === 'Strong' && busInfo?.category === 'Strong'
        
        if (bothEssential || bothStrong) {
          // Priority logic: 
          // 1. If Metro <= 2km, prioritize Metro
          // 2. If Metro > 2km and Bus <= 2km, prioritize Bus
          // 3. If both > 2km, treat them equally (average)
          const threshold = 2.0 // Same threshold for both Essential and Strong
          
          const metroDistance = home[metroInfo!.field] as number | null
          const busDistance = home[busInfo!.field] as number | null
          
          const metroScore = calculateDistanceScore(metroDistance, metroInfo!.category)
          const busScore = calculateDistanceScore(busDistance, busInfo!.category)
          
          // Determine how to combine Metro and Bus scores
          if (metroDistance !== null && busDistance !== null) {
            if (metroDistance <= threshold) {
              // Metro <= 2km: prioritize Metro (80% metro, 20% bus)
              totalDistanceScore = (metroScore * 0.8) + (busScore * 0.2)
              distanceCount = 1
            } else if (metroDistance > threshold && busDistance <= threshold) {
              // Metro > 2km and Bus <= 2km: prioritize Bus (70% bus, 30% metro)
              totalDistanceScore = (busScore * 0.7) + (metroScore * 0.3)
              distanceCount = 1
            } else {
              // Both > 2km: treat equally (average them)
              totalDistanceScore = metroScore + busScore
              distanceCount = 2
            }
          } else if (metroDistance === null && busDistance !== null) {
            // Only Bus available
            totalDistanceScore = busScore
            distanceCount = 1
          } else if (busDistance === null && metroDistance !== null) {
            // Only Metro available
            totalDistanceScore = metroScore
            distanceCount = 1
          } else {
            // Both null
            totalDistanceScore = 0
            distanceCount = 0
          }
          
          // Store both for logging
          distanceScores.push({ 
            field: metroInfo!.name, 
            distance: metroDistance, 
            score: metroScore 
          })
          distanceScores.push({ 
            field: busInfo!.name, 
            distance: busDistance, 
            score: busScore 
          })
          
          // Add other distance types (School, Hospital, Park, University) normally
          for (const distanceInfo of distancesToConsider) {
            if (distanceInfo.field !== 'closestMetro' && distanceInfo.field !== 'closestBus') {
              const distance = home[distanceInfo.field] as number | null
              const score = calculateDistanceScore(distance, distanceInfo.category)
              totalDistanceScore += score
              distanceScores.push({ field: distanceInfo.name, distance, score })
              if (distance !== null && distance !== undefined) {
                distanceCount++
              }
            }
          }
        } else {
          // Normal calculation: average all distance scores
          for (const distanceInfo of distancesToConsider) {
            const distance = home[distanceInfo.field] as number | null
            const score = calculateDistanceScore(distance, distanceInfo.category)
            totalDistanceScore += score
            distanceScores.push({ field: distanceInfo.name, distance, score })
            if (distance !== null && distance !== undefined) {
              distanceCount++
            }
          }
        }
        
        // Average distance scores if multiple distances, otherwise use the single score
        const avgDistanceScore = distanceCount > 0 ? totalDistanceScore / distanceCount : 0
        
        // Calculate safety score
        const areaData = home.area ? areaSafetyVibeMap.get(home.area) : null
        const safety = areaData?.safety || null
        const safetyScore = calculateSafetyScore(safety, safetyCategory)
        
        // Calculate vibe score
        const propertyVibes = areaData?.vibe ? areaData.vibe.split(',').map(v => v.trim()) : []
        const vibeScore = calculateVibeScore(vibePreference, propertyVibes)
        
        // Calculate parking score (only if it's a soft preference)
        const parkingScore = calculateParkingScore(home.parking, parkingSoftPreference)
        
        // Combine distance, safety, vibe, and parking scores
        // If location preference is mentioned, vibe gets 40% weight
        // Adjust based on what exists
        const hasDistance = distancesToConsider.length > 0
        const hasSafety = safetyCategory && safetyCategory !== 'Not important' && safetyCategory !== 'Not mentioned'
        const hasVibe = !!vibePreference
        const hasParking = parkingSoftPreference
        const hasLocationPreference = (extractedFilters as any).hasLocationPreference === true
        
        // Count how many components we have
        const componentCount = [hasDistance, hasSafety, hasVibe, hasParking].filter(Boolean).length
        
        // If location preference is mentioned, vibe gets 40% weight
        if (hasLocationPreference && hasVibe) {
          if (componentCount === 4) {
            // All four with location preference: Distance 50%, Safety 5%, Vibe 40%, Parking 5%
            rawScore = (avgDistanceScore * 0.5) + (safetyScore * 0.05) + (vibeScore * 0.4) + (parkingScore * 0.05)
          } else if (hasDistance && hasSafety && hasVibe) {
            // Distance + Safety + Vibe with location: Distance 50%, Safety 10%, Vibe 40%
            rawScore = (avgDistanceScore * 0.5) + (safetyScore * 0.1) + (vibeScore * 0.4)
          } else if (hasDistance && hasVibe && hasParking) {
            // Distance + Vibe + Parking with location: Distance 50%, Vibe 40%, Parking 10%
            rawScore = (avgDistanceScore * 0.5) + (vibeScore * 0.4) + (parkingScore * 0.1)
          } else if (hasSafety && hasVibe && hasParking) {
            // Safety + Vibe + Parking with location: Safety 20%, Vibe 40%, Parking 40%
            rawScore = (safetyScore * 0.2) + (vibeScore * 0.4) + (parkingScore * 0.4)
          } else if (hasDistance && hasVibe) {
            // Distance + Vibe with location: Distance 60%, Vibe 40%
            rawScore = (avgDistanceScore * 0.6) + (vibeScore * 0.4)
          } else if (hasSafety && hasVibe) {
            // Safety + Vibe with location: Safety 60%, Vibe 40%
            rawScore = (safetyScore * 0.6) + (vibeScore * 0.4)
          } else if (hasVibe && hasParking) {
            // Vibe + Parking with location: Vibe 40%, Parking 60%
            rawScore = (vibeScore * 0.4) + (parkingScore * 0.6)
          } else if (hasVibe) {
            // Only vibe with location preference: 100% Vibe
            rawScore = vibeScore
          } else {
            // Fallback (shouldn't happen)
            rawScore = avgDistanceScore || safetyScore || parkingScore || 50
          }
        } else {
          // No location preference - use original weighting
          if (componentCount === 4) {
            // All four: Distance 70%, Safety 10%, Vibe 10%, Parking 10%
            rawScore = (avgDistanceScore * 0.7) + (safetyScore * 0.1) + (vibeScore * 0.1) + (parkingScore * 0.1)
          } else if (hasDistance && hasSafety && hasVibe) {
            // Distance + Safety + Vibe: 80% Distance, 10% Safety, 10% Vibe
            rawScore = (avgDistanceScore * 0.8) + (safetyScore * 0.1) + (vibeScore * 0.1)
          } else if (hasDistance && hasSafety && hasParking) {
            // Distance + Safety + Parking: 70% Distance, 20% Safety, 10% Parking
            rawScore = (avgDistanceScore * 0.7) + (safetyScore * 0.2) + (parkingScore * 0.1)
          } else if (hasDistance && hasVibe && hasParking) {
            // Distance + Vibe + Parking: 75% Distance, 15% Vibe, 10% Parking
            rawScore = (avgDistanceScore * 0.75) + (vibeScore * 0.15) + (parkingScore * 0.1)
          } else if (hasSafety && hasVibe && hasParking) {
            // Safety + Vibe + Parking: 60% Safety, 25% Vibe, 15% Parking
            rawScore = (safetyScore * 0.6) + (vibeScore * 0.25) + (parkingScore * 0.15)
          } else if (hasDistance && hasSafety) {
            // Distance + Safety: 60% Distance, 40% Safety
            rawScore = (avgDistanceScore * 0.6) + (safetyScore * 0.4)
          } else if (hasDistance && hasVibe) {
            // Distance + Vibe: 80% Distance, 20% Vibe
            rawScore = (avgDistanceScore * 0.8) + (vibeScore * 0.2)
          } else if (hasDistance && hasParking) {
            // Distance + Parking: 85% Distance, 15% Parking
            rawScore = (avgDistanceScore * 0.85) + (parkingScore * 0.15)
          } else if (hasSafety && hasVibe) {
            // Safety + Vibe: 70% Safety, 30% Vibe
            rawScore = (safetyScore * 0.7) + (vibeScore * 0.3)
          } else if (hasSafety && hasParking) {
            // Safety + Parking: 75% Safety, 25% Parking
            rawScore = (safetyScore * 0.75) + (parkingScore * 0.25)
          } else if (hasVibe && hasParking) {
            // Vibe + Parking: 70% Vibe, 30% Parking
            rawScore = (vibeScore * 0.7) + (parkingScore * 0.3)
          } else if (hasDistance) {
            // Only distance
            rawScore = avgDistanceScore
          } else if (hasSafety) {
            // Only safety
            rawScore = safetyScore
          } else if (hasVibe) {
            // Only vibe
            rawScore = vibeScore
          } else if (hasParking) {
            // Only parking
            rawScore = parkingScore
          } else {
            // No soft criteria (shouldn't happen, but fallback)
            rawScore = 50
          }
        }
        
        rawScores.set(home.id, rawScore)
        minScore = Math.min(minScore, rawScore)
        maxScore = Math.max(maxScore, rawScore)
        
        // TEST LOG - DELETE AFTER: Store calculation details
        calculationDetails.push({
          homeId: home.id,
          homeTitle: home.title.substring(0, 50),
          distanceScores,
          avgDistanceScore,
          safety,
          safetyScore,
          parking: home.parking,
          parkingScore,
          propertyVibes,
          vibeScore,
          rawScore,
        })
      })
      
      // Scale all scores to 0-100 range
      const scoreRange = maxScore - minScore
      
      // TEST LOG - DELETE AFTER: Show scaling info
      console.log('\n========== SCALING INFO ==========')
      console.log('Min Raw Score:', minScore)
      console.log('Max Raw Score:', maxScore)
      console.log('Score Range:', scoreRange)
      console.log('==================================\n')
      
      homes.forEach((home) => {
        const rawScore = rawScores.get(home.id) || 50
        
        // Scale to 0-100
        let scaledScore = scoreRange > 0 
          ? ((rawScore - minScore) / scoreRange) * 100
          : 100 // All same score, set to 100
        
        // Ensure score is between 0-100
        scaledScore = Math.max(0, Math.min(100, scaledScore))
        
        // No 99% cap - allow 100% if the scaled score reaches it
        // The scoring system is now granular enough to show differences naturally
        
        matchMap.set(home.id, scaledScore)
        
        // TEST LOG - DELETE AFTER: Update calculation details with final score
        const detail = calculationDetails.find(d => d.homeId === home.id)
        if (detail) {
          detail.finalScaledScore = scaledScore
        }
      })
      
      // TEST LOG - DELETE AFTER: Show all calculation details
      console.log('\n========== CALCULATION DETAILS FOR EACH HOME ==========')
      calculationDetails.forEach(detail => {
        console.log(`\nHome ID: ${detail.homeId} - ${detail.homeTitle}`)
        console.log('  Distance Scores:')
        detail.distanceScores.forEach(ds => {
          console.log(`    ${ds.field}: ${ds.distance !== null ? ds.distance + 'km' : 'null'} → Score: ${ds.score}`)
        })
        console.log(`  Average Distance Score: ${detail.avgDistanceScore.toFixed(2)}`)
        console.log(`  Safety: ${detail.safety !== null ? detail.safety : 'null'} → Safety Score: ${detail.safetyScore.toFixed(2)}`)
        console.log(`  Parking: ${detail.parking !== null ? detail.parking : 'null'} → Parking Score: ${detail.parkingScore.toFixed(2)}`)
        console.log(`  Property Vibes: [${detail.propertyVibes.join(', ')}]`)
        console.log(`  Vibe Score: ${detail.vibeScore.toFixed(2)}`)
        console.log(`  Raw Score: ${detail.rawScore.toFixed(2)}`)
        console.log(`  Final Scaled Score: ${detail.finalScaledScore?.toFixed(2)}%`)
      })
      console.log('\n======================================================\n')
    }

    // Distance scoring is now handled in the programmatic calculation above
    
    // Post-process: Apply preferred areas bonus
    // If user mentions areas as preferences (e.g., "like Filothei, Psychiko"), boost properties in those areas
    // SKIP if shouldForce100 (only hard filters, no soft criteria) - all should be 100%
    if (!shouldForce100) {
      const preferredAreas = extractedFilters.preferredAreas
      
      if (preferredAreas && Array.isArray(preferredAreas) && preferredAreas.length > 0) {
        // Get area name map for Greek/English matching
        const allAreas = await prisma.area.findMany()
        const areaNameMap = new Map<string, Set<string>>()
        
        allAreas.forEach(area => {
          if (area.name) {
            const nameLower = area.name.toLowerCase()
            if (!areaNameMap.has(nameLower)) {
              areaNameMap.set(nameLower, new Set())
            }
            if (area.nameGreek) {
              areaNameMap.get(nameLower)!.add(area.nameGreek.toLowerCase())
            }
          }
          if (area.nameGreek) {
            const nameGreekLower = area.nameGreek.toLowerCase()
            if (!areaNameMap.has(nameGreekLower)) {
              areaNameMap.set(nameGreekLower, new Set())
            }
            if (area.name) {
              areaNameMap.get(nameGreekLower)!.add(area.name.toLowerCase())
            }
          }
        })
        
        // Build set of all possible preferred area name variations
        const preferredAreaVariations = new Set<string>()
        preferredAreas.forEach(prefArea => {
          const prefAreaLower = prefArea.toLowerCase().trim()
          preferredAreaVariations.add(prefAreaLower)
          preferredAreaVariations.add(removeGreekAccents(prefAreaLower))
          
          // Add variations from area name map
          if (areaNameMap.has(prefAreaLower)) {
            areaNameMap.get(prefAreaLower)!.forEach(variation => {
              preferredAreaVariations.add(variation)
              preferredAreaVariations.add(removeGreekAccents(variation))
            })
          }
        })
      
      homes.forEach((home) => {
          if (home.area) {
            const homeArea = home.area.toLowerCase().trim()
            const homeAreaNormalized = removeGreekAccents(homeArea)
            
            // Check if home area matches any preferred area variation
            const isPreferred = 
              preferredAreaVariations.has(homeArea) ||
              preferredAreaVariations.has(homeAreaNormalized) ||
              Array.from(preferredAreaVariations).some(prefVar => 
                homeArea === prefVar || 
                homeArea.includes(prefVar) || 
                prefVar.includes(homeArea) ||
                homeAreaNormalized === removeGreekAccents(prefVar)
              )
            
            if (isPreferred) {
        const currentScore = matchMap.get(home.id) || 50
              const bonus = 12 // Bonus for being in a preferred area
              const finalScore = Math.min(100, Math.max(0, currentScore + bonus))
              matchMap.set(home.id, finalScore)
            }
          }
        })
      }
    }
    
    // Parking: If hard filter, database is already filtered. If soft preference, it's included in scoring above.
    
    // Distance, safety, and vibe matching are now handled in the programmatic calculation above

    // Post-process: Apply description bonus
    // Analyze descriptions to match user query features (e.g., "new stove", "backyard", "big balcony")
    // This bonus is applied after all other scores are calculated
    if (!shouldForce100) {
      // Calculate description bonus for each home
      const descriptionScores: number[] = []
      const descriptionBonusMap = new Map<number, number>()
      const descriptionPenaltyMap = new Map<number, number>()
      const descriptionDetails: Array<{
        homeId: number
        homeTitle: string
        description: string | null
        bonus: number
        penalty: number
      }> = []
      
      // TEST LOG - DELETE AFTER: Show description matching info
      console.log('\n========== DESCRIPTION MATCHING ==========')
      console.log('User Query:', query)
      console.log('Checking descriptions for matching features...\n')
      
      let extractedKeywords: string[] = []
      const descriptionResults = new Map<number, { bonus: number; penalty: number; extractedKeywords: string[]; matchedKeywords: string[]; hasNewMention: boolean }>()
      
      for (const home of homes) {
        const result = calculateDescriptionBonus(
          query,
          home.description,
          home.yearBuilt,
          home.yearRenovated
        )
        
        // Store extracted keywords from first home (they're the same for all)
        if (extractedKeywords.length === 0) {
          extractedKeywords = result.extractedKeywords
        }
        
        descriptionScores.push(result.bonus)
        descriptionBonusMap.set(home.id, result.bonus)
        descriptionPenaltyMap.set(home.id, result.penalty)
        descriptionResults.set(home.id, result)
        
        // TEST LOG - DELETE AFTER: Store description details
        descriptionDetails.push({
          homeId: home.id,
          homeTitle: home.title.substring(0, 50),
          description: home.description ? home.description.substring(0, 200) : null,
          bonus: result.bonus,
          penalty: result.penalty,
        })
      }
      
      // TEST LOG - DELETE AFTER: Show description scores for each home
      console.log('Extracted Keywords from Query:', extractedKeywords.length > 0 ? extractedKeywords.join(', ') : 'None found')
      console.log('\nDescription Scores:')
      descriptionDetails.forEach(detail => {
        const result = descriptionResults.get(detail.homeId)!
        console.log(`  Home ID: ${detail.homeId} - ${detail.homeTitle}`)
        console.log(`    Description: ${detail.description || 'null'}`)
        console.log(`    Matched Keywords: ${result.matchedKeywords.length > 0 ? result.matchedKeywords.join(', ') : 'None'}`)
        console.log(`    Description Bonus: ${detail.bonus.toFixed(2)}%`)
        if (detail.penalty < 0) {
          console.log(`    Description Penalty: ${detail.penalty.toFixed(2)}%`)
        }
        if (result.hasNewMention) {
          console.log(`    Year-based scoring: Built ${homes.find(h => h.id === detail.homeId)?.yearBuilt || 'N/A'}, Renovated ${homes.find(h => h.id === detail.homeId)?.yearRenovated || 'N/A'}`)
        }
      })
      console.log('==========================================\n')
      
      // Check if any homes have description bonus
      const hasAnyDescriptionBonus = descriptionScores.some(score => score > 0)
      
      // Apply bonuses and penalties
      homes.forEach(home => {
        const bonus = descriptionBonusMap.get(home.id) || 0
        const penalty = descriptionPenaltyMap.get(home.id) || 0
        const currentScore = matchMap.get(home.id) || 0
        
        let finalScore = currentScore
        
        // Apply penalty first (for negative mentions)
        if (penalty < 0) {
          finalScore = Math.max(0, finalScore + penalty) // penalty is already negative
        }
        
        // Apply bonus
        if (bonus > 0) {
          finalScore = Math.min(100, finalScore + bonus)
        } else if (hasAnyDescriptionBonus && bonus === 0 && penalty === 0) {
          // Penalize houses without bonus when others have it (only if no explicit penalty)
          const maxBonus = Math.max(...descriptionScores)
          const relativePenalty = Math.min(maxBonus * 0.5, 10) // Penalty up to 50% of max bonus or 10%, whichever is smaller
          finalScore = Math.max(0, finalScore - relativePenalty)
        }
        
        matchMap.set(home.id, finalScore)
      })
      
      // If some homes have bonus and others don't, show in logs
      if (hasAnyDescriptionBonus) {
        
        // TEST LOG - DELETE AFTER: Show description bonus application
        console.log('\n========== DESCRIPTION BONUS APPLICATION ==========')
        const maxBonus = Math.max(...descriptionScores)
        console.log(`Max Description Bonus: ${maxBonus.toFixed(2)}%`)
        console.log(`Homes with bonus: ${descriptionScores.filter(s => s > 0).length}`)
        console.log(`Homes with penalty: ${Array.from(descriptionPenaltyMap.values()).filter(p => p < 0).length}`)
        console.log(`Homes without bonus: ${descriptionScores.filter(s => s === 0).length}`)
        homes.forEach(home => {
          const bonus = descriptionBonusMap.get(home.id) || 0
          const penalty = descriptionPenaltyMap.get(home.id) || 0
          const beforeScore = matchMap.get(home.id) || 0
          const afterScore = matchMap.get(home.id) || 0
          if (bonus > 0) {
            console.log(`  Home ${home.id}: +${bonus.toFixed(2)}% bonus → ${beforeScore.toFixed(2)}% → ${afterScore.toFixed(2)}%`)
          } else if (penalty < 0) {
            console.log(`  Home ${home.id}: ${penalty.toFixed(2)}% penalty (negative mention) → ${beforeScore.toFixed(2)}% → ${afterScore.toFixed(2)}%`)
          } else if (hasAnyDescriptionBonus) {
            const relativePenalty = Math.min(maxBonus * 0.5, 10)
            console.log(`  Home ${home.id}: -${relativePenalty.toFixed(2)}% penalty (no match) → ${beforeScore.toFixed(2)}% → ${afterScore.toFixed(2)}%`)
          }
        })
        console.log('==================================================\n')
      } else {
        // No homes have bonus, just apply scores as normal
        homes.forEach(home => {
          const bonus = descriptionBonusMap.get(home.id) || 0
          if (bonus > 0) {
            const currentScore = matchMap.get(home.id) || 0
            const finalScore = Math.min(100, currentScore + bonus)
            matchMap.set(home.id, finalScore)
          }
        })
        
        // TEST LOG - DELETE AFTER: Show that no description matches found
        console.log('\n========== DESCRIPTION MATCHING ==========')
        console.log('No description matches found for any homes')
        console.log('==========================================\n')
      }
      
      // Calculate average description score for logging
      if (descriptionScores.length > 0) {
        avgDescriptionPhotoScore = descriptionScores.reduce((sum, score) => sum + score, 0) / descriptionScores.length
      }
      
      // Check if only description matching is requested (no other hard/soft criteria except maybe country)
      // If so, filter to only houses with description score > 0
      const hasOnlyDescriptionMatching = (!hasHardFilters || onlyCountryFilter) && !hasSoftCriteria && hasAnyDescriptionBonus
      if (hasOnlyDescriptionMatching) {
        homes = homes.filter(home => {
          const bonus = descriptionBonusMap.get(home.id) || 0
          return bonus > 0
        })
        // Update matchMap to only include filtered homes
        const filteredHomeIds = new Set(homes.map(h => h.id))
        matchMap.forEach((score, homeId) => {
          if (!filteredHomeIds.has(homeId)) {
            matchMap.delete(homeId)
          }
        })
      }
      
      // If only country filter and no description matches, return nothing
      if (onlyCountryFilter && !hasAnyDescriptionBonus) {
        return NextResponse.json(
          { 
            homes: [],
            message: 'No homes found matching your criteria'
          },
          { status: 200 }
        )
      }
      
      // If no hard filters (or only country) and all description scores are 0 AND no soft criteria, return nothing
      // If there are soft criteria (Safety, vibe, distances), we should still return results
      if ((!hasHardFilters || onlyCountryFilter) && !hasAnyDescriptionBonus && !hasSoftCriteria) {
        return NextResponse.json(
          { 
            homes: [],
            message: 'No homes found matching your criteria'
          },
          { status: 200 }
        )
      }
    } else {
      // If shouldForce100 but only country filter, return nothing
      if (onlyCountryFilter) {
        return NextResponse.json(
          { 
            homes: [],
            message: 'No homes found matching your criteria'
          },
          { status: 200 }
        )
      }
    }

    // Attach match percentages and safety to homes and sort by match percentage (highest first)
    const homesWithMatches = homes.map(home => {
      const areaData = home.area ? areaSafetyVibeMap.get(home.area) : null
      return {
        ...home,
        matchPercentage: matchMap.get(home.id) || 0,
        safety: extractedFilters.Safety || null, // Include safety category in response
      }
    }).sort((a, b) => b.matchPercentage - a.matchPercentage)

    finalHomesCount = homesWithMatches.length
    homesCountAfterFilter = homes.length

    // Log to database (async, don't wait for it)
    prisma.aISearchLog.create({
      data: {
        userId,
        userQuery: query,
        filterExtractionPrompt,
        filterExtractionResponse,
        hardFilters: hardFiltersJson,
        softFilters: softFiltersJson,
        metro: metroCategory,
        bus: busCategory,
        school: schoolCategory,
        hospital: hospitalCategory,
        park: parkCategory,
        university: universityCategory,
        homesCountBeforeFilter,
        homesCountAfterFilter,
        finalHomesCount,
        descriptionPhotoScore: avgDescriptionPhotoScore,
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
        hardFilters: hardFiltersJson,
        softFilters: softFiltersJson,
        metro: metroCategory,
        bus: busCategory,
        school: schoolCategory,
        hospital: hospitalCategory,
        park: parkCategory,
        university: universityCategory,
        homesCountBeforeFilter,
        homesCountAfterFilter,
        finalHomesCount,
        descriptionPhotoScore: avgDescriptionPhotoScore,
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

