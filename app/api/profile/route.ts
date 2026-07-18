import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { clerkClient } from '@clerk/nextjs/server'
import { requestLogger } from '@/lib/logger'
import { unauthorized } from '@/lib/api-utils'

// GET /api/profile - get current user's profile or a specific user by userId query param
export async function GET(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const searchParams = request.nextUrl.searchParams
    const userIdParam = searchParams.get('userId')

    let user
    if (userIdParam) {
      // Viewing another user's profile requires authentication
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        return unauthorized()
      }
      const userId = parseInt(userIdParam)
      if (isNaN(userId)) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
      }
      // Return only public-safe fields — no email or date of birth
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          occupation: true,
          role: true,
          createdAt: true,
        },
      })
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
    } else {
      // Get current user's profile
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        return unauthorized()
      }
      
      user = await prisma.user.findUnique({
        where: { id: currentUser.id },
        select: {
          id: true,
          email: true,
          name: true,
          dateOfBirth: true,
          occupation: true,
          role: true,
          verified: true,
          subscriptionTier: true,
          brokerCategory: true,
          parentBrokerId: true,
          createdAt: true,
        },
      })

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Include hidden listing count for owners/brokers so the banner can display it
      const role = (user.role ?? '').toLowerCase()
      if (role === 'owner' || role === 'both' || role === 'broker') {
        const overlimitHiddenCount = await prisma.home.count({
          where: { ownerId: currentUser.id, overlimitHiddenAt: { not: null } },
        })
        return NextResponse.json({ user: { ...user, overlimitHiddenCount } }, { status: 200 })
      }
    }

    return NextResponse.json({ user }, { status: 200 })
  } catch (error) {
    log.error({ err: error }, 'Get profile error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/profile - update current user's profile
export async function PATCH(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()

    if (!user) {
      return unauthorized()
    }

    const { name, dateOfBirth, occupation, role } = await request.json()
    
    // If user is a broker, they cannot change their role or occupation
    if (user.role === 'broker') {
      // Only update name, keep role as 'broker' and occupation as 'Broker'
      // Brokers don't have date of birth
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name || null,
          dateOfBirth: null, // Brokers don't have date of birth
          occupation: 'Broker', // Always keep as "Broker" for brokers
          role: 'broker', // Keep broker role
        },
        select: {
          id: true,
          email: true,
          name: true,
          dateOfBirth: true,
          occupation: true,
          role: true,
          subscriptionTier: true,
          createdAt: true,
        },
      })
      return NextResponse.json({ message: 'Profile updated', user: updatedUser }, { status: 200 })
    }

    // For non-broker users, only allow changing to user/owner/both (not broker)
    const validRoles = ['owner', 'user', 'both']
    const userRole = role && validRoles.includes(role.toLowerCase()) ? role.toLowerCase() : (user.role || 'user')

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        occupation: occupation || null,
        role: userRole,
      },
      select: {
        id: true,
        email: true,
        name: true,
        dateOfBirth: true,
        occupation: true,
        role: true,
        subscriptionTier: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ message: 'Profile updated', user: updatedUser }, { status: 200 })
  } catch (error) {
    log.error({ err: error }, 'Update profile error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/profile - delete current user's account
export async function DELETE(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()

    if (!user) {
      return unauthorized()
    }

    const clerkUserId = user.clerkUserId

    // Delete from Clerk FIRST — if this fails we abort before touching the DB,
    // so the user's account stays intact and they see a real error.
    if (clerkUserId) {
      const clerk = await clerkClient()
      await clerk.users.deleteUser(clerkUserId)
    }

    // Clerk deletion succeeded — now remove the DB record (cascades handle related rows)
    await prisma.user.delete({
      where: { id: user.id },
    })

    return NextResponse.json({ message: 'Account deleted successfully' }, { status: 200 })
  } catch (error) {
    log.error({ err: error }, 'Delete account error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

