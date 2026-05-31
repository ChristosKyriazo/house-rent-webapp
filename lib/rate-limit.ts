import { redis } from './redis'

// In-memory fallback used when Redis is unavailable
type RateLimitEntry = { count: number; resetAt: number }
const store = new Map<string, RateLimitEntry>()

function nowMs() {
  return Date.now()
}

/**
 * Async rate limiter — uses Redis INCR/EXPIRE when available, in-memory Map as fallback.
 * Returns true when the caller is within quota, false when the limit is exceeded.
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (redis) {
    try {
      const count = await redis.incr(key)
      if (count === 1) {
        await redis.pexpire(key, windowMs)
      }
      return count <= limit
    } catch {
      // Redis error → fall through to in-memory
    }
  }

  // In-memory fallback
  const entry = store.get(key)
  const ts = nowMs()

  if (!entry || ts >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: ts + windowMs })
    return true
  }

  if (entry.count >= limit) return false
  entry.count += 1
  return true
}

// Purge expired in-memory entries periodically
setInterval(() => {
  const ts = nowMs()
  for (const [key, entry] of store) {
    if (ts >= entry.resetAt) store.delete(key)
  }
}, 60_000)

// ── Pre-configured limiters ────────────────────────────────────────────────────

/** 5 AI-search calls per user per minute */
export async function checkAiSearchLimit(userId: string | number): Promise<boolean> {
  return checkRateLimit(`${userId}:ai-search`, 5, 60_000)
}

/** 3 AI description-generation calls per user per minute */
export async function checkAiDescriptionLimit(userId: string | number): Promise<boolean> {
  return checkRateLimit(`${userId}:ai-description`, 3, 60_000)
}

/** 10 translation calls per user per minute */
export async function checkTranslationLimit(userId: string | number): Promise<boolean> {
  return checkRateLimit(`${userId}:translate`, 10, 60_000)
}

/** 20 Google Maps geocoding calls per user per minute */
export async function checkMapsLimit(userId: string | number): Promise<boolean> {
  return checkRateLimit(`${userId}:maps`, 20, 60_000)
}

/** 15 embedding calls per user per minute */
export async function checkEmbeddingLimit(userId: string | number): Promise<boolean> {
  return checkRateLimit(`${userId}:embeddings`, 15, 60_000)
}
