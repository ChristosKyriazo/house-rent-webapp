/**
 * Renders the accumulated conversational filters as one canonical English sentence —
 * the conversation's *intent*, in the same register as a listing's `buildHomeText`.
 *
 * This exists because the conversational search used to send the literal string
 * `"[conversational]"` as its query. Three things were silently keyed off that placeholder:
 * embedding generation (skipped entirely, so the 0.30-weight semantic component was never
 * expressed), and the description and photo keyword bonuses (which matched the word
 * "conversational" against listing text, i.e. nothing, ever). Over half the scoring weight
 * was inert in the only search UI that people actually use.
 *
 * The same string is also what a saved AI search should embed. Embedding the raw last
 * message meant a search saved after a five-turn conversation stored the vector for
 * whatever fragment ended it — "600", "ναι", "Kolonaki" — and then weighted that against
 * every new listing forever.
 *
 * Always English, whatever language the conversation is in: it is compared by cosine
 * against `buildHomeText` output, which is English. Mirroring the user's language here
 * would put the two vectors in different regions of the space.
 */

type Filters = Record<string, unknown>

function num(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** "Essential"/"Strong" read as wants; "Avoid" inverts; the rest carry no intent. */
const PROXIMITY_PHRASES: Record<string, string> = {
  Metro: 'a metro station',
  Bus: 'a bus stop',
  School: 'a school',
  Hospital: 'a hospital',
  Park: 'a park',
  University: 'a university',
}

function range(min: number | null, max: number | null, unit: (n: number) => string): string | null {
  if (min !== null && max !== null) return `${unit(min)} to ${unit(max)}`
  if (max !== null) return `up to ${unit(max)}`
  if (min !== null) return `at least ${unit(min)}`
  return null
}

export function buildIntentText(filters: Filters | null | undefined): string {
  if (!filters) return ''
  const parts: (string | null)[] = []

  // Location and type first — the strongest semantic anchor, same as buildHomeText.
  const place = [str(filters.area), str(filters.city), str(filters.country)]
    .filter(Boolean)
    .join(', ')
  const listingType = str(filters.listingType)
  const kind = listingType === 'sale' ? 'property for sale' : 'rental property'
  parts.push(place ? `${kind} in ${place}` : kind)

  const preferred = filters.preferredAreas
  if (Array.isArray(preferred) && preferred.length > 0) {
    parts.push(`preferably around ${preferred.join(', ')}`)
  }

  parts.push(range(num(filters.minBedrooms), num(filters.maxBedrooms), n => `${n} bedrooms`))
  parts.push(range(num(filters.minBathrooms), num(filters.maxBathrooms), n => `${n} bathrooms`))
  parts.push(range(num(filters.minSize), num(filters.maxSize), n => `${n} square meters`))
  parts.push(range(num(filters.minPrice), num(filters.maxPrice), n => `€${n.toLocaleString('en-US')}`))
  parts.push(range(num(filters.minFloor), num(filters.maxFloor), n => `floor ${n}`))
  parts.push(range(num(filters.minYearBuilt), num(filters.maxYearBuilt), n => `built ${n}`))
  parts.push(range(num(filters.minYearRenovated), num(filters.maxYearRenovated), n => `renovated ${n}`))

  if (filters.parking === true) parts.push('with parking')

  const heatingCategory = str(filters.heatingCategory)
  if (heatingCategory) parts.push(`${heatingCategory} heating`)
  const heatingAgent = str(filters.heatingAgent)
  if (heatingAgent) parts.push(`${heatingAgent} heating system`)

  // Soft criteria carry real semantic signal — a listing description that mentions the
  // metro should be pulled up by a query that asked to be near one.
  for (const [field, phrase] of Object.entries(PROXIMITY_PHRASES)) {
    const category = str(filters[field])
    if (!category) continue
    if (category === 'Essential') parts.push(`close to ${phrase}`)
    else if (category === 'Strong') parts.push(`near ${phrase}`)
    else if (category === 'Avoid') parts.push(`away from ${phrase}`)
  }

  const safety = str(filters.Safety)
  if (safety === 'Essential') parts.push('in a very safe area')
  else if (safety === 'Strong') parts.push('in a safe area')

  const vibe = str(filters.vibePreference)
  if (vibe) parts.push(`${vibe} neighbourhood`)

  return parts.filter(Boolean).join(', ')
}

/**
 * True when the text carries enough intent to be worth embedding. A bare
 * "rental property" says nothing a cosine could use.
 */
export function hasUsableIntent(text: string): boolean {
  return text.trim().length > 0 && text.split(',').length > 1
}
