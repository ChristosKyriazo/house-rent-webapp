import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// POST /api/auth/set-role - Set user role after signup
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { role } = body

    // Validate role
    const validRoles = ['user', 'owner', 'both', 'broker']
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Find user by clerkUserId
    let user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    if (!user) {
      // User doesn't exist yet, create it with the selected role
      // This can happen if set-role is called before getCurrentUser() creates the user
      let cUser
      try {
        cUser = await currentUser()
      } catch (clerkError: any) {
        console.error('Error fetching Clerk user:', clerkError)
        return NextResponse.json(
          { error: 'Failed to fetch user information' },
          { status: 500 }
        )
      }

      if (!cUser) {
        return NextResponse.json(
          { error: 'User not found in Clerk' },
          { status: 404 }
        )
      }

      const email = cUser.emailAddresses?.[0]?.emailAddress || 
                    cUser.primaryEmailAddress?.emailAddress || 
                    `clerk-${userId}@placeholder.local`

      let name: string | null = null
      if (cUser.username) {
        name = cUser.username
      } else if (cUser.firstName || cUser.lastName) {
        name = `${cUser.firstName || ''} ${cUser.lastName || ''}`.trim()
      }

      try {
        user = await prisma.user.create({
          data: {
            clerkUserId: userId,
            email,
            name,
            role, // Use the selected role instead of default 'user'
          },
        })
      } catch (createError: any) {
        // Handle race condition - user might have been created by another request
        if (createError?.code === 'P2002') {
          user = await prisma.user.findUnique({
            where: { clerkUserId: userId },
          })
          if (!user) {
            throw createError
          }
        } else {
          throw createError
        }
      }
    }

    // Update user role (or create was already done with correct role)
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role },
    })

    return NextResponse.json(
      { message: 'Role updated successfully', user: updatedUser },
      { status: 200 }
    )
  } catch (error) {
    console.error('Set role error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

