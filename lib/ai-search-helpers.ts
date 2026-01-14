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
 * Calculate distance score based on category and distance with new gravity system
 * Essential: 0-1km (biggest), 1-3km, 3-10km, over 10km (least)
 * Strong: 0-3km (biggest), 3-10km, over 10km (least)
 * Not important/Not mentioned: 0-10km (even), over 10km (less)
 * Avoid: over 10km (biggest), 0-10km (less)
 */
export function calculateDistanceScore(
  distance: number | null,
  category: string | null | undefined
): number {
  if (distance === null || distance === undefined) {
    // Penalize missing distance data
    return -5
  }
  
  if (!category || category === 'Not important' || category === 'Not mentioned') {
    // Not important/Not mentioned: 0-10km (even weight), over 10km (less weight)
    if (distance <= 10) {
      return 0 // Even weight for 0-10km
    } else {
      return -5 // Less weight for over 10km
    }
  }
  
  let distanceScore = 0
  
  if (category === 'Essential') {
    // Essential: 0-1km (biggest), 1-3km, 3-10km, over 10km (least)
    if (distance <= 1.0) {
      distanceScore = 50 // Biggest boost
    } else if (distance <= 3.0) {
      distanceScore = 30 // Medium boost
    } else if (distance <= 10.0) {
      distanceScore = 10 // Small boost
    } else {
      distanceScore = -10 // Least/penalty for over 10km
    }
  } else if (category === 'Strong') {
    // Strong: 0-3km (biggest), 3-10km, over 10km (least)
    if (distance <= 3.0) {
      distanceScore = 30 // Biggest boost
    } else if (distance <= 10.0) {
      distanceScore = 15 // Medium boost
    } else {
      distanceScore = -5 // Least/penalty for over 10km
    }
  } else if (category === 'Avoid') {
    // Avoid: over 10km (biggest), 0-10km (less)
    if (distance > 10.0) {
      distanceScore = 30 // Biggest boost for being far away
    } else if (distance <= 10.0) {
      distanceScore = -20 // Penalty for being within 10km
    }
  }
  
  return distanceScore
}

/**
 * Available distinct vibes in the system
 */
export const DISTINCT_VIBES = [
  'Central',
  'Family',
  'Historic',
  'Reviving',
  'Rural',
  'Student',
  'Suburban',
  'Upscale',
  'Urban',
  'Waterfront',
  'Working-Class'
]

/**
 * Calculate vibe match score based on user's vibe preference and property's area vibes
 * @param vibePreference - 1-2 words describing the vibe user wants (e.g., "coastal", "urban", "family-friendly")
 * @param propertyVibes - Array of vibes from the property's area (e.g., ["Urban", "Central"])
 * @returns Score from 0-100 representing how well the property vibes match the user's preference
 */
export function calculateVibeScore(
  vibePreference: string | null | undefined,
  propertyVibes: string[]
): number {
  if (!vibePreference || !vibePreference.trim()) {
    return 50 // Neutral score if no vibe preference
  }

  if (!propertyVibes || propertyVibes.length === 0) {
    return 40 // Slight penalty for missing vibe data
  }

  const preferenceLower = vibePreference.toLowerCase().trim()
  const propertyVibesLower = propertyVibes.map(v => v.toLowerCase().trim())

  // Map user's vibe preference to system vibes with priority (1 = highest match, 2 = secondary match)
  // Priority indicates how well the user's term matches each system vibe
  const vibeMapping: Record<string, Array<{ vibe: string; priority: number }>> = {
    'coastal': [{ vibe: 'waterfront', priority: 1 }, { vibe: 'upscale', priority: 2 }],
    'beach': [{ vibe: 'waterfront', priority: 1 }, { vibe: 'upscale', priority: 2 }],
    'seaside': [{ vibe: 'waterfront', priority: 1 }, { vibe: 'upscale', priority: 2 }],
    'near the beach': [{ vibe: 'waterfront', priority: 1 }, { vibe: 'upscale', priority: 2 }],
    'near water': [{ vibe: 'waterfront', priority: 1 }],
    'waterfront': [{ vibe: 'waterfront', priority: 1 }],
    'urban': [{ vibe: 'urban', priority: 1 }, { vibe: 'central', priority: 2 }],
    'city center': [{ vibe: 'urban', priority: 1 }, { vibe: 'central', priority: 2 }],
    'city centre': [{ vibe: 'urban', priority: 1 }, { vibe: 'central', priority: 2 }],
    'central': [{ vibe: 'central', priority: 1 }, { vibe: 'urban', priority: 2 }],
    'downtown': [{ vibe: 'urban', priority: 1 }, { vibe: 'central', priority: 2 }],
    'family-friendly': [{ vibe: 'family', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    'family': [{ vibe: 'family', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    'for kids': [{ vibe: 'family', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    'for children': [{ vibe: 'family', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    'safe': [{ vibe: 'family', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    'quiet': [{ vibe: 'suburban', priority: 1 }, { vibe: 'rural', priority: 2 }],
    'peaceful': [{ vibe: 'suburban', priority: 1 }, { vibe: 'rural', priority: 2 }],
    'residential': [{ vibe: 'suburban', priority: 1 }, { vibe: 'family', priority: 2 }],
    'suburban': [{ vibe: 'suburban', priority: 1 }, { vibe: 'family', priority: 2 }],
    'upscale': [{ vibe: 'upscale', priority: 1 }, { vibe: 'waterfront', priority: 2 }],
    'luxury': [{ vibe: 'upscale', priority: 1 }],
    'premium': [{ vibe: 'upscale', priority: 1 }],
    'student': [{ vibe: 'student', priority: 1 }, { vibe: 'urban', priority: 2 }],
    'nightlife': [{ vibe: 'urban', priority: 1 }, { vibe: 'central', priority: 2 }],
    'vibrant': [{ vibe: 'urban', priority: 1 }, { vibe: 'central', priority: 2 }],
    'historic': [{ vibe: 'historic', priority: 1 }],
    'rural': [{ vibe: 'rural', priority: 1 }],
    'working-class': [{ vibe: 'working-class', priority: 1 }],
    'reviving': [{ vibe: 'reviving', priority: 1 }],
  }

  // Find matching vibes with priorities
  let matchedVibes = vibeMapping[preferenceLower] || []
  
  if (matchedVibes.length === 0) {
    // If no direct mapping, try fuzzy matching against distinct vibes
    const fuzzyMatch = DISTINCT_VIBES.find(v => {
      const vLower = v.toLowerCase()
      return vLower === preferenceLower || 
             vLower.includes(preferenceLower) || 
             preferenceLower.includes(vLower) ||
             vLower.replace('-', ' ') === preferenceLower ||
             preferenceLower.replace('-', ' ') === vLower
    })
    if (fuzzyMatch) {
      matchedVibes.push({ vibe: fuzzyMatch.toLowerCase(), priority: 1 })
    } else {
      return 50 // No match found, neutral score
    }
  }

  // Calculate score based on how well property vibes match with priority weighting
  // Properties have 2 vibes, we score based on how well they match the prioritized vibes
  let totalScore = 0
  let maxPossibleScore = 0

  matchedVibes.forEach(({ vibe, priority }) => {
    // Check if property has this vibe
    const isMatch = propertyVibesLower.some(pv => {
      const pvNormalized = pv.replace('-', ' ').replace('_', ' ')
      const vibeNormalized = vibe.replace('-', ' ').replace('_', ' ')
      return pv === vibe || pvNormalized === vibeNormalized
    })
    
    if (isMatch) {
      // Priority 1 (highest match) = 100 points, Priority 2 (secondary) = 50 points
      const points = priority === 1 ? 100 : 50
      totalScore += points
    }
    maxPossibleScore += priority === 1 ? 100 : 50
  })

  // Bonus if property matches multiple prioritized vibes
  const matchedCount = matchedVibes.filter(({ vibe }) => 
    propertyVibesLower.some(pv => {
      const pvNormalized = pv.replace('-', ' ').replace('_', ' ')
      const vibeNormalized = vibe.replace('-', ' ').replace('_', ' ')
      return pv === vibe || pvNormalized === vibeNormalized
    })
  ).length

  if (matchedCount > 1) {
    totalScore += 15 // Bonus for matching multiple prioritized vibes
    maxPossibleScore += 15
  }

  // Scale to 0-100
  if (maxPossibleScore === 0) {
    return 50
  }

  const rawScore = (totalScore / maxPossibleScore) * 100
  
  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, rawScore))
}

/**
 * Calculate safety score based on category and safety rating
 * Essential: 9+ (highest), 7-9 (medium), below 7 (lowest)
 * Strong: above 7 (highest), below 7 (lowest)
 * Not important/Not mentioned: even weight to all areas
 */
export function calculateSafetyScore(
  safety: number | null,
  category: string | null | undefined
): number {
  if (safety === null || safety === undefined) {
    // Penalize missing safety data
    return -5
  }
  
  if (!category || category === 'Not important' || category === 'Not mentioned') {
    // Not important/Not mentioned: even weight to all areas
    return 0
  }
  
  let safetyScore = 0
  
  if (category === 'Essential') {
    // Essential: 9+ (highest), 7-9 (medium), below 7 (lowest)
    if (safety >= 9) {
      safetyScore = 50 // Highest priority
    } else if (safety >= 7) {
      safetyScore = 30 // Medium priority
    } else {
      safetyScore = -20 // Lowest priority (penalty)
    }
  } else if (category === 'Strong') {
    // Strong: above 7 (highest), below 7 (lowest)
    if (safety > 7) {
      safetyScore = 30 // Highest priority
    } else {
      safetyScore = -10 // Lowest priority (penalty)
    }
  }
  
  return safetyScore
}

/**
 * Calculate parking score based on whether property has parking and if it's a soft preference
 * @param hasParking - Whether the property has parking (true/false/null)
 * @param isSoftPreference - Whether parking is a soft preference (not a hard filter)
 * @returns Score representing parking match
 */
export function calculateParkingScore(
  hasParking: boolean | null,
  isSoftPreference: boolean
): number {
  if (!isSoftPreference) {
    // Not a soft preference (hard filter or not mentioned) - no scoring
    return 0
  }
  
  // Soft preference scoring
  if (hasParking === true) {
    return 30 // Bonus for having parking when it's a soft preference
  } else if (hasParking === false) {
    return -15 // Penalty for not having parking when it's a soft preference
  } else {
    return -5 // Small penalty for missing parking data
  }
}

/**
 * Calculates a bonus score (0-5%) based on how well the home description matches user query features
 * @param userQuery - The original user search query
 * @param homeDescription - The home description text
 * @returns Bonus percentage (0-5) to add to the final score
 */
export function calculateDescriptionBonus(
  userQuery: string,
  homeDescription: string | null
): number {
  if (!homeDescription) {
    return 0 // No description to analyze
  }

  // Extract feature keywords from user query (things user wants)
  // Common features: stove, oven, kitchen, balcony, terrace, backyard, garden, pool, view, etc.
  const queryLower = userQuery.toLowerCase()
  const featureKeywords: string[] = []
  
  // Common feature patterns
  const featurePatterns = [
    /\b(new|modern|updated|renovated)\s+(stove|oven|kitchen|appliance|appliances)\b/i,
    /\b(big|large|spacious|huge)\s+(balcony|terrace|patio|deck)\b/i,
    /\b(backyard|garden|yard|outdoor|outdoor space)\b/i,
    /\b(pool|swimming pool|jacuzzi|hot tub)\b/i,
    /\b(view|views|sea view|mountain view|city view|panoramic)\b/i,
    /\b(fireplace|fire place)\b/i,
    /\b(storage|storage space|closet|closets)\b/i,
    /\b(garage|parking space|parking)\b/i,
    /\b(modern|renovated|updated|new)\s+(bathroom|bathrooms)\b/i,
    /\b(wood|hardwood|parquet)\s+(floor|floors|flooring)\b/i,
    /\b(air conditioning|ac|heating|central heating)\b/i,
    /\b(elevator|lift)\b/i,
    /\b(quiet|peaceful|calm)\b/i,
    /\b(bright|sunny|natural light|light)\b/i,
  ]

  // Extract keywords from query
  featurePatterns.forEach(pattern => {
    const match = queryLower.match(pattern)
    if (match) {
      // Extract the feature word(s)
      const words = match[0].split(/\s+/)
      words.forEach(word => {
        if (word.length > 3 && !['new', 'big', 'large', 'modern', 'updated', 'renovated'].includes(word.toLowerCase())) {
          featureKeywords.push(word.toLowerCase())
        }
      })
      featureKeywords.push(match[0].toLowerCase())
    }
  })

  // Also look for standalone feature words
  const standaloneFeatures = ['stove', 'oven', 'balcony', 'terrace', 'backyard', 'garden', 'pool', 'view', 'fireplace', 'storage', 'garage', 'elevator']
  standaloneFeatures.forEach(feature => {
    if (queryLower.includes(feature)) {
      featureKeywords.push(feature)
    }
  })

  if (featureKeywords.length === 0) {
    return 0 // No feature keywords found in query
  }

  // Check description for matches
  let descriptionMatches = 0
  const descLower = homeDescription.toLowerCase()
  featureKeywords.forEach(keyword => {
    if (descLower.includes(keyword)) {
      descriptionMatches++
    }
  })

  // Calculate bonus: 0-5% based on description matches
  // Each match in description = 1%, max 5%
  const descriptionBonus = Math.min(descriptionMatches * 1, 5) // Max 5% from description

  return descriptionBonus
}

