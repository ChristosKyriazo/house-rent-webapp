import { describe, expect, it } from 'vitest'
import {
  parseBareNumbers,
  bindPendingNumericAnswer,
  reconcileBounds,
  oppositeBound,
  isMinBound,
  BOUND_FIELDS,
} from '@/lib/search/numeric-bounds'
import { buildFilterChips, removeChipFields, clearableFields } from '@/lib/search/filter-chips'

describe('parseBareNumbers', () => {
  it('reads a plain number', () => {
    expect(parseBareNumbers('600')).toEqual([600])
    expect(parseBareNumbers('  600  ')).toEqual([600])
  })

  it('reads several numbers in the order given', () => {
    expect(parseBareNumbers('2, 900')).toEqual([2, 900])
    expect(parseBareNumbers('2 and 900')).toEqual([2, 900])
  })

  it('strips currency and common filler', () => {
    expect(parseBareNumbers('€600')).toEqual([600])
    expect(parseBareNumbers('600 euros')).toEqual([600])
    expect(parseBareNumbers('600 ευρώ')).toEqual([600])
  })

  it('handles thousands separators and decimal commas', () => {
    expect(parseBareNumbers('1.200')).toEqual([1200])
    expect(parseBareNumbers('1200.50')).toEqual([1200.5])
    expect(parseBareNumbers('1200,50')).toEqual([1200.5])
  })

  it('refuses replies carrying a qualifier — the model must read those', () => {
    // "at least 600" means the opposite bound from the one we asked for, and only the
    // model can see that. Binding it blindly would invert the user's intent.
    expect(parseBareNumbers('at least 600')).toEqual([])
    expect(parseBareNumbers('600 max')).toEqual([])
    expect(parseBareNumbers('around 600 but flexible')).toEqual([])
    expect(parseBareNumbers('τουλάχιστον 600')).toEqual([])
  })

  it('returns nothing for empty or non-numeric replies', () => {
    expect(parseBareNumbers('')).toEqual([])
    expect(parseBareNumbers('Kolonaki')).toEqual([])
  })
})

describe('bindPendingNumericAnswer', () => {
  it('binds a bare number to the bound the question asked for', () => {
    expect(bindPendingNumericAnswer('600', ['maxPrice'])).toEqual({ maxPrice: 600 })
    expect(bindPendingNumericAnswer('600', ['minPrice'])).toEqual({ minPrice: 600 })
  })

  it('binds multiple answers positionally', () => {
    expect(bindPendingNumericAnswer('2, 900', ['minBedrooms', 'maxPrice'])).toEqual({
      minBedrooms: 2,
      maxPrice: 900,
    })
  })

  it('rounds fields that only take whole numbers', () => {
    expect(bindPendingNumericAnswer('2.4', ['minBedrooms'])).toEqual({ minBedrooms: 2 })
    expect(bindPendingNumericAnswer('600.5', ['maxPrice'])).toEqual({ maxPrice: 600.5 })
  })

  it('does nothing without a pending bound', () => {
    expect(bindPendingNumericAnswer('600', null)).toEqual({})
    expect(bindPendingNumericAnswer('600', [])).toEqual({})
  })

  it('ignores fields that are not real bounds', () => {
    expect(bindPendingNumericAnswer('600', ['budget'])).toEqual({})
  })

  it('leaves qualified replies to the model', () => {
    expect(bindPendingNumericAnswer('at least 600', ['maxPrice'])).toEqual({})
  })
})

describe('reconcileBounds', () => {
  it('drops the stale ceiling when the user raises the floor', () => {
    // "under €600" then "actually at least €800" — without this the filter is
    // min 800 / max 600, which silently returns nothing.
    const filters: Record<string, unknown> = { maxPrice: 600, minPrice: 800 }
    const dropped = reconcileBounds(filters, ['minPrice'])
    expect(dropped).toEqual(['maxPrice'])
    expect(filters).toEqual({ minPrice: 800 })
  })

  it('drops the stale floor when the user lowers the ceiling', () => {
    const filters: Record<string, unknown> = { minBedrooms: 4, maxBedrooms: 2 }
    const dropped = reconcileBounds(filters, ['maxBedrooms'])
    expect(dropped).toEqual(['minBedrooms'])
    expect(filters).toEqual({ maxBedrooms: 2 })
  })

  it('leaves a valid range alone', () => {
    const filters: Record<string, unknown> = { minPrice: 400, maxPrice: 600 }
    expect(reconcileBounds(filters, ['minPrice'])).toEqual([])
    expect(filters).toEqual({ minPrice: 400, maxPrice: 600 })
  })

  it('allows an exact range (min equals max)', () => {
    const filters: Record<string, unknown> = { minBedrooms: 2, maxBedrooms: 2 }
    expect(reconcileBounds(filters, ['minBedrooms'])).toEqual([])
    expect(filters).toEqual({ minBedrooms: 2, maxBedrooms: 2 })
  })

  it('widens rather than narrows when the model contradicts itself in one turn', () => {
    const filters: Record<string, unknown> = { minPrice: 800, maxPrice: 600 }
    const dropped = reconcileBounds(filters, ['minPrice', 'maxPrice'])
    expect(dropped).toEqual(['maxPrice'])
    expect(filters).toEqual({ minPrice: 800 })
  })

  it('reconciles each pair independently', () => {
    const filters: Record<string, unknown> = {
      minPrice: 800, maxPrice: 600,
      minSize: 50, maxSize: 100,
    }
    reconcileBounds(filters, ['minPrice'])
    expect(filters).toEqual({ minPrice: 800, minSize: 50, maxSize: 100 })
  })

  it('handles numeric strings', () => {
    const filters: Record<string, unknown> = { minPrice: '800', maxPrice: '600' }
    expect(reconcileBounds(filters, ['minPrice'])).toEqual(['maxPrice'])
  })
})

describe('bound field helpers', () => {
  it('pairs each bound with its opposite', () => {
    expect(oppositeBound('minPrice')).toBe('maxPrice')
    expect(oppositeBound('maxBedrooms')).toBe('minBedrooms')
    expect(oppositeBound('city')).toBeUndefined()
  })

  it('knows which side of a range a field is', () => {
    expect(isMinBound('minSize')).toBe(true)
    expect(isMinBound('maxSize')).toBe(false)
  })

  it('covers every quantitative filter the chat can set', () => {
    for (const field of ['minPrice', 'maxPrice', 'minBedrooms', 'maxBathrooms', 'minSize', 'maxFloor', 'minYearBuilt']) {
      expect(BOUND_FIELDS.has(field)).toBe(true)
    }
  })
})

describe('buildFilterChips', () => {
  it('renders each bound as its own removable chip', () => {
    const chips = buildFilterChips({ minPrice: 400, maxPrice: 600 }, false)
    expect(chips.map(c => c.label)).toEqual(['≥ €400', '≤ €600'])
    expect(chips.map(c => c.fields)).toEqual([['minPrice'], ['maxPrice']])
  })

  it('labels bedrooms and size with their units', () => {
    const chips = buildFilterChips({ minBedrooms: 2, minSize: 80 }, false)
    expect(chips.map(c => c.label)).toEqual(['≥ 2 bed', '≥ 80 m²'])
  })

  it('translates to Greek', () => {
    const chips = buildFilterChips({ maxPrice: 600, minBedrooms: 2, Metro: 'Essential' }, true)
    expect(chips.map(c => c.label)).toEqual(['≤ 600€', '≥ 2 υ/δ', 'Μετρό: απαραίτητο'])
  })

  it('puts location first', () => {
    const chips = buildFilterChips({ maxPrice: 600, city: 'Athens' }, false)
    expect(chips[0].label).toBe('Athens')
  })

  it('never shows fields the UI itself owns', () => {
    const chips = buildFilterChips({ listingType: 'rent', confidence: 0.9, hasLocationPreference: true }, false)
    expect(chips).toEqual([])
  })

  it('skips unset and "Not mentioned" soft criteria', () => {
    const chips = buildFilterChips({ Metro: 'Not mentioned', vibePreference: null }, false)
    expect(chips).toEqual([])
  })

  it('groups parking with its soft-preference flag so removal is complete', () => {
    const chips = buildFilterChips({ parking: true, parkingSoftPreference: true }, false)
    expect(chips).toHaveLength(1)
    expect(chips[0].fields).toEqual(['parking', 'parkingSoftPreference'])
  })

  it('returns nothing for empty input', () => {
    expect(buildFilterChips(null, false)).toEqual([])
    expect(buildFilterChips({}, false)).toEqual([])
  })
})

describe('removeChipFields / clearableFields', () => {
  it('removes without mutating the original', () => {
    const filters = { minPrice: 400, maxPrice: 600 }
    const next = removeChipFields(filters, ['maxPrice'])
    expect(next).toEqual({ minPrice: 400 })
    expect(filters).toEqual({ minPrice: 400, maxPrice: 600 })
  })

  it('keeps the rent/buy mode when clearing everything', () => {
    const filters = { listingType: 'rent', city: 'Athens', maxPrice: 600 }
    const cleared = removeChipFields(filters, clearableFields(filters))
    expect(cleared).toEqual({ listingType: 'rent' })
  })
})
