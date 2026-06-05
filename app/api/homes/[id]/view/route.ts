import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const VALID_SOURCES = ['direct', 'browse', 'ai_search', 'filter_search', 'map', 'saved', 'compare']
const DEDUP_WINDOW_MS = 5 * 1000 // 5 seconds — prevents double-fire on the same page load only

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const homeKey = resolvedParams.id

    const home = await prisma.home.findFirst({
      where: { OR: [{ key: homeKey }, { id: isNaN(Number(homeKey)) ? -1 : Number(homeKey) }] },
      select: { id: true },
    })
    if (!home) return NextResponse.json({}, { status: 200 })

    let body: { source?: string; sessionId?: string } = {}
    try {
      body = await request.json()
    } catch {
      // ignore malformed body
    }

    const source = VALID_SOURCES.includes(body.source ?? '') ? body.source : 'direct'
    const sessionId = typeof body.sessionId === 'string' && body.sessionId.length <= 64
      ? body.sessionId
      : null

    const user = await getCurrentUser().catch(() => null)
    const userId = user?.id ?? null

    const windowStart = new Date(Date.now() - DEDUP_WINDOW_MS)
    const recentView = await prisma.listingView.findFirst({
      where: {
        homeId: home.id,
        viewedAt: { gte: windowStart },
        ...(userId ? { userId } : { sessionId, userId: null }),
      },
      select: { id: true },
    })

    if (!recentView) {
      await prisma.listingView.create({
        data: { homeId: home.id, userId, sessionId, source },
      })
    }

    return NextResponse.json({}, { status: 200 })
  } catch {
    return NextResponse.json({}, { status: 200 })
  }
}
