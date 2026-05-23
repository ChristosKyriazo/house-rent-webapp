'use client'

import { useState, useRef, useEffect } from 'react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  homesCount?: number
}

interface AIChatPanelProps {
  searchType: 'rent' | 'buy'
  excludeInquired: boolean
  excludeApproved: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onResultsFound: (homes: any[]) => void
  onBack: () => void
  language: string
}

const MAX_TURNS = 3

export default function AIChatPanel({
  searchType,
  excludeInquired,
  excludeApproved,
  onResultsFound,
  onBack,
  language,
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationKey, setConversationKey] = useState<string | null>(null)
  const [turn, setTurn] = useState(0)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const isEl = language === 'el'

  const t = {
    headline: isEl ? 'Πώς μπορώ να σας βοηθήσω να βρείτε το σπίτι σας;' : "Let's find your perfect home.",
    subtitle: isEl
      ? 'Πείτε μου τι ψάχνετε — τοποθεσία, προϋπολογισμό, χαρακτηριστικά — και θα σας βρω τα καλύτερα ακίνητα.'
      : 'Tell me what you\'re looking for — location, budget, features — and I\'ll find the best matches for you.',
    placeholder: isEl ? 'Γράψτε το μήνυμά σας...' : 'Type your message...',
    send: isEl ? 'Αποστολή' : 'Send',
    back: isEl ? 'Πίσω' : 'Back',
    startOver: isEl ? 'Νέα αναζήτηση' : 'Start over',
    searching: isEl ? 'Αναζήτηση ακινήτων...' : 'Searching properties...',
    foundPrefix: isEl ? 'Βρήκα' : 'Found',
    foundSuffix: isEl ? 'ακίνητα για εσάς.' : 'properties for you.',
    noResults: isEl ? 'Δεν βρήκα ακίνητα που να ταιριάζουν. Δοκιμάστε να αλλάξετε κάποια κριτήρια.' : 'No matching properties found. Try adjusting your criteria.',
    turnIndicator: (n: number) => isEl ? `Ερώτηση ${n} / ${MAX_TURNS}` : `Question ${n} / ${MAX_TURNS}`,
    limitReached: isEl ? 'Κάνω αναζήτηση με αυτά που συζητήσαμε...' : 'Running a search based on our conversation...',
    errorMsg: isEl ? 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.' : 'Something went wrong. Please try again.',
    exampleRent: isEl
      ? 'Παράδειγμα: "Ψάχνω 2άρι στην Αθήνα, κοντά σε σχολεία, γύρω στα 900€"'
      : 'e.g. "Looking for a 2-bed in Athens near schools, around €900/mo"',
    exampleBuy: isEl
      ? 'Παράδειγμα: "Θέλω διαμέρισμα 3 υπνοδωματίων στη Θεσσαλονίκη, έως 200.000€"'
      : 'e.g. "Want a 3-bed apartment in Thessaloniki, budget up to €200k"',
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const runSearch = async (filters: object) => {
    const res = await fetch('/api/homes/ai-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '[conversational]',
        type: searchType,
        excludeInquired,
        excludeApproved,
        preExtractedFilters: filters,
      }),
    })
    const data = await res.json()
    return (data.homes || []) as any[]
  }

  const handleSend = async () => {
    const msg = input.trim()
    if (!msg || loading || done) return

    setInput('')
    setError(null)
    const newTurn = turn + 1
    setTurn(newTurn)

    setMessages((prev) => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    try {
      // Step 1: chat turn — AI decides search or ask
      const chatRes = await fetch('/api/homes/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          conversationKey,
          type: searchType,
        }),
      })
      const chatData = await chatRes.json()
      if (!chatRes.ok) throw new Error(chatData.error || 'Chat error')

      setConversationKey(chatData.conversationKey)

      const shouldSearch = chatData.action === 'search' || newTurn >= MAX_TURNS

      if (shouldSearch) {
        // Step 2: run actual property search
        const forcedMsg = newTurn >= MAX_TURNS && chatData.action !== 'search' ? t.limitReached : chatData.assistantMessage
        setMessages((prev) => [...prev, { role: 'assistant', content: forcedMsg }])
        setLoading(true)

        const homes = await runSearch(chatData.filters)

        const resultMsg = homes.length > 0
          ? `${t.foundPrefix} ${homes.length} ${t.foundSuffix}`
          : t.noResults

        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: forcedMsg, homesCount: homes.length },
          { role: 'assistant', content: resultMsg },
        ])
        onResultsFound(homes)
        setDone(true)
      } else {
        // Show follow-up question
        const aiMsg = chatData.followUpQuestion || chatData.assistantMessage
        setMessages((prev) => [...prev, { role: 'assistant', content: aiMsg }])
      }
    } catch (err) {
      setError(t.errorMsg)
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleReset = () => {
    setMessages([])
    setInput('')
    setConversationKey(null)
    setTurn(0)
    setDone(false)
    setError(null)
    onResultsFound([])
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const isEmpty = messages.length === 0

  return (
    <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl shadow-xl border border-[var(--border-subtle)] mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--border-subtle)]">
        <button
          onClick={onBack}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
        >
          ← {t.back}
        </button>
        {!isEmpty && (
          <button
            onClick={handleReset}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            ↺ {t.startOver}
          </button>
        )}
      </div>

      {/* Welcome state */}
      {isEmpty && (
        <div className="px-8 pt-8 pb-4 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/10 text-3xl">
            🏡
          </div>
          <h2 className="mb-2 text-2xl font-bold text-[var(--text)]">{t.headline}</h2>
          <p className="mb-6 text-sm text-[var(--text-muted)] max-w-md mx-auto">{t.subtitle}</p>
          <p className="text-xs text-[var(--text-muted)]/60 italic">
            {searchType === 'buy' ? t.exampleBuy : t.exampleRent}
          </p>
        </div>
      )}

      {/* Chat messages */}
      {!isEmpty && (
        <div className="px-6 py-4 space-y-4 max-h-80 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-base mt-1">
                  🏡
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[var(--accent)] text-white rounded-tr-sm'
                    : 'bg-[var(--ink-soft)] text-[var(--text)] rounded-tl-sm border border-[var(--border-subtle)]'
                }`}
              >
                {m.content}
                {m.homesCount !== undefined && m.homesCount > 0 && (
                  <div className="mt-1 text-xs opacity-70">↓ {isEl ? 'Δείτε παρακάτω' : 'See results below'}</div>
                )}
              </div>
            </div>
          ))}

          {/* Loading bubble */}
          {loading && (
            <div className="flex justify-start">
              <div className="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-base mt-1">
                🏡
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-[var(--ink-soft)] border border-[var(--border-subtle)] px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="h-2 w-2 rounded-full bg-[var(--accent)]/60 animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-[var(--accent)]/60 animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-[var(--accent)]/60 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-6 mb-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="px-6 pb-6 pt-3">
        {!done ? (
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder={t.placeholder}
                disabled={loading}
                className="w-full resize-none rounded-2xl border border-[var(--border-subtle)] bg-[var(--ink-soft)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
              />
              {turn > 0 && !done && (
                <div className="absolute bottom-2 right-3 text-[10px] text-[var(--text-muted)]/50">
                  {t.turnIndicator(turn)}
                </div>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="btn-primary flex-shrink-0 rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-40"
            >
              {loading ? '...' : t.send}
            </button>
          </div>
        ) : (
          <button
            onClick={handleReset}
            className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--ink-soft)] py-3 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all"
          >
            ↺ {t.startOver}
          </button>
        )}
      </div>
    </div>
  )
}
