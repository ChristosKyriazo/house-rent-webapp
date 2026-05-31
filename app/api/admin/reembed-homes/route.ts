import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { generateEmbedding, buildHomeText } from '@/lib/embeddings'
import * as Sentry from '@sentry/nextjs'
import { checkRateLimit } from '@/lib/rate-limit'

// POST /api/admin/reembed-homes
// Re-generates embeddings for all homes using the improved buildHomeText().
// Protected by ADMIN_SECRET. Processes in batches to avoid timeouts.
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!process.env.ADMIN_SECRET || auth !== `Bearer ${process.env.ADMIN_SECRET}`) {
    Sentry.captureMessage('Admin auth failed: reembed-homes', {
      level: 'warning',
      extra: { ip: request.headers.get('x-forwarded-for') ?? 'unknown' },
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await checkRateLimit('admin:reembed-homes', 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
  if (!openai) return NextResponse.json({ error: 'OpenAI not configured' }, { status: 503 })

  const { batchSize = 10 } = await request.json().catch(() => ({}))

  const homes = await prisma.home.findMany({
    select: {
      id: true, title: true, description: true, city: true, country: true,
      area: true, listingType: true, bedrooms: true, bathrooms: true,
      pricePerMonth: true, sizeSqMeters: true, parking: true, energyClass: true,
      heatingCategory: true, heatingAgent: true, yearBuilt: true, yearRenovated: true,
    },
    take: batchSize,
    orderBy: { updatedAt: 'asc' }, // oldest updated first
  })

  if (!homes.length) return NextResponse.json({ message: 'Nothing to re-embed', processed: 0 })

  let processed = 0
  let failed = 0

  for (const home of homes) {
    try {
      const text = buildHomeText(home)
      const embedding = await generateEmbedding(text, openai)
      await prisma.home.update({
        where: { id: home.id },
        data: { embedding },
      })
      processed++
    } catch {
      failed++
    }
  }

  const total = await prisma.home.count()

  return NextResponse.json({ processed, failed, total, message: `Run again to continue. ${total} homes total.` })
}
