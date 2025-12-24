import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET: Get all inquiries for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const inquiries = await prisma.inquiry.findMany({
      where: { userId: user.id },
      select: { homeId: true },
    })

    const homeIds = inquiries.map(inq => inq.homeId)
    return NextResponse.json({ homeIds }, { status: 200 })
  } catch (error) {
    console.error('Get inquiries error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create an inquiry
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { homeId } = body

    if (!homeId) {
      return NextResponse.json(
        { error: 'Home ID is required' },
        { status: 400 }
      )
    }

    // Check if inquiry already exists
    const existing = await prisma.inquiry.findFirst({
      where: {
        userId: user.id,
        homeId: parseInt(homeId),
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Inquiry already exists' },
        { status: 400 }
      )
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        userId: user.id,
        homeId: parseInt(homeId),
      },
    })

    return NextResponse.json({ inquiry }, { status: 201 })
  } catch (error: any) {
    console.error('Create inquiry error:', error)
    
    // Handle Prisma unique constraint violation
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Inquiry already exists' },
        { status: 400 }
      )
    }
    
    // Handle other Prisma errors
    if (error?.code) {
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE: Remove an inquiry
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const homeId = searchParams.get('homeId')

    if (!homeId) {
      return NextResponse.json(
        { error: 'Home ID is required' },
        { status: 400 }
      )
    }

    await prisma.inquiry.deleteMany({
      where: {
        userId: user.id,
        homeId: parseInt(homeId),
      },
    })

    return NextResponse.json({ message: 'Inquiry removed' }, { status: 200 })
  } catch (error) {
    console.error('Delete inquiry error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

