import { describe, expect, it } from 'vitest'
import { calculateVibeScore, VIBE_MISMATCH } from '@/lib/search/scoring'

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

  it('secondary-only match scores below a primary match but well above a mismatch', () => {
    // "family-friendly" maps to family(p1) + suburban(p2) + urban(p3)
    const secondary = calculateVibeScore('family-friendly', ['Suburban'])
    expect(secondary).toBe(80)
    expect(secondary).toBeLessThan(calculateVibeScore('family-friendly', ['Family']))
    expect(secondary).toBeGreaterThan(VIBE_MISMATCH)
  })

  it('a known mismatch scores below an area with no vibe data', () => {
    // A beach-lover's inland listing used to score 50 — above "unknown" (40).
    expect(calculateVibeScore('beach', ['Urban'])).toBe(VIBE_MISMATCH)
    expect(VIBE_MISMATCH).toBeLessThan(calculateVibeScore('beach', []))
  })

  it('matches the "family-friendly" label the area data actually uses', () => {
    expect(calculateVibeScore('family-friendly', ['family-friendly'])).toBe(100)
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
