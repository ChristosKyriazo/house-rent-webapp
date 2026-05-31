import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { processAIChatTurn } from '@/lib/services/ai-chat-service'
import { requestLogger } from '@/lib/logger'
import { features } from '@/lib/features'

// POST /api/homes/ai-chat — conversational AI search
// Body: { message: string, conversationKey?: string, type?: "rent"|"buy" }
// Returns: { conversationKey, action, filters, assistantMessage, followUpQuestion? }
// When action === "search", pass filters to POST /api/homes/ai-search as preExtractedFilters
export async function POST(request: NextRequest) {
  const log = requestLogger(request)

  try {
    if (!features.aiSearch) {
      return NextResponse.json({ error: 'AI search is currently disabled' }, { status: 503 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { message, conversationKey, type } = body

    if (!message || !String(message).trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    if (type && type !== 'rent' && type !== 'buy') {
      return NextResponse.json({ error: 'type must be "rent" or "buy"' }, { status: 400 })
    }

    let userId: number | null = null
    try {
      const user = await getCurrentUser()
      if (user) userId = user.id
    } catch {
      // unauthenticated — allowed
    }

    const result = await processAIChatTurn(
      conversationKey ?? null,
      String(message).trim(),
      userId,
      type as 'rent' | 'buy' | undefined
    )

    log.info({ action: result.action, conversationKey: result.conversationKey }, 'ai-chat turn')

    return NextResponse.json(result)
  } catch (error) {
    log.error({ error }, 'ai-chat error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/homes/ai-chat/:key — retrieve conversation history
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (!key) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 })
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    const conversation = await prisma.searchConversation.findUnique({
      where: { key },
      select: { key: true, messages: true, accumulatedFilters: true, listingMode: true, createdAt: true },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    return NextResponse.json(conversation)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
