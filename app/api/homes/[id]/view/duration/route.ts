import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BEACON_WINDOW_MS = 10 * 60 * 1000 // 10 minutes — match the dedup window in view route

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

    // sendBeacon may send text/plain — handle both content types
    let body: { sessionId?: string; durationSeconds?: number } = {}
    try {
      const contentType = request.headers.get('content-type') ?? ''
      const raw = await request.text()
      if (raw) body = JSON.parse(raw)
      void contentType
    } catch {
      return NextResponse.json({}, { status: 200 })
    }

    const { sessionId, durationSeconds } = body
    if (!sessionId || typeof durationSeconds !== 'number') {
      return NextResponse.json({}, { status: 200 })
    }

    const duration = Math.round(durationSeconds)
    if (duration < 1 || duration > 3600) return NextResponse.json({}, { status: 200 })

    const windowStart = new Date(Date.now() - BEACON_WINDOW_MS)
    await prisma.listingView.updateMany({
      where: {
        homeId: home.id,
        sessionId,
        viewedAt: { gte: windowStart },
        durationSeconds: null,
      },
      data: { durationSeconds: duration },
    })

    return NextResponse.json({}, { status: 200 })
  } catch {
    return NextResponse.json({}, { status: 200 })
  }
}
