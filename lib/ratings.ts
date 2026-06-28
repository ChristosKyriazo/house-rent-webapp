import { prisma } from './prisma'

// Score shapes per rating type (see schema comments for reference)
type ViewingBrokerScores = { punctual: number; helpful: number; listingMatch: number }
type MoveinHouseScores   = { accuracy: number; condition: number; handover: number }
type MoveoutHouseScores  = { overallCondition: number; recommend: number; ownerFair: number; moveoutHandling: number }

// ── Scoring helpers ───────────────────────────────────────────────────────────

// Bayesian average: pulls sparse samples toward the platform mean.
// C = confidence weight: how many ratings it takes before we fully trust the sample.
// m = prior: midpoint of the 1-5 scale.
// Effect: a single 1★ revenge rating on a new listing brings it to ~3.4, not 1.
const BAYES_C = 10
const BAYES_M = 3.5

function bayesianAvg(scores: number[]): number | null {
  if (scores.length === 0) return null
  const sum = scores.reduce((a, b) => a + b, 0)
  return Number(((BAYES_C * BAYES_M + sum) / (BAYES_C + scores.length)).toFixed(1))
}

// Raw average — used only for intra-rating dimension aggregation (not across ratings)
function avg(nums: number[]): number | null {
  if (nums.length === 0) return null
  return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1))
}

function scoresAvg(scores: Record<string, number>): number {
  const vals = Object.values(scores)
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

// Filter condition for public-facing queries: only include ratings that have been revealed
function revealedFilter() {
  const now = new Date()
  return { OR: [{ revealAt: null }, { revealAt: { lte: now } }] }
}

// ── Public score aggregations ─────────────────────────────────────────────────

// Tenant/broker user score: Bayesian average across all viewing_tenant + moveout_tenant ratings
export async function getUserScore(userId: number) {
  const ratings = await prisma.rating.findMany({
    where: {
      ratedUserId: userId,
      type: { in: ['viewing_tenant', 'moveout_tenant'] },
      ...revealedFilter(),
    },
    include: { rater: { select: { id: true, name: true } } },
  })

  if (ratings.length === 0) return { score: null, count: 0, ratings: [] }

  const scorePerRating = ratings.map(r => scoresAvg(r.scores as Record<string, number>))
  return {
    score: bayesianAvg(scorePerRating),
    count: ratings.length,
    ratings,
  }
}

// Broker score: Bayesian average across all viewing_broker ratings received by this user
export async function getBrokerScore(userId: number) {
  const ratings = await prisma.rating.findMany({
    where: {
      ratedUserId: userId,
      type: 'viewing_broker',
      ...revealedFilter(),
    },
    include: { rater: { select: { id: true, name: true } } },
  })

  if (ratings.length === 0) return { score: null, count: 0, ratings: [] }

  const scorePerRating = ratings.map(r => {
    const s = r.scores as ViewingBrokerScores
    return avg([s.punctual, s.helpful, s.listingMatch])!
  })
  return {
    score: bayesianAvg(scorePerRating),
    count: ratings.length,
    ratings,
  }
}

// House scores: Bayesian averages from movein_house + moveout_house ratings
export async function getHomeRatingScores(homeId: number) {
  const ratings = await prisma.rating.findMany({
    where: {
      ratedHomeId: homeId,
      type: { in: ['movein_house', 'moveout_house'] },
      ...revealedFilter(),
    },
    include: {
      rater: { select: { id: true, name: true } },
      finalization: { select: { id: true, moveInDate: true, moveOutDate: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const houseScores: number[] = []
  const ownerScores: number[] = []
  const reviewsWithComments: Array<{ comment: string; raterName: string | null; createdAt: Date; type: string }> = []

  for (const r of ratings) {
    if (r.type === 'movein_house') {
      const s = r.scores as MoveinHouseScores
      houseScores.push(avg([s.accuracy, s.condition])!)
      ownerScores.push(s.handover)
    } else if (r.type === 'moveout_house') {
      const s = r.scores as MoveoutHouseScores
      houseScores.push(avg([s.overallCondition, s.recommend])!)
      ownerScores.push(avg([s.ownerFair, s.moveoutHandling])!)
    }
    if (r.comment) {
      reviewsWithComments.push({
        comment: r.comment,
        raterName: r.rater.name,
        createdAt: r.createdAt,
        type: r.type,
      })
    }
  }

  return {
    houseScore: bayesianAvg(houseScores),
    ownerScore: bayesianAvg(ownerScores),
    combinedScore: bayesianAvg([...houseScores, ...ownerScores]),
    totalRatings: ratings.length,
    reviews: reviewsWithComments,
  }
}

// Owner score breakdown: per-dimension Bayesian averages + reviews, for the owner ratings page
export async function getOwnerRatingDetails(homeId: number) {
  const ratings = await prisma.rating.findMany({
    where: {
      ratedHomeId: homeId,
      type: { in: ['movein_house', 'moveout_house'] },
      ...revealedFilter(),
    },
    include: {
      rater: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const handoverScores: number[] = []
  const ownerFairScores: number[] = []
  const moveoutHandlingScores: number[] = []
  const ownerScores: number[] = []
  const reviews: Array<{ comment: string; raterName: string | null; createdAt: Date; type: string }> = []

  for (const r of ratings) {
    if (r.type === 'movein_house') {
      const s = r.scores as MoveinHouseScores
      handoverScores.push(s.handover)
      ownerScores.push(s.handover)
    } else if (r.type === 'moveout_house') {
      const s = r.scores as MoveoutHouseScores
      ownerFairScores.push(s.ownerFair)
      moveoutHandlingScores.push(s.moveoutHandling)
      ownerScores.push(avg([s.ownerFair, s.moveoutHandling])!)
    }
    if (r.comment) {
      reviews.push({ comment: r.comment, raterName: r.rater.name, createdAt: r.createdAt, type: r.type })
    }
  }

  return {
    ownerScore: bayesianAvg(ownerScores),
    dimensions: {
      handover: bayesianAvg(handoverScores),
      ownerFair: bayesianAvg(ownerFairScores),
      moveoutHandling: bayesianAvg(moveoutHandlingScores),
    },
    totalRatings: ratings.length,
    reviews,
  }
}

// ── Rater-facing queries (no revealAt filter — users always see their own submissions) ──

// All ratings submitted by a user (for their rating dashboard pages)
export async function getRatingsByRater(raterId: number, type: string) {
  return prisma.rating.findMany({
    where: { raterId, type },
    include: {
      ratedUser: { select: { id: true, name: true, email: true } },
      ratedHome: { select: { id: true, key: true, title: true, titleGreek: true, city: true, country: true } },
      finalization: { select: { id: true, moveInDate: true, moveOutDate: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ── Dedup guards ──────────────────────────────────────────────────────────────

export async function hasRatedFinalization(raterId: number, finalizationId: number, type: string) {
  const existing = await prisma.rating.findFirst({
    where: { raterId, finalizationId, type },
  })
  return !!existing
}

export async function hasRatedBooking(raterId: number, bookingId: number, type: string) {
  const existing = await prisma.rating.findFirst({
    where: { raterId, bookingId, type },
  })
  return !!existing
}

// ── Legacy helpers ────────────────────────────────────────────────────────────

export async function getUserRatings(userId: number) {
  const [userScore, brokerScore] = await Promise.all([
    getUserScore(userId),
    getBrokerScore(userId),
  ])
  return {
    userScore: userScore.score,
    userCount: userScore.count,
    brokerScore: brokerScore.score,
    brokerCount: brokerScore.count,
  }
}

// Batch version — single DB round-trip for a list of user IDs (avoids N+1)
export async function getBatchUserRatings(userIds: number[]): Promise<Map<number, { userScore: number | null; brokerScore: number | null }>> {
  if (userIds.length === 0) return new Map()

  const now = new Date()
  const ratings = await prisma.rating.findMany({
    where: {
      ratedUserId: { in: userIds },
      type: { in: ['viewing_tenant', 'moveout_tenant', 'viewing_broker'] },
      OR: [{ revealAt: null }, { revealAt: { lte: now } }],
    },
    select: { ratedUserId: true, type: true, scores: true },
  })

  const result = new Map<number, { userScore: number | null; brokerScore: number | null }>()

  const byUser = new Map<number, { tenant: number[]; broker: number[] }>()
  for (const r of ratings) {
    if (r.ratedUserId == null) continue
    if (!byUser.has(r.ratedUserId)) byUser.set(r.ratedUserId, { tenant: [], broker: [] })
    const entry = byUser.get(r.ratedUserId)!
    const s = r.scores as Record<string, number>
    const rowAvg = Object.values(s).reduce((a, b) => a + b, 0) / Object.values(s).length
    if (r.type === 'viewing_broker') {
      entry.broker.push(rowAvg)
    } else {
      entry.tenant.push(rowAvg)
    }
  }

  for (const uid of userIds) {
    const entry = byUser.get(uid)
    const tenantScores = entry?.tenant ?? []
    const brokerScores = entry?.broker ?? []
    result.set(uid, {
      userScore: bayesianAvg(tenantScores),
      brokerScore: bayesianAvg(brokerScores),
    })
  }

  return result
}
