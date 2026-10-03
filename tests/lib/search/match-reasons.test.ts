import { describe, expect, it } from 'vitest'
import { buildMatchReasons, reasonText, topReasons, FEATURE_LABELS, type MatchReason } from '@/lib/search/match-reasons'
import { COMPONENT_WEIGHTS, normalizeDistance } from '@/lib/search/score-home'
import { CONCEPTS } from '@/lib/search/listing-evidence'

const base = { weights: { ...COMPONENT_WEIGHTS } }

describe('buildMatchReasons', () => {
  it('turns the score components into reasons with the right tone', () => {
    const { reasons, breakdown } = buildMatchReasons({
      ...base,
      components: { semantic: 0.82, distance: normalizeDistance(0.35, 'Essential'), heating: 1, parking: 0 },
      distances: [{ amenity: 'Metro', km: 0.35, category: 'Essential', value: normalizeDistance(0.35, 'Essential') }],
      heatingWanted: 'autonomous',
      parkingHas: false,
      confirmedFeatures: ['balcony', 'airConditioning'],
      contradictedFeatures: ['elevator'],
      adjust: { descriptionBonus: 0.067, penalty: 0.083 },
    })
    const byCode = Object.fromEntries(reasons.map(r => [r.code, r]))
    expect(byCode.distance.tone).toBe('good')
    expect(byCode.heating.tone).toBe('good')
    expect(byCode.parking.tone).toBe('bad')
    expect(byCode.semantic.tone).toBe('good')
    expect(byCode.features.tone).toBe('good')
    expect(byCode.missingFeatures.tone).toBe('bad')
    // Shares of the weighted mean add up to 100%.
    expect(breakdown.parts.reduce((s, p) => s + p.share, 0)).toBeCloseTo(1, 6)
    expect(breakdown.adjustments).toEqual([
      { kind: 'features', points: 6.7 },
      { kind: 'contradicted', points: -8.3 },
    ])
  })

  it('an unknown distance is "partial", never claimed as good', () => {
    const { reasons } = buildMatchReasons({
      ...base,
      components: { semantic: 0.5, distance: 0.35 },
      distances: [{ amenity: 'Park', km: null, category: 'Essential', value: 0.35 }],
    })
    expect(reasons.find(r => r.code === 'distance')!.tone).toBe('partial')
  })

  it('only expressed components appear in the breakdown', () => {
    const { breakdown } = buildMatchReasons({ ...base, components: { semantic: 0.6 }, distances: [] })
    expect(breakdown.parts.map(p => p.part)).toEqual(['semantic'])
  })
})

describe('reasonText', () => {
  it('reads naturally in both languages', () => {
    const metro = { code: 'distance', tone: 'good', amenity: 'Metro', km: 0.35, avoid: false } as const
    expect(reasonText(metro, 'en')).toBe('350 m from the metro')
    expect(reasonText(metro, 'el')).toBe('350 μ. από το μετρό')
    expect(reasonText({ code: 'distance', tone: 'partial', amenity: 'School', km: 1.24, avoid: false }, 'en')).toBe('1.2 km from a school')
    expect(reasonText({ code: 'distance', tone: 'partial', amenity: 'School', km: 1.24, avoid: false }, 'el')).toBe('1,2 χλμ. από σχολείο')
    const feats: MatchReason = { code: 'features', tone: 'good', ids: ['balcony', 'airConditioning', 'petFriendly'] }
    expect(reasonText(feats, 'en')).toBe('Matches what you asked for: balcony, air conditioning and pets allowed')
    expect(reasonText({ code: 'features', tone: 'good', ids: ['quiet', 'balcony'] }, 'el')).toBe('Ταιριάζει σε όσα ζητήσατε: ήσυχο και μπαλκόνι')
    expect(reasonText({ code: 'vibe', tone: 'good', wanted: 'quiet' }, 'el')).toBe('Ήσυχη γειτονιά, όπως θέλατε')
    expect(reasonText({ code: 'vibe', tone: 'bad', wanted: 'waterfront' }, 'en')).toBe("The neighbourhood isn't seaside")
    expect(reasonText({ code: 'heating', tone: 'good', wanted: 'autonomous' }, 'el')).toBe('Έχει αυτόνομη θέρμανση')
  })

  it('has a label for every feature the evidence matcher can confirm', () => {
    for (const c of CONCEPTS) expect(FEATURE_LABELS[c.id], c.id).toBeDefined()
  })
})

describe('topReasons', () => {
  it('leads with positives and caps the count', () => {
    const r: MatchReason[] = [
      { code: 'parking', tone: 'bad', has: false },
      { code: 'semantic', tone: 'good' },
      { code: 'heating', tone: 'good', wanted: 'autonomous' },
      { code: 'safety', tone: 'partial', score: null },
    ]
    expect(topReasons(r, 2).map(x => x.code)).toEqual(['semantic', 'heating'])
  })
})
