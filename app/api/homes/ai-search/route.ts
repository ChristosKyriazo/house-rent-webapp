import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// POST /api/homes/ai-search - AI-powered home search
// For now, this is a simple keyword-based search
// In production, you'd integrate with an AI service (OpenAI, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, type } = body

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    // Simple keyword matching for now
    // In production, you'd use AI to:
    // 1. Extract requirements from the query (location, size, budget, etc.)
    // 2. Match against homes in the database
    // 3. Rank results by relevance

    const queryLower = query.toLowerCase()

    // Build search conditions
    // Note: SQLite doesn't support case-insensitive mode, but contains works case-insensitive by default
    const searchConditions = [
      { title: { contains: queryLower } },
      { description: { contains: queryLower } },
      { city: { contains: queryLower } },
      { country: { contains: queryLower } },
    ]
    
    // Extract location keywords and add to search conditions
    const locationKeywords = ['athens', 'greece', 'london', 'paris', 'berlin', 'rome', 'madrid']
    const foundLocation = locationKeywords.find(loc => queryLower.includes(loc))
    if (foundLocation) {
      searchConditions.push(
        { city: { contains: foundLocation } },
        { country: { contains: foundLocation } }
      )
    }
    
    // Build base where conditions
    const baseConditions: any = {
      OR: searchConditions,
    }
    
    // Try to extract numbers that might be bedrooms or price
    const numbers = query.match(/\d+/g)
    if (numbers) {
      const num = Number(numbers[0])
      if (num <= 10) {
        // Likely bedrooms
        baseConditions.bedrooms = num
      } else if (num >= 100) {
        // Likely price
        baseConditions.pricePerMonth = { lte: num * 1.2 } // Allow 20% variance
      }
    }
    
    // Filter by listing type if provided
    // Map 'buy' (from search UI) to 'sell' (in database)
    let where: any
    if (type) {
      if (type === 'buy') {
        // When user clicks "buy" in search, filter for "sell" listings
        where = {
          AND: [
            baseConditions,
            { listingType: 'sell' }
          ]
        }
      } else if (type === 'rent') {
        where = {
          AND: [
            baseConditions,
            { listingType: 'rent' }
          ]
        }
      } else {
        where = {
          AND: [
            baseConditions,
            { listingType: type }
          ]
        }
      }
    } else {
      where = baseConditions
    }

    // Exclude owner's own houses if user is also an owner
    // Check if user is authenticated and has owner role
    try {
      const user = await getCurrentUser()
      if (user) {
        const userRole = (user.role || 'user').toLowerCase()
        // If user is owner or both, exclude their own houses from search
        if (userRole === 'owner' || userRole === 'both') {
          // Add ownerId filter to existing where conditions
          if (where.AND) {
            where.AND.push({ ownerId: { not: user.id } })
          } else {
            where = {
              ...where,
              ownerId: { not: user.id }
            }
          }
        }
      }
    } catch (error) {
      // If getCurrentUser fails (user not logged in), continue without filtering
      // This allows unauthenticated users to search
    }

    const homes = await prisma.home.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, email: true, name: true },
        },
      },
    })

    return NextResponse.json(
      { 
        homes,
        message: 'AI search completed (using keyword matching for now)'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('AI search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

