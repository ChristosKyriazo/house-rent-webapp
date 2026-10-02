const DISTINCT_VIBES =[
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
  'Working-Class',
]

export function calculateDistanceScore(
  distance: number | null,
  category: string | null | undefined
): number {
  if (distance === null || distance === undefined) return 0

  if (!category || category === 'Not important' || category === 'Not mentioned') {
    return distance <= 10 ? 0 : -5
  }

  let distanceScore = 0

  if (category === 'Essential') {
    if (distance <= 0.5) {
      distanceScore = 60 - (distance / 0.5) * 10
    } else if (distance <= 1.0) {
      distanceScore = 50 - ((distance - 0.5) / 0.5) * 10
    } else if (distance <= 2.0) {
      distanceScore = 40 - ((distance - 1.0) / 1.0) * 10
    } else if (distance <= 3.0) {
      distanceScore = 30 - ((distance - 2.0) / 1.0) * 10
    } else if (distance <= 5.0) {
      distanceScore = 20 - ((distance - 3.0) / 2.0) * 10
    } else if (distance <= 10.0) {
      distanceScore = 10 - ((distance - 5.0) / 5.0) * 10
    } else {
      distanceScore = -10 - ((distance - 10.0) / 10.0) * 5
    }
  } else if (category === 'Strong') {
    if (distance <= 1.0) {
      distanceScore = 40 - (distance / 1.0) * 5
    } else if (distance <= 2.0) {
      distanceScore = 35 - ((distance - 1.0) / 1.0) * 5
    } else if (distance <= 3.0) {
      distanceScore = 30 - ((distance - 2.0) / 1.0) * 10
    } else if (distance <= 5.0) {
      distanceScore = 20 - ((distance - 3.0) / 2.0) * 10
    } else if (distance <= 10.0) {
      distanceScore = 10 - ((distance - 5.0) / 5.0) * 10
    } else {
      distanceScore = -5 - ((distance - 10.0) / 10.0) * 3
    }
  } else if (category === 'Avoid') {
    if (distance <= 2.0) distanceScore = -30
    else if (distance <= 5.0) distanceScore = -15
    else if (distance <= 10.0) distanceScore = 5
    else distanceScore = 20
  }

  return distanceScore
}

export function calculateVibeScore(
  vibePreference: string | null | undefined,
  propertyVibes: string[]
): number {
  if (!vibePreference || !vibePreference.trim()) return 50
  if (!propertyVibes || propertyVibes.length === 0) return 40

  const preferenceLower = vibePreference.toLowerCase().trim()
  const propertyVibesLower = propertyVibes.map(v => v.toLowerCase().trim())

  const vibeMapping: Record<string, Array<{ vibe: string; priority: number }>> = {
    coastal: [{ vibe: 'waterfront', priority: 1 }],
    beach: [{ vibe: 'waterfront', priority: 1 }],
    seaside: [{ vibe: 'waterfront', priority: 1 }],
    'near the beach': [{ vibe: 'waterfront', priority: 1 }],
    'near beach': [{ vibe: 'waterfront', priority: 1 }],
    'by the sea': [{ vibe: 'waterfront', priority: 1 }],
    'near water': [{ vibe: 'waterfront', priority: 1 }],
    waterfront: [{ vibe: 'waterfront', priority: 1 }],
    urban: [{ vibe: 'urban', priority: 1 }, { vibe: 'central', priority: 2 }],
    'city center': [{ vibe: 'central', priority: 1 }, { vibe: 'urban', priority: 2 }],
    'city centre': [{ vibe: 'central', priority: 1 }, { vibe: 'urban', priority: 2 }],
    'near the center': [{ vibe: 'central', priority: 1 }, { vibe: 'urban', priority: 2 }],
    'near center': [{ vibe: 'central', priority: 1 }, { vibe: 'urban', priority: 2 }],
    'near the centre': [{ vibe: 'central', priority: 1 }, { vibe: 'urban', priority: 2 }],
    central: [{ vibe: 'central', priority: 1 }, { vibe: 'urban', priority: 2 }],
    downtown: [{ vibe: 'urban', priority: 1 }, { vibe: 'central', priority: 2 }],
    'with a lot of people': [{ vibe: 'central', priority: 1 }, { vibe: 'urban', priority: 2 }],
    'busy area': [{ vibe: 'central', priority: 1 }, { vibe: 'urban', priority: 2 }],
    crowded: [{ vibe: 'central', priority: 1 }, { vibe: 'urban', priority: 2 }],
    'family-friendly': [{ vibe: 'family', priority: 1 }, { vibe: 'suburban', priority: 2 }, { vibe: 'urban', priority: 3 }],
    family: [{ vibe: 'family', priority: 1 }, { vibe: 'suburban', priority: 2 }, { vibe: 'urban', priority: 3 }],
    'for kids': [{ vibe: 'family', priority: 1 }, { vibe: 'suburban', priority: 2 }, { vibe: 'urban', priority: 3 }],
    'for children': [{ vibe: 'family', priority: 1 }, { vibe: 'suburban', priority: 2 }, { vibe: 'urban', priority: 3 }],
    quiet: [{ vibe: 'rural', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    peaceful: [{ vibe: 'rural', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    calm: [{ vibe: 'rural', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    tranquil: [{ vibe: 'rural', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    'away from noise': [{ vibe: 'rural', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    'near mountain': [{ vibe: 'rural', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    mountainous: [{ vibe: 'rural', priority: 1 }],
    'mountain area': [{ vibe: 'rural', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    rural: [{ vibe: 'rural', priority: 1 }, { vibe: 'suburban', priority: 2 }],
    suburban: [{ vibe: 'suburban', priority: 1 }, { vibe: 'family', priority: 2 }],
    residential: [{ vibe: 'suburban', priority: 1 }, { vibe: 'family', priority: 2 }],
    upscale: [{ vibe: 'upscale', priority: 1 }],
    luxury: [{ vibe: 'upscale', priority: 1 }],
    premium: [{ vibe: 'upscale', priority: 1 }],
    'high-end': [{ vibe: 'upscale', priority: 1 }],
    expensive: [{ vibe: 'upscale', priority: 1 }],
    'financial stability': [{ vibe: 'upscale', priority: 1 }],
    pricey: [{ vibe: 'upscale', priority: 1 }],
    'working-class': [{ vibe: 'working-class', priority: 1 }],
    'young workers': [{ vibe: 'working-class', priority: 1 }],
    affordable: [{ vibe: 'working-class', priority: 1 }],
    'budget-friendly': [{ vibe: 'working-class', priority: 1 }],
    'student area': [{ vibe: 'working-class', priority: 1 }],
    student: [{ vibe: 'student', priority: 1 }, { vibe: 'urban', priority: 2 }],
    nightlife: [{ vibe: 'urban', priority: 1 }, { vibe: 'central', priority: 2 }],
    vibrant: [{ vibe: 'urban', priority: 1 }, { vibe: 'central', priority: 2 }],
    historic: [{ vibe: 'historic', priority: 1 }],
    reviving: [{ vibe: 'reviving', priority: 1 }],
    safe: [{ vibe: 'family', priority: 1 }, { vibe: 'suburban', priority: 2 }],
  }

  const matchedVibes = vibeMapping[preferenceLower] || []

  if (matchedVibes.length === 0) {
    const fuzzyMatch = DISTINCT_VIBES.find(v => {
      const vLower = v.toLowerCase()
      return (
        vLower === preferenceLower ||
        vLower.includes(preferenceLower) ||
        preferenceLower.includes(vLower) ||
        vLower.replace('-', ' ') === preferenceLower ||
        preferenceLower.replace('-', ' ') === vLower
      )
    })
    if (fuzzyMatch) {
      matchedVibes.push({ vibe: fuzzyMatch.toLowerCase(), priority: 1 })
    } else {
      return 50
    }
  }

  // Priority weights: 1→1.0, 2→0.5, 3→0.33
  // Proportional scoring: 50 (neutral baseline) + weighted match ratio * 50
  // This avoids the asymmetry where a secondary-only match scored unfairly low.
  const priorityWeight = (p: number) => (p === 1 ? 1.0 : p === 2 ? 0.5 : 0.33)

  const isVibeMatch = (vibe: string) =>
    propertyVibesLower.some(pv => {
      const pvNorm = pv.replace(/[-_]/g, ' ')
      const vibeNorm = vibe.replace(/[-_]/g, ' ')
      return pv === vibe || pvNorm === vibeNorm
    })

  const totalWeight = matchedVibes.reduce((sum, { priority }) => sum + priorityWeight(priority), 0)
  const matchedWeight = matchedVibes.reduce(
    (sum, { vibe, priority }) => sum + (isVibeMatch(vibe) ? priorityWeight(priority) : 0),
    0
  )

  if (totalWeight === 0) return 50
  const ratio = matchedWeight / totalWeight
  return Math.max(0, Math.min(100, 50 + ratio * 50))
}

export function calculateSafetyScore(
  safety: number | null,
  category: string | null | undefined
): number {
  if (safety === null || safety === undefined) return 0
  if (!category || category === 'Not important' || category === 'Not mentioned') return 0

  let safetyScore = 0

  if (category === 'Essential') {
    if (safety >= 9.5) {
      safetyScore = 60 - ((safety - 9.5) / 0.5) * 10
    } else if (safety >= 9.0) {
      safetyScore = 50 - ((safety - 9.0) / 0.5) * 5
    } else if (safety >= 8.5) {
      safetyScore = 45 - ((safety - 8.5) / 0.5) * 5
    } else if (safety >= 8.0) {
      safetyScore = 40 - ((safety - 8.0) / 0.5) * 5
    } else if (safety >= 7.5) {
      safetyScore = 35 - ((safety - 7.5) / 0.5) * 5
    } else if (safety >= 7.0) {
      safetyScore = 30 - ((safety - 7.0) / 0.5) * 10
    } else if (safety >= 6.0) {
      safetyScore = 20 - ((safety - 6.0) / 1.0) * 20
    } else {
      safetyScore = -10 - ((6.0 - safety) / 2.0) * 10
    }
  } else if (category === 'Strong') {
    if (safety >= 9.0) {
      safetyScore = 40 - ((safety - 9.0) / 1.0) * 5
    } else if (safety >= 8.0) {
      safetyScore = 35 - ((safety - 8.0) / 1.0) * 5
    } else if (safety >= 7.5) {
      safetyScore = 30 - ((safety - 7.5) / 0.5) * 5
    } else if (safety >= 7.0) {
      safetyScore = 25 - ((safety - 7.0) / 0.5) * 10
    } else if (safety >= 6.0) {
      safetyScore = 15 - ((safety - 6.0) / 1.0) * 15
    } else {
      safetyScore = -5 - ((6.0 - safety) / 2.0) * 5
    }
  }

  return safetyScore
}

export function calculateParkingScore(hasParking: boolean | null, isSoftPreference: boolean): number {
  if (!isSoftPreference) return 0
  if (hasParking === true) return 30
  if (hasParking === false) return -15
  return -5
}

export function calculatePhotoBonus(userQuery: string, photoTagsRaw: string | null | undefined): number {
  if (!userQuery || !photoTagsRaw) return 0

  let tags: string[]
  try {
    const parsed = JSON.parse(photoTagsRaw)
    tags = Array.isArray(parsed) ? parsed.map(t => String(t).toLowerCase()) : []
  } catch {
    return 0
  }
  if (tags.length === 0) return 0

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PHOTO_TAG_SYNONYMS } = require('../photo-vision') as { PHOTO_TAG_SYNONYMS: Record<string, string[]> }

  const queryLower = userQuery.toLowerCase()
  const stopWords = new Set([
    'i', 'want', 'need', 'looking', 'for', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'θελω', 'θέλω', 'χρειάζομαι', 'ψάχνω', 'για', 'το', 'τη', 'τον', 'τα', 'της', 'των', 'με', 'σε', 'από', 'προς', 'και', 'ή', 'αλλά',
  ])
  const queryWords = queryLower
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))

  const matchedTags = new Set<string>()

  for (const word of queryWords) {
    for (const tag of tags) {
      if (tag.includes(word) || word.includes(tag)) matchedTags.add(tag)
    }
  }

  for (const [phrase, expandedTags] of Object.entries(PHOTO_TAG_SYNONYMS)) {
    if (queryLower.includes(phrase)) {
      for (const et of expandedTags) {
        if (tags.includes(et)) matchedTags.add(et)
      }
    }
  }

  if (matchedTags.size === 0) return 0
  return Math.min(12, 6 + (matchedTags.size - 1) * 3)
}
