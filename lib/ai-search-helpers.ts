/**
 * Helper functions for AI search functionality
 * These functions simplify the main ai-search route by extracting complex logic
 */

import { removeGreekAccents } from './utils'

/**
 * Create bidirectional maps for location matching (English <-> Greek)
 */
export function createLocationMaps(areas: Array<{
  name?: string | null
  nameGreek?: string | null
  city?: string | null
  cityGreek?: string | null
  country?: string | null
  countryGreek?: string | null
}>) {
  const cityMap = new Map<string, Set<string>>()
  const countryMap = new Map<string, Set<string>>()
  const areaNameMap = new Map<string, Set<string>>()
  
  areas.forEach(area => {
    // City mapping
    if (area.city && area.cityGreek) {
      const cityLower = area.city.toLowerCase()
      const cityGreekLower = area.cityGreek.toLowerCase()
      
      if (!cityMap.has(cityLower)) {
        cityMap.set(cityLower, new Set())
      }
      cityMap.get(cityLower)!.add(cityGreekLower)
      
      if (!cityMap.has(cityGreekLower)) {
        cityMap.set(cityGreekLower, new Set())
      }
      cityMap.get(cityGreekLower)!.add(cityLower)
    }
    
    // Country mapping
    if (area.country && area.countryGreek) {
      const countryLower = area.country.toLowerCase()
      const countryGreekLower = area.countryGreek.toLowerCase()
      
      if (!countryMap.has(countryLower)) {
        countryMap.set(countryLower, new Set())
      }
      countryMap.get(countryLower)!.add(countryGreekLower)
      
      if (!countryMap.has(countryGreekLower)) {
        countryMap.set(countryGreekLower, new Set())
      }
      countryMap.get(countryGreekLower)!.add(countryLower)
    }
    
    // Area name mapping
    if (area.name && area.nameGreek) {
      const nameLower = area.name.toLowerCase()
      const nameGreekLower = area.nameGreek.toLowerCase()
      
      if (!areaNameMap.has(nameLower)) {
        areaNameMap.set(nameLower, new Set())
      }
      areaNameMap.get(nameLower)!.add(nameGreekLower)
      
      if (!areaNameMap.has(nameGreekLower)) {
        areaNameMap.set(nameGreekLower, new Set())
      }
      areaNameMap.get(nameGreekLower)!.add(nameLower)
    }
  })
  
  return { cityMap, countryMap, areaNameMap }
}

/**
 * Check if a location name matches a filter (handles Greek/English variations)
 */
export function matchesLocation(
  locationName: string | null | undefined,
  filterValue: string,
  locationMap: Map<string, Set<string>>,
  allVariations?: Set<string>
): boolean {
  if (!locationName) return false
  
  const locationLower = locationName.toLowerCase().trim()
  const locationNormalized = removeGreekAccents(locationLower)
  const filterLower = filterValue.toLowerCase().trim()
  const filterNormalized = removeGreekAccents(filterLower)
  
  // Direct match
  if (locationLower === filterLower) return true
  
  // Normalized match (handles accents)
  if (locationNormalized === filterNormalized) return true
  
  // Check against all variations if provided
  if (allVariations) {
    if (allVariations.has(locationLower)) return true
    if (allVariations.has(locationNormalized)) return true
  }
  
  // Check bidirectional mapping
  if (locationMap.has(locationLower) && locationMap.get(locationLower)!.has(filterLower)) return true
  if (locationMap.has(filterLower) && locationMap.get(filterLower)!.has(locationLower)) return true
  
  return false
}

/**
 * Get all possible name variations for a location filter
 */
export function getLocationVariations(
  filterValue: string,
  locationMap: Map<string, Set<string>>
): Set<string> {
  const filterLower = filterValue.toLowerCase().trim()
  const filterNormalized = removeGreekAccents(filterLower)
  
  const variations = new Set<string>([filterLower, filterNormalized])
  
  if (locationMap.has(filterLower)) {
    locationMap.get(filterLower)!.forEach(name => {
      variations.add(name)
      variations.add(removeGreekAccents(name))
    })
  }
  
  return variations
}

/**
 * Get distance field configuration
 */
export function getDistanceFields(extractedFilters: any): Array<{
  field: 'closestMetro' | 'closestBus' | 'closestSchool' | 'closestHospital' | 'closestPark' | 'closestUniversity'
  category: string | null | undefined
  name: string
}> {
  return [
    { field: 'closestMetro', category: extractedFilters.Metro, name: 'Metro' },
    { field: 'closestBus', category: extractedFilters.Bus, name: 'Bus' },
    { field: 'closestUniversity', category: extractedFilters.University, name: 'University' },
    { field: 'closestSchool', category: extractedFilters.School, name: 'School' },
    { field: 'closestPark', category: extractedFilters.Park, name: 'Park' },
    { field: 'closestHospital', category: extractedFilters.Hospital, name: 'Hospital' },
  ]
}

/**
 * Calculate distance score based on category and distance
 * The category (Essential/Strong/Avoid) already indicates importance, so no additional priority weighting is needed
 */
export function calculateDistanceScore(
  distance: number | null,
  category: string | null | undefined
): number {
  if (distance === null || distance === undefined) {
    // Penalize missing distance data with a fixed penalty
    return -5
  }
  
  if (!category || category === 'Not important' || category === 'Not mentioned') {
    return 0
  }
  
  let distanceScore = 0
  
  if (category === 'Essential') {
    if (distance <= 0.5) {
      distanceScore = 40
    } else if (distance <= 1.0) {
      distanceScore = 35
    } else if (distance <= 1.5) {
      distanceScore = 25
    } else if (distance <= 2.0) {
      distanceScore = 5
    } else if (distance <= 3.0) {
      distanceScore = -10
    } else if (distance <= 5.0) {
      distanceScore = -20
    } else if (distance <= 7.0) {
      distanceScore = -30
    } else {
      distanceScore = -40
    }
  } else if (category === 'Strong') {
    if (distance <= 0.5) {
      distanceScore = 20
    } else if (distance <= 1.0) {
      distanceScore = 18
    } else if (distance <= 1.5) {
      distanceScore = 15
    } else if (distance <= 2.0) {
      distanceScore = 12
    } else if (distance <= 3.0) {
      distanceScore = 0
    } else if (distance <= 5.0) {
      distanceScore = -5
    } else {
      distanceScore = -10
    }
  } else if (category === 'Avoid') {
    if (distance < 1.0) {
      distanceScore = -25
    } else if (distance < 2.0) {
      distanceScore = -20
    } else if (distance < 3.0) {
      distanceScore = -15
    } else if (distance >= 3.0 && distance < 5.0) {
      distanceScore = 0
    } else if (distance >= 5.0 && distance < 7.0) {
      distanceScore = 10
    } else if (distance >= 7.0 && distance < 10.0) {
      distanceScore = 15
    } else {
      distanceScore = 20
    }
  }
  
  return distanceScore
}

