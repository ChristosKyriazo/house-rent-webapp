import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const sessionKey = request.cookies.get('sessionId')?.value

    if (sessionKey) {
      // Delete session from DB by key (ignore errors if it's already gone)
      try {
        await prisma.session.delete({
          where: { key: sessionKey },
        })
      } catch {
        // ignore
      }
    }

    // Redirect back to login page after logout
    const response = NextResponse.redirect(new URL('/login', request.url))

    // Clear cookie
    response.cookies.set('sessionId', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


