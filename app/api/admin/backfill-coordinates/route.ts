import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { calculatePropertyDistances } from '@/lib/google-maps'

/**
 * POST /api/admin/backfill-coordinates?limit=20
 *
 * Geocodes listings that have no coordinates (e.g. rows inserted by SQL) and stores the
 * metro/school/hospital/park/university distances too — those feed AI match scores, and
 * the old version saved only lat/lng, leaving every distance null.
 *
 * Works in batches: each geocode is ~6 Google calls, and a request longer than ~100 s is
 * cut off by Cloudflare. Call repeatedly until `remaining` is 0.
 */
export async function POST(request: NextRequest) {
  const { error: adminError } = await requireAdmin()
  if (adminError) return adminError

  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit')) || 20, 1), 50)

  const homes = await prisma.home.findMany({
    where: { latitude: null },
    select: { id: true, street: true, area: true, city: true, country: true },
    orderBy: { id: 'asc' },
    take: limit,
  })

  let updated = 0
  const failedIds: number[] = []

  for (const home of homes) {
    try {
      const r = await calculatePropertyDistances(home.street, home.area, home.city, home.country)
      if (!r.propertyCoordinates) {
        failedIds.push(home.id)
        continue
      }
      await prisma.home.update({
        where: { id: home.id },
        data: {
          latitude: r.propertyCoordinates.lat,
          longitude: r.propertyCoordinates.lng,
          closestMetro: r.closestMetro,
          closestSchool: r.closestSchool,
          closestHospital: r.closestHospital,
          closestPark: r.closestPark,
          closestUniversity: r.closestUniversity,
        },
      })
      updated++
    } catch {
      failedIds.push(home.id)
    }
  }

  // Failed rows keep latitude null, so they would come back first on every call; report them.
  const remaining = await prisma.home.count({ where: { latitude: null } })
  return NextResponse.json({ processed: homes.length, updated, failedIds, remaining })
}
