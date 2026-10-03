import { describe, expect, it } from 'vitest'
import {
  scoreHome,
  rankScore,
  recencyBoost,
  normalizeDistance,
  normalizeSafety,
  normalizeVibe,
  normalizeParking,
  normalizeHeating,
  evidenceScoreOptions,
  HEATING_UNKNOWN,
  DESCRIPTION_PENALTY_MAX,
  COMPONENT_WEIGHTS,
  DESCRIPTION_BONUS_MAX,
  PHOTO_BONUS_MAX,
  expressedComponents,
  DISTANCE_UNKNOWN,
  VIBE_WEIGHT_LOCATION_PREFERENCE,
} from '@/lib/search/score-home'
import { semanticScore, SEM_CENTER, SEM_NEUTRAL } from '@/lib/search/calibration'

describe('semanticScore', () => {
  it('maps the calibration centre to 0.5', () => {
    expect(semanticScore(SEM_CENTER)).toBeCloseTo(0.5, 6)
  })

  it('stretches the live cosine band across most of 0..1', () => {
    // The whole point: raw cosine for query-vs-listing sits in ~0.2-0.5, and comparing that
    // to a user-facing percentage is what made saved AI searches never fire.
    expect(semanticScore(0.2)).toBeLessThan(0.2)
    expect(semanticScore(0.44)).toBeGreaterThan(0.85)
  })

  it('is monotonic', () => {
    expect(semanticScore(0.25)).toBeLessThan(semanticScore(0.35))
    expect(semanticScore(0.35)).toBeLessThan(semanticScore(0.45))
  })

  it('falls back to neutral for non-finite input', () => {
    expect(semanticScore(NaN)).toBe(SEM_NEUTRAL)
  })
})

describe('normalizeDistance', () => {
  it('is 1 at zero distance for a wanted amenity', () => {
    expect(normalizeDistance(0, 'Essential')).toBeCloseTo(1, 6)
  })

  it('decays with distance and decays faster when Essential than Strong', () => {
    expect(normalizeDistance(3, 'Essential')).toBeLessThan(normalizeDistance(1, 'Essential'))
    expect(normalizeDistance(3, 'Essential')).toBeLessThan(normalizeDistance(3, 'Strong'))
  })

  it('inverts for Avoid — further is better', () => {
    expect(normalizeDistance(10, 'Avoid')).toBeGreaterThan(normalizeDistance(1, 'Avoid'))
  })

  it('scores unknown distance below a real near hit but above a real far one', () => {
    // The old additive scoring returned 0 for "unknown" and -10 for "10km away", so listings
    // with missing geocoding systematically outranked known-distant ones.
    const near = normalizeDistance(0.5, 'Essential')
    const far = normalizeDistance(15, 'Essential')
    expect(normalizeDistance(null, 'Essential')).toBe(DISTANCE_UNKNOWN)
    expect(DISTANCE_UNKNOWN).toBeLessThan(near)
    expect(DISTANCE_UNKNOWN).toBeGreaterThan(far)
  })

  it('is neutral when the query did not ask about proximity', () => {
    expect(normalizeDistance(0.5, 'Not mentioned')).toBe(DISTANCE_UNKNOWN)
    expect(normalizeDistance(0.5, null)).toBe(DISTANCE_UNKNOWN)
  })
})

describe('component normalisers stay in [0,1]', () => {
  it('safety', () => {
    expect(normalizeSafety(10)).toBe(1)
    expect(normalizeSafety(5)).toBe(0)
    expect(normalizeSafety(2)).toBe(0)
    expect(normalizeSafety(null)).toBe(0.5)
  })

  it('vibe', () => {
    expect(normalizeVibe(100)).toBe(1)
    expect(normalizeVibe(50)).toBe(0.5)
  })

  it('parking ranks known-yes above unknown above known-no', () => {
    expect(normalizeParking(true)).toBeGreaterThan(normalizeParking(null))
    expect(normalizeParking(null)).toBeGreaterThan(normalizeParking(false))
  })

  it('heating: match beats unknown beats known mismatch, and is unexpressed when not asked', () => {
    const want = { heatingCategory: 'autonomous', heatingAgent: 'natural gas' }
    expect(normalizeHeating({ heatingCategory: 'autonomous', heatingAgent: 'natural gas' }, want)).toBe(1)
    expect(normalizeHeating({ heatingCategory: null, heatingAgent: null }, want)).toBe(HEATING_UNKNOWN)
    expect(normalizeHeating({ heatingCategory: 'central', heatingAgent: 'oil' }, want)).toBe(0)
    expect(normalizeHeating({ heatingCategory: 'autonomous', heatingAgent: 'oil' }, want)).toBe(0.5)
    expect(normalizeHeating({ heatingCategory: 'central' }, {})).toBeUndefined()
  })

  it('heating tolerates spelling variants of the same fuel', () => {
    expect(normalizeHeating({ heatingAgent: 'Natural Gas' }, { heatingAgent: 'gas' })).toBe(1)
  })
})

describe('evidenceScoreOptions', () => {
  const base = { requested: [], confirmed: [], contradicted: [], confirmedInPhotos: [], disqualifier: null }

  it('turns evidence into fractions of what was asked', () => {
    const opts = evidenceScoreOptions({
      ...base,
      requested: ['balcony', 'fireplace'],
      confirmed: ['balcony'],
      contradicted: ['fireplace'],
      confirmedInPhotos: ['balcony'],
    })
    expect(opts.descriptionBonus).toBe(0.5)
    expect(opts.photoBonus).toBe(0.5)
    expect(opts.penalty).toBeCloseTo(0.5 * DESCRIPTION_PENALTY_MAX, 6)
  })

  it('a disqualifier overrides everything', () => {
    expect(evidenceScoreOptions({ ...base, requested: ['balcony'], confirmed: ['balcony'], disqualifier: 'No pets allowed' }))
      .toEqual({ disqualified: true })
  })

  it('asks for nothing → adjusts nothing', () => {
    expect(evidenceScoreOptions(base)).toEqual({})
  })

  it('a contradicted feature lowers the fit but cannot zero a strong match on its own', () => {
    const strong = scoreHome({ semantic: 0.9, distance: 0.9 }, evidenceScoreOptions({
      ...base, requested: ['balcony'], contradicted: ['balcony'],
    }))
    expect(strong).toBeGreaterThan(55)
    expect(strong).toBeLessThan(scoreHome({ semantic: 0.9, distance: 0.9 }))
  })
})

describe('scoreHome', () => {
  it('is absolute — the same inputs give the same score regardless of context', () => {
    const components = { semantic: 0.8, distance: 0.6 }
    expect(scoreHome(components)).toBe(scoreHome(components))
  })

  it('renormalises over only the components the query expressed', () => {
    // A query that only asked about proximity should not be diluted by absent criteria.
    expect(scoreHome({ distance: 1 })).toBe(100)
    expect(scoreHome({ distance: 0 })).toBe(0)
  })

  it('weights semantic and distance as the two dominant signals', () => {
    expect(COMPONENT_WEIGHTS.semantic).toBeGreaterThan(COMPONENT_WEIGHTS.distance)
    expect(COMPONENT_WEIGHTS.distance).toBeGreaterThan(COMPONENT_WEIGHTS.vibe)
  })

  it('mixes components by weight', () => {
    // semantic 0.30 * 1 + distance 0.25 * 0 → 0.30 / 0.55
    expect(scoreHome({ semantic: 1, distance: 0 })).toBeCloseTo(54.5, 0)
  })

  it('locks a disqualified home to 0 whatever else it scores', () => {
    expect(scoreHome({ semantic: 1, distance: 1 }, { disqualified: true })).toBe(0)
  })

  it('keeps the denominator a function of the query, not of the listing', () => {
    // Description and photo evidence must never enter the mean. If they did, a listing
    // that happens to mention "balcony" would be scored over a different component set
    // than one that doesn't — and the saved-search matcher, which computes neither the
    // same way, would sit on a third scale. That is the bug that made the slider lie.
    const withEvidence = scoreHome({ semantic: 0.5, distance: 0.5 }, { descriptionBonus: 1, photoBonus: 1 })
    const withoutEvidence = scoreHome({ semantic: 0.5, distance: 0.5 })
    expect(withEvidence).toBeGreaterThan(withoutEvidence)
    // The lift is exactly the two bonus ceilings, not a change of scale.
    expect(withEvidence - withoutEvidence).toBeCloseTo((DESCRIPTION_BONUS_MAX + PHOTO_BONUS_MAX) * 100, 5)
  })

  it('never lets description evidence punish a listing that stays silent', () => {
    expect(scoreHome({ semantic: 0.5 }, { descriptionBonus: 0 })).toBe(scoreHome({ semantic: 0.5 }))
  })

  it('applies the area bonus and the description penalty to the aggregate', () => {
    const base = scoreHome({ semantic: 0.5 })
    expect(scoreHome({ semantic: 0.5 }, { areaBonus: 0.12 })).toBeGreaterThan(base)
    expect(scoreHome({ semantic: 0.5 }, { penalty: 0.3 })).toBeLessThan(base)
  })

  it('never leaves 0..100', () => {
    expect(scoreHome({ semantic: 1 }, { areaBonus: 5 })).toBe(100)
    expect(scoreHome({ semantic: 0 }, { penalty: 5 })).toBe(0)
  })

  it('honours a per-query weight override', () => {
    const components = { semantic: 0, vibe: 1 }
    const boosted = scoreHome(components, { weights: { vibe: VIBE_WEIGHT_LOCATION_PREFERENCE } })
    expect(boosted).toBeGreaterThan(scoreHome(components))
  })

  it('returns a neutral 50 when nothing was expressed', () => {
    expect(scoreHome({})).toBe(50)
  })

  it('ignores components that are not finite', () => {
    expect(scoreHome({ semantic: 0.5, distance: NaN })).toBe(scoreHome({ semantic: 0.5 }))
  })
})

describe('rankScore', () => {
  const day = 24 * 60 * 60 * 1000

  it('boosts fresh listings for ordering', () => {
    expect(recencyBoost(new Date(Date.now() - 1 * day))).toBe(15)
    expect(recencyBoost(new Date(Date.now() - 20 * day))).toBe(8)
    expect(recencyBoost(new Date(Date.now() - 45 * day))).toBe(3)
    expect(recencyBoost(new Date(Date.now() - 200 * day))).toBe(0)
  })

  it('keeps freshness out of the displayed fit', () => {
    // A mediocre-but-new listing may outrank an excellent-but-old one, but it must never
    // advertise a higher match percentage.
    const fresh = { fit: 60, createdAt: new Date(Date.now() - 1 * day) }
    const stale = { fit: 70, createdAt: new Date(Date.now() - 200 * day) }
    expect(rankScore(fresh.fit, fresh.createdAt)).toBeGreaterThan(rankScore(stale.fit, stale.createdAt))
    expect(fresh.fit).toBeLessThan(stale.fit)
  })
})

describe('expressedComponents', () => {
  it('always expresses semantic', () => {
    expect(expressedComponents({})).toEqual(['semantic'])
  })

  it('adds only what the query asked about', () => {
    expect(expressedComponents({ hasDistances: true, hasVibe: true }))
      .toEqual(['semantic', 'distance', 'vibe'])
  })

  it('gives search and matcher the same denominator for the same criteria', () => {
    // The two call sites derive their component set from one shared function precisely so
    // they cannot drift. A home scoring 87% in search must score 87% in the matcher, or
    // minMatchPercent is comparing two different scales again.
    const criteria = { hasDistances: true, hasSafety: true, hasVibe: true, hasParking: false }
    const components = { semantic: 0.5, distance: 0.9, safety: 0.7, vibe: 0.8 }
    const searchSide = expressedComponents(criteria)
    const matcherSide = expressedComponents(criteria)
    expect(searchSide).toEqual(matcherSide)
    expect(scoreHome(components)).toBe(scoreHome(components))
  })
})

describe('heating as a requirement', () => {
  it('known, different heating contradicts; unknown heating does not', async () => {
    const { contradictsHeating } = await import('@/lib/search/score-home')
    const want = { heatingCategory: 'autonomous' }
    expect(contradictsHeating({ heatingCategory: 'Central' }, want)).toBe(true)
    expect(contradictsHeating({ heatingCategory: 'Autonomous' }, want)).toBe(false)
    expect(contradictsHeating({ heatingCategory: null }, want)).toBe(false)
    expect(contradictsHeating({ heatingCategory: 'Central' }, {})).toBe(false)
  })

  it('understands the spellings the AI, the data and Greek users use', async () => {
    const { sameHeating } = await import('@/lib/search/score-home')
    expect(sameHeating('electricity', 'Power')).toBe(true)
    expect(sameHeating('heat pump', 'Power')).toBe(true)
    expect(sameHeating('Ρεύμα', 'Power')).toBe(true)
    expect(sameHeating('natural gas', 'Natural gas')).toBe(true)
    expect(sameHeating('φυσικό αέριο', 'Natural gas')).toBe(true)
    expect(sameHeating('αυτόνομη', 'Autonomous')).toBe(true)
    expect(sameHeating('oil', 'Natural gas')).toBe(false)
    expect(sameHeating('autonomous', 'Central')).toBe(false)
  })
})
