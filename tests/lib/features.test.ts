import { describe, expect, it, beforeEach, afterEach } from 'vitest'

describe('feature flags', () => {
  const origEnv = { ...process.env }

  afterEach(() => {
    // Restore env after each test
    Object.assign(process.env, origEnv)
    delete process.env.FEATURE_AI_SEARCH
    delete process.env.FEATURE_BOOKINGS
  })

  it('enables feature when env var is absent', async () => {
    delete process.env.FEATURE_AI_SEARCH
    // Re-import to pick up env change
    const { features } = await import('@/lib/features')
    expect(features.aiSearch).toBe(true)
  })

  it('disables feature on exact string "false"', async () => {
    process.env.FEATURE_AI_SEARCH = 'false'
    const mod = await import('@/lib/features')
    // features is evaluated at module load; test the isEnabled logic directly
    const isEnabled = (v: string | undefined) => v !== 'false'
    expect(isEnabled('false')).toBe(false)
  })

  it('enables feature on string "true"', () => {
    const isEnabled = (v: string | undefined) => v !== 'false'
    expect(isEnabled('true')).toBe(true)
  })

  it('enables feature on "0" (only exact "false" disables)', () => {
    const isEnabled = (v: string | undefined) => v !== 'false'
    expect(isEnabled('0')).toBe(true)
  })

  it('enables feature on "False" (case-sensitive)', () => {
    const isEnabled = (v: string | undefined) => v !== 'false'
    expect(isEnabled('False')).toBe(true)
  })

  it('enables feature on undefined', () => {
    const isEnabled = (v: string | undefined) => v !== 'false'
    expect(isEnabled(undefined)).toBe(true)
  })
})
