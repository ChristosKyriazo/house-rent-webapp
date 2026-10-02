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

  // Best match wins, discounted by how far down the preference list it sits. A mismatch is
  // a real negative — the area is known and it is not what was asked for — so it scores well
  // below the 40 used when the area simply has no vibe data. It used to score 50, above
  // "unknown", which made a beach-lover's inland listing look like a coin toss.
  //
  // Labels are compared without "-friendly" and separators, because the area data says
  // "family-friendly" where this mapping says "family" — they never matched before.
  const canon = (v: string) => v.toLowerCase().replace(/[\s_-]*friendly$/, '').replace(/[\s_-]+/g, ' ').trim()
  const propertyCanon = new Set(propertyVibesLower.map(canon))

  const PRIORITY_SCORE: Record<number, number> = { 1: 100, 2: 80, 3: 60 }
  let best = 0
  for (const { vibe, priority } of matchedVibes) {
    if (propertyCanon.has(canon(vibe))) best = Math.max(best, PRIORITY_SCORE[priority] ?? 60)
  }
  return best > 0 ? best : VIBE_MISMATCH
}

/** Known area vibe, and not one the user asked for. */
export const VIBE_MISMATCH = 20
