import { prisma } from './prisma'

// Score shapes per rating type (see schema comments for reference)
type ViewingBrokerScores = { punctual: number; helpful: number; listingMatch: number }
type MoveinHouseScores   = { accuracy: number; condition: number; handover: number }
type MoveoutHouseScores  = { overallCondition: number; recommend: number; ownerFair: number; moveoutHandling: number }

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null
  return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1))
}

function scoresAvg(scores: Record<string, number>): number {
  const vals = Object.values(scores)
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

// Tenant/broker user score: average of all viewing_tenant + moveout_tenant ratings received
export async function getUserScore(userId: number) {
  const ratings = await prisma.rating.findMany({
    where: {
      ratedUserId: userId,
      type: { in: ['viewing_tenant', 'moveout_tenant'] },
    },
    include: { rater: { select: { id: true, name: true } } },
  })

  if (ratings.length === 0) return { score: null, count: 0, ratings: [] }

  const scorePerRating = ratings.map(r => scoresAvg(r.scores as Record<string, number>))
  return {
    score: avg(scorePerRating),
    count: ratings.length,
    ratings,
  }
}

// Broker score: average of all viewing_broker ratings received by this user
export async function getBrokerScore(userId: number) {
  const ratings = await prisma.rating.findMany({
    where: { ratedUserId: userId, type: 'viewing_broker' },
    include: { rater: { select: { id: true, name: true } } },
  })

  if (ratings.length === 0) return { score: null, count: 0, ratings: [] }

  const scorePerRating = ratings.map(r => {
    const s = r.scores as ViewingBrokerScores
    return avg([s.punctual, s.helpful, s.listingMatch])!
  })
  return {
    score: avg(scorePerRating),
    count: ratings.length,
    ratings,
  }
}

// House scores: house score + owner score computed from movein_house + moveout_house ratings
export async function getHomeRatingScores(homeId: number) {
  const ratings = await prisma.rating.findMany({
    where: {
      ratedHomeId: homeId,
      type: { in: ['movein_house', 'moveout_house'] },
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
    houseScore: avg(houseScores),
    ownerScore: avg(ownerScores),
    combinedScore: avg([...houseScores, ...ownerScores]),
    totalRatings: ratings.length,
    reviews: reviewsWithComments,
  }
}

// Owner score breakdown: per-dimension averages + reviews, for the owner ratings page
export async function getOwnerRatingDetails(homeId: number) {
  const ratings = await prisma.rating.findMany({
    where: {
      ratedHomeId: homeId,
      type: { in: ['movein_house', 'moveout_house'] },
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
    ownerScore: avg(ownerScores),
    dimensions: {
      handover: avg(handoverScores),
      ownerFair: avg(ownerFairScores),
      moveoutHandling: avg(moveoutHandlingScores),
    },
    totalRatings: ratings.length,
    reviews,
  }
}

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

// Check whether a user has already submitted a specific rating type for a finalization
export async function hasRatedFinalization(raterId: number, finalizationId: number, type: string) {
  const existing = await prisma.rating.findFirst({
    where: { raterId, finalizationId, type },
  })
  return !!existing
}

// Check whether a user has already submitted a viewing rating for a booking
export async function hasRatedBooking(raterId: number, bookingId: number, type: string) {
  const existing = await prisma.rating.findFirst({
    where: { raterId, bookingId, type },
  })
  return !!existing
}

// Legacy helper kept for any existing callers
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
