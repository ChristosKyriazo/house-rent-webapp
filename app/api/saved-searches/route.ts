import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { unauthorized, badRequest } from '@/lib/api-utils'
import { buildIntentText } from '@/lib/search/intent-text'

// GET /api/saved-searches — list current user's saved searches
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return unauthorized()

  const searches = await prisma.savedSearch.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      key: true,
      name: true,
      type: true,
      filterParams: true,
      queryText: true,
      minMatchPercent: true,
      notificationsEnabled: true,
      lastNotifiedAt: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ searches })
}

// POST /api/saved-searches — create a saved search
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()

  let body: {
    type?: string
    name?: string
    filterParams?: Record<string, unknown>
    conversationKey?: string
    minMatchPercent?: number
  }
  try {
    body = await request.json()
  } catch {
    return badRequest('Invalid JSON')
  }

  const { type, name, filterParams, conversationKey, minMatchPercent } = body

  if (!type || !['filter', 'ai'].includes(type)) {
    return badRequest('type must be "filter" or "ai"')
  }

  if (type === 'filter') {
    if (!filterParams || typeof filterParams !== 'object') {
      return badRequest('filterParams required for filter type')
    }

    const search = await prisma.savedSearch.create({
      data: {
        userId: user.id,
        name: name ?? null,
        type: 'filter',
        filterParams: filterParams as object,
        notificationsEnabled: true,
      },
    })

    return NextResponse.json({ search }, { status: 201 })
  }

  // AI type — fetch conversation and snapshot embedding
  if (!conversationKey) {
    return badRequest('conversationKey required for ai type')
  }

  const conversation = await prisma.searchConversation.findUnique({
    where: { key: conversationKey },
    select: {
      embedding: true,
      accumulatedFilters: true,
      messages: true,
    },
  })

  if (!conversation) {
    return badRequest('Conversation not found')
  }

  // Extract the first user message as queryText
  const messages = conversation.messages as Array<{ role: string; content: string }>
  const firstUserMessage = messages.find(m => m.role === 'user')?.content ?? null

  // Extract hard filter fields from accumulated filters for location enforcement
  const accFilters = (conversation.accumulatedFilters ?? {}) as Record<string, unknown>
  const hardFilters = accFilters.hardFilters
    ? (typeof accFilters.hardFilters === 'string' ? JSON.parse(accFilters.hardFilters) : accFilters.hardFilters)
    : accFilters

  // Snapshot the soft criteria alongside the hard ones so `matchSavedSearches` can rebuild
  // the same components the search route scored with — without these it can only compare
  // embeddings, and the saved threshold means something different from what the user saw.
  const softSource = (accFilters.softFilters
    ? (typeof accFilters.softFilters === 'string' ? JSON.parse(accFilters.softFilters) : accFilters.softFilters)
    : accFilters) as Record<string, unknown>

  const SOFT_CRITERIA_KEYS = [
    'Metro', 'Bus', 'School', 'Hospital', 'Park', 'University', 'Safety',
    'vibePreference', 'parkingSoftPreference', 'hasLocationPreference',
  ] as const

  const softCriteria: Record<string, unknown> = {}
  for (const key of SOFT_CRITERIA_KEYS) {
    const value = softSource[key]
    if (value !== undefined && value !== null && value !== 'Not mentioned') {
      softCriteria[key] = value
    }
  }

  const savedFilterParams = {
    city: (hardFilters as Record<string, unknown>).city ?? null,
    country: (hardFilters as Record<string, unknown>).country ?? null,
    listingType: (hardFilters as Record<string, unknown>).listingType ?? null,
    softCriteria: Object.keys(softCriteria).length > 0 ? softCriteria : null,
  }

  // `queryText` drives the matcher's description and photo evidence, so it must describe
  // the whole accumulated intent — the first user message is only the opening fragment of
  // a conversation that may have refined everything since.
  const intentText = buildIntentText({ ...hardFilters as Record<string, unknown>, ...softCriteria })

  const search = await prisma.savedSearch.create({
    data: {
      userId: user.id,
      name: name ?? (firstUserMessage ? firstUserMessage.slice(0, 80) : null),
      type: 'ai',
      filterParams: savedFilterParams as object,
      queryText: intentText || firstUserMessage,
      queryEmbedding: conversation.embedding ?? undefined,
      minMatchPercent: minMatchPercent ?? 70,
      notificationsEnabled: true,
    },
  })

  return NextResponse.json({ search }, { status: 201 })
}
