import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { unauthorized } from '@/lib/api-utils'

// TODO: gate behind Stripe payment before flipping viberAlertsActive
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return unauthorized()

  await prisma.user.update({
    where: { id: user.id },
    data: { viberAlertsActive: true },
  })

  return NextResponse.json({ ok: true })
}
