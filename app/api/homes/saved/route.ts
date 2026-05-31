import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, serverError, unauthorized } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'

// GET /api/homes/saved — list all saved homes for current user
export async function GET(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const saved = await prisma.savedHome.findMany({
      where: { userId: user.id },
      include: {
        home: {
          select: {
            id: true,
            key: true,
            title: true,
            titleGreek: true,
            city: true,
            country: true,
            area: true,
            listingType: true,
            pricePerMonth: true,
            bedrooms: true,
            bathrooms: true,
            sizeSqMeters: true,
            photos: true,
            finalized: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ saved }, { status: 200 })
  } catch (error) {
    log.error({ err: error }, 'Get saved homes error')
    return serverError()
  }
}

// POST /api/homes/saved — save a home { homeKey: string }
export async function POST(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { homeKey } = await request.json()
    if (!homeKey) return badRequest('homeKey is required')

    const home = await prisma.home.findUnique({ where: { key: homeKey }, select: { id: true } })
    if (!home) return NextResponse.json({ error: 'Home not found' }, { status: 404 })

    const saved = await prisma.savedHome.upsert({
      where: { userId_homeId: { userId: user.id, homeId: home.id } },
      create: { userId: user.id, homeId: home.id },
      update: {},
    })

    log.info({ homeKey }, 'Home saved')
    return NextResponse.json({ saved }, { status: 201 })
  } catch (error) {
    log.error({ err: error }, 'Save home error')
    return serverError()
  }
}

// DELETE /api/homes/saved?homeKey=xxx — unsave a home
export async function DELETE(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const homeKey = request.nextUrl.searchParams.get('homeKey')
    if (!homeKey) return badRequest('homeKey is required')

    const home = await prisma.home.findUnique({ where: { key: homeKey }, select: { id: true } })
    if (!home) return NextResponse.json({ error: 'Home not found' }, { status: 404 })

    await prisma.savedHome.deleteMany({ where: { userId: user.id, homeId: home.id } })

    log.info({ homeKey }, 'Home unsaved')
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    log.error({ err: error }, 'Unsave home error')
    return serverError()
  }
}
