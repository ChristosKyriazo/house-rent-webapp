import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import { applyLocationRewrites, canonicalizeFilterLocations } from '@/lib/services/ai-chat-service'
import { createLocationResolver } from '@/lib/search/fuzzy-location'

const AREAS = [
  { name: 'Nea Smyrni', nameGreek: 'Νέα Σμύρνη', city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Chalandri', nameGreek: 'Χαλάνδρι', city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Amarousio', nameGreek: 'Αμαρούσιο', city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
]

const resolver = createLocationResolver(AREAS)

describe('canonicalizeFilterLocations', () => {
  it('pins a misspelled area to the canonical name and reports the rewrite', () => {
    const filters: Record<string, unknown> = { area: 'Nea Smirni', maxPrice: 800 }
    const rewrites = canonicalizeFilterLocations(filters, resolver)

    expect(filters.area).toBe('Nea Smyrni')
    expect(filters.maxPrice).toBe(800)
    expect(rewrites).toEqual([{ raw: 'Nea Smirni', canonical: 'Nea Smyrni' }])
  })

  it('moves an area the model misfiled as a city', () => {
    const filters: Record<string, unknown> = { city: 'nea smirni' }
    canonicalizeFilterLocations(filters, resolver)

    expect(filters.city).toBeNull()
    expect(filters.area).toBe('Nea Smyrni')
  })

  it('leaves a real city in place', () => {
    const filters: Record<string, unknown> = { city: 'athina' }
    canonicalizeFilterLocations(filters, resolver)

    expect(filters.city).toBe('Athens')
    expect(filters.area).toBeUndefined()
  })

  it('canonicalizes preferredAreas and leaves unknown names alone', () => {
    const filters: Record<string, unknown> = { preferredAreas: ['halandri', 'marousi', 'Atlantis'] }
    canonicalizeFilterLocations(filters, resolver)

    expect(filters.preferredAreas).toEqual(['Chalandri', 'Amarousio', 'Atlantis'])
  })

  it('reports no rewrites when the model already spelled it canonically', () => {
    const filters: Record<string, unknown> = { area: 'Nea Smyrni' }
    expect(canonicalizeFilterLocations(filters, resolver)).toEqual([])
  })
})

describe('applyLocationRewrites', () => {
  it('fixes the assistant echo', () => {
    const message = applyLocationRewrites('Great choice with Nea Smirni! What budget?', [
      { raw: 'Nea Smirni', canonical: 'Nea Smyrni' },
    ])
    expect(message).toBe('Great choice with Nea Smyrni! What budget?')
  })

  it('is case-insensitive but preserves the rest of the sentence', () => {
    const message = applyLocationRewrites('Looking in nea smirni, got it.', [
      { raw: 'nea smirni', canonical: 'Nea Smyrni' },
    ])
    expect(message).toBe('Looking in Nea Smyrni, got it.')
  })

  it('never rewrites Greek-script prose into English', () => {
    const message = applyLocationRewrites('Ωραία επιλογή η Νέα Σμύρνη!', [
      { raw: 'Νέα Σμύρνη', canonical: 'Nea Smyrni' },
    ])
    expect(message).toBe('Ωραία επιλογή η Νέα Σμύρνη!')
  })

  it('does not corrupt a name embedded in a longer word', () => {
    const message = applyLocationRewrites('The Rio area is nice.', [
      { raw: 'Rio', canonical: 'Rio' },
    ])
    expect(message).toBe('The Rio area is nice.')
  })
})
