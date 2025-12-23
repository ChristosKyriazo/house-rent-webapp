import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/homes - list all homes with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Build filter object
    const where: any = {}
    
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
      listingType,
      pricePerMonth,
      bedrooms,
      bathrooms,
      floor,
      heating,
      sizeSqMeters,
      yearBuilt,
      yearRenovated,
      availableFrom,
      photos,
    } = body

    // Minimal validation
    if (!title || !city || !country || !pricePerMonth) {
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

    const home = await prisma.home.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        street: street?.trim() || null,
        city: city.trim(),
        country: country.trim(),
        listingType: listingType || 'rent',
        pricePerMonth: Number(pricePerMonth),
        bedrooms: Number(bedrooms || 0),
        bathrooms: Number(bathrooms || 0),
        floor: floor && floor !== '' ? Number(floor) : null,
        heating: heating?.trim() || null,
        sizeSqMeters: sizeSqMeters && sizeSqMeters !== '' ? Number(sizeSqMeters) : null,
        yearBuilt: yearBuilt && yearBuilt !== '' ? Number(yearBuilt) : null,
        yearRenovated: yearRenovated && yearRenovated !== '' ? Number(yearRenovated) : null,
        availableFrom: availableFromDate,
        photos: photos || null,
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
    const errorStack = error instanceof Error ? error.stack : undefined
    
    // Log full error details for debugging
    console.error('Full error details:', {
      message: errorMessage,
      stack: errorStack,
      error: error
    })
    
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}
