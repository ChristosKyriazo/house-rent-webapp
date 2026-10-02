import { removeGreekAccents } from './utils'

// Jaro-Winkler similarity — prefix-aware, avoids false suffix matches for place names.
// See value-matcher.ts for the rationale.
function jaroSim(s1: string, s2: string): number {
  if (s1 === s2) return 1
  const l1 = s1.length, l2 = s2.length
  if (!l1 || !l2) return 0
  const win = Math.max(0, Math.floor(Math.max(l1, l2) / 2) - 1)
  const m1 = new Array(l1).fill(false)
  const m2 = new Array(l2).fill(false)
  let matches = 0
  for (let i = 0; i < l1; i++) {
    for (let j = Math.max(0, i - win); j < Math.min(i + win + 1, l2); j++) {
      if (m2[j] || s1[i] !== s2[j]) continue
      m1[i] = m2[j] = true; matches++; break
    }
  }
  if (!matches) return 0
  let t = 0, k = 0
  for (let i = 0; i < l1; i++) {
    if (!m1[i]) continue
    while (!m2[k]) k++
    if (s1[i] !== s2[k]) t++
    k++
  }
  return (matches / l1 + matches / l2 + (matches - t / 2) / matches) / 3
}

function jaroWinklerSim(s1: string, s2: string): number {
  const jaro = jaroSim(s1, s2)
  let p = 0
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) p++; else break
  }
  return jaro + p * 0.1 * (1 - jaro)
}

/**
 * Find the most similar area from a list using Jaro-Winkler.
 * Checks English and Greek names with accent normalization.
 * Threshold 0.82 prevents suffix-only matches (e.g. "keramikos" → "thermaikos").
 */
export function findMostSimilarArea(
  query: string,
  areas: Array<{ id: number; name: string; nameGreek: string | null }>
): { id: number; name: string; nameGreek: string | null } | null {
  if (!query || query.trim().length === 0 || areas.length === 0) return null

  const q = removeGreekAccents(query.toLowerCase().trim())
  let best: { area: (typeof areas)[0]; score: number } | null = null

  for (const area of areas) {
    const scoreEn = jaroWinklerSim(q, removeGreekAccents(area.name.toLowerCase()))
    const scoreEl = area.nameGreek
      ? jaroWinklerSim(q, removeGreekAccents(area.nameGreek.toLowerCase()))
      : 0
    const score = Math.max(scoreEn, scoreEl)
    if (!best || score > best.score) best = { area, score }
  }

  return best && best.score >= 0.82 ? best.area : null
}

/**
 * Get area name based on language
 */
export function getAreaName(
  area: string | null,
  areas: Array<{ name: string; nameGreek: string | null }>,
  language: 'el' | 'en'
): string {
  if (!area) return ''
  
  // Find the area in the list
  const areaData = areas.find(a => a.name === area || a.nameGreek === area)
  
  if (!areaData) return area
  
  // Return Greek name if language is Greek and it exists, otherwise return English name
  if (language === 'el' && areaData.nameGreek) {
    return areaData.nameGreek
  }
  
  return areaData.name
}

/**
 * Get city name based on language
 * Looks up the city in the areas table to find Greek translation
 */
export function getCityName(
  city: string | null,
  areas: Array<{ city: string | null; cityGreek: string | null }>,
  language: 'el' | 'en'
): string {
  if (!city) return ''
  
  // Find an area with matching city
  const areaData = areas.find(a => a.city === city)
  
  if (!areaData) return city
  
  // Return Greek name if language is Greek and it exists, otherwise return original city
  if (language === 'el' && areaData.cityGreek) {
    return areaData.cityGreek
  }
  
  return city
}

/**
 * Get home title based on language
 */
export function getHomeTitle(
  language: 'el' | 'en',
  home: { title: string; titleGreek?: string | null }
): string {
  return language === 'el' && home.titleGreek ? home.titleGreek : home.title
}

/**
 * Get home street based on language
 */
export function getHomeStreet(
  language: 'el' | 'en',
  home: { street?: string | null; streetGreek?: string | null }
): string | null {
  if (language === 'el' && home.streetGreek) return home.streetGreek
  return home.street ?? null
}

/**
 * Get country name based on language
 * Looks up the country in the areas table to find Greek translation
 */
export function getCountryName(
  country: string | null,
  areas: Array<{ country: string | null; countryGreek: string | null }>,
  language: 'el' | 'en'
): string {
  if (!country) return ''
  
  // Find an area with matching country
  const areaData = areas.find(a => a.country === country)
  
  if (!areaData) return country
  
  // Return Greek name if language is Greek and it exists, otherwise return original country
  if (language === 'el' && areaData.countryGreek) {
    return areaData.countryGreek
  }
  
  return country
}

