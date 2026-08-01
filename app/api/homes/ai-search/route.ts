import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { extractFiltersHybrid } from '@/lib/filter-extraction'
import { removeGreekAccents } from '@/lib/utils'
import { createLocationMaps, createLocationResolver, matchesLocation, getLocationVariations, getDistanceFields, calculateVibeScore, calculateDescriptionBonus, calculatePhotoBonus, calculateDisqualifiers, inferStudentContext, applyStudentTransitBoost } from '@/lib/ai-search-helpers'
import { checkAiSearchLimit, checkEmbeddingLimit } from '@/lib/rate-limit'
import OpenAI from 'openai'
import { requestLogger } from '@/lib/logger'
import { features } from '@/lib/features'
import { generateEmbedding, cosineSimilarity } from '@/lib/embeddings'
import { redisGet, redisSet } from '@/lib/redis'
import {
  scoreHome,
  rankScore,
  normalizeDistance,
  normalizeSafety,
  normalizeVibe,
  normalizeParking,
  normalizeDescriptionBonus,
  normalizeDescriptionPenalty,
  normalizePhoto,
  VIBE_WEIGHT_LOCATION_PREFERENCE,
  type HomeComponents,
} from '@/lib/search/score-home'
import { semanticScore, SEM_NEUTRAL } from '@/lib/search/calibration'

// Initialize OpenAI client (using cheapest model: gpt-3.5-turbo)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

// --- Semantic query caches (server-instance scoped) ---

/** Reuse embedding vectors for identical query strings (LRU, max 200 entries) */
const embeddingTextCache = new Map<string, { vec: number[]; ts: number }>()

interface CachedSearchResult {
  embedding: number[]
  type: string | undefined
  result: { homes: unknown[]; message: string }
  ts: number
}
const searchResultCache: CachedSearchResult[] = []
const SEARCH_CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes
const SEARCH_CACHE_MAX_ENTRIES = 100
const SEARCH_CACHE_SIM_THRESHOLD = 0.78

/** Added to the fit (0..1 scale) when a listing sits in an area the user named. */
const PREFERRED_AREA_BONUS = 0.12

// POST /api/homes/ai-search - AI-powered home search with match percentages
export async function POST(request: NextRequest) {
  const log = requestLogger(request)

  if (!features.aiSearch) {
    return NextResponse.json({ error: 'AI search is currently disabled' }, { status: 503 })
  }

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
  // Declared out here so the error path below can log it too
  let conversationKey: string | null = null

  try {
    const body = await request.json()
    const { query, type, excludeInquired, excludeApproved, preExtractedFilters } = body
    userQuery = query || (preExtractedFilters ? '[conversational]' : 'unknown')
    conversationKey = typeof body.conversationKey === 'string' ? body.conversationKey : null

    if (!preExtractedFilters && (!query || !query.trim())) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    // User id + profile (occupation used for student transit boost)
    let appUserOccupation: string | null = null
    try {
      const user = await getCurrentUser()
      if (user) {
        userId = user.id
        appUserOccupation = user.occupation ?? null

        if (!await checkAiSearchLimit(user.id)) {
          return NextResponse.json(
            { error: 'Too many AI search requests. Please wait before searching again.' },
            { status: 429 }
          )
        }
      }
    } catch {
      // User not logged in, continue without userId
    }

    // --- Semantic cache: generate embedding early, check for similar recent queries ---
    let queryEmbedding: number[] | null = null
    if (openai && process.env.OPENAI_API_KEY && query && query.trim() && !preExtractedFilters) {
      try {
        const normalizedQuery = query.trim()
        // Reuse embedding for the exact same query text
        const cached = embeddingTextCache.get(normalizedQuery)
        if (cached) {
          cached.ts = Date.now() // refresh LRU timestamp
          queryEmbedding = cached.vec
        }
        if (!queryEmbedding) {
          if (userId && !await checkEmbeddingLimit(userId)) {
            return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
          }
          queryEmbedding = await generateEmbedding(normalizedQuery, openai)
          if (embeddingTextCache.size >= 200) {
            // Evict least-recently-used entry
            let lruKey: string | null = null
            let lruTs = Infinity
            for (const [k, v] of embeddingTextCache) {
              if (v.ts < lruTs) { lruTs = v.ts; lruKey = k }
            }
            if (lruKey) embeddingTextCache.delete(lruKey)
          }
          embeddingTextCache.set(normalizedQuery, { vec: queryEmbedding, ts: Date.now() })
        }

        // Only check cache when results aren't user-specific (no exclusion filters)
        if (!excludeInquired && !excludeApproved) {
          // Try Redis cache first (shared across instances, survives restarts)
          const { createHash } = await import('crypto')
          const queryHash = createHash('sha256').update(normalizedQuery).digest('hex').slice(0, 16)
          const redisCacheKey = `ai-search:${type || 'any'}:${queryHash}`
          const redisHit = await redisGet<{ homes: unknown[]; message: string }>(redisCacheKey)
          if (redisHit) {
            log.info('Serving AI search from Redis cache')
            return NextResponse.json(redisHit, { status: 200 })
          }

          // Fall back to in-memory semantic cache
          const now = Date.now()
          let i = searchResultCache.length
          while (i--) {
            if (now - searchResultCache[i].ts > SEARCH_CACHE_TTL_MS) searchResultCache.splice(i, 1)
          }
          let bestSim = 0
          let bestEntry: CachedSearchResult | null = null
          for (const entry of searchResultCache) {
            if (entry.type !== (type || undefined)) continue
            const sim = cosineSimilarity(queryEmbedding, entry.embedding)
            if (sim > bestSim) { bestSim = sim; bestEntry = entry }
          }
          if (bestEntry && bestSim >= SEARCH_CACHE_SIM_THRESHOLD) {
            log.info({ similarity: Math.round(bestSim * 1000) / 1000 }, 'Serving AI search from in-memory cache')
            return NextResponse.json(bestEntry.result, { status: 200 })
          }
        }
      } catch {
        // non-fatal — proceed without caching
      }
    }

    // Step 1: Extract hard filters — skip if pre-extracted filters are provided (conversational mode)
    const listingMode = type === 'buy' || type === 'rent' ? type : undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let extractedFiltersResult: any

    if (preExtractedFilters) {
      extractedFiltersResult = { ...preExtractedFilters, confidence: preExtractedFilters.confidence ?? 0.9 }
    } else {
      // When OpenAI is unavailable fall back to unfiltered results (recency-sorted) rather than hard error
      if (!openai || !process.env.OPENAI_API_KEY) {
        extractedFiltersResult = { confidence: 0 }
      } else {
        extractedFiltersResult = await extractFiltersHybrid(query, openai, { listingMode })
      }
    }
    
    // Extract the filters (reasoning is extracted but not returned to client)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    filterExtractionPrompt = (extractedFiltersResult as Record<string, unknown>).filterExtractionPrompt as string | null || null
    filterExtractionResponse = (extractedFiltersResult as Record<string, unknown>).filterExtractionResponse as string | null || null

    // Canonicalize locations before anything else reads them. The model echoes the
    // user's own spelling ("Nea Smirni", "νεα σμυρνη", "Halandri") but every filter
    // below compares against the DB by exact, accent-folded string.
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
    const locationResolver = createLocationResolver(allAreas)

    if (typeof extractedFilters.city === 'string') {
      const resolvedCity = locationResolver.resolveCity(extractedFilters.city)
      if (resolvedCity) {
        extractedFilters.city = resolvedCity
      } else if (!extractedFilters.area) {
        // Not a known city — the model often puts an area name here ("Nea Smirni")
        const resolvedAsArea = locationResolver.resolveArea(extractedFilters.city)
        if (resolvedAsArea) {
          extractedFilters.area = resolvedAsArea
          extractedFilters.city = null
        }
      }
    }

    // The city (resolved just above) disambiguates areas whose name two cities share
    const cityHint = typeof extractedFilters.city === 'string' ? extractedFilters.city : null

    if (typeof extractedFilters.area === 'string') {
      extractedFilters.area = locationResolver.resolveArea(extractedFilters.area, cityHint) ?? extractedFilters.area
    }

    if (typeof extractedFilters.country === 'string') {
      extractedFilters.country = locationResolver.resolveCountry(extractedFilters.country) ?? extractedFilters.country
    }

    if (Array.isArray(extractedFilters.preferredAreas)) {
      extractedFilters.preferredAreas = extractedFilters.preferredAreas.map(
        (name: string) => locationResolver.resolveArea(name, cityHint) ?? name
      )
    }

    if (Array.isArray(extractedFilters.districts)) {
      extractedFilters.districts = extractedFilters.districts.map(
        (name: string) => locationResolver.resolveDistrict(name) ?? name
      )
    }

    // Separate filters into hard filters, soft filters, and distances for logging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hardFilters: any = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const softFilters: any = {}
    
    // Hard filters: city, country, area, districts, listingType, price, bedrooms, bathrooms, size, parking (if not soft), floor, yearBuilt, yearRenovated, heatingCategory, heatingAgent
    if (extractedFilters.city !== undefined && extractedFilters.city !== null) hardFilters.city = extractedFilters.city
    if (extractedFilters.country !== undefined && extractedFilters.country !== null) hardFilters.country = extractedFilters.country
    if (extractedFilters.area !== undefined && extractedFilters.area !== null) hardFilters.area = extractedFilters.area
    if (extractedFilters.districts !== undefined && extractedFilters.districts !== null) hardFilters.districts = extractedFilters.districts
    if (extractedFilters.listingType !== undefined && extractedFilters.listingType !== null) hardFilters.listingType = extractedFilters.listingType
    if (extractedFilters.listingtype !== undefined && extractedFilters.listingtype !== null) hardFilters.listingtype = extractedFilters.listingtype
    if (extractedFilters.minPrice !== undefined && extractedFilters.minPrice !== null) hardFilters.minPrice = extractedFilters.minPrice
    if (extractedFilters.maxPrice !== undefined && extractedFilters.maxPrice !== null) hardFilters.maxPrice = extractedFilters.maxPrice
    if (extractedFilters.minBedrooms !== undefined && extractedFilters.minBedrooms !== null) hardFilters.minBedrooms = extractedFilters.minBedrooms
    if (extractedFilters.maxBedrooms !== undefined && extractedFilters.maxBedrooms !== null) hardFilters.maxBedrooms = extractedFilters.maxBedrooms
    if (extractedFilters.minBathrooms !== undefined && extractedFilters.minBathrooms !== null) hardFilters.minBathrooms = extractedFilters.minBathrooms
    if (extractedFilters.maxBathrooms !== undefined && extractedFilters.maxBathrooms !== null) hardFilters.maxBathrooms = extractedFilters.maxBathrooms
    if (extractedFilters.minSize !== undefined && extractedFilters.minSize !== null) hardFilters.minSize = extractedFilters.minSize
    if (extractedFilters.maxSize !== undefined && extractedFilters.maxSize !== null) hardFilters.maxSize = extractedFilters.maxSize
    // Parking is hard filter only if not a soft preference
    if (extractedFilters.parking !== undefined && extractedFilters.parking !== null && extractedFilters.parkingSoftPreference !== true) {
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
    if (extractedFilters.parkingSoftPreference !== undefined && extractedFilters.parkingSoftPreference !== null) {
      softFilters.parkingSoftPreference = extractedFilters.parkingSoftPreference
    }
    
    // When confidence is low, widen distance categories so ambiguous queries don't over-filter
    const extractionConfidence = (extractedFiltersResult as Record<string, unknown>).confidence as number ?? 0.9
    if (extractionConfidence < 0.7) {
      const widen = (cat: string | null | undefined) => {
        if (cat === 'Essential') return 'Strong'
        if (cat === 'Strong') return 'Not important'
        return cat
      }
      extractedFilters.Metro = widen(extractedFilters.Metro)
      extractedFilters.Bus = widen(extractedFilters.Bus)
      extractedFilters.University = widen(extractedFilters.University)
      extractedFilters.School = widen(extractedFilters.School)
      extractedFilters.Hospital = widen(extractedFilters.Hospital)
      extractedFilters.Park = widen(extractedFilters.Park)
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

    // Step 2: Build database query with extracted filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    // Match /api/homes: exclude finalized listings from browse
    where.finalized = false

    // Listing type: UI mode (rent vs buy) always wins over AI extraction — same as manual search
    if (type === 'buy') {
      where.listingType = { in: ['sale', 'sell'] }
    } else if (type === 'rent') {
      where.listingType = 'rent'
    } else {
      const listingTypeFilter = extractedFilters.listingType || extractedFilters.listingtype
      if (listingTypeFilter) {
        const listingTypeLower = String(listingTypeFilter).toLowerCase()
        if (listingTypeLower === 'buy' || listingTypeLower === 'sale' || listingTypeLower === 'sell') {
          where.listingType = { in: ['sale', 'sell'] }
        } else if (listingTypeLower === 'rent') {
          where.listingType = 'rent'
        } else {
          where.listingType = listingTypeLower
        }
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
      const isSoftPreference = extractedFilters.parkingSoftPreference === true
      if (!isSoftPreference) {
        // Only apply as hard filter if NOT a soft preference
        where.parking = extractedFilters.parking
      }
      // If it's a soft preference, we'll handle it in scoring instead
    }
    
    // NOTE: Do NOT filter by heatingCategory or heatingAgent if user requests them
    // Instead, include all houses (even with null values) and let AI penalize missing info in match percentage
    // This allows houses with missing information to still appear in results, just with lower scores

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

    // Step 3: Fetch homes with filters applied (reduces dataset before AI processing)
    // Note: City/area/country filters will be applied in JavaScript for better Greek/English matching
    let homes = await prisma.home.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, name: true },
        },
      },
    })

    homesCountBeforeFilter = homes.length

    // Step 4: Apply city/area/country filters with Greek/English matching
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
            include: { owner: { select: { id: true, name: true } } },
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
            include: { owner: { select: { id: true, name: true } } },
          })
        }
      }
    }

    // Filter homes by districts (hard filter - multiple districts = OR condition)
    if (extractedFilters.districts && Array.isArray(extractedFilters.districts) && extractedFilters.districts.length > 0) {
      const requestedDistricts = extractedFilters.districts as string[]
      
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
          } catch {
            // User not logged in, can't exclude
          }
        }

        if (currentUserId) {
          // Always exclude homes where user has dismissed (rejected) inquiries
          const rejectedInquiries = await prisma.inquiry.findMany({
            where: {
              userId: currentUserId,
              dismissed: true,
            },
            select: {
              homeId: true,
            },
          })
          const excludeRejectedHomeIds = rejectedInquiries.map(inq => inq.homeId)

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

          const excludeHomeIds: number[] = []

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

          // Combine all excluded home IDs (rejected + filter exclusions)
          const allExcludedHomeIds = [...new Set([...excludeRejectedHomeIds, ...excludeHomeIds])]
          
          // Remove duplicates and filter out excluded homes
          if (allExcludedHomeIds.length > 0) {
            homes = homes.filter(home => !allExcludedHomeIds.includes(home.id))
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
      (extractedFilters.districts && Array.isArray(extractedFilters.districts) && extractedFilters.districts.length > 0) ||
      extractedFilters.listingType || extractedFilters.listingtype ||
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
      !(extractedFilters.districts && Array.isArray(extractedFilters.districts) && extractedFilters.districts.length > 0) &&
      !extractedFilters.listingType && !extractedFilters.listingtype &&
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
    const parkingSoftPreference = extractedFilters.parkingSoftPreference === true
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

    const studentContext = inferStudentContext(userQuery, appUserOccupation)
    /** Students care about uni + transit; treat as soft criteria so we rank by distance, not flat 100%. */
    const effectiveSoftCriteria = hasSoftCriteria || studentContext
    const filtersForDistanceScoring = studentContext
      ? applyStudentTransitBoost(extractedFilters as Record<string, unknown>)
      : extractedFilters
    
    // Hard filters and nothing else: every returned listing satisfies the query completely,
    // so there is no match signal to report — we order by intrinsic quality and show no
    // percentage at all rather than inventing one out of unrelated attributes.
    const hardFiltersOnly = hasHardFilters && !effectiveSoftCriteria

    // ABSOLUTE MATCH CALCULATION
    // Every component below normalises to [0,1] independently of the rest of the result
    // set, and they are aggregated once at the end by `scoreHome`. Keeping the components
    // separate (rather than mutating a running score) is what lets the saved-search
    // matcher reuse the exact same maths on a single new listing.
    /** homeId → per-component [0,1] scores */
    const componentsMap = new Map<number, HomeComponents>()
    /** homeId → [0,1] bonus for sitting in an explicitly preferred area */
    const areaBonusMap = new Map<number, number>()
    /** homeId → [0,1] penalty from a description that contradicts the query */
    const penaltyMap = new Map<number, number>()
    /** homeId → intrinsic quality, ordering only, used when `hardFiltersOnly` */
    const intrinsicRankMap = new Map<number, number>()

    const getComponents = (homeId: number): HomeComponents => {
      let c = componentsMap.get(homeId)
      if (!c) {
        c = {}
        componentsMap.set(homeId, c)
      }
      return c
    }

    if (hardFiltersOnly) {
      // Order by intrinsic home quality so identical-filter results still have a stable,
      // non-arbitrary sequence. This number is never shown as a match percentage.
      const energyBonus: Record<string, number> = { 'A+': 22, A: 18, B: 13, C: 9, D: 5, E: 2, F: 1, G: 0 }
      homes.forEach(home => {
        let score = 55 // base
        // Energy class (0-22 pts)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        score += energyBonus[(home as any).energyClass || ''] ?? 4
        // Recency — take the best of yearBuilt / yearRenovated (0-15 pts)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const yr = Math.max((home as any).yearBuilt || 0, (home as any).yearRenovated || 0)
        if (yr >= 2020) score += 15
        else if (yr >= 2015) score += 12
        else if (yr >= 2010) score += 9
        else if (yr >= 2000) score += 6
        else if (yr >= 1990) score += 3
        else if (yr > 0) score += 1
        // Price efficiency — closer to budget midpoint = better (0-8 pts)
        const maxP = extractedFilters.maxPrice as number | undefined
        const minP = extractedFilters.minPrice as number | undefined
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (maxP && (home as any).pricePerMonth) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ratio = (home as any).pricePerMonth / maxP
          if (ratio < 0.55) score += 8
          else if (ratio < 0.70) score += 6
          else if (ratio < 0.82) score += 4
          else if (ratio < 0.92) score += 2
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } else if (minP && maxP && (home as any).pricePerMonth) {
          const mid = (minP + maxP) / 2
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dist = Math.abs((home as any).pricePerMonth - mid) / (maxP - minP)
          score += Math.max(0, Math.round((1 - dist) * 6))
        }
        intrinsicRankMap.set(home.id, Math.min(100, score))
      })
    } else {
      // Calculate scores programmatically
      const vibePreference = extractedFilters.vibePreference || null
      const safetyCategory = extractedFilters.Safety || null
      
      // Get distance fields (student: metro, bus, university weighted as Strong when unset)
      const distanceFields = getDistanceFields(filtersForDistanceScoring)
      const distancesToConsider = distanceFields.filter(d => 
        d.category && d.category !== 'Not important' && d.category !== 'Not mentioned' && d.category !== null
      )
      
      // Per-home component scores. Each is absolute and in [0,1]: it depends only on this
      // home and this query, never on the other results. A component left unset was not
      // expressed by the query and is skipped by `scoreHome` rather than scored as 0.
      homes.forEach((home) => {
        const components = getComponents(home.id)
        const areaData = home.area ? areaSafetyVibeMap.get(home.area) : null

        // Proximity — mean over every distance the query asked about. Missing data gets an
        // explicit prior inside `normalizeDistance`, so an ungeocoded listing can never
        // outrank one we know is close.
        if (distancesToConsider.length > 0) {
          let total = 0
          for (const distanceInfo of distancesToConsider) {
            total += normalizeDistance(home[distanceInfo.field] as number | null, distanceInfo.category)
          }
          components.distance = total / distancesToConsider.length
        }

        if (safetyCategory && safetyCategory !== 'Not important' && safetyCategory !== 'Not mentioned') {
          components.safety = normalizeSafety(areaData?.safety ?? null)
        }

        if (vibePreference) {
          const propertyVibes = areaData?.vibe ? areaData.vibe.split(',').map(v => v.trim()) : []
          components.vibe = normalizeVibe(calculateVibeScore(vibePreference, propertyVibes))
        }

        if (parkingSoftPreference) {
          components.parking = normalizeParking(home.parking)
        }
      })
    }

    // Post-process: Apply preferred areas bonus
    // If user mentions areas as preferences (e.g., "like Filothei, Psychiko"), boost properties in those areas
    // Skipped when only hard filters were given — there is no percentage to boost.
    if (!hardFiltersOnly) {
      const preferredAreas = extractedFilters.preferredAreas
      
      if (preferredAreas && Array.isArray(preferredAreas) && preferredAreas.length > 0) {
        // Get area name map for Greek/English matching (reuses the areas fetched above)
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
              areaBonusMap.set(home.id, PREFERRED_AREA_BONUS)
            }
          }
        })
      }
    }
    
    // Parking: If hard filter, database is already filtered. If soft preference, it's a component above.

    // Post-process: Apply description bonus + disqualifier detection
    // Analyze descriptions to match user query features (e.g., "new stove", "backyard", "big balcony")
    /** homeId → incompatibility reason when description explicitly prohibits what user wants */
    const disqualifierMap = new Map<number, string>()
    if (!hardFiltersOnly) {
      // Calculate description bonus for each home
      const descriptionScores: number[] = []
      const descriptionBonusMap = new Map<number, number>()

      for (const home of homes) {
        const result = calculateDescriptionBonus(
          query,
          home.description,
          home.yearBuilt,
          home.yearRenovated
        )

        const disqualifier = calculateDisqualifiers(query, home.description)
        if (disqualifier) {
          disqualifierMap.set(home.id, disqualifier)
        }

        descriptionScores.push(result.bonus)
        descriptionBonusMap.set(home.id, result.bonus)

        if (disqualifierMap.has(home.id)) continue

        // A description that speaks to the query at all is evidence of fit; one that
        // explicitly denies what was asked for is evidence against it. The first is a
        // component, the second a penalty on the aggregate — a listing that says
        // "no pets" should not be rescued by scoring well everywhere else.
        if (result.bonus > 0) {
          getComponents(home.id).description = normalizeDescriptionBonus(result.bonus)
        }
        if (result.penalty < 0) {
          penaltyMap.set(home.id, normalizeDescriptionPenalty(result.penalty))
        }
      }

      // Check if any homes have description bonus
      const hasAnyDescriptionBonus = descriptionScores.some(score => score > 0)


      // Apply photo tag bonus — visual features confirmed in photos that match user query
      // Skip disqualified homes to keep their score locked at 0
      homes.forEach(home => {
        if (disqualifierMap.has(home.id)) return
        // photoTagsArray is the canonical column; JSON-stringify it for calculatePhotoBonus compatibility
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tagsRaw = Array.isArray((home as any).photoTagsArray) && (home as any).photoTagsArray.length > 0
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? JSON.stringify((home as any).photoTagsArray)
          : null
        const photoBonus = calculatePhotoBonus(userQuery, tagsRaw)
        if (photoBonus > 0) {
          getComponents(home.id).photo = normalizePhoto(photoBonus)
        }
      })

      // Recency is applied in `rankScore` below, never to the displayed fit — freshness is
      // a merchandising decision, not evidence that a listing answers the query.

      // Calculate average description score for logging
      if (descriptionScores.length > 0) {
        avgDescriptionPhotoScore = descriptionScores.reduce((sum, score) => sum + score, 0) / descriptionScores.length
      }
      
      // Check if only description matching is requested (no other hard/soft criteria except maybe country)
      // If so, filter to only houses with description score > 0
      const hasOnlyDescriptionMatching = (!hasHardFilters || onlyCountryFilter) && !effectiveSoftCriteria && hasAnyDescriptionBonus
      if (hasOnlyDescriptionMatching) {
        homes = homes.filter(home => {
          const bonus = descriptionBonusMap.get(home.id) || 0
          return bonus > 0
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
      if ((!hasHardFilters || onlyCountryFilter) && !hasAnyDescriptionBonus && !effectiveSoftCriteria) {
        return NextResponse.json(
          { 
            homes: [],
            message: 'No homes found matching your criteria'
          },
          { status: 200 }
        )
      }
    } else {
      // Hard filters only, but only a country was given — too broad to be useful.
      if (onlyCountryFilter) {
        return NextResponse.json(
          {
            homes: [],
            message: 'No homes found matching your criteria'
          },
          { status: 200 }
        )
      }

      // Still detect hard incompatibilities in descriptions
      if (query) {
        for (const home of homes) {
          const disqualifier = calculateDisqualifiers(query, home.description)
          if (disqualifier) {
            disqualifierMap.set(home.id, disqualifier)
          }
        }
      }
    }

    // Semantic similarity — the single strongest signal we have, and a first-class
    // component rather than the ~0-4 point afterthought it used to be. pgvector when the
    // column is populated, JS cosine over the JSON column otherwise.
    if (queryEmbedding && homes.length > 0 && !hardFiltersOnly) {
      const candidates = homes.filter(h => !disqualifierMap.has(h.id))
      /** Homes the in-database query actually returned a similarity for. */
      const scoredByPgvector = new Set<number>()

      if (candidates.length > 0) {
        try {
          const vectorStr = `[${queryEmbedding.join(',')}]`
          const pgResults = await prisma.$queryRawUnsafe<Array<{ id: number; sim: number }>>(
            `SELECT id, 1 - ("embeddingVec" <=> $1::vector) AS sim
             FROM homes
             WHERE id = ANY($2::int[]) AND "embeddingVec" IS NOT NULL`,
            vectorStr,
            candidates.map(h => h.id)
          )
          for (const { id, sim } of pgResults) {
            scoredByPgvector.add(id)
            getComponents(id).semantic = semanticScore(sim)
          }
        } catch {
          // pgvector not yet available — everything falls through to JS cosine
        }

        // Per-home coverage, not a global flag: `embeddingVec` is only written by the bulk
        // uploader and the re-embed job, so a single bulk-uploaded home in the result set
        // used to mark pgvector "used" and silently strip the semantic signal from every
        // normally-created listing.
        for (const home of candidates) {
          if (scoredByPgvector.has(home.id)) continue
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const stored = (home as any).embedding
          getComponents(home.id).semantic = Array.isArray(stored)
            ? semanticScore(cosineSimilarity(queryEmbedding, stored as number[]))
            : SEM_NEUTRAL
        }
      }
    }

    // Final aggregation. `matchPercentage` is the absolute fit and is what the user sees;
    // `rankScore` adds freshness and is only ever used to order the list.
    // When only hard filters were given every result satisfies the query completely, so we
    // report no percentage at all and let the UI say "matches your filters".
    const vibeWeightOverride = extractedFilters.hasLocationPreference === true && extractedFilters.vibePreference
      ? { vibe: VIBE_WEIGHT_LOCATION_PREFERENCE }
      : undefined

    const homesWithMatches = homes.map(home => {
      const incompatibilityReason = disqualifierMap.get(home.id) ?? undefined
      const disqualified = incompatibilityReason !== undefined

      const fit = hardFiltersOnly
        ? null
        : scoreHome(componentsMap.get(home.id) ?? {}, {
            penalty: penaltyMap.get(home.id),
            areaBonus: areaBonusMap.get(home.id),
            disqualified,
            weights: vibeWeightOverride,
          })

      const base = hardFiltersOnly
        ? (disqualified ? 0 : intrinsicRankMap.get(home.id) ?? 50)
        : fit ?? 0

      return {
        ...home,
        embedding: undefined, // strip from response
        matchPercentage: fit,
        incompatibilityReason,
        safety: extractedFilters.Safety || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _rank: disqualified ? -1 : rankScore(base, (home as any).createdAt),
      }
    })
      .sort((a, b) => b._rank - a._rank)
      .map(({ _rank, ...home }) => home)

    finalHomesCount = homesWithMatches.length
    homesCountAfterFilter = homes.length

    // Store in cache for future similar queries (Redis + in-memory)
    if (queryEmbedding && !excludeInquired && !excludeApproved) {
      const cacheResult = { homes: homesWithMatches, message: 'AI search completed' }
      // Redis (shared, persists across deploys)
      const redisCacheKey = `ai-search:${type || 'any'}:${queryEmbedding.slice(0, 8).join(',')}`
      redisSet(redisCacheKey, cacheResult, SEARCH_CACHE_TTL_MS / 1000).catch(() => {})
      // In-memory fallback
      if (searchResultCache.length >= SEARCH_CACHE_MAX_ENTRIES) searchResultCache.shift()
      searchResultCache.push({
        embedding: queryEmbedding,
        type: type || undefined,
        result: cacheResult,
        ts: Date.now(),
      })
    }

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
        conversationKey,
      },
    }).catch((logError) => {
      log.error({ err: logError }, 'Failed to log AI search to database')
    })

    return NextResponse.json(
      { 
        homes: homesWithMatches,
        message: 'AI search completed'
      },
      { status: 200 }
    )
  } catch (error) {
    log.error({ err: error }, 'AI search error')
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
        conversationKey,
      },
    }).catch((logError) => {
      log.error({ err: logError }, 'Failed to log AI search error to database')
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

