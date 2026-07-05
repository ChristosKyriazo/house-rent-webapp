import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import { mergeFilters } from '@/lib/services/ai-chat-service'

describe('mergeFilters — conversational filter accumulation', () => {
  it('keeps accumulated values when the model returns null for unmentioned fields', () => {
    // This was the "I told you I have a kid" bug: models emit null for every
    // field not mentioned in the current turn, which used to delete them.
    const accumulated = { city: 'Athens', School: 'Essential', vibePreference: 'family-friendly' }
    const incoming = { city: null, School: null, vibePreference: null, parking: true }

    const merged = mergeFilters(accumulated, incoming)

    expect(merged).toEqual({
      city: 'Athens',
      School: 'Essential',
      vibePreference: 'family-friendly',
      parking: true,
    })
  })

  it('treats "Not mentioned", empty string, and empty array as no-ops', () => {
    const accumulated = { city: 'Athens', preferredAreas: ['Kifisia'] }
    const incoming = { city: 'Not mentioned' as unknown as string, area: '', preferredAreas: [] }

    const merged = mergeFilters(accumulated, incoming)

    expect(merged).toEqual({ city: 'Athens', preferredAreas: ['Kifisia'] })
  })

  it('clears a filter only on the explicit CLEAR sentinel (user changed their mind)', () => {
    const accumulated = { city: 'Athens', parking: true }
    const incoming = { parking: 'CLEAR' as unknown as boolean }

    const merged = mergeFilters(accumulated, incoming)

    expect(merged).toEqual({ city: 'Athens' })
  })

  it('lets new values override accumulated ones', () => {
    const accumulated = { maxPrice: 900, minBedrooms: 2 }
    const incoming = { maxPrice: 1100 }

    const merged = mergeFilters(accumulated, incoming)

    expect(merged).toEqual({ maxPrice: 1100, minBedrooms: 2 })
  })
})
