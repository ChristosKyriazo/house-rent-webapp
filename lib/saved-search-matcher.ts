import type { PrismaClient } from '@prisma/client'
import { cosineSimilarity } from '@/lib/embeddings'

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
}

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

  const toNotify: number[] = []
  const matchedIds: number[] = []

  for (const search of searches) {
    if (search.userId === home.ownerId) continue

    let matched = false

    if (search.type === 'filter') {
      const params = (search.filterParams ?? {}) as FilterParams
      matched = matchesFilters(home, params)
    } else if (search.type === 'ai') {
      if (!search.queryEmbedding) continue
      const queryVec = search.queryEmbedding as number[]
      if (!Array.isArray(queryVec) || queryVec.length === 0) continue

      const threshold = (search.minMatchPercent ?? 70) / 100
      const similarity = cosineSimilarity(embedding, queryVec)
      if (similarity < threshold) continue

      // Also enforce hard location/type filters from stored filterParams
      const params = (search.filterParams ?? {}) as FilterParams
      if (params.city || params.country || params.listingType) {
        matched = matchesFilters(home, { city: params.city, country: params.country, listingType: params.listingType })
      } else {
        matched = true
      }
    }

    if (matched) {
      toNotify.push(search.userId)
      matchedIds.push(search.id)
    }
  }

  if (toNotify.length === 0) return

  // Deduplicate: one notification per user per listing
  const uniqueUserIds = [...new Set(toNotify)]

  await prisma.notification.createMany({
    data: uniqueUserIds.map(userId => ({
      recipientId: userId,
      role: 'user',
      type: 'new_listing_match',
      homeKey: home.key,
    })),
    skipDuplicates: true,
  })

  // Stamp lastNotifiedAt on every matched search
  await prisma.savedSearch.updateMany({
    where: { id: { in: matchedIds } },
    data: { lastNotifiedAt: new Date() },
  })
}
