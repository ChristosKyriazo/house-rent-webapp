import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'
import {
  getUserUsage,
  getUserSearchHistory,
  getUserCostEstimate,
  findUsers,
  getUsageLeaderboard,
} from '@/lib/services/usage-data'

export interface AssistantMessage {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

// Raised when a caller tries to load a conversation that isn't theirs. The route
// maps this to a 404 so thread keys can't be probed for existence.
export class ConversationAccessError extends Error {
  constructor() {
    super('Conversation not found')
    this.name = 'ConversationAccessError'
  }
}

// Keep only the last 6 turns (12 messages) in the model context — caps token
// cost while preserving enough thread for follow-ups. Same window as ai-chat.
const MAX_HISTORY_MESSAGES = 12
// Bound on tool round-trips so a confused model can't loop up spend.
const MAX_TOOL_ROUNDS = 4
const OVERALL_TIMEOUT_MS = 30_000

function systemPrompt(isAdmin: boolean): string {
  const base = `You are the AI Usage Assistant for Kaparro, a property-rental platform. You answer questions about how much the platform's AI features (AI property search) are being used and what they cost. Be precise and concise. When you state numbers, get them from the tools — never invent usage figures. Cost figures are estimates; say so when you report them. If a tool returns no data, say so plainly. Format currency in euros.`
  if (isAdmin) {
    return `${base}

You are talking to an ADMIN, who may ask about ANY user. To look at a specific person, first call find_user with their name or email to get a numeric userId, then pass that userId to the other tools. You may also ask for the overall usage leaderboard.`
  }
  return `${base}

You are talking to a NORMAL USER. Every tool automatically scopes to THEIR OWN account — you cannot see other users' data, and any userId argument is ignored by the system. Do not claim to look up other people; if asked, explain you can only report on their own AI usage.`
}

function toolDefinitions(isAdmin: boolean): OpenAI.Chat.Completions.ChatCompletionTool[] {
  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'get_user_usage',
        description:
          'Get AI-search credit usage for a user: subscription tier, monthly searches used/limit/remaining, purchased pack credits, lifetime searches, and Viber alerts status.',
        parameters: {
          type: 'object',
          properties: {
            userId: { type: 'number', description: 'Target user id (admins only; ignored for normal users).' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_user_search_history',
        description: 'List a user\'s most recent AI searches (query text, how many homes were found, when).',
        parameters: {
          type: 'object',
          properties: {
            userId: { type: 'number', description: 'Target user id (admins only; ignored for normal users).' },
            limit: { type: 'number', description: 'How many recent searches to return (default 10, max 25).' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_user_cost_estimate',
        description:
          'Estimate the OpenAI cost a user has generated from AI searches. Cost is an ESTIMATE (token counts are not stored).',
        parameters: {
          type: 'object',
          properties: {
            userId: { type: 'number', description: 'Target user id (admins only; ignored for normal users).' },
            sinceDays: { type: 'number', description: 'Only count searches within the last N days. Omit for all-time.' },
          },
        },
      },
    },
  ]

  if (isAdmin) {
    tools.push(
      {
        type: 'function',
        function: {
          name: 'find_user',
          description: 'Resolve a name or email fragment to matching users (id, email, name, tier). Use before other tools when the admin names a person.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Name or email fragment to search for.' },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_usage_leaderboard',
          description: 'List the users with the most AI searches this month (heaviest AI users).',
          parameters: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'How many top users to return (default 10, max 25).' },
            },
          },
        },
      }
    )
  }

  return tools
}

interface ToolArgs {
  userId?: number
  limit?: number
  sinceDays?: number
  query?: string
}

// Executes a tool call under the caller's scope. Scope is enforced HERE, not in
// the prompt: a normal user's target is always forced to their own id, and
// admin-only tools are refused. The model physically cannot reach other users'
// rows when isAdmin is false. Exported for unit tests — the scope guarantee is
// the security boundary of this feature and must not regress.
export async function executeTool(
  name: string,
  args: ToolArgs,
  actingUserId: number,
  isAdmin: boolean
): Promise<unknown> {
  const targetUserId = isAdmin && typeof args.userId === 'number' ? args.userId : actingUserId

  switch (name) {
    case 'get_user_usage': {
      const usage = await getUserUsage(targetUserId)
      return usage ?? { error: 'not_found', message: 'No such user.' }
    }
    case 'get_user_search_history':
      return getUserSearchHistory(targetUserId, args.limit ?? 10)
    case 'get_user_cost_estimate': {
      const since =
        typeof args.sinceDays === 'number' && args.sinceDays > 0
          ? new Date(Date.now() - args.sinceDays * 24 * 60 * 60 * 1000)
          : undefined
      return getUserCostEstimate(targetUserId, since)
    }
    case 'find_user':
      if (!isAdmin) return { error: 'not_permitted', message: 'Only admins can look up other users.' }
      return findUsers(String(args.query ?? ''))
    case 'get_usage_leaderboard':
      if (!isAdmin) return { error: 'not_permitted', message: 'Only admins can view the usage leaderboard.' }
      return getUsageLeaderboard(args.limit ?? 10)
    default:
      return { error: 'unknown_tool', message: `No tool named ${name}.` }
  }
}

export interface UsageAssistantTurnInput {
  conversationKey: string | null
  message: string
  actingUserId: number
  isAdmin: boolean
}

export interface UsageAssistantTurnResult {
  conversationKey: string
  assistantMessage: string
  title: string | null
}

export async function processUsageAssistantTurn(
  input: UsageAssistantTurnInput
): Promise<UsageAssistantTurnResult> {
  const { conversationKey, message, actingUserId, isAdmin } = input
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  // Load the thread if one was passed, refusing anyone else's.
  let existing: { key: string; userId: number; title: string | null; transcript: AssistantMessage[] } | null = null
  if (conversationKey) {
    const row = await prisma.assistantConversation.findUnique({
      where: { key: conversationKey },
      select: { key: true, userId: true, title: true, messages: true },
    })
    if (!row || row.userId !== actingUserId) throw new ConversationAccessError()
    existing = {
      key: row.key,
      userId: row.userId,
      title: row.title,
      transcript: (row.messages as unknown as AssistantMessage[]) ?? [],
    }
  }

  const priorTranscript: AssistantMessage[] = existing?.transcript ?? []
  const history = priorTranscript.slice(-MAX_HISTORY_MESSAGES)

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt(isAdmin) },
    ...history.map((m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.Completions.ChatCompletionMessageParam),
    { role: 'user', content: message },
  ]

  const tools = toolDefinitions(isAdmin)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), OVERALL_TIMEOUT_MS)

  let assistantText = ''
  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const completion = await openai.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          messages,
          tools,
          tool_choice: 'auto',
          temperature: 0,
          max_tokens: 700,
        },
        { signal: controller.signal }
      )

      const choice = completion.choices[0]?.message
      if (!choice) throw new Error('Empty AI response')
      messages.push(choice)

      const toolCalls = choice.tool_calls ?? []
      if (toolCalls.length === 0) {
        assistantText = choice.content ?? ''
        break
      }

      for (const call of toolCalls) {
        if (call.type !== 'function') continue
        let parsed: ToolArgs = {}
        try {
          parsed = JSON.parse(call.function.arguments || '{}')
        } catch {
          parsed = {}
        }
        const result = await executeTool(call.function.name, parsed, actingUserId, isAdmin)
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) })
      }
    }

    // The model kept calling tools until the round budget ran out. Force one
    // final answer with tools disabled so the user always gets prose.
    if (!assistantText) {
      const finalCompletion = await openai.chat.completions.create(
        { model: 'gpt-4o-mini', messages, temperature: 0, max_tokens: 700 },
        { signal: controller.signal }
      )
      assistantText = finalCompletion.choices[0]?.message?.content ?? ''
    }
  } finally {
    clearTimeout(timeoutId)
  }

  if (!assistantText.trim()) {
    assistantText = isAdmin
      ? "I couldn't produce an answer for that. Try naming the user by email, or ask for the usage leaderboard."
      : "I couldn't produce an answer for that. Try asking how many AI searches you have left."
  }

  const now = new Date().toISOString()
  const updatedTranscript: AssistantMessage[] = [
    ...priorTranscript,
    { role: 'user', content: message, createdAt: now },
    { role: 'assistant', content: assistantText, createdAt: now },
  ]
  const messagesJson = updatedTranscript as unknown as object

  let savedKey: string
  let savedTitle: string | null
  if (existing) {
    const updated = await prisma.assistantConversation.update({
      where: { key: existing.key },
      data: { messages: messagesJson },
      select: { key: true, title: true },
    })
    savedKey = updated.key
    savedTitle = updated.title
  } else {
    const title = message.length > 60 ? `${message.slice(0, 60)}…` : message
    const created = await prisma.assistantConversation.create({
      data: {
        userId: actingUserId,
        scope: isAdmin ? 'admin' : 'self',
        title,
        messages: messagesJson,
      },
      select: { key: true, title: true },
    })
    savedKey = created.key
    savedTitle = created.title
  }

  return { conversationKey: savedKey, assistantMessage: assistantText, title: savedTitle }
}
