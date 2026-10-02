import { describe, expect, it, vi, beforeEach } from 'vitest'

// --- Mocks ------------------------------------------------------------------
// vi.mock factories are hoisted above module scope, so the doubles they close
// over must be created with vi.hoisted (also hoisted) rather than plain consts.

const { usageMocks, assistantConversation, createSpy } = vi.hoisted(() => ({
  // Capture the targetUserId each usage-data helper is called with so we can
  // assert scope enforcement in executeTool.
  usageMocks: {
    getUserUsage: vi.fn(async (id: number) => ({ userId: id })),
    getUserSearchHistory: vi.fn(async (id: number) => [{ userId: id }]),
    getUserCostEstimate: vi.fn(async (id: number) => ({ userId: id })),
    findUsers: vi.fn(async () => [{ userId: 99 }]),
    getUsageLeaderboard: vi.fn(async () => [{ userId: 1 }]),
  },
  // A mutable Prisma double the tests reconfigure per case.
  assistantConversation: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  // OpenAI double: records the messages sent and returns a plain no-tool answer.
  createSpy: vi.fn(),
}))

vi.mock('@/lib/services/usage-data', () => usageMocks)
vi.mock('@/lib/prisma', () => ({ prisma: { assistantConversation } }))
vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: createSpy } }
  },
}))

import {
  executeTool,
  processUsageAssistantTurn,
  ConversationAccessError,
} from '@/lib/services/usage-assistant-service'

beforeEach(() => {
  vi.clearAllMocks()
  createSpy.mockResolvedValue({ choices: [{ message: { role: 'assistant', content: 'ok', tool_calls: [] } }] })
})

// --- Scope enforcement in executeTool ---------------------------------------

describe('executeTool scope enforcement', () => {
  it('forces a normal user to their own id, ignoring any userId argument', async () => {
    await executeTool('get_user_usage', { userId: 999 }, 42, false)
    expect(usageMocks.getUserUsage).toHaveBeenCalledWith(42)
  })

  it('lets an admin target another user via userId', async () => {
    await executeTool('get_user_usage', { userId: 999 }, 42, true)
    expect(usageMocks.getUserUsage).toHaveBeenCalledWith(999)
  })

  it('falls back to the admin\'s own id when no userId is given', async () => {
    await executeTool('get_user_cost_estimate', {}, 7, true)
    expect(usageMocks.getUserCostEstimate).toHaveBeenCalledWith(7, undefined)
  })

  it('blocks find_user for non-admins', async () => {
    const result = await executeTool('find_user', { query: 'bob' }, 42, false)
    expect(result).toMatchObject({ error: 'not_permitted' })
    expect(usageMocks.findUsers).not.toHaveBeenCalled()
  })

  it('blocks get_usage_leaderboard for non-admins', async () => {
    const result = await executeTool('get_usage_leaderboard', {}, 42, false)
    expect(result).toMatchObject({ error: 'not_permitted' })
    expect(usageMocks.getUsageLeaderboard).not.toHaveBeenCalled()
  })

  it('allows leaderboard for admins', async () => {
    await executeTool('get_usage_leaderboard', { limit: 5 }, 42, true)
    expect(usageMocks.getUsageLeaderboard).toHaveBeenCalledWith(5)
  })
})

// --- Conversation ownership -------------------------------------------------

describe('processUsageAssistantTurn conversation ownership', () => {
  it('refuses to load a conversation owned by another user', async () => {
    assistantConversation.findUnique.mockResolvedValue({
      key: 'k1',
      userId: 100, // not the caller
      title: 't',
      messages: [],
    })

    await expect(
      processUsageAssistantTurn({ conversationKey: 'k1', message: 'hi', actingUserId: 42, isAdmin: false })
    ).rejects.toBeInstanceOf(ConversationAccessError)

    expect(createSpy).not.toHaveBeenCalled()
  })
})

// --- History window ---------------------------------------------------------

describe('processUsageAssistantTurn history window', () => {
  it('caps the model context to the last 12 messages plus system + new user turn', async () => {
    const priorMessages = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `msg ${i}`,
      createdAt: new Date().toISOString(),
    }))
    assistantConversation.findUnique.mockResolvedValue({
      key: 'k1',
      userId: 42,
      title: 't',
      messages: priorMessages,
    })
    assistantConversation.update.mockResolvedValue({ key: 'k1', title: 't' })

    // The service mutates its messages array after the call (pushing the model's
    // reply), so snapshot the array at call time rather than reading the ref.
    let sentMessages: Array<{ role: string; content: string }> = []
    createSpy.mockImplementation(async (params: { messages: Array<{ role: string; content: string }> }) => {
      sentMessages = [...params.messages]
      return { choices: [{ message: { role: 'assistant', content: 'ok', tool_calls: [] } }] }
    })

    await processUsageAssistantTurn({ conversationKey: 'k1', message: 'new question', actingUserId: 42, isAdmin: false })

    // 1 system + 12 history + 1 new user
    expect(sentMessages).toHaveLength(14)
    expect(sentMessages[0].role).toBe('system')
    expect(sentMessages.at(-1)).toEqual({ role: 'user', content: 'new question' })
    // The oldest retained history message is msg 18 (30 - 12)
    expect(sentMessages[1].content).toBe('msg 18')
  })

  it('persists the new turn to the existing conversation', async () => {
    assistantConversation.findUnique.mockResolvedValue({ key: 'k1', userId: 42, title: 't', messages: [] })
    assistantConversation.update.mockResolvedValue({ key: 'k1', title: 't' })

    const result = await processUsageAssistantTurn({
      conversationKey: 'k1',
      message: 'hi',
      actingUserId: 42,
      isAdmin: true,
    })

    expect(result.assistantMessage).toBe('ok')
    expect(assistantConversation.update).toHaveBeenCalledTimes(1)
    const savedMessages = assistantConversation.update.mock.calls[0][0].data.messages
    expect(savedMessages).toHaveLength(2) // user + assistant
    expect(savedMessages[0]).toMatchObject({ role: 'user', content: 'hi' })
    expect(savedMessages[1]).toMatchObject({ role: 'assistant', content: 'ok' })
  })

  it('creates a new conversation with a derived title and scope when no key is given', async () => {
    assistantConversation.create.mockResolvedValue({ key: 'new-key', title: 'What is my usage?' })

    const result = await processUsageAssistantTurn({
      conversationKey: null,
      message: 'What is my usage?',
      actingUserId: 42,
      isAdmin: false,
    })

    expect(result.conversationKey).toBe('new-key')
    const createArg = assistantConversation.create.mock.calls[0][0].data
    expect(createArg).toMatchObject({ userId: 42, scope: 'self', title: 'What is my usage?' })
  })
})
