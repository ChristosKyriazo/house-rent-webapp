import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getUserRatings } from '@/lib/ratings'
import { calculatePropertyDistances, hasAddressChanged } from '@/lib/google-maps'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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
            email: true,
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

    // Fetch owner ratings
    const ownerRatings = await getUserRatings(home.owner.id)

    return NextResponse.json({ 
      home: {
        ...home,
        owner: {
          ...home.owner,
          ratings: ownerRatings,
        }
      }
    }, { status: 200 })
  } catch (error) {
    console.error('Get home error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

// PUT /api/homes/[id] - update an existing home listing
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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
        { error: 'Only owners can update listings' },
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

    // Check if address has changed - only recalculate distances if it has
    const addressChanged = hasAddressChanged(
      existingHome.street,
      existingHome.area,
      existingHome.city,
      street?.trim() || null,
      area?.trim() || null,
      city.trim()
    )

    // Prepare update data
    const updateData: any = {
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
      energyClass: energyClass?.trim() || null,
    }

    // Only recalculate distances if address changed
    if (addressChanged) {
      console.log('Address changed, recalculating distances:', {
        old: { street: existingHome.street, area: existingHome.area, city: existingHome.city },
        new: { street: street?.trim() || null, area: area?.trim() || null, city: city.trim() }
      })

      try {
        const distanceResult = await calculatePropertyDistances(
          street?.trim() || null,
          area?.trim() || null,
          city.trim(),
          country.trim()
        )
        
        console.log('Distance recalculation completed:')
        console.log('Property coordinates:', distanceResult.propertyCoordinates)
        console.log('Distances (km):', {
          closestMetro: distanceResult.closestMetro,
          closestBus: distanceResult.closestBus,
          closestSchool: distanceResult.closestSchool,
          closestHospital: distanceResult.closestHospital,
          closestPark: distanceResult.closestPark,
          closestUniversity: distanceResult.closestUniversity,
        })
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

        // Update distance fields
        updateData.closestMetro = distanceResult.closestMetro
        updateData.closestBus = distanceResult.closestBus
        updateData.closestSchool = distanceResult.closestSchool
        updateData.closestHospital = distanceResult.closestHospital
        updateData.closestPark = distanceResult.closestPark
        updateData.closestUniversity = distanceResult.closestUniversity
      } catch (error) {
        console.error('Error recalculating distances (keeping existing values):', error)
        // Don't update distance fields if API fails - keep existing values
      }
    } else {
      console.log('Address unchanged, skipping distance recalculation')
      // Keep existing distance values - don't include them in updateData
    }

    const updatedHome = await prisma.home.update({
      where: { id: existingHome.id },
      data: updateData,
    })

    return NextResponse.json(
      { message: 'Home updated', home: updatedHome },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update home error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

// DELETE /api/homes/[id] - delete a home listing
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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
        { error: 'Only owners can delete listings' },
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
    console.error('Delete home error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

