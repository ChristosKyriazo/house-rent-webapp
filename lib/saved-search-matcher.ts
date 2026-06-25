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
  city?: string
  country?: string
  listingType?: string
  minPrice?: string | number
  maxPrice?: string | number
  minBedrooms?: string | number
  maxBedrooms?: string | number
  minSize?: string | number
  maxSize?: string | number
  heatingCategory?: string
  heatingAgent?: string
  yearBuilt?: string | number
  areas?: string[]
  parking?: boolean
}

function matchesFilters(home: HomeForMatching, params: FilterParams): boolean {
  if (params.city && home.city.toLowerCase() !== params.city.toLowerCase()) return false
  if (params.country && home.country.toLowerCase() !== params.country.toLowerCase()) return false
  if (params.listingType && home.listingType !== params.listingType) return false

  const minPrice = params.minPrice ? Number(params.minPrice) : null
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : null
  if (minPrice && home.pricePerMonth < minPrice) return false
  if (maxPrice && home.pricePerMonth > maxPrice) return false

  const minBed = params.minBedrooms ? Number(params.minBedrooms) : null
  const maxBed = params.maxBedrooms ? Number(params.maxBedrooms) : null
  if (minBed && home.bedrooms < minBed) return false
  if (maxBed && home.bedrooms > maxBed) return false

  const minSize = params.minSize ? Number(params.minSize) : null
  const maxSize = params.maxSize ? Number(params.maxSize) : null
  if (minSize && (home.sizeSqMeters ?? 0) < minSize) return false
  if (maxSize && home.sizeSqMeters && home.sizeSqMeters > maxSize) return false

  if (params.heatingCategory && home.heatingCategory && home.heatingCategory.toLowerCase() !== params.heatingCategory.toLowerCase()) return false
  if (params.heatingAgent && home.heatingAgent && home.heatingAgent.toLowerCase() !== params.heatingAgent.toLowerCase()) return false
  if (params.yearBuilt && home.yearBuilt && home.yearBuilt < Number(params.yearBuilt)) return false
  if (params.parking === true && home.parking !== true) return false

  if (params.areas && params.areas.length > 0 && home.area) {
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

  for (const search of searches) {
    // Never notify the listing's owner about their own listing
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

      // Also enforce hard location/type filters from accumulated filters if present
      const params = (search.filterParams ?? {}) as FilterParams
      if (params.city || params.country || params.listingType) {
        matched = matchesFilters(home, { city: params.city, country: params.country, listingType: params.listingType })
      } else {
        matched = true
      }
    }

    if (matched) toNotify.push(search.userId)
  }

  if (toNotify.length === 0) return

  await prisma.notification.createMany({
    data: toNotify.map(userId => ({
      recipientId: userId,
      role: 'user',
      type: 'new_listing_match',
      homeKey: home.key,
    })),
    skipDuplicates: true,
  })
}
