import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { unauthorized, badRequest, forbidden } from '@/lib/api-utils'

// PATCH /api/saved-searches/[key] — update notificationsEnabled or minMatchPercent
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()

  const { key } = await params

  const search = await prisma.savedSearch.findUnique({ where: { key } })
  if (!search) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (search.userId !== user.id) return forbidden('Not your saved search')

  let body: { notificationsEnabled?: boolean; minMatchPercent?: number; name?: string }
  try {
    body = await request.json()
  } catch {
    return badRequest('Invalid JSON')
  }

  const data: Record<string, unknown> = {}
  if (typeof body.notificationsEnabled === 'boolean') data.notificationsEnabled = body.notificationsEnabled
  if (typeof body.minMatchPercent === 'number') {
    if (body.minMatchPercent < 1 || body.minMatchPercent > 100) return badRequest('minMatchPercent must be 1–100')
    data.minMatchPercent = body.minMatchPercent
  }
  if (typeof body.name === 'string') data.name = body.name

  const updated = await prisma.savedSearch.update({ where: { key }, data })
  return NextResponse.json({ search: updated })
}

// DELETE /api/saved-searches/[key]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()

  const { key } = await params

  const search = await prisma.savedSearch.findUnique({ where: { key } })
  if (!search) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (search.userId !== user.id) return forbidden('Not your saved search')

  await prisma.savedSearch.delete({ where: { key } })
  return NextResponse.json({ ok: true })
}
