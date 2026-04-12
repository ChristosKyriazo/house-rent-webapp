import path from 'path'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'

/**
 * SQLite URLs like file:./prisma/dev.db are relative to process.cwd().
 * Next/Turbopack may run with cwd = repo root instead of webapp/, which breaks relative paths.
 * Resolve to an absolute file: URL that exists (prefer webapp/prisma/dev.db when cwd is parent).
 */
function resolveSqliteDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url || !url.startsWith('file:')) return url

  const rest = url.slice('file:'.length).trim()
  const relative = rest.replace(/^\.\//, '')

  const candidates = [
    path.resolve(process.cwd(), relative),
    path.join(process.cwd(), 'webapp', relative),
  ]

  for (const absolute of candidates) {
    const dir = path.dirname(absolute)
    if (fs.existsSync(dir)) {
      return `file:${absolute}`
    }
  }

  return `file:${path.resolve(process.cwd(), relative)}`
}

const resolvedDatabaseUrl = resolveSqliteDatabaseUrl()

const prismaClientOptions = {
  log: (process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']) as (
    | 'error'
    | 'warn'
    | 'info'
    | 'query'
  )[],
  ...(resolvedDatabaseUrl
    ? { datasources: { db: { url: resolvedDatabaseUrl } } }
    : {}),
}

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/nextjs-best-practices

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// PrismaClient configuration with timeout settings for SQLite
// SQLite timeout is set via connection string or PRAGMA statements
// We'll use a custom client with better error handling
let prismaInstance =
  globalForPrisma.prisma ?? new PrismaClient(prismaClientOptions)

// Check if inquiry model exists, if not recreate the client
if (!prismaInstance.inquiry) {
  console.warn('Prisma client missing inquiry model, recreating...')
  prismaInstance = new PrismaClient(prismaClientOptions)
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance
  }
}

// Check if booking model exists
if (!prismaInstance.booking) {
  console.warn('Prisma client missing booking model. Please run: npx prisma generate')
}

// Add connection timeout handling for SQLite
// SQLite uses PRAGMA busy_timeout to handle locks
if (process.env.DATABASE_URL?.includes('sqlite') || process.env.DATABASE_URL?.includes('.db')) {
  // Set busy timeout to 30 seconds (30000ms) for SQLite to handle concurrent access
  // Note: We set this via connection string instead of PRAGMA to avoid errors
  // The connection string should include: ?busy_timeout=30000
  // For now, we'll rely on the connection string or default timeout
}

export const prisma = prismaInstance

