import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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
    
    if (searchParams.get('city')) {
      where.city = { contains: searchParams.get('city') }
    }
    
    if (searchParams.get('country')) {
      where.country = { contains: searchParams.get('country') }
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
    try {
      const user = await getCurrentUser()
      if (user) {
        const userRole = (user.role || 'user').toLowerCase()
        // If user is owner or both, exclude their own houses from search
        if (userRole === 'owner' || userRole === 'both') {
          where.ownerId = { not: user.id }
        }
      }
      // Always exclude finalized houses from search
      where.finalized = false
    } catch (error) {
      // If getCurrentUser fails (user not logged in), still exclude finalized houses
      where.finalized = false
    }

    const homes = await prisma.home.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, email: true, name: true },
        },
      },
    })

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

    // Check if user has owner role
    const userRole = user.role || 'user'
    if (userRole !== 'owner' && userRole !== 'both') {
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

    // Generate dummy distance values (will be replaced by Google API in the future)
    const generateDummyDistance = () => {
      // Random distance between 0.1 and 5.0 km
      return Math.round((Math.random() * 4.9 + 0.1) * 10) / 10
    }

    const home = await prisma.home.create({
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
        // Dummy distance values (will be populated from Google API in the future)
        closestMetro: generateDummyDistance(),
        closestBus: generateDummyDistance(),
        closestSchool: generateDummyDistance(),
        closestKindergarten: generateDummyDistance(),
        closestHospital: generateDummyDistance(),
        closestPark: generateDummyDistance(),
        ownerId: user.id,
      },
    })

    return NextResponse.json(
      { message: 'Home created', home },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create home error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorDetails = error instanceof Error ? error.stack : String(error)
    console.error('Error details:', errorDetails)
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}
