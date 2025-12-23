import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { NextResponse } from 'next/server'

// How long a session should live (here: 7 days)
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

// Helper to create a session and set the cookie on the response
export async function createSession(userId: number, response: NextResponse) {
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)

  // Create session row in DB
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt,
    },
  })

  // Set HTTP-only cookie on the response (using session key for external reference)
  const isProd = process.env.NODE_ENV === 'production'
  
  response.cookies.set('sessionId', session.key, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })

  return session
}

// Helper used in server components / API routes to get current user from cookie
export async function getCurrentUser() {
  try {
    // In Next 15+ cookies() is async and returns a Promise-like object
    const cookieStore = await cookies()
    const sessionKey = cookieStore.get('sessionId')?.value

    if (!sessionKey) return null

    // Find session by key (external reference)
    const session = await prisma.session.findUnique({
      where: { key: sessionKey },
      include: { user: true },
    })

    if (!session) return null

    // Check expiration
    if (session.expiresAt < new Date()) {
      // Optionally delete expired session
      await prisma.session.delete({ where: { id: session.id } })
      return null
    }

    return session.user
  } catch (error) {
    console.error('getCurrentUser error:', error)
    // Return null on any error to prevent breaking the app
    return null
  }
}
