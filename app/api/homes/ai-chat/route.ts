import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { processAIChatTurn } from '@/lib/services/ai-chat-service'
import { requestLogger } from '@/lib/logger'
import { features } from '@/lib/features'
import { unauthorized } from '@/lib/api-utils'

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

    const user = await getCurrentUser().catch(() => null)
    if (!user) {
      return unauthorized()
    }
    const userId = user.id

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

// PATCH /api/homes/ai-chat — overwrite a conversation's accumulated filters
// Body: { conversationKey: string, filters: object }
// Used by the filter chips: removing a bound re-runs the search directly, with no model
// call and no AI credit, so the stored filters must be updated out of band. Without this
// the next chat turn would resurrect whatever the user just removed.
export async function PATCH(request: NextRequest) {
  const log = requestLogger(request)

  try {
    if (!features.aiSearch) {
      return NextResponse.json({ error: 'AI search is currently disabled' }, { status: 503 })
    }

    const user = await getCurrentUser().catch(() => null)
    if (!user) return unauthorized()

    const body = await request.json()
    const { conversationKey, filters } = body

    if (!conversationKey || typeof conversationKey !== 'string') {
      return NextResponse.json({ error: 'conversationKey is required' }, { status: 400 })
    }
    if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
      return NextResponse.json({ error: 'filters must be an object' }, { status: 400 })
    }

    const { prisma } = await import('@/lib/prisma')
    const conversation = await prisma.searchConversation.findUnique({
      where: { key: conversationKey },
      select: { id: true, userId: true },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    if (conversation.userId !== null && conversation.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { Prisma } = await import('@prisma/client')
    await prisma.searchConversation.update({
      where: { key: conversationKey },
      data: {
        accumulatedFilters: filters as object,
        // A hand-edit invalidates any bound the assistant was waiting on: the user has
        // moved on, and binding their next bare number to a stale question would be wrong.
        pendingNumeric: Prisma.DbNull,
      },
    })

    log.info({ conversationKey }, 'ai-chat filters patched')
    return NextResponse.json({ ok: true, filters })
  } catch (error) {
    log.error({ error }, 'ai-chat patch error')
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
    const { getCurrentUser } = await import('@/lib/auth')
    const user = await getCurrentUser().catch(() => null)
    if (!user) {
      return unauthorized()
    }

    const { prisma } = await import('@/lib/prisma')
    const conversation = await prisma.searchConversation.findUnique({
      where: { key },
      select: { key: true, userId: true, messages: true, accumulatedFilters: true, listingMode: true, createdAt: true },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Prevent users from reading each other's conversation history
    if (conversation.userId !== null && conversation.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(conversation)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
