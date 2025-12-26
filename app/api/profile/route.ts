import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/profile - get current user's profile or a specific user by userId query param
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userIdParam = searchParams.get('userId')

    let user
    if (userIdParam) {
      // Fetch specific user by ID (for viewing other users' profiles/ratings)
      const userId = parseInt(userIdParam)
      if (isNaN(userId)) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
      }
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          dateOfBirth: true,
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
      user = await getCurrentUser()
      if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }
    }

    return NextResponse.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        dateOfBirth: user.dateOfBirth,
        occupation: user.occupation,
        role: user.role,
        createdAt: user.createdAt,
      }
    }, { status: 200 })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/profile - update current user's profile
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { name, dateOfBirth, occupation, role } = await request.json()
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
        createdAt: true,
      },
    })

    return NextResponse.json({ message: 'Profile updated', user: updatedUser }, { status: 200 })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

