import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getHomeRatingScores } from '@/lib/ratings'
import { calculatePropertyDistances, hasAddressChanged } from '@/lib/google-maps'
import { toEnglishValue } from '@/lib/translations'
import { resolveCountryToEnglishCanonical, resolveCityToEnglishCanonical, resolveAreaToEnglishCanonical } from '@/lib/utils'
import { requestLogger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const log = requestLogger(request)
  try {
    const resolvedParams = await Promise.resolve(params)
    const homeId = resolvedParams.id
    
    const home = await prisma.home.findFirst({
      where: {
        OR: [
          { key: homeId },
          { id: isNaN(Number(homeId)) ? -1 : Number(homeId) }
        ]
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
      },
    })

    if (!home) {
      return NextResponse.json({ error: 'Home not found' }, { status: 404 })
    }

    // Check if user has a rejected (dismissed) inquiry for this home
    try {
      const currentUser = await getCurrentUser()
      if (currentUser) {
        const rejectedInquiry = await prisma.inquiry.findFirst({
          where: {
            userId: currentUser.id,
            homeId: home.id,
            dismissed: true,
          },
        })
        
        if (rejectedInquiry) {
          return NextResponse.json(
            { error: 'This property is no longer available' },
            { status: 403 }
          )
        }
      }
    } catch {
      // If user is not authenticated, continue normally
    }

    const isBroker = home.owner.role === 'broker'
    const homeRatings = await getHomeRatingScores(home.id)

    return NextResponse.json({
      home: {
        ...home,
        owner: {
          ...home.owner,
          isBroker,
        },
        ratings: homeRatings,
      }
    }, { status: 200 })
  } catch (error) {
    log.error({ err: error }, 'Get home error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/homes/[id] - update an existing home listing
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const log = requestLogger(request)
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
        { error: 'Only owners and brokers can update listings' },
        { status: 403 }
      )
    }

    // Handle both sync and async params (Next.js 14 vs 15)
    const resolvedParams = await Promise.resolve(params)
    const homeId = resolvedParams.id

    // Find the home listing
    const existingHome = await prisma.home.findFirst({
      where: {
        OR: [
          { key: homeId },
          { id: isNaN(Number(homeId)) ? -1 : Number(homeId) }
        ]
      },
    })

    if (!existingHome) {
      return NextResponse.json(
        { error: 'Home listing not found' },
        { status: 404 }
      )
    }

    // Check if user owns this listing
    if (existingHome.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'You can only update your own listings' },
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

    // Check if address has changed - only recalculate distances if it has
    const addressChanged =
      hasAddressChanged(
        existingHome.street,
        existingHome.area,
        existingHome.city,
        street?.trim() || null,
        area?.trim() || null,
        englishCity
      ) || existingHome.country.trim().toLowerCase() !== englishCountry.trim().toLowerCase()

    // Prepare update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      title: title.trim(),
      description: description?.trim() || null,
      descriptionGreek: body.descriptionGreek?.trim() || null,
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
      // Convert heating values to English before storing
      heatingCategory: heatingCategory ? toEnglishValue(heatingCategory.trim()) : null,
      heatingAgent: heatingAgent ? toEnglishValue(heatingAgent.trim()) : null,
      parking: parking === undefined || parking === null 
        ? null 
        : (parking === true || parking === 'true' ? true : parking === false || parking === 'false' ? false : null),
      sizeSqMeters: Number(sizeSqMeters),
      yearBuilt: yearBuilt && yearBuilt !== '' ? Number(yearBuilt) : null,
      yearRenovated: yearRenovated && yearRenovated !== '' ? Number(yearRenovated) : null,
      availableFrom: availableFromDate,
      photos: photos || null,
      // Convert energy class to uppercase English
      energyClass: energyClass ? toEnglishValue(energyClass.trim())?.toUpperCase() || energyClass.trim().toUpperCase() : null,
    }

    // Only recalculate distances if address changed
    if (addressChanged) {
      log.info({ old: { street: existingHome.street, area: existingHome.area, city: existingHome.city }, new: { street: street?.trim() || null, area: area?.trim() || null, city: englishCity } }, 'Address changed, recalculating distances')

      try {
        const distanceResult = await calculatePropertyDistances(
          street?.trim() || null,
          englishArea,
          englishCity,
          englishCountry
        )
        
        log.info({ coordinates: distanceResult.propertyCoordinates, distances: { metro: distanceResult.closestMetro, school: distanceResult.closestSchool, hospital: distanceResult.closestHospital, park: distanceResult.closestPark, university: distanceResult.closestUniversity } }, 'Distance recalculation completed')

        // Update distance fields and coordinates
        updateData.latitude = distanceResult.propertyCoordinates?.lat ?? null
        updateData.longitude = distanceResult.propertyCoordinates?.lng ?? null
        updateData.closestMetro = distanceResult.closestMetro
        updateData.closestSchool = distanceResult.closestSchool
        updateData.closestHospital = distanceResult.closestHospital
        updateData.closestPark = distanceResult.closestPark
        updateData.closestUniversity = distanceResult.closestUniversity
      } catch (error) {
        log.error({ err: error }, 'Error recalculating distances, keeping existing values')
      }
    } else {
      log.info('Address unchanged, skipping distance recalculation')
      // Keep existing distance values - don't include them in updateData
    }

    const updatedHome = await prisma.home.update({
      where: { id: existingHome.id },
      data: updateData,
    })

    // Re-queue embedding if any semantic field changed (title, description, city, area, price, etc.)
    const semanticFields: Array<keyof typeof updateData> = ['title', 'description', 'city', 'country', 'area', 'listingType', 'bedrooms', 'bathrooms', 'pricePerMonth', 'sizeSqMeters', 'parking', 'heatingCategory', 'heatingAgent', 'energyClass', 'yearBuilt', 'yearRenovated']
    const hasSemanticChange = semanticFields.some(f => f in updateData)
    if (hasSemanticChange) {
      prisma.embeddingQueue.upsert({
        where: { homeId: existingHome.id },
        create: { homeId: existingHome.id, status: 'pending' },
        update: { status: 'pending', lastError: null },
      }).catch((err) => log.error({ err, homeId: existingHome.id }, 'Failed to enqueue embedding update'))
    }

    return NextResponse.json(
      { message: 'Home updated', home: updatedHome },
      { status: 200 }
    )
  } catch (error) {
    log.error({ err: error }, 'Update home error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/homes/[id] - delete a home listing
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const log = requestLogger(request)
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
        { error: 'Only owners and brokers can delete listings' },
        { status: 403 }
      )
    }

    // Handle both sync and async params (Next.js 14 vs 15)
    const resolvedParams = await Promise.resolve(params)
    const homeId = resolvedParams.id

    // Find the home listing
    const existingHome = await prisma.home.findFirst({
      where: {
        OR: [
          { key: homeId },
          { id: isNaN(Number(homeId)) ? -1 : Number(homeId) }
        ]
      },
    })

    if (!existingHome) {
      return NextResponse.json(
        { error: 'Home listing not found' },
        { status: 404 }
      )
    }

    // Check if user owns this listing
    if (existingHome.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own listings' },
        { status: 403 }
      )
    }

    // Delete the home listing (cascade will handle related records)
    await prisma.home.delete({
      where: { id: existingHome.id },
    })

    return NextResponse.json(
      { message: 'Home listing deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    log.error({ err: error }, 'Delete home error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

