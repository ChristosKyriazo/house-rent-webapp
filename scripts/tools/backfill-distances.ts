/**
 * Backfill Google Maps distances for all homes that have null distances.
 * Run with: npx tsx scripts/tools/backfill-distances.ts
 *
 * Requires GOOGLE_MAPS_API_KEY and DATABASE_URL in environment.
 * Processes homes in batches with a delay to avoid hitting API rate limits.
 */

import { PrismaClient } from '@prisma/client'
import { calculatePropertyDistances } from '../../lib/google-maps'

const prisma = new PrismaClient()
const BATCH_DELAY_MS = 1500 // 1.5s between homes to stay well under quota

async function main() {
  // Only backfill homes where ALL distance fields are null
  const homes = await prisma.home.findMany({
    where: {
      closestMetro: null,
      closestBus: null,
      closestSchool: null,
      closestHospital: null,
      closestPark: null,
      closestUniversity: null,
    },
    select: {
      id: true,
      street: true,
      area: true,
      city: true,
      country: true,
    },
  })

  console.log(`Found ${homes.length} homes with no distances. Starting backfill...`)

  let success = 0
  let failed = 0

  for (let i = 0; i < homes.length; i++) {
    const home = homes[i]
    console.log(`\n[${i + 1}/${homes.length}] Home #${home.id}: ${home.street || ''}, ${home.area || ''}, ${home.city}, ${home.country}`)

    try {
      const result = await calculatePropertyDistances(
        home.street ?? null,
        home.area ?? null,
        home.city,
        home.country
      )

      await prisma.home.update({
        where: { id: home.id },
        data: {
          closestMetro: result.closestMetro,
          closestSchool: result.closestSchool,
          closestHospital: result.closestHospital,
          closestPark: result.closestPark,
          closestUniversity: result.closestUniversity,
        },
      })

      console.log(`  ✅ metro=${result.closestMetro} school=${result.closestSchool} hospital=${result.closestHospital} park=${result.closestPark} university=${result.closestUniversity}`)
      success++
    } catch (err) {
      console.error(`  ❌ Failed:`, err)
      failed++
    }

    if (i < homes.length - 1) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS))
    }
  }

  console.log(`\nDone. Success: ${success}, Failed: ${failed}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
