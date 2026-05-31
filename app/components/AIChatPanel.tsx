'use client'

import { useState, useRef, useEffect } from 'react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
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

const MAX_TOTAL_PROMPTS = 9
const FIRST_SEARCH_TURN = 3

function AIChatPanel(
  { searchType, excludeInquired, excludeApproved, onResultsFound, onBack, language }: AIChatPanelProps
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationKey, setConversationKey] = useState<string | null>(null)
  const [promptCount, setPromptCount] = useState(0)
  const [paused, setPaused] = useState(false)
  const [searchCount, setSearchCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const isEl = language === 'el'
  const remaining = MAX_TOTAL_PROMPTS - promptCount
  const hardStop = promptCount >= MAX_TOTAL_PROMPTS

  const t = {
    headline: isEl ? 'Πώς μπορώ να σας βοηθήσω να βρείτε το σπίτι σας;' : "Let's find your perfect home.",
    subtitle: isEl
      ? 'Θα σας κάνω 3 ερωτήσεις για να καταλάβω ακριβώς τι ψάχνετε — και μετά αναζητώ!'
      : "I'll ask you 3 questions to understand exactly what you need — then I'll search for you.",
    placeholder: isEl ? 'Γράψτε το μήνυμά σας...' : 'Type your message...',
    send: isEl ? 'Αποστολή' : 'Send',
    back: isEl ? 'Πίσω' : 'Back',
    startOver: isEl ? 'Νέα αναζήτηση' : 'Start over',
    remaining: (n: number) => isEl ? `${n} ερωτήσεις ακόμα` : `${n} prompts left`,
    refineBtn: isEl ? 'Δεν σας αρέσουν τα αποτελέσματα; Συνεχίστε τη συνομιλία' : "Not happy with the results? Continue refining",
    hardStopMsg: isEl ? 'Έχετε φτάσει το όριο συνομιλίας. Δείτε τα παρακάτω αποτελέσματα.' : 'Conversation limit reached. See the results below.',
    switchToManual: isEl ? 'Δοκιμάστε χειροκίνητα φίλτρα' : 'Try manual filters',
    approachingLimit: (n: number) => isEl ? `Απομένουν μόνο ${n} ερωτήσεις — ή μεταβείτε σε χειροκίνητη αναζήτηση.` : `Only ${n} prompts left — or switch to manual filters.`,
    searching: isEl ? 'Αναζήτηση...' : 'Searching...',
    foundPrefix: isEl ? 'Βρήκα' : 'Found',
    foundSuffix: isEl ? 'ακίνητα για εσάς ↓' : 'properties for you ↓',
    noResults: isEl ? 'Δεν βρήκα ακίνητα που να ταιριάζουν. Δοκιμάστε να αλλάξετε κάποια κριτήρια.' : 'No matching properties found. Try adjusting your criteria.',
    limitReached: isEl ? 'Κάνω αναζήτηση με αυτά που συζητήσαμε...' : 'Searching with everything we discussed…',
    errorMsg: isEl ? 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.' : 'Something went wrong. Please try again.',
    exampleRent: isEl
      ? 'π.χ. "2άρι στην Αθήνα, γύρω στα 900€, κοντά σε σχολεία"'
      : 'e.g. "2-bed in Athens, around €900/mo, near schools"',
    exampleBuy: isEl
      ? 'π.χ. "3άρι στη Θεσσαλονίκη, έως 200.000€, με θέα θάλασσα"'
      : 'e.g. "3-bed in Thessaloniki, up to €200k, sea view"',
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, loading, paused])

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
    if (!msg || loading || paused || hardStop) return

    setInput('')
    setError(null)
    const newCount = promptCount + 1
    setPromptCount(newCount)

    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    try {
      const chatRes = await fetch('/api/homes/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, conversationKey, type: searchType }),
      })
      const chatData = await chatRes.json()
      if (!chatRes.ok) throw new Error(chatData.error || 'Chat error')
      setConversationKey(chatData.conversationKey)

      const isRefinement = searchCount > 0
      const shouldSearch =
        chatData.action === 'search' ||
        newCount >= FIRST_SEARCH_TURN ||
        isRefinement

      if (shouldSearch) {
        const aiMsg = newCount >= FIRST_SEARCH_TURN && chatData.action !== 'search'
          ? t.limitReached
          : chatData.assistantMessage
        setMessages(prev => [...prev, { role: 'assistant', content: aiMsg }])

        const homes = await runSearch(chatData.filters)
        const newSearchCount = searchCount + 1
        setSearchCount(newSearchCount)

        const resultMsg = homes.length > 0
          ? `${t.foundPrefix} ${homes.length} ${t.foundSuffix}`
          : t.noResults

        setMessages(prev => [...prev, { role: 'assistant', content: resultMsg }])

        onResultsFound(homes)
        setPaused(true)
      } else {
        const aiMsg = chatData.followUpQuestion || chatData.assistantMessage
        setMessages(prev => [...prev, { role: 'assistant', content: aiMsg }])
      }
    } catch {
      setError(t.errorMsg)
    } finally {
      setLoading(false)
      if (!paused) setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleResume = () => {
    if (hardStop) return
    setPaused(false)
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  const handleReset = () => {
    setMessages([])
    setInput('')
    setConversationKey(null)
    setPromptCount(0)
    setPaused(false)
    setSearchCount(0)
    setError(null)
    onResultsFound([])
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl shadow-xl border border-[var(--border-subtle)] mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--border-subtle)]">
        <button
          onClick={onBack}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
        >
          ← {t.back}
        </button>

        <div className="flex items-center gap-3">
          {/* Remaining prompts counter */}
          {promptCount > 0 && !hardStop && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
              remaining <= 2
                ? 'border-orange-400/40 bg-orange-400/10 text-orange-400'
                : 'border-[var(--border-subtle)] bg-[var(--ink-soft)] text-[var(--text-muted)]'
            }`}>
              {t.remaining(remaining)}
            </span>
          )}

          {!isEmpty && (
            <button
              onClick={handleReset}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            >
              ↺ {t.startOver}
            </button>
          )}
        </div>
      </div>

      {/* Welcome state */}
      {isEmpty && (
        <div className="px-8 pt-8 pb-4 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/10 text-3xl">
            🏡
          </div>
          <h2 className="mb-2 text-2xl font-bold text-[var(--text)]">{t.headline}</h2>
          <p className="mb-5 text-sm text-[var(--text-muted)] max-w-md mx-auto">{t.subtitle}</p>
          <p className="text-xs text-[var(--text-muted)]/60 italic">
            {searchType === 'buy' ? t.exampleBuy : t.exampleRent}
          </p>
        </div>
      )}

      {/* Chat messages */}
      {!isEmpty && (
        <div className="px-6 py-4 space-y-4 max-h-96 overflow-y-auto">
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
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-base mt-1">
                🏡
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-[var(--ink-soft)] border border-[var(--border-subtle)] px-4 py-3">
                <div className="flex gap-1 items-center h-4">
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

      {error && (
        <div className="mx-6 mb-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Input / paused / hard-stop footer */}
      <div className="px-6 pb-6 pt-3">
        {hardStop ? (
          <div className="flex flex-col gap-2 py-2 text-center">
            <p className="text-sm text-[var(--text-muted)]">{t.hardStopMsg}</p>
            <button
              onClick={onBack}
              className="mx-auto rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-all"
            >
              ⚙️ {t.switchToManual}
            </button>
          </div>
        ) : remaining <= 2 && promptCount > 0 ? (
          <div className="mb-2 rounded-xl border border-[var(--status-warning)] bg-[var(--status-warning-bg)] px-4 py-2 text-xs text-[var(--status-warning)]">
            {t.approachingLimit(remaining)}{' '}
            <button onClick={onBack} className="underline font-semibold">
              {t.switchToManual}
            </button>
          </div>
        ) : paused ? (
          <button
            onClick={handleResume}
            className="w-full rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/5 py-3 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all"
          >
            💬 {t.refineBtn} ({remaining} {isEl ? 'ακόμα' : 'left'})
          </button>
        ) : (
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder={t.placeholder}
              disabled={loading}
              className="flex-1 resize-none rounded-2xl border border-[var(--border-subtle)] bg-[var(--ink-soft)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="btn-primary flex-shrink-0 rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-40"
            >
              {loading ? '...' : t.send}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AIChatPanel
