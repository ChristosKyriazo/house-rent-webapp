import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/nextjs-best-practices

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Classic PrismaClient for v5: no special constructor options needed.
// Force recreation if inquiry model is missing (for hot reload scenarios)
let prismaInstance = globalForPrisma.prisma ?? new PrismaClient()

// Check if inquiry model exists, if not recreate the client
if (!prismaInstance.inquiry) {
  console.warn('Prisma client missing inquiry model, recreating...')
  prismaInstance = new PrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance
  }
}

export const prisma = prismaInstance

