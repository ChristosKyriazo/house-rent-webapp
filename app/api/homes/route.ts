import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { calculatePropertyDistances } from '@/lib/google-maps'
import { removeGreekAccents } from '@/lib/utils'

// GET /api/homes - list all homes with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Build filter object
    const where: any = {}
    
    // Map 'buy' (from search UI) to 'sell' (in database)
    const listingType = searchParams.get('listingType')
    if (listingType) {
      // When user clicks "buy" in search, filter for "sell" listings
      if (listingType === 'buy') {
        where.listingType = 'sell'
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

    // Exclude owner's own houses if user is also an owner
    // Also exclude finalized houses from search results
    // Check if user is authenticated and has owner role
    let currentUser = null
    try {
      currentUser = await getCurrentUser()
      if (currentUser) {
        const userRole = (currentUser.role || 'user').toLowerCase()
        // If user is owner, both, or broker, exclude their own houses from search
        if (userRole === 'owner' || userRole === 'both' || userRole === 'broker') {
          where.ownerId = { not: currentUser.id }
        }
      }
      // Always exclude finalized houses from search
      where.finalized = false
    } catch (error) {
      // If getCurrentUser fails (user not logged in), still exclude finalized houses
      where.finalized = false
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

    let homes = await prisma.home.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, email: true, name: true },
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
      
      // Filter homes by matching countries
      if (matchingEnglishCountries.size > 0) {
        homes = homes.filter(home => home.country && matchingEnglishCountries.has(home.country))
      } else {
        // No match found, return empty
        homes = []
      }
    }
    
    // Apply exclude filters in JavaScript after all other filtering
    if (excludeHomeIds.length > 0) {
      homes = homes.filter(home => !excludeHomeIds.includes(home.id))
    }

    return NextResponse.json({ homes }, { status: 200 })
  } catch (error) {
    console.error('List homes error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

// POST /api/homes - create a new home listing for the logged-in user
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user has owner role (brokers are treated like owners)
    const userRole = user.role || 'user'
    if (userRole !== 'owner' && userRole !== 'both' && userRole !== 'broker') {
      return NextResponse.json(
        { error: 'Only owners can create listings' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
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
    } = body

    // Minimal validation
    if (!title || !city || !country || !pricePerMonth || !sizeSqMeters) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

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

    // Calculate distances using Google Maps API (7 API calls: 1 geocoding + 6 places in parallel)
    let distances = {
      closestMetro: null,
      closestBus: null,
      closestSchool: null,
      closestHospital: null,
      closestPark: null,
      closestUniversity: null,
    }

    let distanceDetails: any = null

    try {
      console.log('Calculating distances for new property:', { street, area, city, country })
      const distanceResult = await calculatePropertyDistances(
        street?.trim() || null,
        area?.trim() || null,
        city.trim(),
        country.trim()
      )
      
      // Extract just the distances for database storage
      distances = {
        closestMetro: distanceResult.closestMetro,
        closestBus: distanceResult.closestBus,
        closestSchool: distanceResult.closestSchool,
        closestHospital: distanceResult.closestHospital,
        closestPark: distanceResult.closestPark,
        closestUniversity: distanceResult.closestUniversity,
      }
      
      // Store full details for logging/verification
      distanceDetails = distanceResult
      
      console.log('Distance calculation completed:')
      console.log('Property coordinates:', distanceResult.propertyCoordinates)
      console.log('Distances (km):', distances)
      console.log('\n📍 Location Details for Verification:')
      if (distanceResult.propertyCoordinates) {
        console.log(`Property: https://www.google.com/maps?q=${distanceResult.propertyCoordinates.lat},${distanceResult.propertyCoordinates.lng}`)
      }
      if (distanceResult.closestMetroLocation) {
        console.log(`Metro (${distanceResult.closestMetroName || 'N/A'}): ${distanceResult.closestMetro}km - https://www.google.com/maps?q=${distanceResult.closestMetroLocation.lat},${distanceResult.closestMetroLocation.lng}`)
      }
      if (distanceResult.closestBusLocation) {
        console.log(`Bus (${distanceResult.closestBusName || 'N/A'}): ${distanceResult.closestBus}km - https://www.google.com/maps?q=${distanceResult.closestBusLocation.lat},${distanceResult.closestBusLocation.lng}`)
      }
      if (distanceResult.closestSchoolLocation) {
        console.log(`School (${distanceResult.closestSchoolName || 'N/A'}): ${distanceResult.closestSchool}km - https://www.google.com/maps?q=${distanceResult.closestSchoolLocation.lat},${distanceResult.closestSchoolLocation.lng}`)
      }
      if (distanceResult.closestHospitalLocation) {
        console.log(`Hospital (${distanceResult.closestHospitalName || 'N/A'}): ${distanceResult.closestHospital}km - https://www.google.com/maps?q=${distanceResult.closestHospitalLocation.lat},${distanceResult.closestHospitalLocation.lng}`)
      }
      if (distanceResult.closestParkLocation) {
        console.log(`Park (${distanceResult.closestParkName || 'N/A'}): ${distanceResult.closestPark}km - https://www.google.com/maps?q=${distanceResult.closestParkLocation.lat},${distanceResult.closestParkLocation.lng}`)
      }
      if (distanceResult.closestUniversityLocation) {
        console.log(`University (${distanceResult.closestUniversityName || 'N/A'}): ${distanceResult.closestUniversity}km - https://www.google.com/maps?q=${distanceResult.closestUniversityLocation.lat},${distanceResult.closestUniversityLocation.lng}`)
      }
    } catch (error) {
      console.error('Error calculating distances (continuing with null values):', error)
      // Continue with null distances if API fails - don't block home creation
    }

    // Retry logic for SQLite database locks
    const createHomeWithRetry = async (maxRetries = 3, delay = 100) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await prisma.home.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        street: street?.trim() || null,
        city: city.trim(),
        country: country.trim(),
              area: area?.trim() || null,
        listingType: listingType || 'rent',
        pricePerMonth: Number(pricePerMonth),
        bedrooms: Number(bedrooms || 0),
        bathrooms: Number(bathrooms || 0),
        floor: floor && floor !== '' ? Number(floor) : null,
              heatingCategory: heatingCategory?.trim() || null,
              heatingAgent: heatingAgent?.trim() || null,
              parking: parking === undefined || parking === null 
                ? null 
                : (parking === true || parking === 'true' ? true : parking === false || parking === 'false' ? false : null),
              sizeSqMeters: Number(sizeSqMeters),
        yearBuilt: yearBuilt && yearBuilt !== '' ? Number(yearBuilt) : null,
        yearRenovated: yearRenovated && yearRenovated !== '' ? Number(yearRenovated) : null,
        availableFrom: availableFromDate,
              photos: photos || null,
              // Distance values from Google Maps API
              closestMetro: distances.closestMetro,
              closestBus: distances.closestBus,
              closestSchool: distances.closestSchool,
              closestHospital: distances.closestHospital,
              closestPark: distances.closestPark,
              closestUniversity: distances.closestUniversity,
              energyClass: energyClass?.trim() || null,
        ownerId: user.id,
      },
    })
        } catch (error: any) {
          const isLockError = error?.code === 'SQLITE_BUSY' || 
                             error?.message?.includes('database is locked') ||
                             error?.message?.includes('timeout')
          
          if (isLockError && attempt < maxRetries) {
            const waitTime = delay * Math.pow(2, attempt - 1) // Exponential backoff
            console.warn(`Database lock detected, retrying in ${waitTime}ms (attempt ${attempt}/${maxRetries})...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
            continue
          }
          throw error
        }
      }
      throw new Error('Failed to create home after retries')
    }

    const home = await createHomeWithRetry()

    return NextResponse.json(
      { message: 'Home created', home },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Create home error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorDetails = error instanceof Error ? error.stack : String(error)
    console.error('Error details:', errorDetails)
    
    // Check for database lock/timeout errors
    const isLockError = error?.code === 'SQLITE_BUSY' || 
                       error?.message?.includes('database is locked') ||
                       error?.message?.includes('timeout') ||
                       error?.message?.includes('Operations timed out')
    
    if (isLockError) {
      return NextResponse.json(
        { 
          error: 'Database is currently locked', 
          details: 'The database is being accessed by another application (e.g., DBeaver). Please close any database tools and try again.' 
        },
        { status: 503 } // Service Unavailable
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}
