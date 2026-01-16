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
    // Essential: More granular scoring to show differences
    // 0-0.5km: 60-50 points (linear decrease)
    // 0.5-1km: 50-40 points
    // 1-2km: 40-30 points
    // 2-3km: 30-20 points
    // 3-5km: 20-10 points
    // 5-10km: 10-0 points
    // >10km: negative penalty
    if (distance <= 0.5) {
      // 0-0.5km: 60 to 50 (closer is better)
      distanceScore = 60 - (distance / 0.5) * 10
    } else if (distance <= 1.0) {
      // 0.5-1km: 50 to 40
      distanceScore = 50 - ((distance - 0.5) / 0.5) * 10
    } else if (distance <= 2.0) {
      // 1-2km: 40 to 30
      distanceScore = 40 - ((distance - 1.0) / 1.0) * 10
    } else if (distance <= 3.0) {
      // 2-3km: 30 to 20
      distanceScore = 30 - ((distance - 2.0) / 1.0) * 10
    } else if (distance <= 5.0) {
      // 3-5km: 20 to 10
      distanceScore = 20 - ((distance - 3.0) / 2.0) * 10
    } else if (distance <= 10.0) {
      // 5-10km: 10 to 0
      distanceScore = 10 - ((distance - 5.0) / 5.0) * 10
    } else {
      // >10km: penalty increases with distance
      distanceScore = -10 - ((distance - 10.0) / 10.0) * 5 // -10 to -15 for 10-20km, then more
    }
  } else if (category === 'Strong') {
    // Strong: More granular scoring
    // 0-1km: 40-35 points
    // 1-2km: 35-30 points
    // 2-3km: 30-20 points
    // 3-5km: 20-10 points
    // 5-10km: 10-0 points
    // >10km: negative penalty
    if (distance <= 1.0) {
      // 0-1km: 40 to 35
      distanceScore = 40 - (distance / 1.0) * 5
    } else if (distance <= 2.0) {
      // 1-2km: 35 to 30
      distanceScore = 35 - ((distance - 1.0) / 1.0) * 5
    } else if (distance <= 3.0) {
      // 2-3km: 30 to 20
      distanceScore = 30 - ((distance - 2.0) / 1.0) * 10
    } else if (distance <= 5.0) {
      // 3-5km: 20 to 10
      distanceScore = 20 - ((distance - 3.0) / 2.0) * 10
    } else if (distance <= 10.0) {
      // 5-10km: 10 to 0
      distanceScore = 10 - ((distance - 5.0) / 5.0) * 10
    } else {
      // >10km: penalty
      distanceScore = -5 - ((distance - 10.0) / 10.0) * 3
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
  // Location-based preferences get better matching:
  // - "near center" / "with a lot of people" → central, urban
  // - Family mentions → family, suburban, urban
  // - Financial stability/pricey → upscale
  // - Quiet places → rural, suburban
  // - Beach/sea → waterfront
  // - Younger workers/affordable → working-class
  const vibeMapping: Record<string, Array<{ vibe: string; priority: number }>> = {
    // Beach/Waterfront preferences
    'coastal': [{ vibe: 'waterfront', priority: 1 }],
    'beach': [{ vibe: 'waterfront', priority: 1 }],
    'seaside': [{ vibe: 'waterfront', priority: 1 }],
    'near the beach': [{ vibe: 'waterfront', priority: 1 }],
    'near beach': [{ vibe: 'waterfront', priority: 1 }],
    'by the sea': [{ vibe: 'waterfront', priority: 1 }],
    'near water': [{ vibe: 'waterfront', priority: 1 }],
    'waterfront': [{ vibe: 'waterfront', priority: 1 }],
    // Center/Urban preferences (with a lot of people)
    'urban': [{ vibe: 'urban', priority: 1 }, { vibe: 'central', priority: 2 }],
    'city center': [{ vibe: 'central', priority: 1 }, { vibe: 'urban', priority: 2 }],
    'city centre': [{ vibe: 'central', priority: 1 }, { vibe: 'urban', priority: 2 }],
    'near the center': [{ vibe: 'central', priority: 1 }, { vibe: 'urban', priority: 2 }],
    'near center': [{ vibe: 'central', priority: 1 }, { vibe: 'urban', priority: 2 }],
    'near the centre': [{ vibe: 'central', priority: 1 }, { vibe: 'urban', priority: 2 }],
    'central': [{ vibe: 'central', priority: 1 }, { vibe: 'urban', priority: 2 }],
    'downtown': [{ vibe: 'urban', priority: 1 }, { vibe: 'central', priority: 2 }],
    'with a lot of people': [{ vibe: 'central', priority: 1 }, { vibe: 'urban', priority: 2 }],
    'busy area': [{ vibe: 'central', priority: 1 }, { vibe: 'urban', priority: 2 }],
    'crowded': [{ vibe: 'central', priority: 1 }, { vibe: 'urban', priority: 2 }],
    // Family preferences
    'family-friendly': [{ vibe: 'family', priority: 1 }, { vibe: 'suburban', priority: 2 }, { vibe: 'urban', priority: 3 }],
    'family': [{ vibe: 'family', priority: 1 }, { vibe: 'suburban', priority: 2 }, { vibe: 'urban', priority: 3 }],
    'for kids': [{ vibe: 'family', priority: 1 }, { vibe: 'suburban', priority: 2 }, { vibe: 'urban', priority: 3 }],
    'for children': [{ vibe: 'family', priority: 1 }, { vibe: 'suburban', priority: 2 }, { vibe: 'urban', priority: 3 }],
    // Quiet/Rural preferences
    'quiet': [{ vibe: 'rural', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    'peaceful': [{ vibe: 'rural', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    'calm': [{ vibe: 'rural', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    'tranquil': [{ vibe: 'rural', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    'away from noise': [{ vibe: 'rural', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    'near mountain': [{ vibe: 'rural', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    'mountainous': [{ vibe: 'rural', priority: 1 }],
    'mountain area': [{ vibe: 'rural', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    'rural': [{ vibe: 'rural', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    'suburban': [{ vibe: 'suburban', priority: 1 }, { vibe: 'family', priority: 2 }],
    'residential': [{ vibe: 'suburban', priority: 1 }, { vibe: 'family', priority: 2 }],
    // Upscale/Financial stability preferences
    'upscale': [{ vibe: 'upscale', priority: 1 }],
    'luxury': [{ vibe: 'upscale', priority: 1 }],
    'premium': [{ vibe: 'upscale', priority: 1 }],
    'high-end': [{ vibe: 'upscale', priority: 1 }],
    'expensive': [{ vibe: 'upscale', priority: 1 }],
    'financial stability': [{ vibe: 'upscale', priority: 1 }],
    'pricey': [{ vibe: 'upscale', priority: 1 }],
    // Working-class/Young workers preferences
    'working-class': [{ vibe: 'working-class', priority: 1 }],
    'young workers': [{ vibe: 'working-class', priority: 1 }],
    'affordable': [{ vibe: 'working-class', priority: 1 }],
    'budget-friendly': [{ vibe: 'working-class', priority: 1 }],
    'student area': [{ vibe: 'working-class', priority: 1 }],
    // Legacy mappings
    'student': [{ vibe: 'student', priority: 1 }, { vibe: 'urban', priority: 2 }],
    'nightlife': [{ vibe: 'urban', priority: 1 }, { vibe: 'central', priority: 2 }],
    'vibrant': [{ vibe: 'urban', priority: 1 }, { vibe: 'central', priority: 2 }],
    'historic': [{ vibe: 'historic', priority: 1 }],
    'reviving': [{ vibe: 'reviving', priority: 1 }],
    'safe': [{ vibe: 'family', priority: 1 }, { vibe: 'suburban', priority: 2 }],
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
    // Essential: More granular scoring
    // 9.5-10: 60-50 points (excellent)
    // 9-9.5: 50-45 points (very good)
    // 8.5-9: 45-40 points (good)
    // 8-8.5: 40-35 points (decent)
    // 7.5-8: 35-30 points (acceptable)
    // 7-7.5: 30-20 points (below ideal)
    // 6-7: 20-0 points (poor)
    // <6: negative penalty
    if (safety >= 9.5) {
      // 9.5-10: 60 to 50 (linear decrease)
      safetyScore = 60 - ((safety - 9.5) / 0.5) * 10
    } else if (safety >= 9.0) {
      // 9-9.5: 50 to 45
      safetyScore = 50 - ((safety - 9.0) / 0.5) * 5
    } else if (safety >= 8.5) {
      // 8.5-9: 45 to 40
      safetyScore = 45 - ((safety - 8.5) / 0.5) * 5
    } else if (safety >= 8.0) {
      // 8-8.5: 40 to 35
      safetyScore = 40 - ((safety - 8.0) / 0.5) * 5
    } else if (safety >= 7.5) {
      // 7.5-8: 35 to 30
      safetyScore = 35 - ((safety - 7.5) / 0.5) * 5
    } else if (safety >= 7.0) {
      // 7-7.5: 30 to 20
      safetyScore = 30 - ((safety - 7.0) / 0.5) * 10
    } else if (safety >= 6.0) {
      // 6-7: 20 to 0
      safetyScore = 20 - ((safety - 6.0) / 1.0) * 20
    } else {
      // <6: penalty increases with lower safety
      safetyScore = -10 - ((6.0 - safety) / 2.0) * 10 // -10 to -20 for 6-4, then more
    }
  } else if (category === 'Strong') {
    // Strong: More granular scoring
    // 9-10: 40-35 points
    // 8-9: 35-30 points
    // 7.5-8: 30-25 points
    // 7-7.5: 25-15 points
    // 6-7: 15-0 points
    // <6: negative penalty
    if (safety >= 9.0) {
      // 9-10: 40 to 35
      safetyScore = 40 - ((safety - 9.0) / 1.0) * 5
    } else if (safety >= 8.0) {
      // 8-9: 35 to 30
      safetyScore = 35 - ((safety - 8.0) / 1.0) * 5
    } else if (safety >= 7.5) {
      // 7.5-8: 30 to 25
      safetyScore = 30 - ((safety - 7.5) / 0.5) * 5
    } else if (safety >= 7.0) {
      // 7-7.5: 25 to 15
      safetyScore = 25 - ((safety - 7.0) / 0.5) * 10
    } else if (safety >= 6.0) {
      // 6-7: 15 to 0
      safetyScore = 15 - ((safety - 6.0) / 1.0) * 15
    } else {
      // <6: penalty
      safetyScore = -5 - ((6.0 - safety) / 2.0) * 5
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
 * Also detects negative mentions (penalties) and "new" features (with year-based scoring)
 * @param userQuery - The original user search query
 * @param homeDescription - The home description text
 * @param yearBuilt - Year the house was built (for "new" feature scoring)
 * @param yearRenovated - Year the house was renovated (for "new" feature scoring)
 * @returns Object with bonus percentage (0-5), penalty percentage (0 to -20), and debug info
 */
export function calculateDescriptionBonus(
  userQuery: string,
  homeDescription: string | null,
  yearBuilt: number | null = null,
  yearRenovated: number | null = null
): { bonus: number; penalty: number; extractedKeywords: string[]; matchedKeywords: string[]; hasNewMention: boolean } {
  if (!homeDescription) {
    return { bonus: 0, penalty: 0, extractedKeywords: [], matchedKeywords: [], hasNewMention: false } // No description to analyze
  }
  
  let penalty = 0
  let hasNewMention = false

  // Extract meaningful words from user query (excluding common words)
  // This works for both Greek and English
  // This works for both Greek and English
  const queryLower = userQuery.toLowerCase().trim()
  const featureKeywords: string[] = []
  
  // Common stop words to exclude (English and Greek)
  const stopWords = new Set([
    'i', 'want', 'need', 'looking', 'for', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'θελω', 'θέλω', 'χρειάζομαι', 'ψάχνω', 'για', 'το', 'τη', 'τον', 'τα', 'της', 'των', 'με', 'σε', 'από', 'προς', 'και', 'ή', 'αλλά'
  ])
  
  // Extract all words from query (split by spaces and punctuation)
  const words = queryLower
    .replace(/[^\p{L}\s]/gu, ' ') // Replace punctuation with spaces
    .split(/\s+/)
    .filter(word => word.length > 2) // Only words longer than 2 characters
    .filter(word => !stopWords.has(word)) // Exclude stop words
  
  // Add normalized versions (without accents) for Greek text
  words.forEach(word => {
    if (word.length > 2) {
      featureKeywords.push(word)
      const normalized = removeGreekAccents(word)
      if (normalized !== word) {
        featureKeywords.push(normalized)
      }
    }
  })
  
  // Also check for common feature patterns (English)
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
  ]

  // Extract keywords from English patterns
  featurePatterns.forEach(pattern => {
    const match = queryLower.match(pattern)
    if (match) {
      const words = match[0].split(/\s+/)
      words.forEach(word => {
        if (word.length > 3 && !['new', 'big', 'large', 'modern', 'updated', 'renovated'].includes(word.toLowerCase())) {
          featureKeywords.push(word.toLowerCase())
        }
      })
      featureKeywords.push(match[0].toLowerCase())
    }
  })

  // Also look for standalone English feature words
  const standaloneFeatures = ['stove', 'oven', 'balcony', 'terrace', 'backyard', 'garden', 'pool', 'view', 'fireplace', 'storage', 'garage', 'elevator', 'appliance', 'appliances']
  standaloneFeatures.forEach(feature => {
    if (queryLower.includes(feature)) {
      featureKeywords.push(feature)
    }
  })

  // Remove duplicates from featureKeywords
  const uniqueFeatureKeywords = [...new Set(featureKeywords)]
  
  if (uniqueFeatureKeywords.length === 0) {
    return { bonus: 0, penalty: 0, extractedKeywords: [], matchedKeywords: [], hasNewMention: false } // No feature keywords found in query
  }

  // Check description for matches (with Greek accent normalization)
  const matchedKeywords: string[] = []
  const descLower = homeDescription.toLowerCase()
  const descNormalized = removeGreekAccents(descLower)
  
  // Check for "new" mentions in query (for year-based scoring)
  const newPatterns = [
    /\b(new|modern|updated|renovated|recent)\s+(kitchen|bathroom|bathrooms|appliance|appliances|stove|oven|renovation|renovations)\b/i,
    /\b(new|modern|updated|renovated)\s+(house|home|apartment|property)\b/i
  ]
  hasNewMention = newPatterns.some(pattern => pattern.test(userQuery))
  
  uniqueFeatureKeywords.forEach(keyword => {
    const keywordNormalized = removeGreekAccents(keyword)
    
    // Check for negative mentions (e.g., "does not have", "no", "without")
    // Look for the keyword near negative words (English and Greek)
    // Greek negative words: δεν, δεν έχει, χωρίς, λείπει, λείπει το
    const negativePatterns = [
      // English patterns
      new RegExp(`(doesn't|does not|don't|do not|no|without|lack|lacks|missing|does not have|doesn't have)\\s+.*?${keywordNormalized}`, 'i'),
      new RegExp(`${keywordNormalized}.*?(doesn't|does not|don't|do not|no|without|lack|lacks|missing)`, 'i'),
      new RegExp(`(no|without)\\s+${keywordNormalized}`, 'i'),
      // Greek patterns
      new RegExp(`(δεν|χωρίς|λείπει|λείπει το|δεν έχει|δεν υπάρχει)\\s+.*?${keywordNormalized}`, 'i'),
      new RegExp(`${keywordNormalized}.*?(δεν|χωρίς|λείπει|δεν έχει)`, 'i'),
      new RegExp(`(χωρίς)\\s+${keywordNormalized}`, 'i')
    ]
    
    // Check if description explicitly says it doesn't have this feature
    const hasNegativeMention = negativePatterns.some(pattern => 
      pattern.test(descLower) || pattern.test(descNormalized)
    )
    
    if (hasNegativeMention) {
      // Heavy penalty for explicitly saying it doesn't have what user wants
      penalty -= 15 // -15% penalty per negative mention
    } else if (descLower.includes(keyword) || descNormalized.includes(keywordNormalized)) {
      // Positive match
      matchedKeywords.push(keyword)
    }
  })

  // Calculate bonus: 0-5% based on description matches
  // Each match in description = 1%, max 5%
  // But if we have matches, give at least some bonus (scale based on match ratio)
  const matchRatio = matchedKeywords.length / uniqueFeatureKeywords.length
  let descriptionBonus = 0
  
  if (matchedKeywords.length > 0) {
    // If we have matches, give bonus based on match ratio
    // Perfect match (all keywords found) = 5%
    // Partial matches scale proportionally, minimum 1% per match
    descriptionBonus = Math.min(Math.max(matchedKeywords.length * 1, matchRatio * 5), 5)
  }
  
  // Add year-based bonus for "new" mentions
  if (hasNewMention) {
    const currentYear = new Date().getFullYear()
    const latestYear = Math.max(
      yearRenovated || 0,
      yearBuilt || 0
    )
    
    if (latestYear > 0) {
      const yearsSinceLatest = currentYear - latestYear
      
      // Score based on how recent the house is
      // 0-2 years: +3% bonus
      // 2-5 years: +2% bonus
      // 5-10 years: +1% bonus
      // 10-20 years: +0.5% bonus
      // >20 years: no bonus
      if (yearsSinceLatest <= 2) {
        descriptionBonus += 3
      } else if (yearsSinceLatest <= 5) {
        descriptionBonus += 2
      } else if (yearsSinceLatest <= 10) {
        descriptionBonus += 1
      } else if (yearsSinceLatest <= 20) {
        descriptionBonus += 0.5
      }
      
      // Cap total bonus at 8% (5% from description + 3% from year)
      descriptionBonus = Math.min(descriptionBonus, 8)
    }
  }
  
  // Cap penalty at -20% (to avoid completely destroying the score)
  penalty = Math.max(penalty, -20)

  return { 
    bonus: descriptionBonus, 
    penalty: penalty,
    extractedKeywords: uniqueFeatureKeywords,
    matchedKeywords: matchedKeywords,
    hasNewMention: hasNewMention
  }
}

