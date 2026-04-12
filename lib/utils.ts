/**
 * Shared utility functions used across the application
 */

/**
 * Remove Greek accents from a string for better matching
 * Used for matching Greek and English location names
 */
export function removeGreekAccents(str: string): string {
  const accentMap: Record<string, string> = {
    'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω',
    'ὰ': 'α', 'ὲ': 'ε', 'ὴ': 'η', 'ὶ': 'ι', 'ὸ': 'ο', 'ὺ': 'υ', 'ὼ': 'ω',
    'ᾶ': 'α', 'ῆ': 'η', 'ῖ': 'ι', 'ῦ': 'υ', 'ῶ': 'ω',
    'ᾳ': 'α', 'ῃ': 'η', 'ῳ': 'ω',
    'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω',
    'Ὰ': 'Α', 'Ὲ': 'Ε', 'Ὴ': 'Η', 'Ὶ': 'Ι', 'Ὸ': 'Ο', 'Ὺ': 'Υ', 'Ὼ': 'Ω',
    'ᾼ': 'Α', 'ῌ': 'Η', 'ῼ': 'Ω',
  }
  
  return str
    .split('')
    .map(char => accentMap[char] || char)
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

type AreaCountryRow = { country: string | null; countryGreek: string | null }
type AreaCityRow = { city: string | null; cityGreek: string | null }
type AreaNameRow = { name: string | null; nameGreek: string | null }

/** Map stored country (English or Greek, any accents) to canonical English country from areas table. */
export function resolveCountryToEnglishCanonical(
  stored: string | null | undefined,
  areas: AreaCountryRow[]
): string {
  if (stored == null) return ''
  const t = String(stored).trim()
  if (!t) return ''
  const lower = t.toLowerCase()
  const norm = removeGreekAccents(lower)
  for (const a of areas) {
    if (a.country) {
      const cl = a.country.toLowerCase()
      if (cl === lower || removeGreekAccents(cl) === norm) return a.country
    }
    if (a.countryGreek) {
      const g = a.countryGreek.toLowerCase()
      if (g === lower || removeGreekAccents(g) === norm) {
        return a.country || t
      }
    }
  }
  return t
}

/** Map stored city to canonical English city from areas table. */
export function resolveCityToEnglishCanonical(
  stored: string | null | undefined,
  areas: AreaCityRow[]
): string {
  if (stored == null) return ''
  const t = String(stored).trim()
  if (!t) return ''
  const lower = t.toLowerCase()
  const norm = removeGreekAccents(lower)
  for (const a of areas) {
    if (a.city) {
      const cl = a.city.toLowerCase()
      if (cl === lower || removeGreekAccents(cl) === norm) return a.city
    }
    if (a.cityGreek) {
      const g = a.cityGreek.toLowerCase()
      if (g === lower || removeGreekAccents(g) === norm) {
        return a.city || t
      }
    }
  }
  return t
}

/** Map stored area name to canonical English area name from areas table. */
export function resolveAreaToEnglishCanonical(
  stored: string | null | undefined,
  areas: AreaNameRow[]
): string | null {
  if (stored == null || String(stored).trim() === '') return null
  const t = String(stored).trim()
  const lower = t.toLowerCase()
  const norm = removeGreekAccents(lower)
  for (const a of areas) {
    if (a.name) {
      const nl = a.name.toLowerCase()
      if (nl === lower || removeGreekAccents(nl) === norm) return a.name
    }
    if (a.nameGreek) {
      const g = a.nameGreek.toLowerCase()
      if (g === lower || removeGreekAccents(g) === norm) {
        return a.name || t
      }
    }
  }
  return t
}


