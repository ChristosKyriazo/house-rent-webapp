import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { isAdminUser } from '@/lib/admin'
import { features } from '@/lib/features'
import { unauthorized, badRequest } from '@/lib/api-utils'
import { checkUsageAssistantLimit } from '@/lib/rate-limit'
import { requestLogger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { processUsageAssistantTurn, ConversationAccessError } from '@/lib/services/usage-assistant-service'

const MSG_MAX_LENGTH = 500

// POST /api/assistant/usage — one chatbot turn
// Body: { message: string, conversationKey?: string }
// Returns: { conversationKey, assistantMessage, title, isAdmin }
export async function POST(request: NextRequest) {
  const log = requestLogger(request)

  if (!features.usageAssistant) {
    return NextResponse.json({ error: 'The usage assistant is currently disabled' }, { status: 503 })
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
  }

  const user = await getCurrentUser().catch(() => null)
  if (!user) return unauthorized()

  if (!(await checkUsageAssistantLimit(user.id))) {
    return NextResponse.json({ error: 'rate_limited', message: 'Too many requests. Please slow down.' }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return badRequest('Invalid request body')

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return badRequest('message is required')
  if (message.length > MSG_MAX_LENGTH) return badRequest(`message must be at most ${MSG_MAX_LENGTH} characters`)

  const conversationKey = typeof body.conversationKey === 'string' ? body.conversationKey : null
  const isAdmin = isAdminUser(user)

  try {
    const result = await processUsageAssistantTurn({
      conversationKey,
      message,
      actingUserId: user.id,
      isAdmin,
    })
    log.info({ conversationKey: result.conversationKey, isAdmin }, 'usage-assistant turn')
    return NextResponse.json({ ...result, isAdmin })
  } catch (error) {
    if (error instanceof ConversationAccessError) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    log.error({ error }, 'usage-assistant error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/assistant/usage        — list the caller's own threads
// GET /api/assistant/usage?key=…  — fetch one thread's transcript
export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null)
  if (!user) return unauthorized()

  const key = new URL(request.url).searchParams.get('key')

  if (key) {
    const conversation = await prisma.assistantConversation.findUnique({
      where: { key },
      select: { key: true, userId: true, title: true, messages: true, scope: true, createdAt: true },
    })
    // Scope reads to the owner; 404 (not 403) so keys can't be probed.
    if (!conversation || conversation.userId !== user.id) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    return NextResponse.json({ ...conversation, isAdmin: isAdminUser(user) })
  }

  const threads = await prisma.assistantConversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: { key: true, title: true, updatedAt: true },
  })
  return NextResponse.json({ threads, isAdmin: isAdminUser(user) })
}
