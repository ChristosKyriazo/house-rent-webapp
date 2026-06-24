import fs from 'fs'
import path from 'path'

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
  // Strip the trailing project name (last hyphen-separated word is usually the project)
  // e.g. "…-flows" or "…-owner" — remove if it's a known project tag
  const projects = ['flows', 'owner', 'renter', 'broker', 'both', 'public']
  let name = dirName
  for (const p of projects) {
    if (name.endsWith(`-${p}`)) {
      name = name.slice(0, -(p.length + 1))
      break
    }
  }

  // Replace the em-dash placeholder (Playwright encodes — as multiple chars)
  // Playwright slugifies "—" as "-—-" or similar — collapse to " — "
  name = name.replace(/-?—-?/g, ' — ')

  // Replace remaining hyphens used as word separators with spaces, but keep " — "
  const parts = name.split(' — ')
  const cleaned = parts
    .map(part =>
      part
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    )
    .join(' — ')

  return cleaned.slice(0, 120)
}
