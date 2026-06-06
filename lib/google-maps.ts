/**
 * Google Maps API utility for calculating distances to nearby places
 * Uses Geocoding API and Places API (Nearby Search)
 * Simple approach: 1 geocoding + 7 places searches
 * Strict validation: Only accepts places with exact primary type matching
 */

import { prisma } from '@/lib/prisma'

// In-memory geocoding cache: address string → coordinates (TTL 24 h for hits, 5 min for misses)
const geocodeCache = new Map<string, { coords: Coordinates | null; expiresAt: number }>()
const GEOCODE_CACHE_MAX = 1000
const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const GEOCODE_CACHE_NULL_TTL_MS = 5 * 60 * 1000

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

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
 * Single geocoding attempt for a pre-built address string.
 * Returns null on ZERO_RESULTS or any error.
 */
async function attemptGeocode(address: string, apiKey: string): Promise<Coordinates | null> {
  const cached = geocodeCache.get(address)
  if (cached && cached.expiresAt > Date.now()) return cached.coords

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    const response = await fetchWithTimeout(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location
      const coords = { lat: location.lat, lng: location.lng }
      if (geocodeCache.size >= GEOCODE_CACHE_MAX) {
        geocodeCache.delete(geocodeCache.keys().next().value!)
      }
      geocodeCache.set(address, { coords, expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS })
      return coords
    }

    // Don't cache failures for long — a transient API outage shouldn't block distances for 24 h
    geocodeCache.set(address, { coords: null, expiresAt: Date.now() + GEOCODE_CACHE_NULL_TTL_MS })
    return null
  } catch (error) {
    // Don't cache errors at all so the next request retries immediately
    return null
  }
}

/**
 * Geocode an address to get coordinates.
 * Falls back to progressively simpler address forms if the full address fails:
 *   1. street + area + city + country
 *   2. street + city + country  (drops area — sometimes causes ZERO_RESULTS)
 *   3. city + country           (last resort, at least returns city-centre coords)
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

  // Attempt 1: full address
  const fullAddress = [street, area, city, country].filter(Boolean).join(', ')
  const coords1 = await attemptGeocode(fullAddress, apiKey)
  if (coords1) return coords1

  // Attempt 2: drop area (area can confuse geocoder if not in Google's index)
  if (area) {
    const noAreaAddress = [street, city, country].filter(Boolean).join(', ')
    // retrying without area
    const coords2 = await attemptGeocode(noAreaAddress, apiKey)
    if (coords2) return coords2
  }

  // Attempt 3: city + country only (coarse but better than null)
  const cityOnlyAddress = [city, country].filter(Boolean).join(', ')
  // retrying with city only
  const coords3 = await attemptGeocode(cityOnlyAddress, apiKey)
  if (coords3) return coords3

  // all geocoding attempts failed
  return null
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
    
    case 'bus_stop':
      // Accept individual bus stops (OASA in Athens) and bus stations (KTEL terminals)
      return primaryType === 'bus_stop' || primaryType === 'bus_station' || primaryType === 'transit_station'
    
    case 'school':
    case 'primary_school':
    case 'secondary_school':
      // Accept school, primary_school, or secondary_school as primary type
      return (primaryType === 'school' || primaryType === 'primary_school' || primaryType === 'secondary_school') &&
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

    const response = await fetchWithTimeout(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const validPlaces = data.results.filter((place: any) => isValidPlaceType(place, placeType))

      if (validPlaces.length === 0) {
        return { distance: null, coordinates: null }
      }

      // Calculate distance for all valid results and find the closest one
      type PlaceDistance = {
        place: any
        distance: number
        coordinates: Coordinates
        name: string | undefined
      }

      const placesWithDistance: PlaceDistance[] = validPlaces.map((place: any) => {
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
          name: place.name || undefined,
        }
      })

      // Sort by distance and get the closest one
      placesWithDistance.sort((a, b) => a.distance - b.distance)
      const closest = placesWithDistance[0]

      return {
        distance: Math.round(closest.distance * 10) / 10, // Round to 1 decimal place
        coordinates: closest.coordinates,
        name: closest.name,
      }
    } else {
      return { distance: null, coordinates: null }
    }
  } catch {
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
      return { distance: null, coordinates: null }
    }

    // Create a set of university names for quick lookup (case-insensitive)
    const universityNames = new Set(
      universities.map(u => u.name.toLowerCase().trim())
    )

    // Make 1 Places API Nearby Search call for universities (20km radius)
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coordinates.lat},${coordinates.lng}&radius=20000&type=university&key=${apiKey}`
    
    const response = await fetchWithTimeout(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Filter results to only include:
      // 1. Valid university type (using isValidPlaceType)
      // 2. Universities that match names in our database
      type UniversityDistance = {
        place: any
        distance: number
        coordinates: Coordinates
        name: string | undefined
      }

      const validUniversities: UniversityDistance[] = data.results
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
            name: place.name || undefined,
          }
        })

      if (validUniversities.length === 0) {
        // no matching universities found nearby
        return { distance: null, coordinates: null }
      }

      // Sort by distance and get the closest one
      validUniversities.sort((a, b) => a.distance - b.distance)
      const closest = validUniversities[0]

      // found closest university

      return {
        distance: Math.round(closest.distance * 10) / 10,
        coordinates: closest.coordinates,
        name: closest.name,
      }
    } else {
      // no universities found nearby
      return { distance: null, coordinates: null }
    }
  } catch (error) {
    // error finding closest university
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
    // failed to geocode address
    return defaultResult
  }

  // Step 2: Find all places in parallel (6 API calls at once)
  // Note: University search uses database
  const [
    metroResult,
    schoolResult,
    hospitalResult,
    parkResult,
    universityResult,
  ] = await Promise.all([
    findClosestPlace(propertyCoordinates, 'subway_station'), // Metro station (only subway_station)
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
