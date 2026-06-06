import { describe, expect, it, vi } from 'vitest'
import { findBookingConflicts } from '@/lib/booking-conflicts'

function makeTx(userCount: number, ownerCount: number) {
  return {
    booking: {
      count: vi.fn()
        .mockResolvedValueOnce(userCount)
        .mockResolvedValueOnce(ownerCount),
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

const base = {
  userId: 1,
  ownerId: 2,
  startTime: new Date('2026-06-01T10:00:00Z'),
  endTime: new Date('2026-06-01T11:00:00Z'),
}

describe('findBookingConflicts', () => {
  it('returns no conflicts when both slots are free', async () => {
    const result = await findBookingConflicts({ tx: makeTx(0, 0), ...base })
    expect(result).toEqual({ userHasConflict: false, ownerHasConflict: false })
  })

  it('detects user conflict', async () => {
    const result = await findBookingConflicts({ tx: makeTx(1, 0), ...base })
    expect(result.userHasConflict).toBe(true)
    expect(result.ownerHasConflict).toBe(false)
  })

  it('detects owner conflict', async () => {
    const result = await findBookingConflicts({ tx: makeTx(0, 1), ...base })
    expect(result.userHasConflict).toBe(false)
    expect(result.ownerHasConflict).toBe(true)
  })

  it('detects both conflicts simultaneously', async () => {
    const result = await findBookingConflicts({ tx: makeTx(2, 3), ...base })
    expect(result.userHasConflict).toBe(true)
    expect(result.ownerHasConflict).toBe(true)
  })

  it('passes excludeBookingId as id: { not: ... } in both queries', async () => {
    const mockCount = vi.fn().mockResolvedValue(0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = { booking: { count: mockCount } } as any

    await findBookingConflicts({ tx, ...base, excludeBookingId: 99 })

    expect(mockCount).toHaveBeenCalledTimes(2)
    for (const call of mockCount.mock.calls) {
      expect(call[0].where).toMatchObject({ id: { not: 99 } })
    }
  })

  it('omits id filter when excludeBookingId is not provided', async () => {
    const mockCount = vi.fn().mockResolvedValue(0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = { booking: { count: mockCount } } as any

    await findBookingConflicts({ tx, ...base })

    for (const call of mockCount.mock.calls) {
      expect(call[0].where).not.toHaveProperty('id')
    }
  })

  it('queries with correct time overlap conditions', async () => {
    const mockCount = vi.fn().mockResolvedValue(0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = { booking: { count: mockCount } } as any

    await findBookingConflicts({ tx, ...base })

    for (const call of mockCount.mock.calls) {
      expect(call[0].where).toMatchObject({
        status: 'scheduled',
        startTime: { lt: base.endTime },
        endTime: { gt: base.startTime },
      })
    }
  })
})
