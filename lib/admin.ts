import { getCurrentUser } from './auth'
import { unauthorized, forbidden } from './api-utils'
import type { NextResponse } from 'next/server'
import type { User } from '@prisma/client'

type AdminCheck = { user: User; error: null } | { user: null; error: NextResponse }

/**
 * Shared admin gate for /api/admin routes.
 *
 * Prefers ADMIN_CLERK_IDS (comma-separated Clerk user IDs — stable identifiers
 * that survive email changes) and falls back to the legacy ADMIN_EMAILS
 * allowlist. Set ADMIN_CLERK_IDS in the deploy env to migrate off emails.
 */
export async function requireAdmin(): Promise<AdminCheck> {
  const user = await getCurrentUser()
  if (!user) return { user: null, error: unauthorized() }

  const adminClerkIds = (process.env.ADMIN_CLERK_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)

  const isAdmin =
    (user.clerkUserId !== null && adminClerkIds.includes(user.clerkUserId)) ||
    adminEmails.includes(user.email)

  if (!isAdmin) return { user: null, error: forbidden('Forbidden') }
  return { user, error: null }
}
