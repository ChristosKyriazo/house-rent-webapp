import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getUserRatings } from '@/lib/ratings'
import { extractFiltersHybrid } from '@/lib/filter-extraction'
import { MATCH_CALCULATION_SYSTEM_PROMPT, createMatchCalculationUserPrompt } from '@/lib/ai-prompts'
import { removeGreekAccents } from '@/lib/utils'
import { createLocationMaps, matchesLocation, getLocationVariations, calculateDistanceScore, getDistanceFields } from '@/lib/ai-search-helpers'
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
    extractedFiltersJson = JSON.stringify(extractedFilters)

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
    if (extractedFilters.parking !== undefined && extractedFilters.parking !== null) {
      where.parking = extractedFilters.parking
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

    // NOTE: Distance categories are NO LONGER used as hard filters
    // Instead, they are used only for scoring/ranking in post-processing
    // All homes are returned, but match percentages are adjusted based on distance categories
    // - Essential: Extra importance to 0-1km, good importance to 1-2km, less importance beyond
    // - Strong: Even importance to 0-2km, less importance beyond
    // - Avoid: Penalize homes within 3km, reward homes further away
    // - Not important/Not mentioned: No distance-based scoring

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
        hasElevator: null, // Elevator information not stored in database - will be penalized in scoring if required
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

    // Check if ONLY hard filters were extracted (no soft criteria)
    // Hard filters: location (city/country/area), price, bedrooms, bathrooms, size, floor, year built/renovated, 
    // heating category/agent, parking, listing type, distance categories
    // Soft criteria: safety, vibe, visual features, owner rating, description matching, etc.
    // If ONLY hard filters are present, all matching properties should get 100%
    
    const hasHardFilters = 
      extractedFilters.city || extractedFilters.country || extractedFilters.area ||
      extractedFilters.listingType || (extractedFilters as any).listingtype ||
      extractedFilters.minPrice || extractedFilters.maxPrice ||
      extractedFilters.minBedrooms || extractedFilters.maxBedrooms ||
      extractedFilters.minBathrooms || extractedFilters.maxBathrooms ||
      extractedFilters.minSize || extractedFilters.maxSize ||
      extractedFilters.parking !== undefined ||
      extractedFilters.heatingCategory || extractedFilters.heatingAgent ||
      extractedFilters.minFloor || extractedFilters.maxFloor ||
      extractedFilters.minYearBuilt || extractedFilters.maxYearBuilt ||
      extractedFilters.minYearRenovated || extractedFilters.maxYearRenovated ||
      (extractedFilters.Metro && extractedFilters.Metro !== 'Not mentioned') ||
      (extractedFilters.Bus && extractedFilters.Bus !== 'Not mentioned') ||
      (extractedFilters.School && extractedFilters.School !== 'Not mentioned') ||
      (extractedFilters.Hospital && extractedFilters.Hospital !== 'Not mentioned') ||
      (extractedFilters.Park && extractedFilters.Park !== 'Not mentioned') ||
      (extractedFilters.University && extractedFilters.University !== 'Not mentioned')
    
    // Check if query mentions soft criteria (safety, vibe, visual, etc.)
    const queryLower = query.toLowerCase().trim()
    const mentionsSoftCriteria = 
      /safe|safety|secure|vibrant|quiet|family-friendly|upscale|suburban|urban|coastal|seaside|near water|beautiful|nice looking|modern|traditional|aesthetic|view|views|sea view|mountain view|city view|balcony|terrace|garden|pool|rating|rated|review/i.test(queryLower) ||
      /kids|children|elderly|seniors|people in need|vulnerable|disabled|student|students|nightlife|parties/i.test(queryLower)
    
    // If we have hard filters but NO soft criteria mentioned, force 100% for all matches
    // This means the user only specified hard requirements (location, price, size, etc.) 
    // and all properties matching those hard filters should be considered equally good (100%)
    const shouldForce100 = hasHardFilters && !mentionsSoftCriteria

    // Create AI prompt to calculate match percentages
    // Use the ORIGINAL user query and compare against ALL house data (including safety/vibe)
    const systemPrompt = MATCH_CALCULATION_SYSTEM_PROMPT
    const userPrompt = createMatchCalculationUserPrompt(query, homesData)

    // Capture match calculation prompt for logging
    matchCalculationPrompt = `System: ${systemPrompt}\n\nUser: ${userPrompt}`

    // Call OpenAI API for match percentage calculation
    // SKIP AI call if shouldForce100 (only hard filters, no soft criteria) - we'll set all to 100% anyway
    let matchResults: Array<{ id: number; matchPercentage: number }> = []
    
    if (shouldForce100) {
      // Set all to 100% immediately - no need to call AI
      matchResults = homesData.map(home => ({ id: home.id, matchPercentage: 100 }))
      matchCalculationResponse = 'Skipped - hard filters only, all matches set to 100%'
    } else {
    
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
      
      if (responseContent) {
        try {
          const parsed = JSON.parse(responseContent)
          // Extract matches array from response
          matchResults = parsed.matches || parsed.results || []
          
          // If AI didn't return matches for all homes, add missing ones with 0% match
          const matchedIds = new Set(matchResults.map((r: any) => r.id))
          const missingHomes = homesData.filter(home => !matchedIds.has(home.id))
          if (missingHomes.length > 0) {
            missingHomes.forEach(home => {
              (matchResults as any[]).push({ 
                id: home.id, 
                matchPercentage: 0
              })
            })
          }
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError)
          // Fallback: assign equal percentages if parsing fails
          matchResults = homesData.map(home => ({ 
            id: home.id, 
            matchPercentage: 50
          } as any))
        }
      } else {
        // No response from AI, assign default percentages
        matchResults = homesData.map(home => ({ 
          id: home.id, 
          matchPercentage: 50
        } as any))
      }
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError)
      matchCalculationResponse = openaiError instanceof Error ? openaiError.message : String(openaiError)
      // Fallback: assign equal percentages if API fails
      matchResults = homesData.map(home => ({ id: home.id, matchPercentage: 50 }))
      }
    }

    // Create match percentage map
    const matchMap = new Map<number, number>()
    matchResults.forEach((result: any) => {
      matchMap.set(result.id, Math.max(0, Math.min(100, result.matchPercentage)))
    })
    
    // If shouldForce100 is true, we already set all to 100% in matchResults (skipped AI call)
    // But we still need to ensure the map has 100% for all homes
    if (shouldForce100 && homesData.length > 0) {
      // Force all to 100% (in case AI was called before we detected shouldForce100)
      homesData.forEach(home => {
        matchMap.set(home.id, 100)
      })
    }

    // Post-process: Apply distance-based scoring based on new category system
    // Categories are NO LONGER used as hard filters - all homes are returned
    // Instead, match percentages are adjusted based on distance categories:
    // - Essential: Extra importance to 0-1km (high bonus), good importance to 1-2km (medium bonus), less importance beyond (small bonus/penalty)
    // - Strong: Even importance to 0-2km (medium bonus), less importance beyond (small bonus/penalty)
    // - Avoid: Penalize homes within 3km (penalty), reward homes further away (bonus)
    // - Not important/Not mentioned: No distance-based scoring
    // SKIP if shouldForce100 (only hard filters, no soft criteria) - all should be 100%
    
    if (!shouldForce100) {
      // Get distance fields
      const distanceFields = getDistanceFields(extractedFilters)
      
      // Filter to only distances that have a category (not "Not important", "Not mentioned", or null)
      const distancesToConsider = distanceFields.filter(d => 
        d.category && d.category !== 'Not important' && d.category !== 'Not mentioned' && d.category !== null
      )
    
      // Apply distance scoring based on categories to ALL homes (no filtering)
      homes.forEach((home) => {
        let totalDistanceBonus = 0
        let appliedDistances = 0
        
        for (const distanceInfo of distancesToConsider) {
          const distance = home[distanceInfo.field] as number | null
          const score = calculateDistanceScore(distance, distanceInfo.category)
          totalDistanceBonus += score
          if (distance !== null && distance !== undefined) {
            appliedDistances++
          }
        }
      
      // Get current score
      const currentScore = matchMap.get(home.id) || 50
      
        // Add distance bonus
        // For Essential categories, don't normalize - use full impact
        // For other categories, normalize by number of distances
        const hasEssentialCategory = distancesToConsider.some(d => d.category === 'Essential')
        const distanceBonus = hasEssentialCategory && appliedDistances > 0
          ? totalDistanceBonus  // Full impact for Essential (no normalization)
          : (appliedDistances > 0 ? totalDistanceBonus / appliedDistances : 0)  // Normalize for non-Essential
        const finalScore = Math.min(100, Math.max(0, currentScore + distanceBonus))
        
      matchMap.set(home.id, finalScore)
    })
    }
    
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
    
    // Post-process: Enforce elevator requirement penalty
    // If user requires elevator for floors above a certain level, penalize properties on those floors without elevator
    // SKIP if shouldForce100 (only hard filters, no soft criteria) - all should be 100%
    if (!shouldForce100) {
      const requiresElevator = extractedFilters.requiresElevator === true
      const elevatorRequiredFromFloor = extractedFilters.elevatorRequiredFromFloor
      
      if (requiresElevator && elevatorRequiredFromFloor !== null && elevatorRequiredFromFloor !== undefined) {
        homes.forEach((home) => {
      const currentScore = matchMap.get(home.id) || 50
      
          // Only penalize if property is on or above the required floor
          if (home.floor !== null && home.floor !== undefined && home.floor >= elevatorRequiredFromFloor) {
            // Check if elevator is mentioned in description (we can't store elevator in DB, so check description)
            const description = (home.description || '').toLowerCase()
            const hasElevatorMention = /elevator|lift|ascenseur|ανελκυστήρας/i.test(description)
            
            if (!hasElevatorMention) {
              // Property is on required floor or above, but no elevator mentioned - heavy penalty
              const penalty = -25
              const finalScore = Math.max(0, Math.min(100, currentScore + penalty))
      matchMap.set(home.id, finalScore)
            } else {
              // Elevator mentioned in description - small bonus
              const bonus = 5
              const finalScore = Math.max(0, Math.min(100, currentScore + bonus))
              matchMap.set(home.id, finalScore)
            }
          }
        })
      }
    }
    
    // Parking is now a HARD FILTER - if user mentions parking, database is already filtered
    // No post-processing needed for parking

    // Attach match percentages to homes and sort by match percentage (highest first)
    const homesWithMatches = homes.map(home => ({
      ...home,
      matchPercentage: matchMap.get(home.id) || 0,
    })).sort((a, b) => b.matchPercentage - a.matchPercentage)

    finalHomesCount = homesWithMatches.length
    homesCountAfterFilter = homes.length

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

