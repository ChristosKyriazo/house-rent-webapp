import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter'
import fs from 'fs'
import path from 'path'

/**
 * Copies each test's recorded video to test-results/videos/ with a
 * human-readable filename once the entire run is finished (so the video
 * file is guaranteed to be flushed before we try to copy it).
 *
 * Example output:
 *   test-results/videos/01-owner-creates-listing — 01-owner-creates-a-listing.webm
 */
export default class VideoReporter implements Reporter {
  private pending: Array<{ src: string; dest: string }> = []
  private videosDir = path.join(process.cwd(), 'test-results', 'videos')

  onTestEnd(test: TestCase, result: TestResult) {
    const video = result.attachments.find(a => a.name === 'video')
    if (!video?.path) return

    const fileName = buildVideoName(test)
    const dest = path.join(this.videosDir, `${fileName}.webm`)
    this.pending.push({ src: video.path, dest })
  }

  onEnd(_result: FullResult) {
    if (this.pending.length === 0) return
    fs.mkdirSync(this.videosDir, { recursive: true })

    for (const { src, dest } of this.pending) {
      try {
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest)
        }
      } catch {
        // ignore individual copy failures
      }
    }
  }
}

function buildVideoName(test: TestCase): string {
  const specFile = path.basename(test.location.file, '.spec.ts')

  const title = test.title
    .replace(/[^a-zA-Z0-9\s\-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

  const name = `${specFile} — ${title}`
  return name.slice(0, 120)
}
