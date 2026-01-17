import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { subscription } = body

    // Validate subscription value
    if (!subscription || ![1, 2, 3].includes(Number(subscription))) {
      return NextResponse.json(
        { error: 'Invalid subscription value. Must be 1 (Free), 2 (Plus), or 3 (Unlimited)' },
        { status: 400 }
      )
    }

    // Update user subscription
    // getCurrentUser should have already created the user if it didn't exist
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { subscription: Number(subscription) },
      })
    } catch (updateError: any) {
      console.error('Update error details:', {
        error: updateError,
        code: updateError?.code,
        userId: user.id,
        subscription: Number(subscription),
      })
      
      // If record not found, the user might not exist yet - this shouldn't happen
      // but let's handle it gracefully
      if (updateError?.code === 'P2025') {
        return NextResponse.json(
          { error: 'User record not found. Please try refreshing the page.' },
          { status: 404 }
        )
      }
      throw updateError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error setting subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to set subscription. Please try again.' },
      { status: 500 }
    )
  }
}

