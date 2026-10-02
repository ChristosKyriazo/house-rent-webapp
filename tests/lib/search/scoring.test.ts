import { describe, expect, it } from 'vitest'
import {
  calculateDistanceScore,
  calculateVibeScore,
  calculateSafetyScore,
  calculateParkingScore,
} from '@/lib/search/scoring'

describe('calculateDistanceScore', () => {
  it('returns 0 for null distance', () => {
    expect(calculateDistanceScore(null, 'Essential')).toBe(0)
  })

  it('returns 0 for Not important regardless of distance', () => {
    expect(calculateDistanceScore(5, 'Not important')).toBe(0)
    expect(calculateDistanceScore(5, 'Not mentioned')).toBe(0)
    expect(calculateDistanceScore(5, null)).toBe(0)
  })

  it('Essential: 0km → ~60pts', () => {
    expect(calculateDistanceScore(0, 'Essential')).toBeCloseTo(60, 0)
  })

  it('Essential: 0.5km → 50pts', () => {
    expect(calculateDistanceScore(0.5, 'Essential')).toBeCloseTo(50, 0)
  })

  it('Essential: 1km → 40pts', () => {
    expect(calculateDistanceScore(1.0, 'Essential')).toBeCloseTo(40, 0)
  })

  it('Essential: 10km → ~0pts', () => {
    expect(calculateDistanceScore(10, 'Essential')).toBeCloseTo(0, 0)
  })

  it('Essential: >10km → negative', () => {
    expect(calculateDistanceScore(15, 'Essential')).toBeLessThan(0)
  })

  it('Strong: 0km → ~40pts', () => {
    expect(calculateDistanceScore(0, 'Strong')).toBeCloseTo(40, 0)
  })

  it('Avoid: ≤2km → -30 (graduated penalty)', () => {
    expect(calculateDistanceScore(1, 'Avoid')).toBe(-30)
  })

  it('Avoid: 3-5km → -15', () => {
    expect(calculateDistanceScore(4, 'Avoid')).toBe(-15)
  })

  it('Avoid: 5-10km → +5', () => {
    expect(calculateDistanceScore(7, 'Avoid')).toBe(5)
  })

  it('Avoid: >10km → +20 (reward for being far)', () => {
    expect(calculateDistanceScore(15, 'Avoid')).toBe(20)
  })
})

describe('calculateVibeScore', () => {
  it('returns 50 for no preference', () => {
    expect(calculateVibeScore(null, ['Urban'])).toBe(50)
    expect(calculateVibeScore('', ['Urban'])).toBe(50)
  })

  it('returns 40 when property has no vibes', () => {
    expect(calculateVibeScore('urban', [])).toBe(40)
  })

  it('primary vibe match → high score (≥75)', () => {
    const score = calculateVibeScore('beach', ['Waterfront', 'Urban'])
    expect(score).toBeGreaterThanOrEqual(75)
  })

  it('secondary-only match → reasonable score (≥50 and <80)', () => {
    // "family-friendly" maps to family(p1) + suburban(p2) + urban(p3)
    // Only suburban matches → should be reasonably scored, not 33%
    const score = calculateVibeScore('family-friendly', ['Suburban'])
    expect(score).toBeGreaterThanOrEqual(50)
    expect(score).toBeLessThan(80)
  })

  it('all vibes match → 100', () => {
    // "urban" maps to urban(p1) + central(p2); both present
    const score = calculateVibeScore('urban', ['Urban', 'Central'])
    expect(score).toBeCloseTo(100, 0)
  })

  it('fuzzy matches partial vibe name', () => {
    const score = calculateVibeScore('waterfront', ['Waterfront'])
    expect(score).toBeGreaterThan(50)
  })

  it('returns 50 for completely unrecognised vibe with no fuzzy match', () => {
    expect(calculateVibeScore('xyzabc123', ['Urban'])).toBe(50)
  })

  it('is case-insensitive', () => {
    const lower = calculateVibeScore('beach', ['waterfront'])
    const upper = calculateVibeScore('BEACH', ['WATERFRONT'])
    expect(lower).toBe(upper)
  })
})

describe('calculateSafetyScore', () => {
  it('returns 0 for null safety', () => {
    expect(calculateSafetyScore(null, 'Essential')).toBe(0)
  })

  it('returns 0 for Not important category', () => {
    expect(calculateSafetyScore(8, 'Not important')).toBe(0)
    expect(calculateSafetyScore(8, null)).toBe(0)
  })

  it('Essential: safety 9.5 → ~60pts', () => {
    expect(calculateSafetyScore(9.5, 'Essential')).toBeCloseTo(60, 0)
  })

  it('Essential: safety 9.0 → ~50pts', () => {
    expect(calculateSafetyScore(9.0, 'Essential')).toBeCloseTo(50, 0)
  })

  it('Essential: safety <6 → negative', () => {
    expect(calculateSafetyScore(5, 'Essential')).toBeLessThan(0)
  })

  it('Strong: safety 9+ → ~35-40pts', () => {
    const score = calculateSafetyScore(9.5, 'Strong')
    expect(score).toBeGreaterThanOrEqual(35)
    expect(score).toBeLessThanOrEqual(40)
  })
})

describe('calculateParkingScore', () => {
  it('returns 0 when not a soft preference', () => {
    expect(calculateParkingScore(true, false)).toBe(0)
    expect(calculateParkingScore(false, false)).toBe(0)
  })

  it('returns +30 when soft preference and parking available', () => {
    expect(calculateParkingScore(true, true)).toBe(30)
  })

  it('returns -15 when soft preference and no parking', () => {
    expect(calculateParkingScore(false, true)).toBe(-15)
  })

  it('returns -5 when soft preference and parking unknown', () => {
    expect(calculateParkingScore(null, true)).toBe(-5)
  })
})
