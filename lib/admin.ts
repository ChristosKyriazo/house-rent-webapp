import { getCurrentUser } from './auth'
import { unauthorized, forbidden } from './api-utils'
import type { NextResponse } from 'next/server'
import type { User } from '@prisma/client'

type AdminCheck = { user: User; error: null } | { user: null; error: NextResponse }

/**
 * Whether a resolved user is on the admin allowlist.
 *
 * Prefers ADMIN_CLERK_IDS (comma-separated Clerk user IDs — stable identifiers
 * that survive email changes) and falls back to the legacy ADMIN_EMAILS
 * allowlist. Set ADMIN_CLERK_IDS in the deploy env to migrate off emails.
 */
export function isAdminUser(user: Pick<User, 'clerkUserId' | 'email'>): boolean {
  const adminClerkIds = (process.env.ADMIN_CLERK_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)

  return (
    (user.clerkUserId !== null && adminClerkIds.includes(user.clerkUserId)) ||
    adminEmails.includes(user.email)
  )
}

/**
 * Shared admin gate for /api/admin routes. Returns a 401/403 NextResponse when
 * the caller is not a signed-in admin.
 */
export async function requireAdmin(): Promise<AdminCheck> {
  const user = await getCurrentUser()
  if (!user) return { user: null, error: unauthorized() }
  if (!isAdminUser(user)) return { user: null, error: forbidden('Forbidden') }
  return { user, error: null }
}
