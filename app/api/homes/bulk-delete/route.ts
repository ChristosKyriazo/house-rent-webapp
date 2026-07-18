import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { requestLogger } from '@/lib/logger'
import { unauthorized } from '@/lib/api-utils'

// POST /api/homes/bulk-delete — delete multiple listings owned by the current user
export async function POST(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const role = user.role || 'user'
    if (role !== 'owner' && role !== 'both' && role !== 'broker') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const keys: string[] = Array.isArray(body.keys) ? body.keys : []
    if (keys.length === 0) {
      return NextResponse.json({ error: 'No keys provided' }, { status: 400 })
    }

    // Ownership enforced by ownerId filter — safe to pass any keys
    const result = await prisma.home.deleteMany({
      where: {
        key: { in: keys },
        ownerId: user.id,
      },
    })

    return NextResponse.json({ deleted: result.count })
  } catch (error) {
    log.error({ err: error }, 'Bulk delete error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
