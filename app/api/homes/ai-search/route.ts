import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    const where: any = {
      OR: [
        { title: { contains: queryLower } },
        { description: { contains: queryLower } },
        { city: { contains: queryLower } },
        { country: { contains: queryLower } },
      ],
    }

    // Try to extract numbers that might be bedrooms or price
    const numbers = query.match(/\d+/g)
    if (numbers) {
      const num = Number(numbers[0])
      if (num <= 10) {
        // Likely bedrooms
        where.bedrooms = num
      } else if (num >= 100) {
        // Likely price
        where.pricePerMonth = { lte: num * 1.2 } // Allow 20% variance
      }
    }

    // Extract location keywords
    const locationKeywords = ['athens', 'greece', 'london', 'paris', 'berlin', 'rome', 'madrid']
    const foundLocation = locationKeywords.find(loc => queryLower.includes(loc))
    if (foundLocation) {
      where.OR.push(
        { city: { contains: foundLocation } },
        { country: { contains: foundLocation } }
      )
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

