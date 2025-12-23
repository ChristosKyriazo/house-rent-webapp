import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/profile - get current user's profile
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get full user data including age, dateOfBirth, title, and occupation
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        dateOfBirth: true,
        title: true,
        occupation: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user: fullUser }, { status: 200 })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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

    const body = await request.json()
    const { name, age, dateOfBirth, title, occupation, role } = body

    // Validate role
    const validRoles = ['owner', 'user', 'both']
    const userRole = role && validRoles.includes(role.toLowerCase()) ? role.toLowerCase() : (user.role || 'user')
    
    console.log('Profile update - Role received:', role, 'Validated role:', userRole, 'Current user role:', user.role)

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name || null,
        // Keep supporting legacy age updates if provided, but prefer dateOfBirth
        age: age ? Number(age) : null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        title: title || null,
        occupation: occupation || null,
        role: userRole,
      },
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        dateOfBirth: true,
        title: true,
        occupation: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      { message: 'Profile updated', user: updatedUser },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

