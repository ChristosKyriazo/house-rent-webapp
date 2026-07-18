import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'
import { CONVERSATIONAL_SEARCH_SYSTEM_PROMPT } from '@/lib/ai-prompts'
import { generateEmbedding } from '@/lib/embeddings'
import { createLocationResolver } from '@/lib/search/fuzzy-location'

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
      ? '\n\n[Search mode: FOR SALE — the user already chose this in the app. NEVER ask whether they want to rent or buy. minPrice/maxPrice are total purchase price in EUR.]'
      : listingMode === 'rent'
        ? '\n\n[Search mode: FOR RENT — the user already chose this in the app. NEVER ask whether they want to rent or buy. minPrice/maxPrice are monthly rent in EUR.]'
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

  // The UI mode is authoritative for rent-vs-buy — the model never asks for it
  // and must not be able to override it.
  if (listingMode) {
    mergedFilters.listingType = listingMode === 'buy' ? 'sale' : 'rent'
  }

  // The model echoes the user's spelling ("Nea Smirni"). Pin the accumulated
  // filters to the canonical area names so later turns and the assistant's own
  // prose stay consistent with the DB.
  const areas = await prisma.area.findMany({
    select: { name: true, nameGreek: true, city: true, cityGreek: true, country: true, countryGreek: true },
  })
  const rewrites = canonicalizeFilterLocations(mergedFilters, createLocationResolver(areas))

  const assistantMessage = applyLocationRewrites(aiResponse.assistantMessage, rewrites)
  const followUpQuestion = aiResponse.followUpQuestion
    ? applyLocationRewrites(aiResponse.followUpQuestion, rewrites)
    : undefined

  // Persist the text the user actually saw. On "ask" turns the UI renders
  // followUpQuestion, not assistantMessage — storing the latter left the model
  // blind to its own question, so a bare reply ("2") looked like it answered
  // nothing and the same question came back next turn.
  const visibleText =
    aiResponse.action === 'ask' && followUpQuestion ? followUpQuestion : assistantMessage

  const updatedHistory: ChatMessage[] = [
    ...fullHistory,
    { role: 'user', content: userMessage },
    { role: 'assistant', content: visibleText },
  ]

  let savedKey: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messagesJson = updatedHistory as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Persist query embedding so AI saved-search matching can use it.
  // Fire-and-forget: doesn't block the chat response.
  if (aiResponse.action === 'search') {
    generateEmbedding(userMessage, openai)
      .then(vec => prisma.searchConversation.update({
        where: { key: savedKey },
        data: { embedding: vec as unknown as never },
      }))
      .catch(() => { /* non-critical — saved search can still be created without embedding */ })
  }

  return {
    conversationKey: savedKey,
    action: aiResponse.action,
    filters: mergedFilters,
    assistantMessage,
    followUpQuestion,
  }
}

// Exported for unit tests — the null-vs-CLEAR semantics caused a real bug
// (accumulated answers were wiped every turn) and must not regress.
const GREEK_SCRIPT = /[Ͱ-Ͽἀ-῿]/

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** A location name the model spelled differently from the DB's canonical form. */
interface Rewrite {
  raw: string
  canonical: string
}

/**
 * Rewrite the model's spelling of a place to the canonical one in prose it wrote
 * ("Great choice with Nea Smirni!" → "…with Nea Smyrni!").
 *
 * Only Latin-script spellings are rewritten. If the user is conversing in Greek
 * the model answers in Greek, and substituting the English canonical mid-sentence
 * would mangle it — a wrong-looking echo beats a broken one.
 */
export function applyLocationRewrites(text: string, rewrites: Rewrite[]): string {
  let result = text
  for (const { raw, canonical } of rewrites) {
    if (GREEK_SCRIPT.test(raw)) continue
    result = result.replace(new RegExp(`\\b${escapeRegExp(raw)}\\b`, 'gi'), canonical)
  }
  return result
}

type LocationResolver = ReturnType<typeof createLocationResolver>

/**
 * Map the model's free-text city/area/country onto canonical `areas` rows, in
 * place. Returns the substitutions made so the assistant's prose can follow suit.
 */
export function canonicalizeFilterLocations(
  filters: ConversationalFilters,
  resolver: LocationResolver
): Rewrite[] {
  const rewrites: Rewrite[] = []

  const track = (raw: string, canonical: string | null): string => {
    if (!canonical || canonical === raw) return raw
    rewrites.push({ raw, canonical })
    return canonical
  }

  if (typeof filters.city === 'string') {
    const resolvedCity = resolver.resolveCity(filters.city)
    if (resolvedCity) {
      filters.city = track(filters.city, resolvedCity)
    } else if (!filters.area) {
      // Not a known city — the model often puts an area name here ("Nea Smirni")
      const resolvedAsArea = resolver.resolveArea(filters.city)
      if (resolvedAsArea) {
        filters.area = track(filters.city, resolvedAsArea)
        filters.city = null
      }
    }
  }

  // The city (resolved just above) disambiguates areas whose name two cities share
  const cityHint = typeof filters.city === 'string' ? filters.city : null

  if (typeof filters.area === 'string') {
    filters.area = track(filters.area, resolver.resolveArea(filters.area, cityHint))
  }

  if (typeof filters.country === 'string') {
    filters.country = track(filters.country, resolver.resolveCountry(filters.country))
  }

  if (Array.isArray(filters.preferredAreas)) {
    filters.preferredAreas = filters.preferredAreas.map((name) =>
      track(name, resolver.resolveArea(name, cityHint))
    )
  }

  return rewrites
}

export function mergeFilters(
  accumulated: ConversationalFilters,
  incoming: ConversationalFilters
): ConversationalFilters {
  const merged = { ...accumulated }
  for (const [k, v] of Object.entries(incoming)) {
    const key = k as keyof ConversationalFilters
    // The model emits null/"Not mentioned"/empty for fields it didn't extract
    // this turn — that means "no new information", NOT "clear". Deleting here
    // wiped previously-given answers ("I told you I have a kid" bug).
    if (
      v === undefined ||
      v === null ||
      v === 'Not mentioned' ||
      v === '' ||
      (Array.isArray(v) && v.length === 0)
    ) {
      continue
    }
    // Explicit user mind-change: the model sets the field to "CLEAR"
    if (v === 'CLEAR') {
      delete (merged as Record<string, unknown>)[key]
      continue
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(merged as any)[key] = v
  }
  return merged
}
