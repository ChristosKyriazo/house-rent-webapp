import { removeGreekAccents } from '../utils'

/**
 * Resolves free-text location names (misspelled, Greeklish, Greek, or English)
 * onto the canonical names stored in the `areas` table.
 *
 * Two stages:
 *  1. A phonetic key that collapses the ways the same Greek sound gets written
 *     in Latin script — "Smyrni"/"Smirni"/"Smyrnh"/"Σμύρνη" all key to "smirni".
 *  2. Bounded edit distance on that key, to absorb dropped/doubled letters.
 */

const GREEK_TO_LATIN: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i',
  κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'ks', ο: 'o', π: 'p', ρ: 'r', σ: 's',
  ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
}

/** Greek script → Latin script, accent-insensitive. Latin input passes through. */
export function transliterateGreek(input: string): string {
  return removeGreekAccents(input.toLowerCase())
    .split('')
    .map((ch) => GREEK_TO_LATIN[ch] ?? ch)
    .join('')
}

/**
 * Collapse one Latin token to a sound-based key.
 *
 * Sentinels: `T` = θ/th, `x` = χ/ξ (chi and xi collapse together), `f` = φ/ph.
 * Order matters — digraphs must be consumed before their component letters.
 */
function tokenKey(token: string): string {
  let t = token

  // Chat-Greeklish digit conventions: 8/9 = θ, 3 = ξ, 0 = ο
  t = t.replace(/[89]/g, 'th').replace(/3/g, 'ks').replace(/0/g, 'o')

  // Consonant digraphs
  t = t.replace(/ph/g, 'f')
  t = t.replace(/th/g, 'T')
  t = t.replace(/ch|kh|ks/g, 'x')

  // A leftover `h` before a vowel is χ (Halandri, Psihiko); elsewhere it is η
  // (smyrnh, ka8hmerini).
  t = t.replace(/h(?=[aeiouwy])/g, 'x')
  t = t.replace(/h/g, 'i')

  // Vowel digraphs, then single-vowel equivalences
  t = t.replace(/ai/g, 'e')
  t = t.replace(/ei|oi|yi|ui/g, 'i')
  t = t.replace(/ou/g, 'u')
  t = t.replace(/w/g, 'o')
  t = t.replace(/y/g, 'i')

  // β and μπ are both written v or b
  t = t.replace(/b/g, 'v')

  // Kallithea / Kalithea
  t = t.replace(/(.)\1+/g, '$1')

  return t
}

/**
 * Phonetic key for a full location name. Separators (spaces, hyphens,
 * apostrophes) are dropped so "Nea Smyrni" and "Nea-Smyrni" agree.
 */
export function locationKey(input: string): string {
  return transliterateGreek(input)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(tokenKey)
    .join('')
}

/** Levenshtein distance, abandoning once every cell in a row exceeds `max`. */
function boundedEditDistance(a: string, b: string, max: number): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  const curr = new Array<number>(b.length + 1)

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    let rowMin = curr[0]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
      rowMin = Math.min(rowMin, curr[j])
    }
    if (rowMin > max) return max + 1
    prev = curr.slice()
  }

  return prev[b.length]
}

/** Longer names tolerate more slips; short ones must be near-exact. */
function toleranceFor(key: string): number {
  if (key.length <= 4) return 0
  if (key.length <= 7) return 1
  if (key.length <= 12) return 2
  return 3
}

/**
 * Aliases are ranked, and a better tier always wins regardless of edit distance.
 * The canonical English name outranks the Greek name, which outranks a half of a
 * compound name. This keeps "Irakleio" (Athens) resolvable even though Heraklion
 * in Crete shares its Greek name, and keeps standalone "Chalkidona" from losing
 * to the "Chalkidona" half of "Filadelfeia-Chalkidona".
 */
const TIER_CANONICAL = 0
const TIER_ALIAS = 1
const TIER_SEGMENT = 2

export interface LocationAlias {
  value: string
  tier: number
}

export interface LocationCandidate {
  /** The value to return on a match — the canonical name as stored in the DB. */
  canonical: string
  /** Every spelling that should resolve to `canonical` (English + Greek). */
  aliases: LocationAlias[]
}

/**
 * Best canonical match for `input`, or null when nothing is close enough or
 * two different candidates are equally close (never guess between areas).
 */
export function resolveLocation(
  input: string | null | undefined,
  candidates: LocationCandidate[]
): string | null {
  if (!input || !input.trim()) return null

  const inputKey = locationKey(input)
  if (!inputKey) return null

  let best: string | null = null
  let bestTier = Infinity
  let bestDistance = Infinity
  let ambiguous = false

  // Scans every candidate even after an exact hit: two areas can share a name
  // (Ηράκλειο is both an Athens suburb and the Crete capital) and we must see
  // the second one to know the match is ambiguous.
  for (const candidate of candidates) {
    for (const { value, tier } of candidate.aliases) {
      const aliasKey = locationKey(value)
      if (!aliasKey) continue

      const max = Math.min(toleranceFor(aliasKey), toleranceFor(inputKey))
      const distance = boundedEditDistance(inputKey, aliasKey, max)
      if (distance > max) continue

      if (tier < bestTier || (tier === bestTier && distance < bestDistance)) {
        bestTier = tier
        bestDistance = distance
        best = candidate.canonical
        ambiguous = false
      } else if (tier === bestTier && distance === bestDistance && candidate.canonical !== best) {
        ambiguous = true
      }
    }
  }

  if (ambiguous) return null
  return best
}

/**
 * Alternate names that phonetics cannot bridge, keyed on the canonical name as
 * stored in the `areas` table. These are real-world synonyms — a colloquial or
 * historical name for the same place — not misspellings, which `locationKey`
 * already handles. Keep this list conservative: every entry here is a name the
 * resolver will confidently accept.
 */
export const NAME_ALIASES: Record<string, string[]> = {
  // Athens
  Amarousio: ['Marousi', 'Maroussi', 'Μαρούσι'],
  Ilioupoli: ['Helioupoli', 'Ilioupolis'],
  'Papagou-Cholargos': ['Papagos', 'Παπάγος'],
  'Filothei-Psychiko': ['Neo Psychiko', 'Palaio Psychiko', 'Νέο Ψυχικό', 'Παλαιό Ψυχικό'],
  'Nikaia-Agios Ioannis Rentis': ['Rentis', 'Ρέντης'],
  'Palaio Faliro': ['Faliro', 'Φάληρο'],
  Vyronas: ['Vyron', 'Βύρων'],
  // Thessaloniki
  Thessaloniki: ['Salonica', 'Salonika', 'Saloniki', 'Σαλονίκη'],
  // Epirus
  Ioannina: ['Giannena', 'Yannena', 'Γιάννενα'],
}

type AreaRow = {
  name?: string | null
  nameGreek?: string | null
  city?: string | null
  cityGreek?: string | null
  country?: string | null
  countryGreek?: string | null
  district?: string | null
}

/**
 * Merged municipalities are stored under a compound name ("Filothei-Psychiko",
 * "Papagou-Cholargos") but people search for one half of it. Each hyphenated
 * segment becomes a lower-tier alias of the whole. Spaces are never split —
 * "Nea" alone would be ambiguous across Nea Smyrni, Nea Ionia and Nea Filadelfeia.
 */
function expandName(name: string, tier: number, splitCompounds: boolean): LocationAlias[] {
  const aliases: LocationAlias[] = [{ value: name, tier }]
  if (!splitCompounds) return aliases

  const segments = name.split('-').map((s) => s.trim()).filter(Boolean)
  if (segments.length > 1) {
    segments.forEach((segment) => aliases.push({ value: segment, tier: TIER_SEGMENT }))
  }
  return aliases
}

/** Group rows into candidates keyed on the canonical (English) value. */
function buildCandidates(
  rows: AreaRow[],
  pick: (row: AreaRow) => [string | null | undefined, string | null | undefined],
  splitCompounds = false
): LocationCandidate[] {
  const byCanonical = new Map<string, Map<string, number>>()

  for (const row of rows) {
    const [canonical, alias] = pick(row)
    if (!canonical) continue
    if (!byCanonical.has(canonical)) byCanonical.set(canonical, new Map())
    const aliases = byCanonical.get(canonical)!

    const named: Array<readonly [string | null | undefined, number]> = [
      [canonical, TIER_CANONICAL],
      [alias, TIER_ALIAS],
      ...(NAME_ALIASES[canonical] ?? []).map((extra) => [extra, TIER_ALIAS] as const),
    ]

    for (const [name, tier] of named) {
      if (!name) continue
      for (const expanded of expandName(name, tier, splitCompounds)) {
        // Keep the strongest tier if a value shows up as both full name and segment
        aliases.set(expanded.value, Math.min(aliases.get(expanded.value) ?? Infinity, expanded.tier))
      }
    }
  }

  return Array.from(byCanonical, ([canonical, aliases]) => ({
    canonical,
    aliases: Array.from(aliases, ([value, tier]) => ({ value, tier })),
  }))
}

/**
 * Typo/Greeklish-tolerant resolvers for one snapshot of the `areas` table.
 * Each resolver returns the canonical English name, or null if no confident match.
 */
export function createLocationResolver(areas: AreaRow[]) {
  const areaCandidates = buildCandidates(areas, (a) => [a.name, a.nameGreek], true)
  const cityCandidates = buildCandidates(areas, (a) => [a.city, a.cityGreek])
  const countryCandidates = buildCandidates(areas, (a) => [a.country, a.countryGreek])
  const districtCandidates = buildCandidates(areas, (a) => [a.district, null])

  const resolveCity = (input: string | null | undefined) => resolveLocation(input, cityCandidates)

  // Areas grouped by their canonical city, so a city hint can disambiguate names
  // that two cities share (Ηράκλειο is an Athens suburb and the Crete capital).
  const areaCandidatesByCity = new Map<string, LocationCandidate[]>()
  for (const row of areas) {
    if (!row.city) continue
    if (!areaCandidatesByCity.has(row.city)) {
      areaCandidatesByCity.set(
        row.city,
        buildCandidates(areas.filter((a) => a.city === row.city), (a) => [a.name, a.nameGreek], true)
      )
    }
  }

  /**
   * @param cityHint When it names a known city, areas in that city are tried
   *   first; an unknown or unhelpful hint falls back to searching every area.
   */
  const resolveArea = (input: string | null | undefined, cityHint?: string | null) => {
    if (cityHint) {
      const city = resolveCity(cityHint)
      const scoped = city ? areaCandidatesByCity.get(city) : undefined
      if (scoped) {
        const match = resolveLocation(input, scoped)
        if (match) return match
      }
    }
    return resolveLocation(input, areaCandidates)
  }

  return {
    resolveArea,
    resolveCity,
    resolveCountry: (input: string | null | undefined) => resolveLocation(input, countryCandidates),
    resolveDistrict: (input: string | null | undefined) => resolveLocation(input, districtCandidates),
  }
}
