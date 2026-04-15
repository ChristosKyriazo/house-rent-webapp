import type { Prisma } from '@prisma/client'

interface ConflictCheckInput {
  tx: Prisma.TransactionClient
  userId: number
  ownerId: number
  startTime: Date
  endTime: Date
  excludeBookingId?: number
}

export async function findBookingConflicts({
  tx,
  userId,
  ownerId,
  startTime,
  endTime,
  excludeBookingId,
}: ConflictCheckInput) {
  const idExclusion = excludeBookingId ? { not: excludeBookingId } : undefined

  const [userConflictCount, ownerConflictCount] = await Promise.all([
    tx.booking.count({
      where: {
        userId,
        status: 'scheduled',
        ...(idExclusion ? { id: idExclusion } : {}),
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    }),
    tx.booking.count({
      where: {
        ownerId,
        status: 'scheduled',
        ...(idExclusion ? { id: idExclusion } : {}),
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    }),
  ])

  return {
    userHasConflict: userConflictCount > 0,
    ownerHasConflict: ownerConflictCount > 0,
  }
}
