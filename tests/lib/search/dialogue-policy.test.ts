import { describe, expect, it } from 'vitest'
import {
  SLOTS,
  selectNextQuestion,
  isSlotKnown,
  criteriaCoverage,
  knownSlotIds,
} from '@/lib/search/dialogue-policy'
import { buildQuestion, closingLine } from '@/lib/search/question-templates'

const slot = (id: string) => SLOTS.find(s => s.id === id)!

describe('isSlotKnown', () => {
  it('treats a real value as known', () => {
    expect(isSlotKnown(slot('location'), { city: 'Athens' })).toBe(true)
    expect(isSlotKnown(slot('price'), { maxPrice: 600 })).toBe(true)
  })

  it('treats an unanswered slot as unknown', () => {
    expect(isSlotKnown(slot('price'), {})).toBe(false)
    expect(isSlotKnown(slot('price'), { maxPrice: null })).toBe(false)
  })

  it('does not count "Not mentioned" as an answer', () => {
    expect(isSlotKnown(slot('transit'), { Metro: 'Not mentioned' })).toBe(false)
    expect(isSlotKnown(slot('transit'), { Metro: 'Essential' })).toBe(true)
  })

  it('does not count an empty list as an answer', () => {
    expect(isSlotKnown(slot('location'), { preferredAreas: [] })).toBe(false)
    expect(isSlotKnown(slot('location'), { preferredAreas: ['Kolonaki'] })).toBe(true)
  })

  it('counts any one of the slot fields', () => {
    // "at most 3 bedrooms" answers the bedrooms slot just as well as a minimum does.
    expect(isSlotKnown(slot('bedrooms'), { maxBedrooms: 3 })).toBe(true)
  })
})

describe('selectNextQuestion', () => {
  it('keeps asking after the location is given, instead of going quiet', () => {
    // "I want a house in Athens" must not end the conversation — every criterion still
    // unknown is scored with a prior, which is what makes the percentages bunch together.
    const next = selectNextQuestion({ city: 'Athens' })
    expect(next.exhausted).toBe(false)
    expect(next.slots.length).toBeGreaterThan(0)
  })

  it('asks the highest-value unknown criteria first', () => {
    const next = selectNextQuestion({})
    expect(next.slots[0].id).toBe('location')
  })

  it('never re-asks something already answered', () => {
    const next = selectNextQuestion({ city: 'Athens', maxPrice: 600, minBedrooms: 2 })
    const ids = next.slots.map(s => s.id)
    expect(ids).not.toContain('location')
    expect(ids).not.toContain('price')
    expect(ids).not.toContain('bedrooms')
  })

  it('never re-asks a question the user declined to answer', () => {
    // The slot stays unknown, so without the asked-list the policy would loop on it.
    const next = selectNextQuestion({ city: 'Athens' }, ['price', 'bedrooms'])
    const ids = next.slots.map(s => s.id)
    expect(ids).not.toContain('price')
    expect(ids).not.toContain('bedrooms')
  })

  it('prefers scoring components over hard filters that only narrow the list', () => {
    // With location, price and bedrooms known, what is left that actually separates homes
    // is proximity and neighbourhood character — not the year the building went up.
    const next = selectNextQuestion({ city: 'Athens', maxPrice: 600, minBedrooms: 2 })
    expect(next.slots[0].kind).toBe('component')
    expect(next.slots.map(s => s.id)).not.toContain('building')
  })

  it('writes pendingNumeric itself rather than trusting the model to report it', () => {
    const next = selectNextQuestion({ city: 'Athens' })
    expect(next.pendingNumeric).toContain('maxPrice')
  })

  it('emits no bound for a non-numeric question', () => {
    const next = selectNextQuestion(
      { city: 'Athens', maxPrice: 600, minBedrooms: 2 },
      []
    )
    // transit/vibe carry no numeric bound
    expect(next.pendingNumeric).toEqual([])
  })

  it('asks at most two things at once', () => {
    expect(selectNextQuestion({}).slots.length).toBeLessThanOrEqual(2)
  })

  it('reports exhaustion only when every slot is settled', () => {
    const allAsked = SLOTS.map(s => s.id)
    expect(selectNextQuestion({}, allAsked).exhausted).toBe(true)
  })
})

describe('criteriaCoverage', () => {
  it('is zero when nothing that separates homes is known', () => {
    expect(criteriaCoverage({})).toBe(0)
  })

  it('does not credit hard filters that only shrink the list', () => {
    // City and budget narrow the candidates but do nothing to rank what remains, so the
    // percentages are still resting on priors and the meter must say so.
    expect(criteriaCoverage({ city: 'Athens', maxPrice: 600, minBedrooms: 2 })).toBe(0)
  })

  it('rises as scoring components are answered', () => {
    const some = criteriaCoverage({ Metro: 'Essential' })
    const more = criteriaCoverage({ Metro: 'Essential', vibePreference: 'quiet', Safety: 'Strong' })
    expect(some).toBeGreaterThan(0)
    expect(more).toBeGreaterThan(some)
    expect(more).toBeLessThanOrEqual(1)
  })

  it('reaches 1 once every component slot is answered', () => {
    const filters: Record<string, unknown> = {}
    for (const s of SLOTS.filter(s => s.kind === 'component')) filters[s.fields[0]] = 'Essential'
    expect(criteriaCoverage(filters)).toBeCloseTo(1, 6)
  })
})

describe('knownSlotIds', () => {
  it('lists what the filters already answer', () => {
    expect(knownSlotIds({ city: 'Athens', maxPrice: 600 })).toEqual(['location', 'price'])
  })
})

describe('buildQuestion', () => {
  it('names the bound so a bare number is unambiguous', () => {
    expect(buildQuestion([slot('price')], false)).toContain('the most')
    expect(buildQuestion([slot('bedrooms')], false)).toContain('fewest')
  })

  it('joins two slots into one sentence rather than a list', () => {
    const q = buildQuestion([slot('bedrooms'), slot('price')], false)
    expect(q).toContain(', and ')
    expect(q.match(/\?/g)?.length).toBe(1)
  })

  it('translates', () => {
    expect(buildQuestion([slot('parking')], true)).toBe('Χρειάζεστε θέση στάθμευσης;')
  })

  it('returns empty for no slots', () => {
    expect(buildQuestion([], false)).toBe('')
  })

  it('has text for every slot the policy can select', () => {
    for (const s of SLOTS) {
      expect(buildQuestion([s], false).length).toBeGreaterThan(0)
      expect(buildQuestion([s], true).length).toBeGreaterThan(0)
    }
  })
})

describe('closingLine', () => {
  it('says the assistant has what it needs, in both languages', () => {
    expect(closingLine(false).length).toBeGreaterThan(0)
    expect(closingLine(true)).toContain('αποτελέσματα')
  })
})
