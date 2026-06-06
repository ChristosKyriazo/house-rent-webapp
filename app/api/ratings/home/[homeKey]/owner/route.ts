import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notFound, serverError } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'
import { getOwnerRatingDetails } from '@/lib/ratings'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ homeKey: string }> | { homeKey: string } }
) {
  const log = requestLogger(request)
  try {
    const { homeKey } = await Promise.resolve(params)

    const home = await prisma.home.findUnique({
      where: { key: homeKey },
      select: { id: true, key: true, title: true, owner: { select: { id: true, role: true, name: true } } },
    })
    if (!home) return notFound('Home not found')

    const details = await getOwnerRatingDetails(home.id)

    return NextResponse.json({
      homeKey: home.key,
      homeTitle: home.title,
      ownerName: home.owner.name,
      ownerRole: home.owner.role,
      ...details,
    })
  } catch (error) {
    log.error({ err: error }, 'Get owner ratings error')
    return serverError()
  }
}
