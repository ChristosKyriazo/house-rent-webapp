import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'
import { CONVERSATIONAL_SEARCH_SYSTEM_PROMPT } from '@/lib/ai-prompts'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ConversationalFilters {
  city?: string | null
  country?: string | null
  area?: string | null
  listingType?: string | null
  minPrice?: number | null
  maxPrice?: number | null
  minBedrooms?: number | null
  maxBedrooms?: number | null
  minSize?: number | null
  maxSize?: number | null
  parking?: boolean | null
  parkingSoftPreference?: boolean | null
  heatingCategory?: string | null
  heatingAgent?: string | null
  minFloor?: number | null
  maxFloor?: number | null
  minYearBuilt?: number | null
  maxYearBuilt?: number | null
  minYearRenovated?: number | null
  maxYearRenovated?: number | null
  minBathrooms?: number | null
  maxBathrooms?: number | null
  Metro?: string | null
  Bus?: string | null
  School?: string | null
  Hospital?: string | null
  Park?: string | null
  University?: string | null
  Safety?: string | null
  preferredAreas?: string[] | null
  vibePreference?: string | null
  confidence?: number
}

interface ConversationalAIResponse {
  action: 'search' | 'ask'
  filters: ConversationalFilters
  assistantMessage: string
  followUpQuestion?: string
}

export async function processAIChatTurn(
  conversationKey: string | null,
  userMessage: string,
  userId: number | null,
  listingMode?: 'rent' | 'buy'
): Promise<{
  conversationKey: string
  action: 'search' | 'ask'
  filters: ConversationalFilters
  assistantMessage: string
  followUpQuestion?: string
}> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  let conversation: { key: string; messages: ChatMessage[]; accumulatedFilters: ConversationalFilters } | null = null

  if (conversationKey) {
    const existing = await prisma.searchConversation.findUnique({
      where: { key: conversationKey },
      select: { key: true, messages: true, accumulatedFilters: true },
    })
    if (existing) {
      conversation = {
        key: existing.key,
        messages: existing.messages as unknown as ChatMessage[],
        accumulatedFilters: existing.accumulatedFilters as unknown as ConversationalFilters,
      }
    }
  }

  const fullHistory: ChatMessage[] = conversation?.messages ?? []
  const accumulated: ConversationalFilters = conversation?.accumulatedFilters ?? {}

  // Keep only the last 6 turns (12 messages) to cap token usage
  const MAX_HISTORY_MESSAGES = 12
  const history = fullHistory.slice(-MAX_HISTORY_MESSAGES)

  const modeHint =
    listingMode === 'buy'
      ? '\n\n[Search mode: FOR SALE. minPrice/maxPrice are total purchase price in EUR.]'
      : listingMode === 'rent'
        ? '\n\n[Search mode: FOR RENT. minPrice/maxPrice are monthly rent in EUR.]'
        : ''

  const accumulatedContext =
    Object.keys(accumulated).length > 0
      ? `\n\n[Accumulated filters from previous turns: ${JSON.stringify(accumulated)}]`
      : ''

  const messagesForAI: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: CONVERSATIONAL_SEARCH_SYSTEM_PROMPT + modeHint + accumulatedContext },
    ...history.map((m) => ({ role: m.role, content: m.content } as OpenAI.Chat.ChatCompletionMessageParam)),
    { role: 'user', content: userMessage },
  ]

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15_000)

  let aiResponse: ConversationalAIResponse
  try {
    const completion = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: messagesForAI,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      },
      { signal: controller.signal }
    )

    const content = completion.choices[0]?.message?.content
    if (!content) throw new Error('Empty AI response')
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(content)
    } catch {
      throw new Error('AI chat returned invalid JSON')
    }
    if (!parsed.action || !parsed.assistantMessage) throw new Error('AI chat response missing required fields')
    aiResponse = parsed as unknown as ConversationalAIResponse
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
  clearTimeout(timeoutId)

  const mergedFilters: ConversationalFilters = mergeFilters(accumulated, aiResponse.filters ?? {})

  const updatedHistory: ChatMessage[] = [
    ...fullHistory,
    { role: 'user', content: userMessage },
    { role: 'assistant', content: aiResponse.assistantMessage },
  ]

  let savedKey: string
  const messagesJson = updatedHistory as any
  const filtersJson = mergedFilters as any

  if (conversation) {
    const updated = await prisma.searchConversation.update({
      where: { key: conversation.key },
      data: { messages: messagesJson, accumulatedFilters: filtersJson, listingMode: listingMode ?? undefined },
      select: { key: true },
    })
    savedKey = updated.key
  } else {
    const created = await prisma.searchConversation.create({
      data: { userId, messages: messagesJson, accumulatedFilters: filtersJson, listingMode: listingMode ?? undefined },
      select: { key: true },
    })
    savedKey = created.key
  }

  return {
    conversationKey: savedKey,
    action: aiResponse.action,
    filters: mergedFilters,
    assistantMessage: aiResponse.assistantMessage,
    followUpQuestion: aiResponse.followUpQuestion,
  }
}

function mergeFilters(
  accumulated: ConversationalFilters,
  incoming: ConversationalFilters
): ConversationalFilters {
  const merged = { ...accumulated }
  for (const [k, v] of Object.entries(incoming)) {
    const key = k as keyof ConversationalFilters
    if (v === undefined) continue
    // Discard noise values — treat as "not set"
    if (
      v === null ||
      v === 'Not mentioned' ||
      v === '' ||
      (Array.isArray(v) && v.length === 0)
    ) {
      delete (merged as Record<string, unknown>)[key]
    } else {
      ;(merged as any)[key] = v
    }
  }
  return merged
}
