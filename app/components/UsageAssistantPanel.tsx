'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useLanguage } from '@/app/contexts/LanguageContext'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ThreadSummary {
  key: string
  title: string | null
  updatedAt: string
}

const MSG_MAX_LENGTH = 500

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function UsageAssistantPanel() {
  const { isEl } = useLanguage()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [conversationKey, setConversationKey] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const t = {
    heading: isEl ? 'Βοηθός Χρήσης AI' : 'AI Usage Assistant',
    subAdmin: isEl
      ? 'Ρωτήστε για τη χρήση AI οποιουδήποτε χρήστη — υπόλοιπα, ιστορικό, εκτιμώμενο κόστος.'
      : "Ask about any user's AI usage — credits, history, estimated cost.",
    subSelf: isEl
      ? 'Ρωτήστε για τη δική σας χρήση AI — υπόλοιπα, ιστορικό, εκτιμώμενο κόστος.'
      : 'Ask about your own AI usage — credits, history, estimated cost.',
    placeholder: isEl ? 'Ρωτήστε κάτι…' : 'Ask something…',
    send: isEl ? 'Αποστολή' : 'Send',
    newChat: isEl ? 'Νέα συνομιλία' : 'New chat',
    history: isEl ? 'Ιστορικό' : 'History',
    empty: isEl ? 'Δεν υπάρχουν ακόμη συνομιλίες.' : 'No conversations yet.',
    thinking: isEl ? 'Σκέφτομαι…' : 'Thinking…',
    genericError: isEl ? 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.' : 'Something went wrong. Please try again.',
    examplesAdmin: isEl
      ? ['Ποιοι χρησιμοποιούν περισσότερο το AI αυτόν τον μήνα;', 'Πόσα έχει ξοδέψει ο user@example.com σε AISearch;']
      : ['Who are the top AI users this month?', 'How much has user@example.com spent on AI search?'],
    examplesSelf: isEl
      ? ['Πόσες αναζητήσεις AI μου έχουν απομείνει;', 'Δείξε μου το ιστορικό αναζητήσεών μου.']
      : ['How many AI searches do I have left?', 'Show me my recent search history.'],
  }

  const loadThreads = useCallback(() => {
    fetch('/api/assistant/usage')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setThreads(data.threads ?? [])
        setIsAdmin(Boolean(data.isAdmin))
      })
      .catch(() => { /* non-critical */ })
  }, [])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function startNewChat() {
    abortRef.current?.abort()
    setMessages([])
    setConversationKey(null)
    setError(null)
    setInput('')
  }

  function openThread(key: string) {
    if (key === conversationKey) return
    abortRef.current?.abort()
    setError(null)
    setConversationKey(key)
    fetch(`/api/assistant/usage?key=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((conv) => {
        const history = (conv?.messages ?? []) as Array<{ role: 'user' | 'assistant'; content: string }>
        setMessages(history.map((m) => ({ id: newId(), role: m.role, content: m.content })))
      })
      .catch(() => setError(t.genericError))
  }

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setError(null)
    setInput('')
    const userMsg: ChatMessage = { id: newId(), role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/assistant/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, conversationKey }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.message || data.error || t.genericError)
        return
      }

      const data = await res.json()
      setConversationKey(data.conversationKey)
      setIsAdmin(Boolean(data.isAdmin))
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: data.assistantMessage }])
      loadThreads()
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(t.genericError)
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  const examples = isAdmin ? t.examplesAdmin : t.examplesSelf

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full max-w-5xl mx-auto">
      {/* History sidebar */}
      <aside className="md:w-56 shrink-0">
        <button
          onClick={startNewChat}
          className="w-full mb-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + {t.newChat}
        </button>
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{t.history}</div>
        {threads.length === 0 ? (
          <p className="text-sm text-gray-400">{t.empty}</p>
        ) : (
          <ul className="space-y-1">
            {threads.map((th) => (
              <li key={th.key}>
                <button
                  onClick={() => openThread(th.key)}
                  className={`w-full truncate rounded-md px-2 py-1.5 text-left text-sm ${
                    th.key === conversationKey ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title={th.title ?? ''}
                >
                  {th.title || '—'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Chat column */}
      <section className="flex min-h-[70vh] flex-1 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
        <header className="border-b border-gray-100 px-5 py-4">
          <h1 className="text-lg font-semibold text-gray-900">{t.heading}</h1>
          <p className="text-sm text-gray-500">{isAdmin ? t.subAdmin : t.subSelf}</p>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <div className="space-y-2 pt-6">
              {examples.map((ex) => (
                <button
                  key={ex}
                  onClick={() => send(ex)}
                  className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-600 hover:border-blue-300 hover:bg-blue-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                  m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && <div className="text-sm text-gray-400">{t.thinking}</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="border-t border-gray-100 p-3"
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MSG_MAX_LENGTH))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              rows={1}
              placeholder={t.placeholder}
              className="max-h-32 flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {t.send}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
