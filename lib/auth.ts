import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from './prisma'
import { headers } from 'next/headers'

/**
 * Resolve the current authenticated user from Clerk, and ensure we have
 * a matching Prisma User record for app-specific data (role, occupation, etc.).
 */
export async function getCurrentUser() {
  try {
    await headers() // Ensure headers are loaded for Clerk
    const { userId } = await auth()
    if (!userId) return null

    // Find existing local user linked to Clerk
    let user = await prisma.user.findUnique({ where: { clerkUserId: userId } })
    if (user) return user

    // First-time login: create local user record
    const cUser = await currentUser()
    if (!cUser) return null

    const email = cUser.emailAddresses?.[0]?.emailAddress || 
                  cUser.primaryEmailAddress?.emailAddress || 
                  `clerk-${userId}@placeholder.local`

    // Prioritize username from Clerk, then firstName/lastName, then null
    let name: string | null = null
    if (cUser.username) {
      name = cUser.username
    } else if (cUser.firstName || cUser.lastName) {
      name = `${cUser.firstName || ''} ${cUser.lastName || ''}`.trim()
    }

    try {
      user = await prisma.user.create({
        data: {
          clerkUserId: userId,
          email,
          name,
          role: 'user',
        },
      })
      return user
    } catch (createError: any) {
      // Race condition: user already exists, fetch it
      if (createError?.code === 'P2002') {
        user = await prisma.user.findUnique({ where: { clerkUserId: userId } })
        if (user) return user
      }
      throw createError
    }
  } catch (error) {
    console.error('getCurrentUser error:', error)
    return null
  }
}
