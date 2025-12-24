import { prisma } from './prisma'

// Calculate average rating for a user as owner or renter
// Returns default rating of 4.7 if no ratings exist (temporary until review system is implemented)
// Rating scale is 0-5
export async function getUserRatings(userId: number) {
  const ratings = await prisma.rating.findMany({
    where: { ratedUserId: userId },
  })

  const ownerRatings = ratings.filter(r => r.type === 'owner')
  const renterRatings = ratings.filter(r => r.type === 'renter')

  const ownerAvg = ownerRatings.length > 0
    ? ownerRatings.reduce((sum, r) => sum + r.score, 0) / ownerRatings.length
    : 4.7 // Default rating of 4.7 when no ratings exist

  const renterAvg = renterRatings.length > 0
    ? renterRatings.reduce((sum, r) => sum + r.score, 0) / renterRatings.length
    : 4.7 // Default rating of 4.7 when no ratings exist

  return {
    ownerRating: Number(ownerAvg.toFixed(1)),
    ownerCount: ownerRatings.length,
    renterRating: Number(renterAvg.toFixed(1)),
    renterCount: renterRatings.length,
  }
}

