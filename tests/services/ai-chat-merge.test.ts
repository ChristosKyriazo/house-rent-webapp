import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import { mergeFilters, sliceHistoryOnTurnBoundary, describeDroppedBounds } from '@/lib/services/ai-chat-service'

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

describe('sliceHistoryOnTurnBoundary', () => {
  const turn = (role: 'user' | 'assistant', content: string) => ({ role, content })

  it('returns short histories untouched', () => {
    const history = [turn('user', 'a'), turn('assistant', 'b')]
    expect(sliceHistoryOnTurnBoundary(history, 12)).toEqual(history)
  })

  it('never opens the window on an orphaned assistant question', () => {
    // A plain slice(-N) can start on an assistant turn, presenting the model with a
    // question whose own context is gone. That is precisely the bare-reply case the
    // bound-binding design exists to read correctly.
    const history = Array.from({ length: 20 }, (_, i) =>
      turn(i % 2 === 0 ? 'user' : 'assistant', `m${i}`)
    )
    const sliced = sliceHistoryOnTurnBoundary(history, 5)
    expect(sliced[0].role).toBe('user')
    expect(sliced.length).toBeLessThanOrEqual(5)
  })

  it('keeps the most recent turns', () => {
    const history = Array.from({ length: 20 }, (_, i) =>
      turn(i % 2 === 0 ? 'user' : 'assistant', `m${i}`)
    )
    const sliced = sliceHistoryOnTurnBoundary(history, 6)
    expect(sliced[sliced.length - 1].content).toBe('m19')
  })
})

describe('describeDroppedBounds', () => {
  it('says nothing when nothing was dropped', () => {
    expect(describeDroppedBounds([], false)).toBe('')
  })

  it('names the removed bound so a filter never vanishes silently', () => {
    expect(describeDroppedBounds(['maxPrice'], false)).toContain('the maximum price')
  })

  it('lists several in the user language', () => {
    const el = describeDroppedBounds(['maxPrice', 'minBedrooms'], true)
    expect(el).toContain('τη μέγιστη τιμή')
    expect(el).toContain('και')
  })
})
