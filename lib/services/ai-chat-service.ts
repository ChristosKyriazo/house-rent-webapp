import OpenAI from 'openai'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { CONVERSATIONAL_SEARCH_SYSTEM_PROMPT } from '@/lib/ai-prompts'
import { generateEmbedding } from '@/lib/embeddings'
import { createLocationResolver } from '@/lib/search/fuzzy-location'
import {
  bindPendingNumericAnswer,
  reconcileBounds,
  BOUND_FIELDS,
} from '@/lib/search/numeric-bounds'
import { buildIntentText, hasUsableIntent } from '@/lib/search/intent-text'
import { selectNextQuestion, ALL_SLOT_FIELDS } from '@/lib/search/dialogue-policy'
import { buildQuestion, closingLine } from '@/lib/search/question-templates'

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

/**
 * What the model is responsible for, and nothing more: reading the utterance into filter
 * observations, naming what the user dropped, and one warm sentence.
 *
 * It no longer chooses the next question, the bound direction, or whether to keep asking.
 * Those were carried on prompt adherence — a channel the model can silently drop — while
 * the code that selects the question already knows the answer.
 */
interface ConversationalAIResponse {
  filters: ConversationalFilters
  /** Fields the user explicitly dropped or reversed this turn. */
  clearFields?: string[]
  assistantMessage: string
}

/** Every filter field the model may write, with the value shapes each accepts. */
const NUMERIC_FILTER_FIELDS = [
  'minPrice', 'maxPrice', 'minBedrooms', 'maxBedrooms', 'minBathrooms', 'maxBathrooms',
  'minSize', 'maxSize', 'minFloor', 'maxFloor',
  'minYearBuilt', 'maxYearBuilt', 'minYearRenovated', 'maxYearRenovated',
] as const

const STRING_FILTER_FIELDS = [
  'city', 'country', 'area', 'heatingCategory', 'heatingAgent', 'vibePreference',
] as const

const CATEGORY_FILTER_FIELDS = [
  'Metro', 'Bus', 'School', 'Hospital', 'Park', 'University', 'Safety',
] as const

const BOOLEAN_FILTER_FIELDS = ['parking', 'parkingSoftPreference', 'hasLocationPreference'] as const

/**
 * Structured Outputs schema for the turn response.
 *
 * `json_object` only guaranteed the reply was syntactically JSON — field presence, field
 * names and enum membership were all prompt-adherence hopes, and `pendingNumeric` in
 * particular is correctness-critical: if the model drops it, the next bare number binds to
 * nothing. With `strict: true` constrained decoding makes an out-of-enum value
 * *undecodable* rather than merely discouraged.
 *
 * Strict mode requires every property to be listed in `required` with
 * `additionalProperties: false`, so "omit what you didn't extract" becomes "emit null" —
 * which `mergeFilters` already treats as no-new-information.
 */
function buildResponseSchema(): Record<string, unknown> {
  const properties: Record<string, unknown> = {}

  for (const field of NUMERIC_FILTER_FIELDS) {
    // "CLEAR" is the mind-change sentinel, so a number field must also admit that string.
    properties[field] = { type: ['number', 'string', 'null'] }
  }
  for (const field of STRING_FILTER_FIELDS) {
    properties[field] = { type: ['string', 'null'] }
  }
  for (const field of CATEGORY_FILTER_FIELDS) {
    properties[field] = {
      type: ['string', 'null'],
      enum: ['Essential', 'Strong', 'Not important', 'Avoid', 'Not mentioned', 'CLEAR', null],
    }
  }
  for (const field of BOOLEAN_FILTER_FIELDS) {
    properties[field] = { type: ['boolean', 'string', 'null'] }
  }
  properties.preferredAreas = { type: ['array', 'null'], items: { type: 'string' } }

  return {
    type: 'object',
    additionalProperties: false,
    required: ['filters', 'clearFields', 'assistantMessage'],
    properties: {
      assistantMessage: { type: 'string' },
      clearFields: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            ...NUMERIC_FILTER_FIELDS,
            ...STRING_FILTER_FIELDS,
            ...CATEGORY_FILTER_FIELDS,
            ...BOOLEAN_FILTER_FIELDS,
            'preferredAreas',
          ],
        },
      },
      filters: {
        type: 'object',
        additionalProperties: false,
        required: [
          ...NUMERIC_FILTER_FIELDS,
          ...STRING_FILTER_FIELDS,
          ...CATEGORY_FILTER_FIELDS,
          ...BOOLEAN_FILTER_FIELDS,
          'preferredAreas',
        ],
        properties,
      },
    },
  }
}

const RESPONSE_SCHEMA = buildResponseSchema()

/**
 * The area table was read in full on every single chat turn, purely to build the
 * name resolver. Areas change on the order of never; cache the resolver.
 */
const AREA_CACHE_TTL_MS = 10 * 60 * 1000
let areaResolverCache: { resolver: ReturnType<typeof createLocationResolver>; ts: number } | null = null

async function getLocationResolver() {
  if (areaResolverCache && Date.now() - areaResolverCache.ts < AREA_CACHE_TTL_MS) {
    return areaResolverCache.resolver
  }
  const areas = await prisma.area.findMany({
    select: { name: true, nameGreek: true, city: true, cityGreek: true, country: true, countryGreek: true },
  })
  const resolver = createLocationResolver(areas)
  areaResolverCache = { resolver, ts: Date.now() }
  return resolver
}

const RETRYABLE_STATUSES = new Set([408, 409, 429, 500, 502, 503, 504])

function isRetryable(error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') return true
  const status = (error as { status?: number })?.status
  return typeof status === 'number' && RETRYABLE_STATUSES.has(status)
}

/**
 * One completion, with a single jittered retry on transient failure.
 *
 * Without this a lone 503 or a slow response lost the user's message outright — they had
 * typed it, been charged nothing, and got an error. One retry covers the overwhelming
 * majority of transient faults; beyond that the caller falls back to searching on the
 * filters we already have, because for a search product stale results beat no results.
 */
async function requestChatTurn(
  openai: OpenAI,
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<ConversationalAIResponse> {
  let lastError: unknown

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)
    try {
      const completion = await openai.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          messages,
          // There is exactly one correct reading of an utterance. Sampling buys nothing
          // on the extraction half and costs consistency.
          temperature: 0,
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'conversational_search_turn', strict: true, schema: RESPONSE_SCHEMA },
          },
        },
        { signal: controller.signal }
      )

      const content = completion.choices[0]?.message?.content
      if (!content) throw new Error('Empty AI response')
      const parsed = JSON.parse(content) as Record<string, unknown>
      if (!parsed.assistantMessage) {
        throw new Error('AI chat response missing required fields')
      }
      return parsed as unknown as ConversationalAIResponse
    } catch (error) {
      lastError = error
      if (attempt === 0 && isRetryable(error)) {
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400))
        continue
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  throw lastError
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
  /** Bounds removed because the user's revision contradicted them. */
  droppedBounds: string[]
  /** Canonical English rendering of the accumulated intent — the query the search runs on. */
  intentText: string
}> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  let conversation: {
    key: string
    messages: ChatMessage[]
    accumulatedFilters: ConversationalFilters
    pendingNumeric: string[] | null
    askedSlots: string[]
  } | null = null

  if (conversationKey) {
    const existing = await prisma.searchConversation.findUnique({
      where: { key: conversationKey },
      select: { key: true, messages: true, accumulatedFilters: true, pendingNumeric: true, askedSlots: true },
    })
    if (existing) {
      conversation = {
        key: existing.key,
        messages: existing.messages as unknown as ChatMessage[],
        accumulatedFilters: existing.accumulatedFilters as unknown as ConversationalFilters,
        pendingNumeric: Array.isArray(existing.pendingNumeric)
          ? (existing.pendingNumeric as string[])
          : null,
        askedSlots: Array.isArray(existing.askedSlots) ? (existing.askedSlots as string[]) : [],
      }
    }
  }

  const fullHistory: ChatMessage[] = conversation?.messages ?? []
  const accumulated: ConversationalFilters = conversation?.accumulatedFilters ?? {}

  // Resolve a bare numeric reply against the bound the assistant actually asked for,
  // before the model gets a chance to guess the wrong side of the range.
  const boundAnswer = bindPendingNumericAnswer(userMessage, conversation?.pendingNumeric)

  // Keep only the last 6 turns (12 messages) to cap token usage. Sliced on a turn
  // boundary: a plain `slice(-12)` can start mid-turn and orphan an assistant question
  // from the answer that follows it, which is exactly the bare-reply case the whole design
  // exists to read correctly.
  const history = sliceHistoryOnTurnBoundary(fullHistory, 12)

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

  // Tell the model what the bare number was already resolved to, so its prose agrees with
  // the filter that will actually be applied.
  const boundContext =
    Object.keys(boundAnswer).length > 0
      ? `\n\n[The user's reply is a bare number answering your previous question. It has already been bound to: ${JSON.stringify(boundAnswer)}. Treat these as settled — echo them back in your own words and do not move the value to the opposite bound.]`
      : conversation?.pendingNumeric?.length
        ? `\n\n[Your previous question asked for these bounds: ${JSON.stringify(conversation.pendingNumeric)}. The reply was not a bare number, so read it yourself — honour any qualifier the user used ("at least", "max", "around").]`
        : ''

  // The static prompt MUST stay byte-identical as message[0]. OpenAI prompt caching matches
  // on the longest common prefix, so the per-turn state that used to be concatenated onto it
  // (accumulated filters change every turn) meant the cache this prompt was written for
  // never hit once. Turn state goes in its own message, after the cacheable prefix.
  const turnContext = modeHint + accumulatedContext + boundContext

  const messagesForAI: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: CONVERSATIONAL_SEARCH_SYSTEM_PROMPT },
    ...(turnContext ? [{ role: 'system' as const, content: turnContext.trim() }] : []),
    ...history.map((m) => ({ role: m.role, content: m.content } as OpenAI.Chat.ChatCompletionMessageParam)),
    { role: 'user', content: userMessage },
  ]

  const aiResponse = await requestChatTurn(openai, messagesForAI)

  const incoming = aiResponse.filters ?? {}
  const mergedFilters: ConversationalFilters = mergeFilters(accumulated, incoming)

  // Explicit removals. `clearFields` is a first-class list in the response schema rather
  // than a "CLEAR" sentinel smuggled into a value slot, so "actually I don't need parking"
  // removes the filter reliably instead of depending on the model remembering a magic
  // string. Works for every characteristic, not just the numeric ones.
  const clearedFields = sanitizeClearFields(aiResponse.clearFields)
  for (const field of clearedFields) {
    delete (mergedFilters as Record<string, unknown>)[field]
  }

  // The deterministic binding outranks the model. It knows which bound was asked for;
  // the model has to re-derive that from history every turn and gets it wrong.
  Object.assign(mergedFilters, boundAnswer)

  // Drop bounds the user's revision has made impossible. Without this, "under €600"
  // followed by "actually at least €800" leaves min 800 / max 600 and silently returns
  // nothing — the single most confusing way for a refinement to fail.
  const justSet = new Set([...Object.keys(incoming), ...Object.keys(boundAnswer)])
  for (const field of clearedFields) justSet.delete(field)
  const droppedBounds = reconcileBounds(mergedFilters as Record<string, unknown>, justSet)

  // The UI mode is authoritative for rent-vs-buy — the model never asks for it
  // and must not be able to override it.
  if (listingMode) {
    mergedFilters.listingType = listingMode === 'buy' ? 'sale' : 'rent'
  }

  // The model echoes the user's spelling ("Nea Smirni"). Pin the accumulated
  // filters to the canonical area names so later turns and the assistant's own
  // prose stay consistent with the DB.
  const rewrites = canonicalizeFilterLocations(mergedFilters, await getLocationResolver())

  // Built after canonicalization so the embedded text uses the DB's spelling of places.
  const intentText = buildIntentText(mergedFilters as Record<string, unknown>)

  // Reconciliation silently removed a limit the user had given. Say so — a filter that
  // disappears without explanation is worse than the contradiction it resolved.
  const droppedNotice = describeDroppedBounds(droppedBounds, isGreek(userMessage))

  const acknowledgement =
    applyLocationRewrites(aiResponse.assistantMessage, rewrites) + droppedNotice

  // The next question is chosen HERE, from the filters as they now stand — after this
  // turn's answers have been merged. Selecting it in the model's own response meant
  // choosing before knowing what the user had just said, which is how it ended up
  // re-asking things it had literally been told.
  //
  // A slot the user was asked about but did not answer is recorded so it is not asked
  // again; that is what stops the assistant looping on a question someone declined.
  const askedBefore = conversation?.askedSlots ?? []
  const next = selectNextQuestion(mergedFilters as Record<string, unknown>, askedBefore)
  const replyInGreek = isGreek(userMessage) || (userMessage.trim().length < 3 && isGreek(acknowledgement))

  const followUpQuestion = next.exhausted
    ? undefined
    : buildQuestion(next.slots, replyInGreek)

  // The conversation keeps going until the criteria are genuinely exhausted. It used to
  // stop after three turns and then only ever search, which left the percentages resting
  // on priors for every criterion nobody had got round to asking about.
  const action: 'search' | 'ask' = next.exhausted ? 'search' : 'ask'

  const assistantMessage = next.exhausted
    ? `${acknowledgement} ${closingLine(replyInGreek)}`.trim()
    : acknowledgement

  // Persist both halves of what the user saw, so a later turn can read a terse reply
  // against the question that prompted it.
  const visibleText = followUpQuestion
    ? `${assistantMessage} ${followUpQuestion}`.trim()
    : assistantMessage

  const updatedHistory: ChatMessage[] = [
    ...fullHistory,
    { role: 'user', content: userMessage },
    { role: 'assistant', content: visibleText },
  ]

  // Written by the asker, not reported by the model — the two can no longer disagree.
  const nextPendingNumeric = next.pendingNumeric.length > 0 ? next.pendingNumeric : null
  const nextAskedSlots = [...new Set([...askedBefore, ...next.slots.map(s => s.id)])]

  let savedKey: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messagesJson = updatedHistory as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filtersJson = mergedFilters as any
  // `Json?` columns need the DbNull sentinel to be set back to SQL NULL — a plain `null`
  // is rejected as ambiguous with the JSON literal `null`.
  const pendingJson = nextPendingNumeric ?? Prisma.DbNull
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const askedSlotsJson = nextAskedSlots as any

  if (conversation) {
    const updated = await prisma.searchConversation.update({
      where: { key: conversation.key },
      data: {
        messages: messagesJson,
        accumulatedFilters: filtersJson,
        pendingNumeric: pendingJson,
        askedSlots: askedSlotsJson,
        listingMode: listingMode ?? undefined,
      },
      select: { key: true },
    })
    savedKey = updated.key
  } else {
    const created = await prisma.searchConversation.create({
      data: {
        userId,
        messages: messagesJson,
        accumulatedFilters: filtersJson,
        pendingNumeric: pendingJson,
        askedSlots: askedSlotsJson,
        listingMode: listingMode ?? undefined,
      },
      select: { key: true },
    })
    savedKey = created.key
  }

  // Persist the embedding of the conversation's *accumulated intent*, not of the last
  // message. A search saved after five turns used to store the vector for whatever
  // fragment ended it ("600", "ναι"), and the matcher then weighted that against every
  // new listing forever.
  // Fire-and-forget: doesn't block the chat response.
  if (hasUsableIntent(intentText)) {
    generateEmbedding(intentText, openai)
      .then(vec => prisma.searchConversation.update({
        where: { key: savedKey },
        data: { embedding: vec as unknown as never },
      }))
      .catch(() => { /* non-critical — saved search can still be created without embedding */ })
  }

  return {
    conversationKey: savedKey,
    action,
    filters: mergedFilters,
    assistantMessage,
    followUpQuestion,
    droppedBounds,
    intentText,
  }
}

/**
 * Trim history to at most `max` messages without cutting between an assistant question and
 * the user reply that answers it.
 *
 * Exported for tests: the orphaned-question case is invisible in normal use and only shows
 * up as the model mysteriously re-asking something in long conversations.
 */
const GREEK_BOUND_LABELS: Record<string, string> = {
  minPrice: 'την ελάχιστη τιμή',
  maxPrice: 'τη μέγιστη τιμή',
  minBedrooms: 'τον ελάχιστο αριθμό υπνοδωματίων',
  maxBedrooms: 'τον μέγιστο αριθμό υπνοδωματίων',
  minBathrooms: 'τον ελάχιστο αριθμό μπάνιων',
  maxBathrooms: 'τον μέγιστο αριθμό μπάνιων',
  minSize: 'το ελάχιστο εμβαδόν',
  maxSize: 'το μέγιστο εμβαδόν',
  minFloor: 'τον ελάχιστο όροφο',
  maxFloor: 'τον μέγιστο όροφο',
  minYearBuilt: 'το παλαιότερο έτος κατασκευής',
  maxYearBuilt: 'το νεότερο έτος κατασκευής',
  minYearRenovated: 'το παλαιότερο έτος ανακαίνισης',
  maxYearRenovated: 'το νεότερο έτος ανακαίνισης',
}

const ENGLISH_BOUND_LABELS: Record<string, string> = {
  minPrice: 'the minimum price',
  maxPrice: 'the maximum price',
  minBedrooms: 'the minimum bedrooms',
  maxBedrooms: 'the maximum bedrooms',
  minBathrooms: 'the minimum bathrooms',
  maxBathrooms: 'the maximum bathrooms',
  minSize: 'the minimum size',
  maxSize: 'the maximum size',
  minFloor: 'the lowest floor',
  maxFloor: 'the highest floor',
  minYearBuilt: 'the earliest build year',
  maxYearBuilt: 'the latest build year',
  minYearRenovated: 'the earliest renovation year',
  maxYearRenovated: 'the latest renovation year',
}

function isGreek(text: string): boolean {
  return GREEK_SCRIPT.test(text)
}

/** One short clause naming what reconciliation removed, in the user's language. */
export function describeDroppedBounds(dropped: string[], greek: boolean): string {
  if (dropped.length === 0) return ''
  const labels = greek ? GREEK_BOUND_LABELS : ENGLISH_BOUND_LABELS
  const named = dropped.map(field => labels[field] ?? field)
  const list = named.length === 1
    ? named[0]
    : `${named.slice(0, -1).join(', ')} ${greek ? 'και' : 'and'} ${named[named.length - 1]}`

  return greek
    ? ` (Αφαίρεσα ${list}, γιατί δεν ταίριαζε πλέον με αυτό που ζητήσατε.)`
    : ` (I dropped ${list}, since it no longer fit what you asked for.)`
}

export function sliceHistoryOnTurnBoundary(history: ChatMessage[], max: number): ChatMessage[] {
  if (history.length <= max) return history
  let start = history.length - max
  // A window that opens on an assistant message begins with a question whose answer is in
  // the window but whose own context is not — start on the user turn instead.
  if (history[start]?.role === 'assistant') start += 1
  return history.slice(start)
}

/**
 * Keep only field names a slot actually owns. A removal is destructive, so a hallucinated
 * or mistyped entry must delete nothing rather than something adjacent.
 */
export function sanitizeClearFields(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(
    value.filter((v): v is string => typeof v === 'string' && (ALL_SLOT_FIELDS.has(v) || BOUND_FIELDS.has(v)))
  )]
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
