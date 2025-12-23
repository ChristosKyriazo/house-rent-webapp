import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { id } = await params
    
    // Find home by key or id
    const home = await prisma.home.findFirst({
      where: {
        OR: [
          { key: id },
          { id: isNaN(Number(id)) ? -1 : Number(id) }
        ]
      },
      select: { id: true, ownerId: true },
    })

    if (!home) {
      return NextResponse.json(
        { error: 'Home not found' },
        { status: 404 }
      )
    }

    if (home.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    // Set area to 'Nea Smirni' (hard-coded for now)
    const area = 'Nea Smirni'
    const updatedHome = await prisma.home.update({
      where: { id: home.id },
      data: { area },
      select: {
        id: true,
        area: true,
      },
    })

    return NextResponse.json(
      { message: 'Area confirmed', area: updatedHome.area },
      { status: 200 }
    )
  } catch (error) {
    console.error('Confirm area error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

