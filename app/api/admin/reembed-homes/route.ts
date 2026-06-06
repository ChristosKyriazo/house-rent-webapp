import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { generateEmbedding, buildHomeText } from '@/lib/embeddings'
import { checkRateLimit } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'

// POST /api/admin/reembed-homes
// Re-generates embeddings for all homes using the improved buildHomeText().
// Protected by Clerk auth. Processes in batches to avoid timeouts.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!(await checkRateLimit('admin:reembed-homes', 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
  if (!openai) return NextResponse.json({ error: 'OpenAI not configured' }, { status: 503 })

  const raw = await request.json().catch(() => ({}))
  const batchSize = Math.min(Math.max(1, Number(raw.batchSize ?? 10)), 100)

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
      const vectorStr = `[${(embedding as number[]).join(',')}]`
      await prisma.home.update({
        where: { id: home.id },
        data: { embedding },
      })
      // Also update the pgvector column used for similarity search
      await prisma.$executeRawUnsafe(
        `UPDATE homes SET "embeddingVec" = $1::vector WHERE id = $2`,
        vectorStr,
        home.id
      )
      processed++
    } catch {
      failed++
    }
  }

  const total = await prisma.home.count()

  return NextResponse.json({ processed, failed, total, message: `Run again to continue. ${total} homes total.` })
}
