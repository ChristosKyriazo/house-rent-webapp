type RateLimitEntry = { count: number; resetAt: number }

const store = new Map<string, RateLimitEntry>()

function now() {
  return Date.now()
}

/**
 * Simple in-process token-bucket rate limiter.
 * Returns true when the caller is within quota, false when the limit is exceeded.
 *
 * key      – unique identifier (e.g. userId + ':openai')
 * limit    – max calls per window
 * windowMs – window length in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const entry = store.get(key)
  const ts = now()

  if (!entry || ts >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: ts + windowMs })
    return true
  }

  if (entry.count >= limit) {
    return false
  }

  entry.count += 1
  return true
}

// Purge expired entries periodically to prevent unbounded memory growth.
setInterval(() => {
  const ts = now()
  for (const [key, entry] of store) {
    if (ts >= entry.resetAt) store.delete(key)
  }
}, 60_000)

// ── Pre-configured limiters ────────────────────────────────────────────────────

/** 5 AI-search calls per user per minute */
export function checkAiSearchLimit(userId: string | number): boolean {
  return checkRateLimit(`${userId}:ai-search`, 5, 60_000)
}

/** 3 AI description-generation calls per user per minute */
export function checkAiDescriptionLimit(userId: string | number): boolean {
  return checkRateLimit(`${userId}:ai-description`, 3, 60_000)
}

/** 10 translation calls per user per minute */
export function checkTranslationLimit(userId: string | number): boolean {
  return checkRateLimit(`${userId}:translate`, 10, 60_000)
}

/** 20 Google Maps geocoding calls per user per minute */
export function checkMapsLimit(userId: string | number): boolean {
  return checkRateLimit(`${userId}:maps`, 20, 60_000)
}
