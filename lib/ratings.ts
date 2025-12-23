import { prisma } from './prisma'

// Calculate average rating for a user as owner or renter
export async function getUserRatings(userId: number) {
  const ratings = await prisma.rating.findMany({
    where: { ratedUserId: userId },
  })

  const ownerRatings = ratings.filter(r => r.type === 'owner')
  const renterRatings = ratings.filter(r => r.type === 'renter')

  const ownerAvg = ownerRatings.length > 0
    ? ownerRatings.reduce((sum, r) => sum + r.score, 0) / ownerRatings.length
    : null

  const renterAvg = renterRatings.length > 0
    ? renterRatings.reduce((sum, r) => sum + r.score, 0) / renterRatings.length
    : null

  return {
    ownerRating: ownerAvg ? Number(ownerAvg.toFixed(1)) : null,
    ownerCount: ownerRatings.length,
    renterRating: renterAvg ? Number(renterAvg.toFixed(1)) : null,
    renterCount: renterRatings.length,
  }
}

