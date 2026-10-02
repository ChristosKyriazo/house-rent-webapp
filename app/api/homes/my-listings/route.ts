import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { requestLogger } from '@/lib/logger'
import { unauthorized } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    const userRole = (user.role || 'user').toLowerCase()
    if (userRole !== 'owner' && userRole !== 'both' && userRole !== 'broker') {
      return NextResponse.json(
        { error: 'Only owners and brokers can view their listings' },
        { status: 403 }
      )
    }

    // A Main broker can view a Default (child) broker's listings read-only via ?agent=<id>.
    let targetUserId = user.id
    let readOnly = false
    let agentName: string | null = null
    const agentParam = request.nextUrl.searchParams.get('agent')
    if (agentParam) {
      const agentId = parseInt(agentParam, 10)
      if (Number.isInteger(agentId) && agentId !== user.id) {
        if (user.brokerCategory !== 'parent') {
          return NextResponse.json({ error: 'Not your team' }, { status: 403 })
        }
        const child = await prisma.user.findUnique({
          where: { id: agentId },
          select: { parentBrokerId: true, name: true },
        })
        if (!child || child.parentBrokerId !== user.id) {
          return NextResponse.json({ error: 'Not your team member' }, { status: 403 })
        }
        targetUserId = agentId
        readOnly = true
        agentName = child.name
      }
    }

    const homes = await prisma.home.findMany({
      where: { ownerId: targetUserId },
      orderBy: [
        // Hidden listings float to the bottom so they're out of the way unless the owner switches tabs
        { overlimitHiddenAt: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        owner: { select: { id: true, email: true, name: true } },
        _count: {
          select: {
            inquiries: { where: { dismissed: false, finalized: false } },
          },
        },
      },
    })

    const formattedHomes = homes.map(home => {
      let photos: string[] = []
      if (home.photos) {
        try {
          const parsed = JSON.parse(home.photos)
          photos = Array.isArray(parsed) ? parsed : []
        } catch (e) {
          log.error({ err: e }, 'Error parsing photos')
        }
      }

      return {
        ...home,
        photos,
        inquiryCount: home._count.inquiries,
        overlimitHiddenAt: home.overlimitHiddenAt?.toISOString() ?? null,
        createdAt: home.createdAt.toISOString(),
        updatedAt: home.updatedAt.toISOString(),
        availableFrom: home.availableFrom.toISOString(),
      }
    })

    const slotsUsed = formattedHomes.filter(h => h.slotPromoted && !h.overlimitHiddenAt).length
    const hiddenCount = formattedHomes.filter(h => h.overlimitHiddenAt !== null).length

    return NextResponse.json({ homes: formattedHomes, slotsUsed, hiddenCount, readOnly, agentName }, { status: 200 })
  } catch (error) {
    log.error({ err: error }, 'Get my listings error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
