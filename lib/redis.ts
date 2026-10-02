import Redis from 'ioredis'

// Single shared client — null when REDIS_URL is not set (falls back to in-memory)
let redisClient: Redis | null = null

if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: false,
    lazyConnect: true,
  })

  redisClient.on('error', (err) => {
    // Log but don't crash — app falls back to in-memory cache
    console.error('[redis] connection error:', err.message)
  })
}

export const redis = redisClient

export async function redisGet<T>(key: string): Promise<T | null> {
  if (!redis) return null
  try {
    const val = await redis.get(key)
    return val ? (JSON.parse(val) as T) : null
  } catch {
    return null
  }
}

export async function redisSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!redis) return
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  } catch {
    // ignore — in-memory fallback still active
  }
}
