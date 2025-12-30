import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/nextjs-best-practices

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// PrismaClient configuration with timeout settings for SQLite
// SQLite timeout is set via connection string or PRAGMA statements
// We'll use a custom client with better error handling
let prismaInstance = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

// Check if inquiry model exists, if not recreate the client
if (!prismaInstance.inquiry) {
  console.warn('Prisma client missing inquiry model, recreating...')
  prismaInstance = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance
  }
}

// Add connection timeout handling for SQLite
// SQLite uses PRAGMA busy_timeout to handle locks
if (process.env.DATABASE_URL?.includes('sqlite') || process.env.DATABASE_URL?.includes('.db')) {
  // Set busy timeout to 30 seconds (30000ms) for SQLite to handle concurrent access
  // Execute PRAGMA after connection
  prismaInstance.$connect()
    .then(() => {
      // Set busy_timeout to wait up to 30 seconds for locks to clear
      return prismaInstance.$executeRawUnsafe('PRAGMA busy_timeout = 30000')
    })
    .catch((err) => {
      console.error('Prisma connection error:', err)
    })
}

export const prisma = prismaInstance

