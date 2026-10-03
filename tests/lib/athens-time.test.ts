import { describe, expect, it } from 'vitest'
import { athensDate, athensDayRange, athensHour } from '@/lib/athens-time'

describe('Athens time', () => {
  it('uses Athens, not UTC, for the date and hour', () => {
    // 22:30 UTC on 1 Oct = 01:30 on 2 Oct in Athens (UTC+3, summer time)
    const d = new Date('2026-10-01T22:30:00Z')
    expect(athensDate(d)).toBe('2026-10-02')
    expect(athensHour(d)).toBe(1)
  })

  it('day range follows the summer/winter offset', () => {
    const summer = athensDayRange(new Date('2026-07-15T12:00:00Z'))
    expect(summer.start.toISOString()).toBe('2026-07-14T21:00:00.000Z') // UTC+3
    expect(summer.end.toISOString()).toBe('2026-07-15T21:00:00.000Z')
    const winter = athensDayRange(new Date('2026-01-15T12:00:00Z'))
    expect(winter.start.toISOString()).toBe('2026-01-14T22:00:00.000Z') // UTC+2
  })

  it('handles the DST change day (25 h day in October)', () => {
    const r = athensDayRange(new Date('2026-10-25T12:00:00Z'))
    expect((r.end.getTime() - r.start.getTime()) / 3600000).toBe(25)
  })
})
