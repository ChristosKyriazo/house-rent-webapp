import { clerkMiddleware } from '@clerk/nextjs/server'

export const proxy = clerkMiddleware()

export const config = {
  matcher: [
    // Run proxy on all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}


