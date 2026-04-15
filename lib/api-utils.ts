import { NextResponse } from 'next/server'

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
