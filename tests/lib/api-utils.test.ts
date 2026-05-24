import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
  parsePositiveInt,
  parseValidDate,
  validateBody,
} from '@/lib/api-utils'

describe('response helpers', () => {
  it('badRequest returns 400 with error message', async () => {
    const res = badRequest('Bad input')
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Bad input')
  })

  it('unauthorized returns 401', async () => {
    const res = unauthorized()
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Unauthorized')
  })

  it('forbidden returns 403 with error message', async () => {
    const res = forbidden('No access')
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('No access')
  })

  it('notFound returns 404 with error message', async () => {
    const res = notFound('Missing resource')
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Missing resource')
  })

  it('serverError returns 500', async () => {
    const res = serverError()
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Internal server error')
  })
})

describe('parsePositiveInt', () => {
  it.each([
    [1, 1],
    ['5', 5],
    ['100', 100],
  ])('parses %s as %d', (input, expected) => {
    expect(parsePositiveInt(input)).toBe(expected)
  })

  it.each([0, -1, 1.5, 'abc', '', null, undefined])(
    'returns null for %s',
    (input) => {
      expect(parsePositiveInt(input)).toBeNull()
    }
  )
})

describe('parseValidDate', () => {
  it('parses a valid ISO date string', () => {
    const result = parseValidDate('2026-06-01T10:00:00Z')
    expect(result).toBeInstanceOf(Date)
    expect(result!.getFullYear()).toBe(2026)
  })

  it('parses a plain date string', () => {
    expect(parseValidDate('2026-06-01')).toBeInstanceOf(Date)
  })

  it.each(['', '   ', 'not-a-date', 123, null, undefined])(
    'returns null for %s',
    (input) => {
      expect(parseValidDate(input)).toBeNull()
    }
  )
})

describe('validateBody', () => {
  const schema = z.object({ name: z.string().min(1), age: z.number().int().positive() })

  it('returns data when input is valid', () => {
    const result = validateBody(schema, { name: 'Alice', age: 30 })
    expect(result.data).toEqual({ name: 'Alice', age: 30 })
    expect(result.error).toBeUndefined()
  })

  it('returns 400 response with details when input is invalid', async () => {
    const result = validateBody(schema, { name: '', age: -1 })
    expect(result.data).toBeUndefined()
    expect(result.error?.status).toBe(400)
    const body = await result.error!.json()
    expect(body.error).toBe('Validation failed')
    expect(body.details).toBeInstanceOf(Array)
    expect(body.details.length).toBeGreaterThan(0)
  })

  it('returns 400 when body is completely wrong shape', async () => {
    const result = validateBody(schema, null)
    expect(result.error?.status).toBe(400)
  })
})
