/**
 * Local development seed — fake listings and users so `npm run dev` has data
 * to render without tunnelling to the staging database.
 *
 * LOCAL ONLY. This script refuses to run against anything that is not a
 * localhost database (see assertLocalDatabase below). Never add it to a deploy
 * pipeline, and never point it at the tunnel on port 5433 — that is staging.
 *
 * Run areas and universities first; homes reference area names:
 *   npm run db:seed:areas && npm run db:seed:universities && npm run db:seed:dev
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Hard guard against seeding a shared database.
 *
 * Port 5433 is deliberately rejected as well as remote hosts: locally that port
 * is the SSH tunnel to the STAGING database, so a "localhost" check alone would
 * happily wipe staging.
 */
function assertLocalDatabase(): void {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env first.')
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`DATABASE_URL is not a valid URL: ${url}`)
  }

  const localHosts = ['localhost', '127.0.0.1', '::1']
  if (!localHosts.includes(parsed.hostname)) {
    throw new Error(
      `Refusing to seed: DATABASE_URL points at "${parsed.hostname}", not localhost. ` +
        'This seed creates fake data and must never touch staging or production.'
    )
  }

  if (parsed.port === '5433') {
    throw new Error(
      'Refusing to seed: port 5433 is the SSH tunnel to the STAGING database. ' +
        'Point DATABASE_URL at the local Postgres on port 5432 (npm run db:up).'
    )
  }
}

const OWNERS = [
  { email: 'owner@local.test', name: 'Maria Papadopoulou', role: 'owner', subscriptionTier: 'pro', verified: true },
  { email: 'owner2@local.test', name: 'Nikos Georgiou', role: 'owner', subscriptionTier: 'free', verified: false },
]

const BROKERS = [
  { email: 'broker@local.test', name: 'Athens Prime Estates', role: 'broker', subscriptionTier: 'pro', brokerCategory: 'parent', verified: true },
  { email: 'broker.child@local.test', name: 'Eleni Dimitriou', role: 'broker', subscriptionTier: 'plus', brokerCategory: 'child', verified: false },
]

const RENTERS = [
  { email: 'renter@local.test', name: 'Yannis Konstantinou', role: 'user', subscriptionTier: 'free' },
  { email: 'both@local.test', name: 'Sofia Alexiou', role: 'both', subscriptionTier: 'plus' },
]

/** Spread across real Athens/Thessaloniki areas so search and map filters have something to bite on. */
const LISTINGS = [
  { title: 'Bright 2-bedroom in Nea Smyrni', city: 'Athens', area: 'Nea Smyrni', pricePerMonth: 750, bedrooms: 2, bathrooms: 1, sizeSqMeters: 78, floor: 3, yearBuilt: 1998, energyClass: 'C', parking: false, latitude: 37.9447, longitude: 23.7141, heatingCategory: 'autonomous', heatingAgent: 'natural gas' },
  { title: 'Renovated studio near Kolonaki', city: 'Athens', area: 'Athens', pricePerMonth: 620, bedrooms: 1, bathrooms: 1, sizeSqMeters: 42, floor: 2, yearBuilt: 1975, yearRenovated: 2021, energyClass: 'B', parking: false, latitude: 37.9795, longitude: 23.7448, heatingCategory: 'central', heatingAgent: 'oil' },
  { title: 'Family apartment with parking, Chalandri', city: 'Athens', area: 'Chalandri', pricePerMonth: 1100, bedrooms: 3, bathrooms: 2, sizeSqMeters: 118, floor: 1, yearBuilt: 2008, energyClass: 'A', parking: true, latitude: 38.0223, longitude: 23.7997, heatingCategory: 'autonomous', heatingAgent: 'natural gas' },
  { title: 'Seaside flat in Glyfada', city: 'Athens', area: 'Glyfada', pricePerMonth: 1450, bedrooms: 2, bathrooms: 2, sizeSqMeters: 95, floor: 4, yearBuilt: 2015, energyClass: 'A+', parking: true, latitude: 37.8637, longitude: 23.7534, heatingCategory: 'autonomous', heatingAgent: 'electricity' },
  { title: 'Student studio near AUTH', city: 'Thessaloniki', area: 'Thessaloniki', pricePerMonth: 380, bedrooms: 1, bathrooms: 1, sizeSqMeters: 35, floor: 5, yearBuilt: 1985, energyClass: 'E', parking: false, latitude: 40.6318, longitude: 22.9535, heatingCategory: 'central', heatingAgent: 'oil' },
  { title: 'Quiet 2-bed in Kifisia', city: 'Athens', area: 'Kifisia', pricePerMonth: 980, bedrooms: 2, bathrooms: 1, sizeSqMeters: 88, floor: 2, yearBuilt: 2003, energyClass: 'B', parking: true, latitude: 38.0736, longitude: 23.8103, heatingCategory: 'autonomous', heatingAgent: 'natural gas' },
  { title: 'Loft conversion in Peristeri', city: 'Athens', area: 'Peristeri', pricePerMonth: 560, bedrooms: 1, bathrooms: 1, sizeSqMeters: 55, floor: 6, yearBuilt: 1979, yearRenovated: 2019, energyClass: 'D', parking: false, latitude: 38.0154, longitude: 23.6916, heatingCategory: 'central', heatingAgent: 'oil' },
  { title: 'Spacious maisonette, Papagou', city: 'Athens', area: 'Papagou-Cholargos', pricePerMonth: 1600, bedrooms: 4, bathrooms: 2, sizeSqMeters: 165, floor: 0, yearBuilt: 2011, energyClass: 'A', parking: true, latitude: 37.9942, longitude: 23.7936, heatingCategory: 'autonomous', heatingAgent: 'natural gas' },
]

/** For-sale listings, so listingType filters are exercised too. */
const SALE_LISTINGS = [
  { title: 'Investment flat for sale, Kallithea', city: 'Athens', area: 'Kallithea', pricePerMonth: 145_000, bedrooms: 2, bathrooms: 1, sizeSqMeters: 72, floor: 3, yearBuilt: 1992, energyClass: 'C', parking: false, latitude: 37.9564, longitude: 23.7016, heatingCategory: 'central', heatingAgent: 'oil' },
  { title: 'Penthouse for sale, Piraeus', city: 'Athens', area: 'Piraeus', pricePerMonth: 320_000, bedrooms: 3, bathrooms: 2, sizeSqMeters: 130, floor: 7, yearBuilt: 2018, energyClass: 'A+', parking: true, latitude: 37.9421, longitude: 23.6465, heatingCategory: 'autonomous', heatingAgent: 'electricity' },
]

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

async function main() {
  assertLocalDatabase()

  console.log('Seeding local development data...\n')

  // ── Users ───────────────────────────────────────────────────────────────────
  // clerkUserId is left null: these rows exist so listings have owners and the
  // UI has data to render. To actually sign in locally you need your own Clerk
  // dev account — see README → "Signing in locally".
  const allUsers = [...OWNERS, ...BROKERS, ...RENTERS]
  for (const user of allUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    })
  }
  console.log(`  users            ${allUsers.length}`)

  // Link the child broker to the parent so team views have a real hierarchy.
  const parentBroker = await prisma.user.findUnique({ where: { email: 'broker@local.test' } })
  if (parentBroker) {
    await prisma.user.update({
      where: { email: 'broker.child@local.test' },
      data: { parentBrokerId: parentBroker.id },
    })
  }

  // ── Homes ───────────────────────────────────────────────────────────────────
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: 'owner@local.test' } })
  const owner2 = await prisma.user.findUniqueOrThrow({ where: { email: 'owner2@local.test' } })
  const broker = await prisma.user.findUniqueOrThrow({ where: { email: 'broker@local.test' } })

  const existingHomes = await prisma.home.count()
  if (existingHomes > 0) {
    console.log(`  homes            skipped (${existingHomes} already present)`)
  } else {
    const owners = [owner, owner2, broker]
    const rentals = LISTINGS.map((listing, i) => ({
      ...listing,
      country: 'Greece',
      listingType: 'rent',
      availableFrom: daysFromNow(i * 7),
      ownerId: owners[i % owners.length].id,
      // Give the Pro owner's first two listings a live promotion slot so the
      // boost/promotion UI has something to show.
      slotPromoted: i < 2,
      slotPromotedUntil: i < 2 ? daysFromNow(30) : null,
    }))

    const sales = SALE_LISTINGS.map((listing, i) => ({
      ...listing,
      country: 'Greece',
      listingType: 'sale',
      availableFrom: daysFromNow(i * 14),
      ownerId: broker.id,
    }))

    await prisma.home.createMany({ data: [...rentals, ...sales] })
    console.log(`  homes            ${rentals.length + sales.length}`)
  }

  // ── Saved homes ─────────────────────────────────────────────────────────────
  const renter = await prisma.user.findUniqueOrThrow({ where: { email: 'renter@local.test' } })
  const firstHomes = await prisma.home.findMany({ take: 3, orderBy: { id: 'asc' } })
  for (const home of firstHomes) {
    await prisma.savedHome.upsert({
      where: { userId_homeId: { userId: renter.id, homeId: home.id } },
      update: {},
      create: { userId: renter.id, homeId: home.id },
    })
  }
  console.log(`  saved homes      ${firstHomes.length}`)

  const areaCount = await prisma.area.count()
  const uniCount = await prisma.university.count()
  console.log(`  areas            ${areaCount}${areaCount === 0 ? '  ← run: npm run db:seed:areas' : ''}`)
  console.log(`  universities     ${uniCount}${uniCount === 0 ? '  ← run: npm run db:seed:universities' : ''}`)

  console.log('\nDone. Start the app with: npm run dev')
}

main()
  .catch((err) => {
    console.error('\nSeed failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
