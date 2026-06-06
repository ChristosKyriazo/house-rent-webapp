import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { normalizeBulkTextFields } from '@/lib/bulk-upload-normalizer'
import { checkRateLimit } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'

// POST /api/admin/backfill-bilingual
// Backfills titleGreek, streetGreek, descriptionGreek for existing homes that are missing them.
// Protected by Clerk auth. Processes in batches of 20 to avoid timeouts.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Rate limit: max 10 calls per minute globally to prevent abuse if secret leaks
  if (!(await checkRateLimit('admin:backfill-bilingual', 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
  if (!openai) return NextResponse.json({ error: 'OpenAI not configured' }, { status: 503 })

  const raw = await request.json().catch(() => ({}))
  const batchSize = Math.min(Math.max(1, Number(raw.batchSize ?? 20)), 100)

  const homes = await prisma.home.findMany({
    where: {
      OR: [
        { titleGreek: null },
        { streetGreek: null, street: { not: null } },
        { descriptionGreek: null, description: { not: null } },
      ],
    },
    select: { id: true, title: true, street: true, description: true },
    take: batchSize,
  })

  if (!homes.length) return NextResponse.json({ message: 'Nothing to backfill', processed: 0 })

  let processed = 0
  let failed = 0

  for (const home of homes) {
    try {
      const normalized = await normalizeBulkTextFields(
        { title: home.title, street: home.street, description: home.description },
        openai
      )
      await prisma.home.update({
        where: { id: home.id },
        data: {
          titleGreek: normalized.titleEl || undefined,
          streetGreek: normalized.streetEl || undefined,
          descriptionGreek: normalized.descriptionEl || undefined,
        },
      })
      processed++
    } catch {
      failed++
    }
  }

  const remaining = await prisma.home.count({
    where: {
      OR: [
        { titleGreek: null },
        { streetGreek: null, street: { not: null } },
        { descriptionGreek: null, description: { not: null } },
      ],
    },
  })

  return NextResponse.json({ processed, failed, remaining })
}
