import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Explicit public API surface. Everything else under /api requires a signed-in
// Clerk user — a new route that forgets its own auth check is denied by
// default instead of silently public. Route handlers still perform their own
// (finer-grained) authorization on top of this.
const isPublicApi = createRouteMatcher([
  '/api/healthz',
  '/api/readyz',
  '/api/bookings/reminders', // protected internally by x-cron-secret
  '/api/areas/search',
  '/api/cities/search',
  '/api/countries/search',
  '/api/homes/template',
  '/api/ratings/home/(.*)', // public rating display for listings
  '/api/ratings/:userId', // public user score display
  '/api/homes/:id/view', // anonymous view analytics
  '/api/homes/:id/view/duration',
  '/api/homes/ai-chat', // optional-auth AI chat
  '/api/ai-prompt-usage', // optional-auth usage metering
])

// Read-only browse endpoints, public for GET/HEAD only. Named sub-paths that
// also match ':id' (e.g. /api/homes/saved) keep their own internal 401s.
const isPublicBrowse = createRouteMatcher(['/api/homes', '/api/homes/:id'])

const isApi = createRouteMatcher(['/api(.*)'])

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const requestId = crypto.randomUUID()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)

  if (isApi(request)) {
    const isReadOnly = request.method === 'GET' || request.method === 'HEAD'
    const isPublic = isPublicApi(request) || (isReadOnly && isPublicBrowse(request))
    if (!isPublic) {
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401, headers: { 'x-request-id': requestId } }
        )
      }
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('x-request-id', requestId)
  return response
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Exclude Stripe webhook — signature verification requires the raw unmodified body
    '/(api(?!/webhooks/stripe)|trpc)(.*)',
  ],
}
