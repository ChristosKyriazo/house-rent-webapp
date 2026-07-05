import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

config({ path: path.resolve(__dirname, '../../.env.test') })

/**
 * Deletes data created by the four E2E test accounts so runs against the
 * shared staging DB don't accumulate junk listings/inquiries/bookings.
 *
 * Requires E2E_DATABASE_URL in .env.test (point it at the staging tunnel,
 * postgresql://…@localhost:5433/house_rent). Deliberately a separate var from
 * DATABASE_URL so cleanup never runs against an unintended database.
 * Scope is limited to rows owned by the TEST_*_EMAIL accounts.
 */
async function cleanupTestData() {
  if (process.env.E2E_SKIP_CLEANUP === '1') return

  const dbUrl = process.env.E2E_DATABASE_URL
  if (!dbUrl) {
    console.warn('[teardown] E2E_DATABASE_URL not set — skipping staging data cleanup')
    return
  }

  const emails = [
    process.env.TEST_OWNER_EMAIL,
    process.env.TEST_RENTER_EMAIL,
    process.env.TEST_BROKER_EMAIL,
    process.env.TEST_BOTH_EMAIL,
  ].filter((e): e is string => !!e)
  if (emails.length === 0) return

  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })

  try {
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    })
    const ids = users.map((u) => u.id)
    if (ids.length === 0) return

    // Order matters for FK constraints; Home deletion cascades to
    // availability, inquiries, finalizations, ratings, views, embedding queue.
    const ratings = await prisma.rating.deleteMany({
      where: { OR: [{ raterId: { in: ids } }, { ratedUserId: { in: ids } }] },
    })
    const bookings = await prisma.booking.deleteMany({
      where: { OR: [{ userId: { in: ids } }, { ownerId: { in: ids } }] },
    })
    const inquiries = await prisma.inquiry.deleteMany({ where: { userId: { in: ids } } })
    const homes = await prisma.home.deleteMany({ where: { ownerId: { in: ids } } })
    await prisma.notification.deleteMany({ where: { recipientId: { in: ids } } })
    await prisma.savedHome.deleteMany({ where: { userId: { in: ids } } })
    await prisma.savedSearch.deleteMany({ where: { userId: { in: ids } } })
    await prisma.bulkUploadJob.deleteMany({ where: { userId: { in: ids } } })

    console.log(
      `[teardown] Cleaned staging data for ${ids.length} test account(s): ` +
        `${homes.count} homes, ${inquiries.count} inquiries, ${bookings.count} bookings, ${ratings.count} ratings`
    )
  } catch (err) {
    console.warn('[teardown] Staging data cleanup failed (non-fatal):', err)
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * After every Playwright run, walk test-results/ and copy each video.webm
 * into test-results/videos/ with a human-readable name derived from its
 * parent directory (which Playwright names after the test title).
 *
 * Example:
 *   test-results/flows-01-owner-creates-listing-01---owner-creates-a-listing-flows/video.webm
 *   → test-results/videos/01-owner-creates-listing — 01-owner-creates-a-listing.webm
 */
export default async function globalTeardown() {
  await cleanupTestData()

  const resultsDir = path.join(process.cwd(), 'test-results')
  const videosDir = path.join(resultsDir, 'videos')

  if (!fs.existsSync(resultsDir)) return

  const entries = fs.readdirSync(resultsDir, { withFileTypes: true })
  const testDirs = entries.filter(e => e.isDirectory() && e.name !== 'videos')

  const videos: Array<{ src: string; dest: string }> = []

  for (const dir of testDirs) {
    const videoPath = path.join(resultsDir, dir.name, 'video.webm')
    if (!fs.existsSync(videoPath)) continue

    const cleanName = humanReadableName(dir.name)
    videos.push({ src: videoPath, dest: path.join(videosDir, `${cleanName}.webm`) })
  }

  if (videos.length === 0) return

  fs.mkdirSync(videosDir, { recursive: true })

  for (const { src, dest } of videos) {
    try {
      fs.copyFileSync(src, dest)
    } catch {
      // ignore individual failures
    }
  }

  console.log(`\n[teardown] ${videos.length} video(s) saved to test-results/videos/`)
}

/**
 * Converts Playwright's auto-generated directory name into a readable title.
 *
 * Input:  "flows-01-owner-creates-listing-01-—-owner-creates-a-listing-flows"
 * Output: "01-owner-creates-listing — 01-owner-creates-a-listing"
 */
function humanReadableName(dirName: string): string {
  const projects = ['flows', 'owner', 'renter', 'broker', 'both', 'public']
  let name = dirName

  // Strip trailing project suffix, e.g. "…-flows"
  for (const p of projects) {
    if (name.endsWith(`-${p}`)) {
      name = name.slice(0, -(p.length + 1))
      break
    }
  }

  // Strip leading project prefix, e.g. "flows-…"
  for (const p of projects) {
    if (name.startsWith(`${p}-`)) {
      name = name.slice(p.length + 1)
      break
    }
  }

  // Restore em-dash (Playwright slugifies "—" as "-—-")
  name = name.replace(/-?—-?/g, ' — ')

  // Playwright inserts a 5-char hex hash when the name is too long.
  // Pattern: {spec-truncated}-{5hex}-{title-truncated}
  // Merge both halves around the hash so the hash disappears.
  name = name.replace(/-([0-9a-f]{5})-/, '-')

  // Normalize dashes and trim
  name = name.replace(/-+/g, '-').replace(/^-|-$/g, '')

  return name.slice(0, 120)
}
