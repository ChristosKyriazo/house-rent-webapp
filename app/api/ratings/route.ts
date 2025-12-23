import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserRatings } from '@/lib/ratings'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const ratings = await getUserRatings(user.id)
    return NextResponse.json({ ratings }, { status: 200 })
  } catch (error) {
    console.error('Get ratings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



