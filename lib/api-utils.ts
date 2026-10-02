import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden(error: string) {
  return NextResponse.json({ error }, { status: 403 })
}

export function notFound(error: string) {
  return NextResponse.json({ error }, { status: 404 })
}

export function serverError() {
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export function parsePositiveInt(value: unknown): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

export function parseValidDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

/**
 * Validate a parsed request body against a Zod schema.
 * Returns { data } on success or a 400 NextResponse on failure.
 */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { data: T; error?: never } | { data?: never; error: NextResponse } {
  const result = schema.safeParse(body)
  if (!result.success) {
    const messages = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
    return {
      error: NextResponse.json({ error: 'Validation failed', details: messages }, { status: 400 }),
    }
  }
  return { data: result.data }
}

/**
 * This environment's public origin, for URLs that leave the app — Stripe
 * success/cancel redirects, invite links in emails.
 *
 * The request's own `Origin` header wins when present. `APP_ORIGIN` is the
 * per-environment fallback, written into the server `.env` by deploy.yml.
 * The last resort is localhost on purpose: a missing `APP_ORIGIN` should
 * produce an obviously broken local URL, never a link into a *different*
 * environment. Hardcoding a real host here is how a production checkout ends
 * up redirecting to the QA domain.
 */
export function appOrigin(request: NextRequest): string {
  return request.headers.get('origin') ?? process.env.APP_ORIGIN ?? 'http://localhost:3000'
}
