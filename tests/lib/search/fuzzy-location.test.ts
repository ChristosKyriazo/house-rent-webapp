import { describe, it, expect } from 'vitest'
import { locationKey, createLocationResolver } from '@/lib/search/fuzzy-location'

/** Mirrors the shape of rows seeded by scripts/seeds/seed-areas.ts */
const AREAS = [
  { name: 'Nea Smyrni', nameGreek: 'Νέα Σμύρνη', city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα', district: 'Southern Suburbs' },
  { name: 'Nea Ionia', nameGreek: 'Νέα Ιωνία', city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα', district: 'Northern Suburbs' },
  { name: 'Kallithea', nameGreek: 'Καλλιθέα', city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα', district: 'Southern Suburbs' },
  { name: 'Chalandri', nameGreek: 'Χαλάνδρι', city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα', district: 'Northern Suburbs' },
  { name: 'Filothei-Psychiko', nameGreek: 'Φιλοθέη-Ψυχικό', city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα', district: 'Northern Suburbs' },
  { name: 'Glyfada', nameGreek: 'Γλυφάδα', city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα', district: 'Southern Suburbs' },
  { name: 'Kifisia', nameGreek: 'Κηφισιά', city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα', district: 'Northern Suburbs' },
  { name: 'Piraeus', nameGreek: 'Πειραιάς', city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα', district: 'Piraeus' },
  { name: 'Peristeri', nameGreek: 'Περιστέρι', city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα', district: 'Western Athens' },
  { name: 'Thessaloniki', nameGreek: 'Θεσσαλονίκη', city: 'Thessaloniki', cityGreek: 'Θεσσαλονίκη', country: 'Greece', countryGreek: 'Ελλάδα', district: null },
  // Standalone area that is also half of a compound area name
  { name: 'Filadelfeia-Chalkidona', nameGreek: 'Φιλαδέλφεια-Χαλκηδόνα', city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα', district: 'Central Athens' },
  { name: 'Chalkidona', nameGreek: 'Χαλκηδόνα', city: 'Thessaloniki', cityGreek: 'Θεσσαλονίκη', country: 'Greece', countryGreek: 'Ελλάδα', district: null },
  // Two different areas that share the same Greek name
  { name: 'Irakleio', nameGreek: 'Ηράκλειο', city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα', district: 'Northern Suburbs' },
  { name: 'Heraklion', nameGreek: 'Ηράκλειο', city: 'Iraklio', cityGreek: 'Ηράκλειο', country: 'Greece', countryGreek: 'Ελλάδα', district: null },
  // Areas with curated alternate names (see NAME_ALIASES)
  { name: 'Amarousio', nameGreek: 'Αμαρούσιο', city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα', district: 'Northern Suburbs' },
  { name: 'Papagou-Cholargos', nameGreek: 'Παπάγου-Χολαργός', city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα', district: 'Northern Suburbs' },
  { name: 'Nikaia-Agios Ioannis Rentis', nameGreek: 'Νίκαια-Άγιος Ιωάννης Ρέντης', city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα', district: 'Piraeus' },
]

describe('locationKey', () => {
  it('collapses Greek and Latin spellings of the same name', () => {
    const canonical = locationKey('Nea Smyrni')
    expect(locationKey('Νέα Σμύρνη')).toBe(canonical)
    expect(locationKey('nea smirni')).toBe(canonical)
    expect(locationKey('Nea Smyrnh')).toBe(canonical)
    expect(locationKey('NEA-SMIRNI')).toBe(canonical)
  })

  it('treats h before a vowel as chi, elsewhere as eta', () => {
    expect(locationKey('Halandri')).toBe(locationKey('Chalandri'))
    expect(locationKey('Halandri')).toBe(locationKey('Χαλάνδρι'))
    expect(locationKey('Psihiko')).toBe(locationKey('Psychiko'))
    expect(locationKey('Smyrnh')).toBe(locationKey('Smirni'))
  })

  it('handles chat-Greeklish digits', () => {
    expect(locationKey('8essaloniki')).toBe(locationKey('Thessaloniki'))
    expect(locationKey('Θεσσαλονίκη')).toBe(locationKey('Thessaloniki'))
  })

  it('collapses doubled letters and ou/u', () => {
    expect(locationKey('Kalithea')).toBe(locationKey('Kallithea'))
    expect(locationKey('Voula')).toBe(locationKey('Boula'))
  })
})

describe('resolveLocation', () => {
  const { resolveArea, resolveCity, resolveCountry, resolveDistrict } = createLocationResolver(AREAS)

  it('resolves the reported failure: "nea smirni" → "Nea Smyrni"', () => {
    expect(resolveArea('nea smirni')).toBe('Nea Smyrni')
    expect(resolveArea('Nea Smirni')).toBe('Nea Smyrni')
  })

  it('resolves Greek, Greeklish, and typo variants to canonical English', () => {
    expect(resolveArea('Νέα Σμύρνη')).toBe('Nea Smyrni')
    expect(resolveArea('nea smyrnh')).toBe('Nea Smyrni')
    expect(resolveArea('Halandri')).toBe('Chalandri')
    expect(resolveArea('Χαλάνδρι')).toBe('Chalandri')
    expect(resolveArea('Kalithea')).toBe('Kallithea')
    expect(resolveArea('glifada')).toBe('Glyfada')
    expect(resolveArea('Κηφισιά')).toBe('Kifisia')
  })

  it('resolves cities and countries', () => {
    expect(resolveCity('athina')).toBe('Athens')
    expect(resolveCity('Αθήνα')).toBe('Athens')
    expect(resolveCity('thessalonikh')).toBe('Thessaloniki')
    expect(resolveCountry('Ελλάδα')).toBe('Greece')
    expect(resolveCountry('greece')).toBe('Greece')
  })

  it('resolves districts', () => {
    expect(resolveDistrict('southern suburbs')).toBe('Southern Suburbs')
    expect(resolveDistrict('Nothern Suburbs')).toBe('Northern Suburbs')
  })

  it('does not confuse distinct nearby areas', () => {
    expect(resolveArea('Nea Ionia')).toBe('Nea Ionia')
    expect(resolveArea('Νέα Ιωνία')).toBe('Nea Ionia')
    expect(resolveArea('Peristeri')).toBe('Peristeri')
  })

  it('resolves half of a merged municipality to the compound area', () => {
    expect(resolveArea('Psychiko')).toBe('Filothei-Psychiko')
    expect(resolveArea('psihiko')).toBe('Filothei-Psychiko')
    expect(resolveArea('Ψυχικό')).toBe('Filothei-Psychiko')
    expect(resolveArea('Filothei')).toBe('Filothei-Psychiko')
  })

  it('prefers a standalone area over the same word inside a compound name', () => {
    expect(resolveArea('Chalkidona')).toBe('Chalkidona')
    expect(resolveArea('Χαλκηδόνα')).toBe('Chalkidona')
    expect(resolveArea('Filadelfeia')).toBe('Filadelfeia-Chalkidona')
  })

  it('prefers the canonical English name when two areas share a Greek name', () => {
    expect(resolveArea('Irakleio')).toBe('Irakleio')
    expect(resolveArea('Heraklion')).toBe('Heraklion')
  })

  it('uses the city to disambiguate a Greek name two cities share', () => {
    // Ηράκλειο is both an Athens suburb and the capital of Crete
    expect(resolveArea('Ηράκλειο', 'Iraklio')).toBe('Heraklion')
    expect(resolveArea('Ηράκλειο', 'Ηράκλειο')).toBe('Heraklion')
    expect(resolveArea('Ηράκλειο', 'Athens')).toBe('Irakleio')
    expect(resolveArea('Ηράκλειο', 'Αθήνα')).toBe('Irakleio')
  })

  it('falls back to a global search when the city hint does not help', () => {
    expect(resolveArea('nea smirni', 'Athens')).toBe('Nea Smyrni')
    // Area is not in the hinted city — still resolves rather than returning null
    expect(resolveArea('nea smirni', 'Thessaloniki')).toBe('Nea Smyrni')
    expect(resolveArea('nea smirni', 'Atlantis')).toBe('Nea Smyrni')
    expect(resolveArea('nea smirni', null)).toBe('Nea Smyrni')
  })

  it('resolves curated alternate names that phonetics cannot bridge', () => {
    expect(resolveArea('Marousi')).toBe('Amarousio')
    expect(resolveArea('Maroussi')).toBe('Amarousio')
    expect(resolveArea('Μαρούσι')).toBe('Amarousio')
    expect(resolveArea('Papagos')).toBe('Papagou-Cholargos')
    expect(resolveArea('Neo Psychiko')).toBe('Filothei-Psychiko')
    expect(resolveArea('Rentis')).toBe('Nikaia-Agios Ioannis Rentis')
  })

  it('applies curated aliases to cities as well as areas', () => {
    expect(resolveCity('Salonica')).toBe('Thessaloniki')
    expect(resolveCity('Saloniki')).toBe('Thessaloniki')
  })

  it('returns null rather than guessing on unknown input', () => {
    expect(resolveArea('Barcelona')).toBeNull()
    expect(resolveArea('')).toBeNull()
    expect(resolveArea(null)).toBeNull()
    expect(resolveArea(undefined)).toBeNull()
  })
})
