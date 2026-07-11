import { prisma } from '@/lib/prisma'
import type { Prisma, PrismaClient, User } from '@prisma/client'

/**
 * Broker hierarchy: "Main" (parent) and "Default" (standalone | child) brokers.
 *
 *  - Default-standalone: a broker with no parent, on their own subscription. (default on signup)
 *  - Default-child:      a broker invited under a Main broker; their tier mirrors the parent, who pays.
 *  - Main (parent):      a Pro broker who has invited >= 1 broker. Sees & manages all their children's data.
 *
 * The single DB fact separating Default from Main is `brokerCategory`; the fact separating
 * standalone from child is `parentBrokerId`.
 */

/** Max Default (child) brokers a single Main broker may have (pending invites count toward this). */
export const TEAM_MAX_CHILDREN = 10

/** One-off "boost" pricing — mirrors the €4.99 / 30-day boost in app/homes/my-listings. */
export const BOOST_AMOUNT_CENTS = 499
export const BOOST_DAYS = 30

/** Tier required to build a team (invite brokers). */
export const TEAM_REQUIRED_TIER = 'pro'

/** Days an invitation link stays valid. */
export const INVITE_TTL_DAYS = 14

type BrokerLike = Pick<User, 'role' | 'brokerCategory' | 'parentBrokerId'>

/** A Pro broker who has invited >= 1 broker. Sees/manages children. */
export function isMainBroker(u: BrokerLike): boolean {
  return u.role === 'broker' && u.brokerCategory === 'parent'
}

/** An invited broker sitting under a Main broker. Cannot pay directly; requests go to the parent. */
export function isChildBroker(u: BrokerLike): boolean {
  return u.brokerCategory === 'child' && u.parentBrokerId != null
}

/** Any broker that is not a Main broker (standalone or child). */
export function isDefaultBroker(u: BrokerLike): boolean {
  return u.role === 'broker' && u.brokerCategory !== 'parent'
}

/** A broker with no team affiliation at all. */
export function isStandaloneBroker(u: BrokerLike): boolean {
  return u.role === 'broker' && u.brokerCategory === 'standalone' && u.parentBrokerId == null
}

export async function getChildCount(parentId: number): Promise<number> {
  return prisma.user.count({ where: { parentBrokerId: parentId, brokerCategory: 'child' } })
}

export async function getPendingInviteCount(parentId: number): Promise<number> {
  return prisma.teamInvitation.count({ where: { inviterUserId: parentId, status: 'pending' } })
}

/** Whether a Main broker has room for one more member (existing children + pending invites < cap). */
export async function hasTeamCapacity(parentId: number): Promise<boolean> {
  const [children, pending] = await Promise.all([getChildCount(parentId), getPendingInviteCount(parentId)])
  return children + pending < TEAM_MAX_CHILDREN
}

type Tx = Prisma.TransactionClient | PrismaClient

/**
 * Promote a broker to "parent" (Main). Done when the FIRST invite is *sent* so the
 * My Team surface exists immediately. Idempotent.
 */
export async function promoteToParent(userId: number, tx: Tx = prisma): Promise<void> {
  await tx.user.update({
    where: { id: userId },
    data: { brokerCategory: 'parent' },
  })
}

/**
 * Attach an accepted invitee as a Default (child) broker under a Main broker.
 * Sets role=broker, mirrors the parent's tier, and clears any standalone state.
 * The caller is responsible for cancelling the invitee's own Stripe subscription first.
 */
export async function attachChildBroker(
  childId: number,
  parentId: number,
  parentTier: string,
  tx: Tx = prisma
): Promise<void> {
  await tx.user.update({
    where: { id: childId },
    data: {
      role: 'broker',
      brokerCategory: 'child',
      parentBrokerId: parentId,
      subscriptionTier: parentTier,
    },
  })
}

/**
 * Remove a Default (child) broker from their Main broker's team (leave or eject).
 *
 * Per product decision: the departing broker's LISTINGS transfer to the Main broker as
 * their own (Home.ownerId reassigned; owner-side Bookings follow; Inquiries follow via
 * home.ownerId; personal ratings stay with the departing broker). The child then reverts
 * to a standalone free broker.
 *
 * Returns the former parent's id so the caller can sync/re-evaluate, or null if the user
 * was not actually a child.
 */
export async function detachChildBroker(childId: number): Promise<number | null> {
  return prisma.$transaction(async (tx) => {
    const child = await tx.user.findUnique({
      where: { id: childId },
      select: { parentBrokerId: true, brokerCategory: true },
    })
    if (!child?.parentBrokerId || child.brokerCategory !== 'child') return null
    const parentId = child.parentBrokerId

    // Transfer listings + owner-side bookings up to the Main broker.
    await tx.home.updateMany({ where: { ownerId: childId }, data: { ownerId: parentId } })
    await tx.booking.updateMany({ where: { ownerId: childId }, data: { ownerId: parentId } })

    // Cancel any still-pending boost requests this child had in flight.
    await tx.boostRequest.updateMany({
      where: { requesterId: childId, status: 'pending' },
      data: { status: 'expired', decidedAt: new Date() },
    })

    // Revert the child to a standalone free broker.
    await tx.user.update({
      where: { id: childId },
      data: { brokerCategory: 'standalone', parentBrokerId: null, subscriptionTier: 'free' },
    })

    // If the parent no longer has any members or pending invites, drop them back to standalone.
    await revertParentIfEmpty(parentId, tx)

    return parentId
  })
}

/**
 * Cascade a Main broker's subscription tier onto all their Default (child) brokers.
 * Call whenever the parent's tier changes.
 */
export async function syncChildTiers(parentId: number, tier: string, tx: Tx = prisma): Promise<void> {
  await tx.user.updateMany({
    where: { parentBrokerId: parentId, brokerCategory: 'child' },
    data: { subscriptionTier: tier },
  })
}

/**
 * If a parent has no children and no pending invitations left, revert them to standalone
 * so they are never stranded in an empty-team "parent" state.
 */
export async function revertParentIfEmpty(parentId: number, tx: Tx = prisma): Promise<void> {
  const [children, pending] = await Promise.all([
    tx.user.count({ where: { parentBrokerId: parentId, brokerCategory: 'child' } }),
    tx.teamInvitation.count({ where: { inviterUserId: parentId, status: 'pending' } }),
  ])
  if (children === 0 && pending === 0) {
    await tx.user.update({ where: { id: parentId }, data: { brokerCategory: 'standalone' } })
  }
}

/** Apply a paid boost to a listing: set promotedUntil `days` into the future. Returns the expiry. */
export async function applyBoost(homeId: number, days: number, tx: Tx = prisma): Promise<Date> {
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  await tx.home.update({ where: { id: homeId }, data: { promotedUntil: until } })
  return until
}

/** Resolve the Main broker (parent) who pays for a given child, or null if not a child. */
export async function getPayingParent(childId: number): Promise<User | null> {
  const child = await prisma.user.findUnique({
    where: { id: childId },
    select: { parentBrokerId: true },
  })
  if (!child?.parentBrokerId) return null
  return prisma.user.findUnique({ where: { id: child.parentBrokerId } })
}
