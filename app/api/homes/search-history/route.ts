import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { serverError, unauthorized } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'
import { redis } from '@/lib/redis'

const MAX_HISTORY = 10
const TTL_SECONDS = 90 * 24 * 60 * 60 // 90 days

function historyKey(userId: number) {
  return `search-history:${userId}`
}

// GET /api/homes/search-history — return recent searches for current user
export async function GET(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    if (!redis) return NextResponse.json({ searches: [] })

    const raw = await redis.lrange(historyKey(user.id), 0, MAX_HISTORY - 1)
    const searches = raw.map(r => {
      try { return JSON.parse(r) } catch { return null }
    }).filter(Boolean)

    return NextResponse.json({ searches })
  } catch (error) {
    log.error({ err: error }, 'Search history GET error')
    return serverError()
  }
}

// POST /api/homes/search-history — record a new search { query: string, type?: 'rent'|'buy' }
export async function POST(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { query, type } = await request.json()
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    if (!redis) return NextResponse.json({ ok: true })

    const key = historyKey(user.id)
    const entry = JSON.stringify({ query: query.trim(), type: type ?? null, ts: Date.now() })

    // Remove duplicate if same query already exists, then prepend
    const existing = await redis.lrange(key, 0, MAX_HISTORY - 1)
    for (let i = 0; i < existing.length; i++) {
      try {
        const parsed = JSON.parse(existing[i])
        if (parsed.query === query.trim()) {
          await redis.lrem(key, 0, existing[i])
          break
        }
      } catch { /* ignore */ }
    }

    await redis.lpush(key, entry)
    await redis.ltrim(key, 0, MAX_HISTORY - 1)
    await redis.expire(key, TTL_SECONDS)

    log.info({ userId: user.id, query }, 'Search history recorded')
    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error({ err: error }, 'Search history POST error')
    return serverError()
  }
}

// DELETE /api/homes/search-history — clear all search history
export async function DELETE(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    if (redis) await redis.del(historyKey(user.id))

    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error({ err: error }, 'Search history DELETE error')
    return serverError()
  }
}
