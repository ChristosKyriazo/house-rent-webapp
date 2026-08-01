import type { PrismaClient } from '@prisma/client'
import { cosineSimilarity } from '@/lib/embeddings'
import { calculateVibeScore, getDistanceFields } from '@/lib/ai-search-helpers'
import {
  scoreHome,
  normalizeDistance,
  normalizeSafety,
  normalizeVibe,
  normalizeParking,
  VIBE_WEIGHT_LOCATION_PREFERENCE,
  type HomeComponents,
} from '@/lib/search/score-home'
import { semanticScore } from '@/lib/search/calibration'

interface HomeForMatching {
  id: number
  key: string
  ownerId: number
  city: string
  country: string
  area: string | null
  listingType: string
  pricePerMonth: number
  bedrooms: number
  bathrooms: number
  sizeSqMeters: number | null
  parking: boolean | null
  heatingCategory: string | null
  heatingAgent: string | null
  yearBuilt: number | null
  floor: number | null
  closestMetro?: number | null
  closestSchool?: number | null
  closestHospital?: number | null
  closestPark?: number | null
  closestUniversity?: number | null
}

interface FilterParams {
  city?: string | null
  country?: string | null
  listingType?: string | null
  minPrice?: string | number | null
  maxPrice?: string | number | null
  minBedrooms?: string | number | null
  maxBedrooms?: string | number | null
  minBathrooms?: string | number | null
  maxBathrooms?: string | number | null
  minSize?: string | number | null
  maxSize?: string | number | null
  minFloor?: string | number | null
  heatingCategory?: string | null
  heatingAgent?: string | null
  yearBuilt?: string | number | null
  areas?: string[] | null
  parking?: boolean | null
  /** Soft criteria snapshot written by POST /api/saved-searches for `ai` searches. */
  softCriteria?: Record<string, unknown> | null
}

/**
 * A user with one broad saved search should not get a notification per listing when an
 * agency bulk-uploads fifty of them. Anything past this in a rolling day is dropped.
 */
const MAX_MATCH_NOTIFICATIONS_PER_DAY = 5

function num(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

function matchesFilters(home: HomeForMatching, params: FilterParams): boolean {
  if (params.city && home.city.toLowerCase() !== params.city.toLowerCase()) return false
  if (params.country && home.country.toLowerCase() !== params.country.toLowerCase()) return false
  if (params.listingType && home.listingType !== params.listingType) return false

  const minPrice = num(params.minPrice)
  const maxPrice = num(params.maxPrice)
  if (minPrice !== null && home.pricePerMonth < minPrice) return false
  if (maxPrice !== null && home.pricePerMonth > maxPrice) return false

  const minBed = num(params.minBedrooms)
  const maxBed = num(params.maxBedrooms)
  if (minBed !== null && home.bedrooms < minBed) return false
  if (maxBed !== null && home.bedrooms > maxBed) return false

  const minBath = num(params.minBathrooms)
  const maxBath = num(params.maxBathrooms)
  if (minBath !== null && home.bathrooms < minBath) return false
  if (maxBath !== null && home.bathrooms > maxBath) return false

  const minSize = num(params.minSize)
  const maxSize = num(params.maxSize)
  if (minSize !== null && (home.sizeSqMeters ?? 0) < minSize) return false
  if (maxSize !== null && home.sizeSqMeters !== null && home.sizeSqMeters !== undefined && home.sizeSqMeters > maxSize) return false

  const minFloor = num(params.minFloor)
  if (minFloor !== null && (home.floor === null || home.floor < minFloor)) return false

  // For categorical filters: if the home doesn't have the field set, it fails
  if (params.heatingCategory && home.heatingCategory?.toLowerCase() !== params.heatingCategory.toLowerCase()) return false
  if (params.heatingAgent && home.heatingAgent?.toLowerCase() !== params.heatingAgent.toLowerCase()) return false

  if (params.yearBuilt) {
    const yr = num(params.yearBuilt)
    if (yr !== null && (home.yearBuilt === null || home.yearBuilt < yr)) return false
  }

  if (params.parking === true && home.parking !== true) return false

  if (params.areas && params.areas.length > 0) {
    // If home has no area, it cannot satisfy an area requirement
    if (!home.area) return false
    const normalised = params.areas.map(a => a.toLowerCase())
    if (!normalised.some(a => home.area!.toLowerCase().includes(a) || a.includes(home.area!.toLowerCase()))) return false
  }

  return true
}

/**
 * Score one new listing against one saved AI search on the **same absolute 0-100 scale the
 * search UI shows**, so `minMatchPercent` means what the slider says it means.
 *
 * This used to compare a raw embedding cosine directly against `minMatchPercent / 100`.
 * Query-vs-listing cosine for text-embedding-3-small lives around 0.20-0.50, so the default
 * 70% threshold could never be met and AI saved searches never notified anyone; 30% fired on
 * everything. `semanticScore` calibrates that band to 0..1 and `scoreHome` aggregates it with
 * whatever soft criteria were snapshotted at save time.
 */
function scoreAgainstSavedSearch(
  home: HomeForMatching,
  homeEmbedding: number[],
  queryVec: number[],
  params: FilterParams,
  areaData: { safety: number | null; vibe: string | null } | null,
): number {
  const components: HomeComponents = {
    semantic: semanticScore(cosineSimilarity(homeEmbedding, queryVec)),
  }

  const soft = params.softCriteria ?? {}

  const distances = getDistanceFields(soft).filter(
    d => d.category && d.category !== 'Not important' && d.category !== 'Not mentioned',
  )
  if (distances.length > 0) {
    let total = 0
    for (const d of distances) {
      total += normalizeDistance(home[d.field] as number | null | undefined, d.category)
    }
    components.distance = total / distances.length
  }

  const safetyCategory = soft.Safety as string | undefined
  if (safetyCategory && safetyCategory !== 'Not important' && safetyCategory !== 'Not mentioned') {
    components.safety = normalizeSafety(areaData?.safety ?? null)
  }

  const vibePreference = soft.vibePreference as string | undefined
  if (vibePreference) {
    const propertyVibes = areaData?.vibe ? areaData.vibe.split(',').map(v => v.trim()) : []
    components.vibe = normalizeVibe(calculateVibeScore(vibePreference, propertyVibes))
  }

  if (soft.parkingSoftPreference === true) {
    components.parking = normalizeParking(home.parking)
  }

  return scoreHome(components, {
    weights: soft.hasLocationPreference === true && vibePreference
      ? { vibe: VIBE_WEIGHT_LOCATION_PREFERENCE }
      : undefined,
  })
}

export async function matchSavedSearches(
  home: HomeForMatching,
  embedding: number[],
  prisma: PrismaClient,
) {
  const searches = await prisma.savedSearch.findMany({
    where: { notificationsEnabled: true },
    take: 500, // safety cap — prevents unbounded memory at scale
    select: {
      id: true,
      key: true,
      userId: true,
      type: true,
      filterParams: true,
      queryEmbedding: true,
      minMatchPercent: true,
    },
  })

  if (searches.length === 0) return

  // Area safety/vibe for this one listing — needed to score the soft criteria the same way
  // the search route does.
  const areaData = home.area
    ? await prisma.area.findFirst({
        where: { name: home.area },
        select: { safety: true, vibe: true },
      })
    : null

  const toNotify: number[] = []
  const matchedIds: number[] = []

  for (const search of searches) {
    if (search.userId === home.ownerId) continue

    let matched = false
    const params = (search.filterParams ?? {}) as FilterParams

    if (search.type === 'filter') {
      matched = matchesFilters(home, params)
    } else if (search.type === 'ai') {
      if (!search.queryEmbedding) continue
      const queryVec = search.queryEmbedding as number[]
      if (!Array.isArray(queryVec) || queryVec.length === 0) continue

      // Hard location/type filters are absolute — no score can rescue a wrong city.
      if (params.city || params.country || params.listingType) {
        if (!matchesFilters(home, { city: params.city, country: params.country, listingType: params.listingType })) {
          continue
        }
      }

      const fit = scoreAgainstSavedSearch(home, embedding, queryVec, params, areaData)
      matched = fit >= (search.minMatchPercent ?? 70)
    }

    if (matched) {
      toNotify.push(search.userId)
      matchedIds.push(search.id)
    }
  }

  if (toNotify.length === 0) return

  // Deduplicate: one notification per user per listing
  const uniqueUserIds = [...new Set(toNotify)]

  // `skipDuplicates` cannot help here — Notification has no unique constraint for Postgres to
  // conflict on — so re-running the embedding queue for the same listing would re-notify
  // everyone. Check explicitly instead, and cap the daily volume per user.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [alreadyNotified, recentCounts] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: { in: uniqueUserIds }, homeKey: home.key, type: 'new_listing_match' },
      select: { recipientId: true },
    }),
    prisma.notification.groupBy({
      by: ['recipientId'],
      where: {
        recipientId: { in: uniqueUserIds },
        type: 'new_listing_match',
        createdAt: { gte: since },
      },
      _count: { _all: true },
    }),
  ])

  const seen = new Set(alreadyNotified.map(n => n.recipientId))
  const dailyCount = new Map(recentCounts.map(c => [c.recipientId, c._count._all]))

  const recipients = uniqueUserIds.filter(
    userId => !seen.has(userId) && (dailyCount.get(userId) ?? 0) < MAX_MATCH_NOTIFICATIONS_PER_DAY,
  )

  if (recipients.length > 0) {
    await prisma.notification.createMany({
      data: recipients.map(userId => ({
        recipientId: userId,
        role: 'user',
        type: 'new_listing_match',
        homeKey: home.key,
      })),
    })
  }

  // Stamp lastNotifiedAt on every matched search
  await prisma.savedSearch.updateMany({
    where: { id: { in: matchedIds } },
    data: { lastNotifiedAt: new Date() },
  })
}
