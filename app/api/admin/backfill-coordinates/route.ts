import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { unauthorized } from '@/lib/api-utils'
import { calculatePropertyDistances } from '@/lib/google-maps'

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return unauthorized()

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const homes = await prisma.home.findMany({
    where: { latitude: null },
    select: { id: true, street: true, area: true, city: true, country: true },
  })

  let updated = 0
  let failed = 0

  for (const home of homes) {
    try {
      const result = await calculatePropertyDistances(home.street, home.area, home.city, home.country)
      if (result.propertyCoordinates) {
        await prisma.home.update({
          where: { id: home.id },
          data: { latitude: result.propertyCoordinates.lat, longitude: result.propertyCoordinates.lng },
        })
        updated++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  return NextResponse.json({ total: homes.length, updated, failed })
}
