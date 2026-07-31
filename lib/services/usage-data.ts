import { prisma } from '@/lib/prisma'
import { estimateAiSearchCost } from '@/lib/ai-logger'
import { monthlyLimitFor, getMonthlyReset } from '@/lib/ai-usage-limits'

// Scope-aware read helpers for the AI Usage Assistant. Every function takes an
// explicit `targetUserId` the CALLER has already authorized — scope enforcement
// lives in the assistant service's tool executors, not here. Returned objects
// are deliberately compact: they are fed back into the LLM as tool results, so
// smaller payloads mean fewer tokens and lower cost.

export interface UserUsage {
  userId: number
  email: string
  name: string | null
  tier: string
  monthlyUsed: number
  monthlyLimit: number
  monthlyRemaining: number
  packCredits: number
  lifetimeSearches: number
  monthlyResetAt: string | null
  viberAlertsActive: boolean
}

export async function getUserUsage(targetUserId: number): Promise<UserUsage | null> {
  const u = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      email: true,
      name: true,
      subscriptionTier: true,
      aiSearchCount: true,
      aiSearchMonthlyCount: true,
      aiSearchMonthlyResetAt: true,
      aiSearchPackCount: true,
      viberAlertsActive: true,
    },
  })
  if (!u) return null

  const limit = monthlyLimitFor(u.subscriptionTier)
  const { needsReset } = getMonthlyReset(u.aiSearchMonthlyResetAt)
  const used = needsReset ? 0 : u.aiSearchMonthlyCount

  return {
    userId: u.id,
    email: u.email,
    name: u.name,
    tier: u.subscriptionTier,
    monthlyUsed: used,
    monthlyLimit: limit,
    monthlyRemaining: Math.max(0, limit - used),
    packCredits: u.aiSearchPackCount,
    lifetimeSearches: u.aiSearchCount,
    monthlyResetAt: u.aiSearchMonthlyResetAt?.toISOString() ?? null,
    viberAlertsActive: u.viberAlertsActive,
  }
}

export interface SearchHistoryEntry {
  query: string
  homesFound: number
  createdAt: string
}

export async function getUserSearchHistory(
  targetUserId: number,
  limit = 10
): Promise<SearchHistoryEntry[]> {
  const capped = Math.min(Math.max(1, limit), 25)
  const rows = await prisma.aISearchLog.findMany({
    where: { userId: targetUserId },
    orderBy: { createdAt: 'desc' },
    take: capped,
    select: { userQuery: true, finalHomesCount: true, createdAt: true },
  })
  return rows.map((r) => ({
    // Trim long queries so tool results stay small
    query: r.userQuery.length > 200 ? `${r.userQuery.slice(0, 200)}…` : r.userQuery,
    homesFound: r.finalHomesCount,
    createdAt: r.createdAt.toISOString(),
  }))
}

export interface CostEstimate {
  searchCount: number
  estimatedCostCents: number
  estimatedCostEur: string
  since: string | null
  note: string
}

// We do NOT persist per-call token counts, so cost is an ESTIMATE: number of AI
// searches × a representative token profile for one conversational filter-
// extraction call, priced with the same MODEL_COSTS table used by ai-logger.
const ASSUMED_INPUT_TOKENS_PER_SEARCH = 1200
const ASSUMED_OUTPUT_TOKENS_PER_SEARCH = 350

export async function getUserCostEstimate(
  targetUserId: number,
  since?: Date
): Promise<CostEstimate> {
  const searchCount = await prisma.aISearchLog.count({
    where: { userId: targetUserId, ...(since ? { createdAt: { gte: since } } : {}) },
  })
  const perSearch = estimateAiSearchCost(
    'gpt-4o-mini',
    ASSUMED_INPUT_TOKENS_PER_SEARCH,
    ASSUMED_OUTPUT_TOKENS_PER_SEARCH
  )
  const estimatedCostCents = searchCount * perSearch
  return {
    searchCount,
    estimatedCostCents,
    estimatedCostEur: (estimatedCostCents / 100).toFixed(4),
    since: since?.toISOString() ?? null,
    note: 'Estimate only — actual token counts are not stored; assumes a typical AI-search token profile.',
  }
}

export interface FoundUser {
  userId: number
  email: string
  name: string | null
  tier: string
}

// Admin-only: resolve a free-text fragment (name or email) to candidate users.
export async function findUsers(query: string, limit = 5): Promise<FoundUser[]> {
  const q = query.trim()
  if (!q) return []
  const rows = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ],
    },
    orderBy: { aiSearchCount: 'desc' },
    take: Math.min(Math.max(1, limit), 10),
    select: { id: true, email: true, name: true, subscriptionTier: true },
  })
  return rows.map((r) => ({ userId: r.id, email: r.email, name: r.name, tier: r.subscriptionTier }))
}

export interface LeaderboardEntry {
  userId: number
  email: string
  name: string | null
  tier: string
  monthlyUsed: number
  lifetimeSearches: number
}

// Admin-only: the heaviest AI users this billing period.
export async function getUsageLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  const rows = await prisma.user.findMany({
    where: { aiSearchMonthlyCount: { gt: 0 } },
    orderBy: { aiSearchMonthlyCount: 'desc' },
    take: Math.min(Math.max(1, limit), 25),
    select: {
      id: true,
      email: true,
      name: true,
      subscriptionTier: true,
      aiSearchMonthlyCount: true,
      aiSearchCount: true,
    },
  })
  return rows.map((r) => ({
    userId: r.id,
    email: r.email,
    name: r.name,
    tier: r.subscriptionTier,
    monthlyUsed: r.aiSearchMonthlyCount,
    lifetimeSearches: r.aiSearchCount,
  }))
}
