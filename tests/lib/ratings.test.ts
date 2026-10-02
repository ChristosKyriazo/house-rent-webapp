import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    rating: { findMany: vi.fn(), findFirst: vi.fn() },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return { mockPrisma }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

function rating(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    type: 'viewing_tenant',
    scores: { punctual: 5, communication: 5 },
    comment: null,
    createdAt: new Date(),
    rater: { id: 99, name: 'Rater' },
    ...overrides,
  }
}

describe('ratings — Bayesian scoring', () => {
  beforeEach(() => vi.clearAllMocks())

  it('pulls a single 1★ revenge rating toward the prior instead of tanking the score', async () => {
    // One all-1s rating: (C*m + 1) / (C + 1) = (10*3.5 + 1) / 11 = 3.27 → 3.3
    mockPrisma.rating.findMany.mockResolvedValue([
      rating({ scores: { punctual: 1, communication: 1 } }),
    ])

    const { getUserScore } = await import('@/lib/ratings')
    const result = await getUserScore(42)

    expect(result.count).toBe(1)
    expect(result.score).toBe(3.3)
    expect(result.score).toBeGreaterThan(3)
  })

  it('converges toward the true average as sample size grows', async () => {
    // Twenty all-5s ratings: (35 + 100) / 30 = 4.5
    mockPrisma.rating.findMany.mockResolvedValue(
      Array.from({ length: 20 }, (_, i) =>
        rating({ id: i + 1, scores: { punctual: 5, communication: 5 } })
      )
    )

    const { getUserScore } = await import('@/lib/ratings')
    const result = await getUserScore(42)

    expect(result.count).toBe(20)
    expect(result.score).toBe(4.5)
  })

  it('returns null score and zero count when there are no ratings', async () => {
    mockPrisma.rating.findMany.mockResolvedValue([])

    const { getUserScore } = await import('@/lib/ratings')
    const result = await getUserScore(42)

    expect(result.score).toBeNull()
    expect(result.count).toBe(0)
    expect(result.ratings).toEqual([])
  })

  it('queries only revealed ratings (mutual-blind revealAt gate)', async () => {
    mockPrisma.rating.findMany.mockResolvedValue([])

    const { getUserScore } = await import('@/lib/ratings')
    await getUserScore(42)

    const where = mockPrisma.rating.findMany.mock.calls[0][0].where
    expect(where.OR).toEqual([
      { revealAt: null },
      { revealAt: { lte: expect.any(Date) } },
    ])
    // The lte bound must be "now", not a future date — otherwise unrevealed
    // ratings would leak before the blind window closes
    const lteDate = where.OR[1].revealAt.lte as Date
    expect(lteDate.getTime()).toBeLessThanOrEqual(Date.now() + 1000)
  })

  it('applies the reveal gate to home rating queries too', async () => {
    mockPrisma.rating.findMany.mockResolvedValue([])

    const { getHomeRatingScores } = await import('@/lib/ratings')
    await getHomeRatingScores(7)

    const where = mockPrisma.rating.findMany.mock.calls[0][0].where
    expect(where.OR).toEqual([
      { revealAt: null },
      { revealAt: { lte: expect.any(Date) } },
    ])
  })

  it('computes house/owner scores from movein and moveout dimension groups', async () => {
    mockPrisma.rating.findMany.mockResolvedValue([
      rating({
        type: 'movein_house',
        scores: { accuracy: 4, condition: 4, handover: 5 },
        finalization: { id: 1, moveInDate: new Date(), moveOutDate: null },
      }),
    ])

    const { getHomeRatingScores } = await import('@/lib/ratings')
    const result = await getHomeRatingScores(7)

    // houseScore: avg(4,4)=4 → (35+4)/11 = 3.5454 → 3.5
    // ownerScore: handover=5 → (35+5)/11 = 3.6363 → 3.6
    expect(result.houseScore).toBe(3.5)
    expect(result.ownerScore).toBe(3.6)
    expect(result.totalRatings).toBe(1)
  })
})

describe('ratings — batch scoring', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns an empty map for an empty input without querying', async () => {
    const { getBatchUserRatings } = await import('@/lib/ratings')
    const result = await getBatchUserRatings([])

    expect(result.size).toBe(0)
    expect(mockPrisma.rating.findMany).not.toHaveBeenCalled()
  })

  it('separates tenant and broker scores per user and applies the Bayesian prior', async () => {
    mockPrisma.rating.findMany.mockResolvedValue([
      { ratedUserId: 1, type: 'viewing_tenant', scores: { a: 1, b: 1 } },
      { ratedUserId: 2, type: 'viewing_broker', scores: { punctual: 5, helpful: 5, listingMatch: 5 } },
    ])

    const { getBatchUserRatings } = await import('@/lib/ratings')
    const result = await getBatchUserRatings([1, 2, 3])

    expect(result.get(1)).toEqual({ userScore: 3.3, brokerScore: null })
    expect(result.get(2)).toEqual({ userScore: null, brokerScore: 3.6 })
    // User with no ratings still gets an entry with null scores
    expect(result.get(3)).toEqual({ userScore: null, brokerScore: null })
  })

  it('filters unrevealed ratings in the batch query', async () => {
    mockPrisma.rating.findMany.mockResolvedValue([])

    const { getBatchUserRatings } = await import('@/lib/ratings')
    await getBatchUserRatings([1])

    const where = mockPrisma.rating.findMany.mock.calls[0][0].where
    expect(where.OR).toEqual([
      { revealAt: null },
      { revealAt: { lte: expect.any(Date) } },
    ])
  })
})

describe('ratings — dedup guards', () => {
  beforeEach(() => vi.clearAllMocks())

  it('hasRatedFinalization returns true only when a matching rating exists', async () => {
    const { hasRatedFinalization } = await import('@/lib/ratings')

    mockPrisma.rating.findFirst.mockResolvedValue({ id: 1 })
    expect(await hasRatedFinalization(1, 2, 'movein_house')).toBe(true)

    mockPrisma.rating.findFirst.mockResolvedValue(null)
    expect(await hasRatedFinalization(1, 2, 'movein_house')).toBe(false)
  })
})
