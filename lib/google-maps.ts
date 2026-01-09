/**
 * Google Maps API utility for calculating distances to nearby places
 * Uses Geocoding API and Places API (Nearby Search)
 * Simple approach: 1 geocoding + 7 places searches
 * Strict validation: Only accepts places with exact primary type matching
 */

import { prisma } from '@/lib/prisma'

interface Coordinates {
  lat: number
  lng: number
}

interface PlaceWithDistance {
  distance: number | null
  coordinates: Coordinates | null
  name?: string
}

interface DistanceResult {
  propertyCoordinates: Coordinates | null
  closestMetro: number | null
  closestMetroLocation: Coordinates | null
  closestMetroName: string | null
  closestBus: number | null
  closestBusLocation: Coordinates | null
  closestBusName: string | null
  closestSchool: number | null
  closestSchoolLocation: Coordinates | null
  closestSchoolName: string | null
  closestHospital: number | null
  closestHospitalLocation: Coordinates | null
  closestHospitalName: string | null
  closestPark: number | null
  closestParkLocation: Coordinates | null
  closestParkName: string | null
  closestUniversity: number | null
  closestUniversityLocation: Coordinates | null
  closestUniversityName: string | null
}

/**
 * Geocode an address to get coordinates
 */
async function geocodeAddress(
  street: string | null,
  area: string | null,
  city: string,
  country: string
): Promise<Coordinates | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.error('GOOGLE_MAPS_API_KEY is not set')
    return null
  }

  // Build address string
  const addressParts = [street, area, city, country].filter(Boolean)
  const address = addressParts.join(', ')

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location
      return {
        lat: location.lat,
        lng: location.lng,
      }
    } else {
      console.error('Geocoding failed:', data.status, data.error_message)
      return null
    }
  } catch (error) {
    console.error('Geocoding API error:', error)
    return null
  }
}

/**
 * Validate that a place matches the exact category we're looking for
 * Returns true only if the primary type matches exactly
 */
function isValidPlaceType(place: any, requiredType: string): boolean {
  const placeTypes = place.types || []
  if (placeTypes.length === 0) return false

  // Primary type (first in array) must match exactly
  const primaryType = placeTypes[0]

  // Strict validation based on category
  switch (requiredType) {
    case 'subway_station':
      // Must be subway_station, not bus_station or transit_station
      return primaryType === 'subway_station'
    
    case 'bus_station':
      // Must be bus_station, not subway_station
      return primaryType === 'bus_station'
    
    case 'school':
    case 'primary_school':
    case 'secondary_school':
      // Must be primary_school or secondary_school, NOT preschool or university
      return (primaryType === 'primary_school' || primaryType === 'secondary_school') &&
             !placeTypes.includes('preschool') &&
             !placeTypes.includes('university')
    
    case 'hospital':
      // Must be hospital, NOT clinic, pharmacy, or doctor
      return primaryType === 'hospital' &&
             !placeTypes.includes('doctor') &&
             !placeTypes.includes('pharmacy') &&
             !placeTypes.includes('dentist') &&
             !placeTypes.includes('veterinary_care')
    
    case 'park':
      // Must have park type (can be in types array, not necessarily primary)
      const hasParkType = placeTypes.includes('park') || 
                         placeTypes.includes('national_park') || 
                         placeTypes.includes('state_park')
      
      if (!hasParkType) return false
      
      // STRICT: Exclude if it has "store" anywhere in types (herb stores, etc.)
      if (placeTypes.includes('store')) {
        return false
      }
      
      // Exclude if it's primarily a business/store (primary type check)
      const isPrimarilyBusiness = primaryType === 'store' ||
                                  primaryType === 'establishment' ||
                                  primaryType === 'shopping_mall' ||
                                  primaryType === 'supermarket' ||
                                  primaryType === 'pharmacy' ||
                                  primaryType === 'restaurant' ||
                                  primaryType === 'cafe' ||
                                  primaryType === 'point_of_interest'
      
      // Exclude gardens
      const isGarden = placeTypes.includes('garden') || 
                      placeTypes.includes('botanical_garden')
      
      // Allow if it has park type, is not primarily a business, is not a garden, and has no store type
      return !isPrimarilyBusiness && !isGarden
    
    case 'university':
      // Must be university as primary type
      // Exclude if primary type is NOT university (e.g., if it's primarily a school, office, or store)
      if (primaryType !== 'university') {
        return false
      }
      
      // Exclude if it's actually a school (primary type check)
      if (primaryType === 'school' || 
          primaryType === 'primary_school' || 
          primaryType === 'secondary_school' || 
          primaryType === 'preschool') {
        return false
      }
      
      // Exclude if it's primarily an office or store (primary type check)
      if (primaryType === 'office' || primaryType === 'store') {
        return false
      }
      
      // Allow university even if it has establishment or point_of_interest as secondary types
      // (Google often includes these for universities)
      return true
    
    default:
      return primaryType === requiredType
  }
}

/**
 * Find the closest place of a specific type and return distance, coordinates, and name
 * Strict validation: Only accepts places with exact primary type matching
 */
async function findClosestPlace(
  coordinates: Coordinates,
  placeType: string,
  radius: number = 5000 // Default 5km radius
): Promise<PlaceWithDistance> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return { distance: null, coordinates: null }
  }

  try {
    // Build Places API Nearby Search URL (default 5km radius, can be overridden)
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coordinates.lat},${coordinates.lng}&radius=${radius}&type=${placeType}&key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Debug logging for park and university
      if (placeType === 'park' || placeType === 'university') {
        console.log(`\n🔍 DEBUG: ${placeType.toUpperCase()} API returned ${data.results.length} results:`)
        data.results.slice(0, 10).forEach((place: any, index: number) => {
          const types = place.types || []
          const isValid = isValidPlaceType(place, placeType)
          console.log(`  ${index + 1}. ${place.name || 'Unnamed'}`)
          console.log(`     Types: [${types.join(', ')}]`) // Show ALL types for debugging
          console.log(`     Primary: ${types[0] || 'none'}`)
          console.log(`     Valid: ${isValid ? '✅' : '❌'}`)
        })
      }
      
      // Filter results to only include valid places, then calculate distances
      const validPlaces = data.results.filter((place: any) => isValidPlaceType(place, placeType))

      if (validPlaces.length === 0) {
        console.warn(`\n⚠️  No valid ${placeType} found nearby (all ${data.results.length} results were filtered out)`)
        if (placeType === 'park' || placeType === 'university') {
          console.log(`   This means none of the ${data.results.length} results passed the validation check.`)
          console.log(`   Check the types above to see why they were filtered.`)
        } else {
          // For other types, show a sample of what was returned
          console.log(`   Sample of returned results (first 3):`)
          data.results.slice(0, 3).forEach((place: any, index: number) => {
            const types = place.types || []
            console.log(`     ${index + 1}. ${place.name || 'Unnamed'} - Types: [${types.slice(0, 3).join(', ')}...]`)
          })
        }
        return { distance: null, coordinates: null }
      }

      // Calculate distance for all valid results and find the closest one
      const placesWithDistance = validPlaces.map((place: any) => {
        const placeLat = place.geometry.location.lat
        const placeLng = place.geometry.location.lng
        const distance = calculateDistance(
          coordinates.lat,
          coordinates.lng,
          placeLat,
          placeLng
        )
        return {
          place,
          distance,
          coordinates: { lat: placeLat, lng: placeLng },
          name: place.name || null,
        }
      })

      // Sort by distance and get the closest one
      placesWithDistance.sort((a, b) => a.distance - b.distance)
      const closest = placesWithDistance[0]

      console.log(`Found closest ${placeType}: ${closest.name} (primary type: ${closest.place.types[0]}) at ${Math.round(closest.distance * 10) / 10}km`)

      return {
        distance: Math.round(closest.distance * 10) / 10, // Round to 1 decimal place
        coordinates: closest.coordinates,
        name: closest.name,
      }
    } else {
      console.warn(`No ${placeType} found nearby:`, data.status)
      return { distance: null, coordinates: null }
    }
  } catch (error) {
    console.error(`Error finding ${placeType}:`, error)
    return { distance: null, coordinates: null }
  }
}

/**
 * Find the closest university from the database
 * Uses 1 Places API Nearby Search call, then filters to only universities in DB
 */
async function findClosestUniversity(
  coordinates: Coordinates,
  city: string
): Promise<PlaceWithDistance> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return { distance: null, coordinates: null }
  }

  try {
    // Fetch universities from database for the given city
    const universities = await prisma.university.findMany({
      where: { city },
      select: { name: true },
    })

    if (universities.length === 0) {
      console.warn(`No universities found in database for city: ${city}`)
      return { distance: null, coordinates: null }
    }

    // Create a set of university names for quick lookup (case-insensitive)
    const universityNames = new Set(
      universities.map(u => u.name.toLowerCase().trim())
    )

    // Make 1 Places API Nearby Search call for universities (20km radius)
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coordinates.lat},${coordinates.lng}&radius=20000&type=university&key=${apiKey}`
    
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Debug logging for universities
      console.log(`\n🔍 DEBUG: UNIVERSITY API returned ${data.results.length} results:`)
      console.log(`   Looking for universities in DB: ${Array.from(universityNames).join(', ')}`)
      data.results.slice(0, 10).forEach((place: any, index: number) => {
        const types = place.types || []
        const isValidType = isValidPlaceType(place, 'university')
        const placeName = (place.name || '').toLowerCase().trim()
        let nameMatch = false
        let matchedDbName = ''
        for (const dbName of universityNames) {
          if (placeName === dbName || placeName.includes(dbName) || dbName.includes(placeName)) {
            nameMatch = true
            matchedDbName = dbName
            break
          }
        }
        console.log(`  ${index + 1}. ${place.name || 'Unnamed'}`)
        console.log(`     Types: [${types.slice(0, 5).join(', ')}${types.length > 5 ? '...' : ''}]`)
        console.log(`     Primary: ${types[0] || 'none'}`)
        console.log(`     Valid Type: ${isValidType ? '✅' : '❌'}`)
        console.log(`     Name Match: ${nameMatch ? `✅ (matched: ${matchedDbName})` : '❌'}`)
        console.log(`     Final Valid: ${(isValidType && nameMatch) ? '✅' : '❌'}`)
      })
      
      // Filter results to only include:
      // 1. Valid university type (using isValidPlaceType)
      // 2. Universities that match names in our database
      const validUniversities = data.results
        .filter((place: any) => {
          // First check if it's a valid university type
          if (!isValidPlaceType(place, 'university')) {
            return false
          }
          
          // Then check if the name matches any university in our database
          const placeName = (place.name || '').toLowerCase().trim()
          
          // Check for exact match or partial match (in case Google has slightly different name)
          for (const dbName of universityNames) {
            if (placeName === dbName || 
                placeName.includes(dbName) || 
                dbName.includes(placeName)) {
              return true
            }
          }
          
          return false
        })
        .map((place: any) => {
          const placeLat = place.geometry.location.lat
          const placeLng = place.geometry.location.lng
          const distance = calculateDistance(
            coordinates.lat,
            coordinates.lng,
            placeLat,
            placeLng
          )
          return {
            place,
            distance,
            coordinates: { lat: placeLat, lng: placeLng },
            name: place.name || null,
          }
        })

      if (validUniversities.length === 0) {
        console.warn(`No universities from database found nearby for city: ${city}`)
        return { distance: null, coordinates: null }
      }

      // Sort by distance and get the closest one
      validUniversities.sort((a, b) => a.distance - b.distance)
      const closest = validUniversities[0]

      console.log(`Found closest university from DB: ${closest.name} at ${Math.round(closest.distance * 10) / 10}km`)

      return {
        distance: Math.round(closest.distance * 10) / 10,
        coordinates: closest.coordinates,
        name: closest.name,
      }
    } else {
      console.warn(`No universities found nearby:`, data.status)
      return { distance: null, coordinates: null }
    }
  } catch (error) {
    console.error('Error finding closest university:', error)
    return { distance: null, coordinates: null }
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return distance
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Calculate all distances for a property location
 * Uses parallel requests: 1 geocoding + 7 places searches
 */
export async function calculatePropertyDistances(
  street: string | null,
  area: string | null,
  city: string,
  country: string
): Promise<DistanceResult> {
  // Default result with all null values
  const defaultResult: DistanceResult = {
    propertyCoordinates: null,
    closestMetro: null,
    closestMetroLocation: null,
    closestMetroName: null,
    closestBus: null,
    closestBusLocation: null,
    closestBusName: null,
    closestSchool: null,
    closestSchoolLocation: null,
    closestSchoolName: null,
    closestHospital: null,
    closestHospitalLocation: null,
    closestHospitalName: null,
    closestPark: null,
    closestParkLocation: null,
    closestParkName: null,
    closestUniversity: null,
    closestUniversityLocation: null,
    closestUniversityName: null,
  }

  // Step 1: Geocode the address (1 API call)
  const propertyCoordinates = await geocodeAddress(street, area, city, country)
  if (!propertyCoordinates) {
    console.error('Failed to geocode address, returning null distances')
    return defaultResult
  }

  // Step 2: Find all places in parallel (6 API calls at once)
  // Note: University search uses database
  const [
    metroResult,
    busResult,
    schoolResult,
    hospitalResult,
    parkResult,
    universityResult,
  ] = await Promise.all([
    findClosestPlace(propertyCoordinates, 'subway_station'), // Metro station (only subway_station)
    findClosestPlace(propertyCoordinates, 'bus_station'), // Bus station (only bus_station)
    findClosestPlace(propertyCoordinates, 'school'), // School (primary/secondary/high school)
    findClosestPlace(propertyCoordinates, 'hospital'), // Hospital (only hospital, NOT clinic/pharmacy)
    findClosestPlace(propertyCoordinates, 'park'), // Park (only actual parks, NOT stores/gardens)
    findClosestUniversity(propertyCoordinates, city), // University (only from database)
  ])

  return {
    propertyCoordinates,
    closestMetro: metroResult.distance,
    closestMetroLocation: metroResult.coordinates,
    closestMetroName: metroResult.name || null,
    closestBus: busResult.distance,
    closestBusLocation: busResult.coordinates,
    closestBusName: busResult.name || null,
    closestSchool: schoolResult.distance,
    closestSchoolLocation: schoolResult.coordinates,
    closestSchoolName: schoolResult.name || null,
    closestHospital: hospitalResult.distance,
    closestHospitalLocation: hospitalResult.coordinates,
    closestHospitalName: hospitalResult.name || null,
    closestPark: parkResult.distance,
    closestParkLocation: parkResult.coordinates,
    closestParkName: parkResult.name || null,
    closestUniversity: universityResult.distance,
    closestUniversityLocation: universityResult.coordinates,
    closestUniversityName: universityResult.name || null,
  }
}

/**
 * Check if address fields have changed
 */
export function hasAddressChanged(
  oldStreet: string | null,
  oldArea: string | null,
  oldCity: string,
  newStreet: string | null,
  newArea: string | null,
  newCity: string
): boolean {
  // Normalize null/undefined to empty string for comparison
  const normalize = (val: string | null | undefined) => (val || '').trim().toLowerCase()
  
  return (
    normalize(oldStreet) !== normalize(newStreet) ||
    normalize(oldArea) !== normalize(newArea) ||
    normalize(oldCity) !== normalize(newCity)
  )
}
