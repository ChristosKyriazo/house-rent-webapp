import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { calculatePropertyDistances } from '@/lib/google-maps'
import { removeGreekAccents, resolveCountryToEnglishCanonical, resolveCityToEnglishCanonical, resolveAreaToEnglishCanonical } from '@/lib/utils'
import { generateHouseDescriptions } from '@/lib/house-description-generator'
import { toEnglishValue, normalizeHeatingCategory, normalizeHeatingAgent } from '@/lib/translations'
import { validateBody } from '@/lib/api-utils'
import { createHomeSchema } from '@/lib/schemas'
import { getListingLimit, checkTier } from '@/lib/subscription'
import { checkMapsLimit, checkAiDescriptionLimit } from '@/lib/rate-limit'
import { analyzePhotosForTags, parsePhotoTags } from '@/lib/photo-vision'
import { processEmbeddingQueue } from '@/lib/bulk-upload-processor'
import { generateEmbedding, buildHomeText } from '@/lib/embeddings'
import { matchSavedSearches } from '@/lib/saved-search-matcher'
import OpenAI from 'openai'
import { requestLogger } from '@/lib/logger'

// GET /api/homes - list all homes with optional filters
export async function GET(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Build filter object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    // Map 'buy' (from search UI) to sale listings (stored as "sale"; legacy rows may use "sell")
    const listingType = searchParams.get('listingType')
    if (listingType) {
      if (listingType === 'buy') {
        where.listingType = { in: ['sale', 'sell'] }
      } else {
        where.listingType = listingType
      }
    }
    
    // Handle city filter with Greek/English matching
    // We'll fetch all homes first and filter in JavaScript for proper Greek/English matching
    const cityParam = searchParams.get('city')
    const shouldFilterCity = cityParam && cityParam.trim().length > 0
    
    // Handle country filter with Greek/English matching
    const countryParam = searchParams.get('country')
    if (countryParam && countryParam.trim().length > 0) {
      const countrySearch = countryParam.trim().toLowerCase()
      const countrySearchNormalized = removeGreekAccents(countrySearch)
      
      // Fetch all areas to find matching countries
      const allAreas = await prisma.area.findMany({
        select: { country: true, countryGreek: true },
        distinct: ['country'],
      })
      
      // Find all matching country names (English or Greek)
      const matchingCountries = new Set<string>()
      allAreas.forEach(area => {
        if (area.country) {
          const countryLower = area.country.toLowerCase()
          const countryNormalized = removeGreekAccents(countryLower)
          if (countryLower.includes(countrySearch) || countryNormalized.includes(countrySearchNormalized)) {
            matchingCountries.add(area.country)
          }
        }
        if (area.countryGreek) {
          const countryGreekLower = area.countryGreek.toLowerCase()
          const countryGreekNormalized = removeGreekAccents(countryGreekLower)
          if (countryGreekLower.includes(countrySearch) || countryGreekNormalized.includes(countrySearchNormalized)) {
            // Find the English country name for this Greek country
            const englishCountry = allAreas.find(a => a.countryGreek === area.countryGreek)?.country
            if (englishCountry) {
              matchingCountries.add(englishCountry)
            }
          }
        }
      })
      
      if (matchingCountries.size > 0) {
        // Filter by matching country names
        where.country = { in: Array.from(matchingCountries) }
      } else {
        // If no match found in areas, try direct match
        where.country = { contains: countryParam }
      }
    }
    
    if (searchParams.get('minBedrooms')) {
      where.bedrooms = { gte: Number(searchParams.get('minBedrooms')) }
    }
    
    if (searchParams.get('maxBedrooms')) {
      where.bedrooms = { ...where.bedrooms, lte: Number(searchParams.get('maxBedrooms')) }
    }
    
    if (searchParams.get('minPrice')) {
      where.pricePerMonth = { gte: Number(searchParams.get('minPrice')) }
    }
    
    if (searchParams.get('maxPrice')) {
      where.pricePerMonth = { ...where.pricePerMonth, lte: Number(searchParams.get('maxPrice')) }
    }

    if (searchParams.get('minSize')) {
      where.sizeSqMeters = { gte: Number(searchParams.get('minSize')) }
    }
    
    if (searchParams.get('maxSize')) {
      where.sizeSqMeters = { ...where.sizeSqMeters, lte: Number(searchParams.get('maxSize')) }
    }
    
    if (searchParams.get('heatingCategory')) {
      where.heatingCategory = searchParams.get('heatingCategory')
    }
    
    if (searchParams.get('heatingAgent')) {
      where.heatingAgent = searchParams.get('heatingAgent')
    }
    
    if (searchParams.get('yearBuilt')) {
      where.yearBuilt = Number(searchParams.get('yearBuilt'))
    }
    
    // Filter by areas (multiple areas can be selected)
    const areas = searchParams.getAll('areas').filter(area => area && area.trim() !== '')
    if (areas.length > 0) {
      where.area = { in: areas }
    }

    // Exclude finalized and overlimit-hidden houses from renter search results
    let currentUser = null
    try {
      currentUser = await getCurrentUser()
      where.finalized = false
      where.overlimitHiddenAt = null
    } catch {
      where.finalized = false
      where.overlimitHiddenAt = null
    }

    // Always exclude homes where user has dismissed (rejected) inquiries
    let excludeRejectedHomeIds: number[] = []
    if (currentUser) {
      const rejectedInquiries = await prisma.inquiry.findMany({
        where: {
          userId: currentUser.id,
          dismissed: true,
        },
        select: {
          homeId: true,
        },
      })
      excludeRejectedHomeIds = rejectedInquiries.map(inq => inq.homeId)
    }

    // Handle exclude filters for inquired and approved listings
    const excludeInquired = searchParams.get('excludeInquired') === 'true'
    const excludeApproved = searchParams.get('excludeApproved') === 'true'
    
    let excludeHomeIds: number[] = []
    if ((excludeInquired || excludeApproved) && currentUser) {
      // Fetch user's inquiries to get home IDs to exclude
      const userInquiries = await prisma.inquiry.findMany({
        where: {
          userId: currentUser.id,
        },
        select: {
          homeId: true,
          approved: true,
          dismissed: true,
          finalized: true,
        },
      })

      if (excludeInquired) {
        // Exclude homes where user has inquired (not dismissed, not finalized)
        const inquiredHomeIds = userInquiries
          .filter(inq => !inq.dismissed && !inq.finalized)
          .map(inq => inq.homeId)
        excludeHomeIds.push(...inquiredHomeIds)
      }

      if (excludeApproved) {
        // Exclude homes where user has approved inquiries (not dismissed, not finalized)
        const approvedHomeIds = userInquiries
          .filter(inq => inq.approved && !inq.dismissed && !inq.finalized)
          .map(inq => inq.homeId)
        excludeHomeIds.push(...approvedHomeIds)
      }

      // Remove duplicates
      excludeHomeIds = [...new Set(excludeHomeIds)]
    }

    // Combine all excluded home IDs (rejected + filter exclusions)
    const allExcludedHomeIds = [...new Set([...excludeRejectedHomeIds, ...excludeHomeIds])]
    if (allExcludedHomeIds.length > 0) {
      // Add exclusion to where clause
      // Use NOT with OR to exclude multiple IDs
      if (where.AND) {
        where.AND.push({ id: { notIn: allExcludedHomeIds } })
      } else if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { id: { notIn: allExcludedHomeIds } }
        ]
        delete where.OR
      } else if (where.id) {
        // If id filter already exists, combine with AND
        where.AND = [
          { id: where.id },
          { id: { notIn: allExcludedHomeIds } }
        ]
        delete where.id
      } else {
        where.id = { notIn: allExcludedHomeIds }
      }
    }

    // Remove city/country from where clause - we'll filter in JavaScript for proper Greek/English matching
    if (shouldFilterCity) {
      delete where.city
    }
    if (countryParam && countryParam.trim().length > 0) {
      delete where.country
    }

    // Fetch all areas to get city/country translations for matching (before fetching homes)
    const allAreas = await prisma.area.findMany({
      select: { city: true, cityGreek: true, country: true, countryGreek: true },
    })

    // Note: We'll apply exclude filters in JavaScript after city/country filtering
    // to ensure they work correctly with the JavaScript-based filtering

    // Bounded scan: the 1536-float embedding column is omitted (it dominated
    // per-row memory), and the row count is capped so a single request can't
    // load the whole table. City/country matching still happens in JS below —
    // beyond MAX_SCAN rows, only the newest MAX_SCAN listings are searchable.
    const MAX_SCAN = 2000
    let homes = await prisma.home.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: MAX_SCAN,
      omit: { embedding: true },
      include: {
        owner: {
          select: { id: true, name: true, createdAt: true, subscriptionTier: true },
        },
      },
    })

    // Create maps for quick lookup
    const cityMap = new Map<string, Set<string>>() // Greek city -> Set of English cities
    const countryMap = new Map<string, Set<string>>() // Greek country -> Set of English countries
    
    allAreas.forEach(area => {
      if (area.city && area.cityGreek) {
        if (!cityMap.has(area.cityGreek)) {
          cityMap.set(area.cityGreek, new Set())
        }
        cityMap.get(area.cityGreek)!.add(area.city)
      }
      if (area.country && area.countryGreek) {
        if (!countryMap.has(area.countryGreek)) {
          countryMap.set(area.countryGreek, new Set())
        }
        countryMap.get(area.countryGreek)!.add(area.country)
      }
    })

    // Filter by city with Greek/English matching
    if (shouldFilterCity) {
      const citySearch = cityParam!.trim().toLowerCase()
      const citySearchNormalized = removeGreekAccents(citySearch)
      
      // Create bidirectional maps for city translations from areas
      const greekToEnglishCity = new Map<string, string>()
      const englishToGreekCity = new Map<string, string>()
      allAreas.forEach(area => {
        if (area.city && area.cityGreek) {
          greekToEnglishCity.set(area.cityGreek.toLowerCase(), area.city)
          englishToGreekCity.set(area.city.toLowerCase(), area.cityGreek)
        }
      })
      
      // Filter homes directly - check if home's city matches search
      // This is the primary matching method
      homes = homes.filter(home => {
        if (!home.city) return false
        
        const homeCityLower = home.city.toLowerCase()
        const homeCityNormalized = removeGreekAccents(homeCityLower)
        
        // Direct match: check if home's city (normalized) contains the search term
        if (homeCityLower.includes(citySearch) || homeCityNormalized.includes(citySearchNormalized)) {
          return true
        }
        
        // Translation match: check if search term matches a translation of the home's city
        // If home has Greek city, check if search matches English translation
        const englishEquivalent = greekToEnglishCity.get(homeCityLower)
        if (englishEquivalent) {
          const englishLower = englishEquivalent.toLowerCase()
          const englishNormalized = removeGreekAccents(englishLower)
          if (englishLower.includes(citySearch) || englishNormalized.includes(citySearchNormalized)) {
            return true
          }
        }
        
        // If home has English city, check if search matches Greek translation
        const greekEquivalent = englishToGreekCity.get(homeCityLower)
        if (greekEquivalent) {
          const greekLower = greekEquivalent.toLowerCase()
          const greekNormalized = removeGreekAccents(greekLower)
          if (greekLower.includes(citySearch) || greekNormalized.includes(citySearchNormalized)) {
            return true
          }
        }
        
        // Reverse check: check if search term (as Greek or English) matches home's city
        // If search is "athens", check if it matches "Αθήνα" via translation
        const searchAsGreek = englishToGreekCity.get(citySearch)
        if (searchAsGreek) {
          const searchGreekLower = searchAsGreek.toLowerCase()
          if (homeCityLower === searchGreekLower || homeCityNormalized === removeGreekAccents(searchGreekLower)) {
            return true
          }
        }
        
        const searchAsEnglish = greekToEnglishCity.get(citySearch)
        if (searchAsEnglish) {
          const searchEnglishLower = searchAsEnglish.toLowerCase()
          if (homeCityLower === searchEnglishLower || homeCityNormalized === removeGreekAccents(searchEnglishLower)) {
            return true
          }
        }
        
        return false
      })
    }
    
    // Filter by country with Greek/English matching
    if (countryParam && countryParam.trim().length > 0) {
      const countrySearch = countryParam.trim().toLowerCase()
      const countrySearchNormalized = removeGreekAccents(countrySearch)
      
      // Find all English country names that match
      const matchingEnglishCountries = new Set<string>()
      
      const allCountries = new Set<string>()
      homes.forEach(home => {
        if (home.country) allCountries.add(home.country)
      })
      allAreas.forEach(area => {
        if (area.country) allCountries.add(area.country)
      })
      
      allCountries.forEach(englishCountry => {
        const countryLower = englishCountry.toLowerCase()
        const countryNormalized = removeGreekAccents(countryLower)
        
        // Check if English country matches
        if (countryLower.includes(countrySearch) || countryNormalized.includes(countrySearchNormalized)) {
          matchingEnglishCountries.add(englishCountry)
        }
        
        // Check if any Greek translation matches
        allAreas.forEach(area => {
          if (area.country === englishCountry && area.countryGreek) {
            const countryGreekLower = area.countryGreek.toLowerCase()
            const countryGreekNormalized = removeGreekAccents(countryGreekLower)
            if (countryGreekLower.includes(countrySearch) || countryGreekNormalized.includes(countrySearchNormalized)) {
              matchingEnglishCountries.add(englishCountry)
            }
          }
        })
      })
      
      // Filter homes by matching countries (canonical English so Greek-stored country e.g. ελλαδα matches "Greece")
      if (matchingEnglishCountries.size > 0) {
        homes = homes.filter(home => {
          if (!home.country) return false
          const canonical = resolveCountryToEnglishCanonical(home.country, allAreas)
          return matchingEnglishCountries.has(canonical) || matchingEnglishCountries.has(home.country.trim())
        })
      } else {
        // Areas metadata may not list every spelling; fall back to matching stored country + Greek names
        homes = homes.filter(home => {
          if (!home.country) return false
          const h = home.country.trim().toLowerCase()
          const hNorm = removeGreekAccents(h)
          if (h.includes(countrySearch) || hNorm.includes(countrySearchNormalized)) return true
          const canonical = resolveCountryToEnglishCanonical(home.country, allAreas)
          const areasForHome = allAreas.filter(
            a => a.country === canonical || a.country === home.country.trim()
          )
          for (const a of areasForHome) {
            if (!a.countryGreek) continue
            const g = a.countryGreek.toLowerCase()
            const gNorm = removeGreekAccents(g)
            if (g.includes(countrySearch) || gNorm.includes(countrySearchNormalized)) return true
          }
          return false
        })
      }
    }
    
    // Apply exclude filters in JavaScript after all other filtering
    if (excludeHomeIds.length > 0) {
      homes = homes.filter(home => !excludeHomeIds.includes(home.id))
    }

    // Promotion ranking: Pro slot → Plus slot → Pay-per-boost active → Normal
    // Slot is only active if slotPromotedUntil is null (legacy) or in the future
    const now = new Date()
    homes.sort((a, b) => {
      const rank = (h: typeof a) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const slotActive = h.slotPromoted && (!(h as any).slotPromotedUntil || (h as any).slotPromotedUntil > now)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (slotActive) return (h.owner as any)?.subscriptionTier === 'pro' ? 0 : 1
        if (h.promotedUntil && h.promotedUntil > now) return 2
        return 3
      }
      const diff = rank(a) - rank(b)
      if (diff !== 0) return diff
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

    // Pagination — default 50, max 200
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const skip = Math.max(parseInt(searchParams.get('skip') || '0', 10), 0)
    const total = homes.length
    // Embedding vector is already omitted at the query level
    const paginatedHomes = homes.slice(skip, skip + limit)

    // Log search for analytics (fire-and-forget)
    const searchLogUser = await getCurrentUser().catch(() => null)
    prisma.searchLog.create({
      data: {
        userId: searchLogUser?.id ?? null,
        queryType: 'browse',
        filters: Object.fromEntries(searchParams.entries()),
        resultCount: total,
      },
    }).catch(() => {})

    return NextResponse.json(
      { homes: paginatedHomes, total, hasMore: skip + limit < total },
      { status: 200, headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
    )
  } catch (error) {
    log.error({ err: error }, 'List homes error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/homes - create a new home listing for the logged-in user
export async function POST(request: NextRequest) {
  const log = requestLogger(request)
  let subscriptionTier: string | null = null
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    subscriptionTier = user.subscriptionTier

    // Check if user has owner role (brokers are treated like owners)
    const userRole = user.role || 'user'
    if (userRole !== 'owner' && userRole !== 'both' && userRole !== 'broker') {
      return NextResponse.json(
        { error: 'Only owners can create listings' },
        { status: 403 }
      )
    }

    const listingLimit = getListingLimit(user.subscriptionTier ?? 'free')
    if (listingLimit < Number.MAX_SAFE_INTEGER) {
      const activeCount = await prisma.home.count({ where: { ownerId: user.id } })
      if (activeCount >= listingLimit) {
        const requiredTier = (user.subscriptionTier ?? 'free') === 'free' ? 'plus' : 'pro'
        return NextResponse.json(
          { error: 'subscription_required', requiredTier, message: `Your plan allows up to ${listingLimit} listing${listingLimit === 1 ? '' : 's'}.` },
          { status: 402 }
        )
      }
    }

    const rawBody = await request.json()
    const { data: body, error: validationError } = validateBody(createHomeSchema, rawBody)
    if (validationError) return validationError

    const resolveParking = (p: boolean | 'true' | 'false' | null | undefined): boolean | null => {
      if (p === null || p === undefined) return null
      if (typeof p === 'boolean') return p
      return p === 'true'
    }
    const resolveYear = (v: number | '' | null | undefined): number | null => {
      if (v === null || v === undefined || v === '') return null
      return Number(v)
    }
    const resolveEnergyClass = (v: string | undefined): string | null => {
      if (!v) return null
      return toEnglishValue(v.trim())?.toUpperCase() ?? v.trim().toUpperCase()
    }

    const {
      title,
      description,
      descriptionGreek,
      street,
      city,
      country,
      area,
      listingType,
      pricePerMonth,
      bedrooms,
      bathrooms,
      floor,
      heatingCategory,
      heatingAgent,
      parking,
      sizeSqMeters,
      yearBuilt,
      yearRenovated,
      availableFrom,
      photos,
      energyClass,
      useAIDescription,
    } = body

    // Parse availableFrom date - handle both date strings and empty values
    let availableFromDate: Date
    if (availableFrom) {
      availableFromDate = new Date(availableFrom)
      if (isNaN(availableFromDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format for availableFrom' },
          { status: 400 }
        )
      }
    } else {
      availableFromDate = new Date()
    }

    // Convert city, country, and area to English by querying areas table
    const areas = await prisma.area.findMany({
      select: {
        name: true,
        nameGreek: true,
        city: true,
        cityGreek: true,
        country: true,
        countryGreek: true,
      }
    })

    const englishCity = resolveCityToEnglishCanonical(city, areas)
    const englishCountry = resolveCountryToEnglishCanonical(country, areas)
    const englishArea = resolveAreaToEnglishCanonical(area, areas)

    // Calculate distances using Google Maps API (7 API calls: 1 geocoding + 6 places in parallel)
    let distances: {
      latitude: number | null
      longitude: number | null
      closestMetro: number | null
      closestSchool: number | null
      closestHospital: number | null
      closestPark: number | null
      closestUniversity: number | null
    } = {
      latitude: null,
      longitude: null,
      closestMetro: null,
      closestSchool: null,
      closestHospital: null,
      closestPark: null,
      closestUniversity: null,
    }

    let _distanceDetails: unknown = null

    if (!await checkMapsLimit(user.id)) {
      return NextResponse.json({ error: 'Too many requests. Please wait before creating another listing.' }, { status: 429 })
    }

    try {
      log.info({ street, area: englishArea, city: englishCity, country: englishCountry }, 'Calculating distances for new property')
      const distanceResult = await calculatePropertyDistances(
        street?.trim() || null,
        englishArea,
        englishCity,
        englishCountry
      )
      
      // Extract distances and coordinates for database storage
      distances = {
        closestMetro: distanceResult.closestMetro,
        closestSchool: distanceResult.closestSchool,
        closestHospital: distanceResult.closestHospital,
        closestPark: distanceResult.closestPark,
        closestUniversity: distanceResult.closestUniversity,
        latitude: distanceResult.propertyCoordinates?.lat ?? null,
        longitude: distanceResult.propertyCoordinates?.lng ?? null,
      }
      
      // Store full details for logging/verification
      _distanceDetails = distanceResult
      
      log.info({ coordinates: distanceResult.propertyCoordinates, distances }, 'Distance calculation completed')
    } catch (error) {
      log.error({ err: error }, 'Error calculating distances (continuing with null values)')
      // Continue with null distances if API fails - don't block home creation
    }

    // Get area safety and vibe if area is provided
    let areaSafety: number | null = null
    let areaVibe: string | null = null
    if (englishArea) {
      const areaData = await prisma.area.findFirst({
        where: { name: englishArea },
        select: { safety: true, vibe: true }
      })
      if (areaData) {
        areaSafety = areaData.safety
        areaVibe = areaData.vibe
      }
    }

    // Analyze photos for visual feature tags (always when photos provided)
    const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
    let photoTagsList: string[] = []
    if (photos && openai) {
      const photoPaths = parsePhotoTags(photos as string)
      if (photoPaths.length > 0) {
        photoTagsList = await analyzePhotosForTags(photoPaths, openai)
      }
    }
    const _photoTagsJson = photoTagsList.length > 0 ? JSON.stringify(photoTagsList) : null

    // Generate descriptions using AI only if useAIDescription is explicitly checked
    let finalDescription = description?.trim() || null
    let finalDescriptionGreek: string | null = descriptionGreek?.trim() || null

    if (useAIDescription) {
      const tierBlock = checkTier(user.subscriptionTier ?? 'free', 'plus')
      if (tierBlock) return tierBlock

      if (!await checkAiDescriptionLimit(user.id)) {
        return NextResponse.json({ error: 'Too many AI description requests. Please wait before trying again.' }, { status: 429 })
      }

      const aiDescriptions = await generateHouseDescriptions({
        title,
        city: englishCity,
        country: englishCountry,
        area: englishArea,
        listingType: listingType === 'sale' ? 'sale' : 'rent',
        pricePerMonth: Number(pricePerMonth),
        bedrooms: Number(bedrooms || 0),
        bathrooms: Number(bathrooms || 0),
        floor: floor !== null && floor !== undefined && String(floor).trim() !== '' ? Number(floor) : null,
        sizeSqMeters: sizeSqMeters ? Number(sizeSqMeters) : null,
        yearBuilt: resolveYear(yearBuilt),
        yearRenovated: resolveYear(yearRenovated),
        heatingCategory: normalizeHeatingCategory(heatingCategory),
        heatingAgent: normalizeHeatingAgent(heatingAgent),
        parking: resolveParking(parking),
        energyClass: resolveEnergyClass(energyClass),
        closestMetro: distances.closestMetro,
        closestSchool: distances.closestSchool,
        closestHospital: distances.closestHospital,
        closestPark: distances.closestPark,
        closestUniversity: distances.closestUniversity,
        areaSafety,
        areaVibe,
        availableFrom: availableFrom || null,
        ownerNotes: description?.trim() || null,
        photoFeatures: photoTagsList.length > 0 ? photoTagsList : null,
      }, openai)

      if (aiDescriptions) {
        finalDescription = aiDescriptions.description
        finalDescriptionGreek = aiDescriptions.descriptionGreek
      }
    }

    // Re-check the listing limit atomically with the create — the early check
    // above is a fast-fail only; two parallel POSTs could both pass it.
    const home = await prisma.$transaction(async (tx) => {
      if (listingLimit < Number.MAX_SAFE_INTEGER) {
        const activeCount = await tx.home.count({ where: { ownerId: user.id } })
        if (activeCount >= listingLimit) throw new Error('LISTING_LIMIT')
      }
      return tx.home.create({
      data: {
        title: title.trim(),
        description: finalDescription,
        descriptionGreek: finalDescriptionGreek,
        street: street?.trim() || null,
        city: englishCity,
        country: englishCountry,
        area: englishArea,
        // Convert listing type to English (rent or sale)
        listingType: (() => {
          if (!listingType) return 'rent'
          const normalized = String(listingType).trim().toLowerCase()
          if (normalized === 'sale' || normalized === 'sell' || 
              normalized === 'πώληση' || normalized === 'πωληση' ||
              normalized.includes('sale') || normalized.includes('sell')) {
            return 'sale'
          }
          return 'rent'
        })(),
        pricePerMonth: Number(pricePerMonth),
        bedrooms: Number(bedrooms || 0),
        bathrooms: Number(bathrooms || 0),
        // Allow 0 and negative numbers for ground floor and basement
        floor: floor !== null && floor !== undefined && String(floor).trim() !== '' ? Number(floor) : null,
              heatingCategory: normalizeHeatingCategory(heatingCategory),
              heatingAgent: normalizeHeatingAgent(heatingAgent),
              parking: parking === undefined || parking === null 
                ? null 
                : (parking === true || parking === 'true' ? true : parking === false || parking === 'false' ? false : null),
              sizeSqMeters: Number(sizeSqMeters),
        yearBuilt: resolveYear(yearBuilt),
        yearRenovated: resolveYear(yearRenovated),
        availableFrom: availableFromDate,
              photos: (photos as string | null | undefined) || null,
              photoTagsArray: photoTagsList,
              // Distance values and coordinates from Google Maps API
              latitude: distances.latitude,
              longitude: distances.longitude,
              closestMetro: distances.closestMetro,
              closestSchool: distances.closestSchool,
              closestHospital: distances.closestHospital,
              closestPark: distances.closestPark,
              closestUniversity: distances.closestUniversity,
              // Convert energy class to uppercase English
              energyClass: energyClass ? toEnglishValue(energyClass.trim())?.toUpperCase() || energyClass.trim().toUpperCase() : null,
        ownerId: user.id,
      },
      })
    }, { isolationLevel: 'Serializable' })

    // Enqueue embedding record so the queue retry system can pick it up on failure
    await prisma.embeddingQueue.upsert({
      where: { homeId: home.id },
      create: { homeId: home.id, status: 'pending' },
      update: { status: 'pending', failCount: 0, lastError: null },
    })

    if (openai) {
      // Generate embedding inline in background (fast: ~200ms) then match saved searches.
      // Fire-and-forget so the HTTP response is not delayed.
      ;(async () => {
        try {
          const embedding = await generateEmbedding(buildHomeText(home), openai)
          await prisma.home.update({ where: { id: home.id }, data: { embedding } })
          await prisma.embeddingQueue.update({ where: { homeId: home.id }, data: { status: 'completed' } })
          await matchSavedSearches(home, embedding, prisma)
        } catch (err) {
          log.error({ err }, 'Inline embedding failed — falling back to queue')
          processEmbeddingQueue(home.id, openai, prisma).catch((e) =>
            log.error({ e }, 'Queue retry also failed')
          )
        }
      })()
    }

    return NextResponse.json({ message: 'Home created', home }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'LISTING_LIMIT') {
      const listingLimit = getListingLimit(subscriptionTier ?? 'free')
      const requiredTier = (subscriptionTier ?? 'free') === 'free' ? 'plus' : 'pro'
      return NextResponse.json(
        { error: 'subscription_required', requiredTier, message: `Your plan allows up to ${listingLimit} listing${listingLimit === 1 ? '' : 's'}.` },
        { status: 402 }
      )
    }
    // Serializable isolation can abort one of two concurrent creates — ask the client to retry
    if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2034') {
      return NextResponse.json({ error: 'Please try again' }, { status: 409 })
    }
    log.error({ err: error }, 'Create home error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
