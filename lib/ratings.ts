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
    : null // Return null when no ratings exist

  const renterAvg = renterRatings.length > 0
    ? renterRatings.reduce((sum, r) => sum + r.score, 0) / renterRatings.length
    : null // Return null when no ratings exist

  return {
    ownerRating: ownerAvg !== null ? Number(ownerAvg.toFixed(1)) : null,
    ownerCount: ownerRatings.length,
    renterRating: renterAvg !== null ? Number(renterAvg.toFixed(1)) : null,
    renterCount: renterRatings.length,
  }
}

// Calculate house owner ratings for a specific home
// This is used for broker-owned homes where ratings are associated with the house, not the broker
export async function getHouseOwnerRatings(homeId: number) {
  // Get all finalized inquiries for this home
  const finalizedInquiries = await prisma.inquiry.findMany({
    where: {
      homeId: homeId,
      finalized: true,
    },
    select: {
      id: true,
      userId: true,
      home: {
        select: {
          ownerId: true,
        },
      },
    },
  })  // Get all ratings from users to owner for this home
  const houseOwnerRatings = []
  for (const inquiry of finalizedInquiries) {
    const ratings = await prisma.rating.findMany({
      where: {
        raterId: inquiry.userId,
        ratedUserId: inquiry.home.ownerId,
        type: 'owner',
      },
    })
    houseOwnerRatings.push(...ratings)
  }

  const avg = houseOwnerRatings.length > 0
    ? houseOwnerRatings.reduce((sum, r) => sum + r.score, 0) / houseOwnerRatings.length
    : null

  return {
    houseOwnerRating: avg !== null ? Number(avg.toFixed(1)) : null,
    houseOwnerCount: houseOwnerRatings.length,
  }
}
