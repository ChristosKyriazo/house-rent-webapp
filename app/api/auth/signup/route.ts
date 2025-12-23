import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, age, dateOfBirth, title, occupation, role } = body

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password (never store plain text!)
    const hashedPassword = await bcrypt.hash(password, 10)

    // Validate role
    const validRoles = ['owner', 'user', 'both']
    const userRole = role && validRoles.includes(role) ? role : 'user'
    
    console.log('Signup - Role received:', role, 'Validated role:', userRole)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        // Prefer storing date of birth; keep age for backward compatibility if ever used
        age: age ? Number(age) : null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        title: title || null,
        occupation: occupation || null,
        role: userRole,
      },
      // Don't return password in response
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        dateOfBirth: true,
        title: true,
        occupation: true,
        role: true,
        createdAt: true
      }
    })

    // Build response and attach session cookie
    const response = NextResponse.json(
      { message: 'User created successfully', user },
      { status: 201 }
    )

    // Create a session and set HTTP-only cookie
    await createSession(user.id, response as any)

    return response
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

