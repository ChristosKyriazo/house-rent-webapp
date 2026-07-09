'use client'

import { useState, useRef, useEffect } from 'react'

interface ChatMessage {
  id: string
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
  onConversationKeyChange?: (key: string | null) => void
  // When returning from a listing detail page, the parent passes the restored
  // conversation key so the transcript can be rehydrated from the server
  initialConversationKey?: string | null
}

const FREE_PROMPTS = 10
const MSG_MAX_LENGTH = 200

function AIChatPanel(
  { searchType, excludeInquired, excludeApproved, onResultsFound, onBack, language, onConversationKeyChange, initialConversationKey }: AIChatPanelProps
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationKey, setConversationKey] = useState<string | null>(null)
  const [promptCount, setPromptCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [packCredits, setPackCredits] = useState(0)
  const [isPaid, setIsPaid] = useState(false)
  const [monthlyRemaining, setMonthlyRemaining] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const hydratedRef = useRef(false)

  const isEl = language === 'el'

  // Rehydrate the transcript from the server when returning with a saved
  // conversation key (e.g. after viewing a listing detail page)
  useEffect(() => {
    if (!initialConversationKey || hydratedRef.current) return
    hydratedRef.current = true
    const controller = new AbortController()
    fetch(`/api/homes/ai-chat?key=${encodeURIComponent(initialConversationKey)}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(conv => {
        const history = (conv?.messages ?? []) as Array<{ role: 'user' | 'assistant'; content: string }>
        if (history.length === 0) return
        const restored: ChatMessage[] = history.map((m, i) => ({ id: `restored-${i}`, role: m.role, content: m.content }))
        // Never clobber a conversation the user has already started typing in
        setMessages(prev => (prev.length > 0 ? prev : restored))
        setConversationKey(initialConversationKey)
        setPromptCount(restored.filter(m => m.role === 'user').length)
      })
      .catch(() => { /* hydration is best-effort */ })
    return () => controller.abort()
  }, [initialConversationKey])

  // Load server-side prompt state on mount
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/ai-prompt-usage', { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        if (d.isPaid) { setIsPaid(true); setMonthlyRemaining(d.remaining) }
        if (d.packCredits) setPackCredits(d.packCredits)
      })
      .catch((e) => { if (e?.name !== 'AbortError') console.error(e) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, loading])

  // Local limit: free users hit FREE_PROMPTS/month, paid users use server monthly remaining
  const atLocalLimit = isPaid
    ? (monthlyRemaining !== null && monthlyRemaining <= 0 && packCredits === 0)
    : (promptCount >= FREE_PROMPTS && packCredits === 0)

  const searchesLeft = isPaid
    ? (monthlyRemaining ?? (FREE_PROMPTS - promptCount))
    : Math.max(0, FREE_PROMPTS - promptCount)

  const t = {
    headline: isEl ? 'Πώς μπορώ να σας βοηθήσω να βρείτε το σπίτι σας;' : "Let's find your perfect home.",
    subtitle: isEl
      ? 'Περιγράψτε τι ψάχνετε — βλέπετε αποτελέσματα με κάθε μήνυμα και τα βελτιώνω καθώς μαθαίνω περισσότερα.'
      : 'Describe what you need — you see results with every message and I refine them as I learn more.',
    placeholder: isEl ? 'Γράψτε το μήνυμά σας...' : 'Type your message...',
    refinePlaceholder: isEl ? 'Προσθέστε περισσότερες λεπτομέρειες…' : 'Add more details to refine…',
    send: isEl ? 'Αποστολή' : 'Send',
    back: isEl ? 'Πίσω' : 'Back',
    startOver: isEl ? 'Νέα αναζήτηση' : 'New search',
    foundPrefix: isEl ? 'Βρήκα' : 'Found',
    foundSuffix: isEl ? 'ακίνητα ↓' : 'properties ↓',
    noResults: isEl ? 'Δεν βρήκα ακίνητα. Δοκιμάστε διαφορετικά κριτήρια.' : 'No matching properties. Try different criteria.',
    errorMsg: isEl ? 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.' : 'Something went wrong. Please try again.',
    switchToManual: isEl ? 'Χειροκίνητα φίλτρα' : 'Manual filters',
    getMoreSearches: isEl ? 'Αγορά περισσότερων αναζητήσεων' : 'Get more searches',
    exampleRent: isEl
      ? 'π.χ. "2άρι στην Αθήνα, γύρω στα 900€, κοντά σε σχολεία"'
      : 'e.g. "2-bed in Athens, around €900/mo, near schools"',
    exampleBuy: isEl
      ? 'π.χ. "3άρι στη Θεσσαλονίκη, έως 200.000€, με θέα θάλασσα"'
      : 'e.g. "3-bed in Thessaloniki, up to €200k, sea view"',
  }

  const consumeSearchCredit = async (): Promise<{ ok: boolean; remaining: number; pack: number }> => {
    try {
      const res = await fetch('/api/ai-prompt-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'consume' }),
      })
      if (res.status === 402) { setShowPurchaseModal(true); return { ok: false, remaining: 0, pack: packCredits } }
      const data = await res.json()
      const newPack = data.packCredits ?? packCredits
      const newRemaining = data.remaining ?? 0
      setPackCredits(newPack)
      if (isPaid) setMonthlyRemaining(newRemaining)
      return { ok: data.ok === true, remaining: newRemaining, pack: newPack }
    } catch {
      return { ok: true, remaining: searchesLeft, pack: packCredits }
    }
  }

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
    return (data.homes || []) as any[] // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  const handleSend = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    if (atLocalLimit) { setShowPurchaseModal(true); return }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    setInput('')
    setError(null)
    const newCount = promptCount + 1
    setPromptCount(newCount)
    setMessages(prev => [...prev, { id: `${Date.now()}-user`, role: 'user', content: msg }])
    setLoading(true)

    try {
      // Chat turn — extract accumulated filters from conversation
      const chatRes = await fetch('/api/homes/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, conversationKey, type: searchType }),
        signal,
      })
      const chatData = await chatRes.json()
      if (!chatRes.ok) throw new Error(chatData.error || 'Chat error')
      setConversationKey(chatData.conversationKey)
      onConversationKeyChange?.(chatData.conversationKey ?? null)

      // Show AI follow-up / summary message
      const aiMsg = chatData.followUpQuestion || chatData.assistantMessage || ''
      if (aiMsg) setMessages(prev => [...prev, { id: `${Date.now()}-ai`, role: 'assistant', content: aiMsg }])

      // Consume one credit and immediately search with accumulated filters
      const { ok, remaining: newRemaining, pack: newPack } = await consumeSearchCredit()
      if (!ok) { setLoading(false); return }

      const homes = await runSearch(chatData.filters)
      const resultMsg = homes.length > 0
        ? `${t.foundPrefix} ${homes.length} ${t.foundSuffix}`
        : t.noResults
      setMessages(prev => [...prev, { id: `${Date.now()}-result`, role: 'assistant', content: resultMsg }])
      onResultsFound(homes)

      // If this was the last available search, tell the user the result is final
      if (newRemaining === 0 && newPack === 0) {
        const limitMsg = isEl
          ? 'Αυτό είναι το τελευταίο αποτέλεσμα με τις διαθέσιμες αναζητήσεις σας. Αγοράστε περισσότερες παρακάτω αν θέλετε να συνεχίσετε να βελτιώνετε.'
          : 'This is your final result with your current searches. Purchase more below if you want to keep refining.'
        setMessages(prev => [...prev, { id: `${Date.now()}-limit`, role: 'assistant', content: limitMsg }])
      }
    } catch (e) {
      if ((e as { name?: string })?.name !== 'AbortError') setError(t.errorMsg)
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handlePurchase = async (size: '10' | '25' | '50') => {
    setPurchaseLoading(true)
    setPurchaseError(null)
    try {
      const res = await fetch('/api/ai-prompt-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purchase', pack: size, returnPath: window.location.pathname }),
      })
      const data = await res.json()
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return // navigating away; keep the spinner up
      }
      setPurchaseError(isEl ? 'Δεν ήταν δυνατή η έναρξη της πληρωμής. Δοκιμάστε ξανά.' : "Couldn't start checkout. Please try again.")
    } catch {
      setPurchaseError(isEl ? 'Δεν ήταν δυνατή η έναρξη της πληρωμής. Δοκιμάστε ξανά.' : "Couldn't start checkout. Please try again.")
    } finally {
      setPurchaseLoading(false)
    }
  }

  const handleReset = () => {
    setMessages([])
    setInput('')
    setConversationKey(null)
    onConversationKeyChange?.(null)
    setPromptCount(0)
    setError(null)
    setShowPurchaseModal(false)
    onResultsFound([])
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const isEmpty = messages.length === 0

  return (
    <>
      <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl shadow-xl border border-[var(--border-subtle)] mb-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--border-subtle)]">
          <button onClick={onBack} className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
            ← {t.back}
          </button>
          <div className="flex items-center gap-3">
            {promptCount > 0 && !atLocalLimit && (
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                searchesLeft <= 3 && packCredits === 0
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                  : 'border-[var(--border-subtle)] bg-[var(--ink-soft)] text-[var(--text-muted)]'
              }`}>
                {packCredits > 0 && searchesLeft > 0
                  ? (isEl ? `${searchesLeft} δωρ. + ${packCredits} pack` : `${searchesLeft} free + ${packCredits} pack`)
                  : packCredits > 0
                    ? (isEl ? `${packCredits} από pack` : `${packCredits} from pack`)
                    : (isEl ? `${searchesLeft} / ${FREE_PROMPTS} αυτόν τον μήνα` : `${searchesLeft} / ${FREE_PROMPTS} this month`)}
              </span>
            )}
            {!isEmpty && (
              <button onClick={handleReset} className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                ↺ {t.startOver}
              </button>
            )}
          </div>
        </div>

        {/* Welcome state */}
        {isEmpty && (
          <div className="px-8 pt-8 pb-4 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/10 text-3xl">🏡</div>
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
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-base mt-1">🏡</div>
                )}
                <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[var(--accent)] text-[var(--ink)] rounded-tr-sm'
                    : 'bg-[var(--ink-soft)] text-[var(--text)] rounded-tl-sm border border-[var(--border-subtle)]'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-base mt-1">🏡</div>
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
          <div className="mx-6 mb-3 rounded-xl bg-[var(--status-error-bg)] border border-[var(--status-error)] px-4 py-2 text-sm text-[var(--status-error)]">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-6 pt-3">
          {atLocalLimit ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowPurchaseModal(true)}
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition-all"
              >
                ✦ {t.getMoreSearches}
              </button>
              <button onClick={onBack} className="text-xs text-center text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                ⚙️ {t.switchToManual}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {searchesLeft === 1 && packCredits === 0 && (
                <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 leading-relaxed">
                  {isEl
                    ? 'Τελευταία δωρεάν αναζήτηση — το αποτέλεσμα θα είναι οριστικό εκτός αν αγοράσετε περισσότερες.'
                    : 'Last free search — this result will be final unless you purchase more.'}
                </p>
              )}
              <div className="flex gap-3 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value.slice(0, MSG_MAX_LENGTH))}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  placeholder={isEmpty ? t.placeholder : t.refinePlaceholder}
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
              <span className="text-right text-[11px] text-[var(--text-muted)]">{input.length}/{MSG_MAX_LENGTH}</span>
            </div>
          )}
        </div>
      </div>

      {/* Purchase modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-amber-500/30 p-6 flex flex-col gap-4 shadow-2xl">
            <p className="font-[var(--font-fraunces)] text-lg italic text-white/90 text-center">
              {isEl ? '"Βρείτε το σπίτι σας, όχι απλά μια αγγελία."' : '"Find your place, not just a listing."'}
            </p>
            <div className="flex flex-col gap-2">
              {([
                ['10', '€2.99', isEl ? '10 αναζητήσεις' : '10 AI searches'],
                ['25', '€5.99', isEl ? '25 αναζητήσεις' : '25 AI searches'],
                ['50', '€9.99', isEl ? '50 αναζητήσεις' : '50 AI searches'],
              ] as const).map(([size, price, label]) => (
                <button
                  key={size}
                  onClick={() => handlePurchase(size)}
                  disabled={purchaseLoading}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--canvas)] border border-white/10 hover:border-amber-500/40 transition-all disabled:opacity-50"
                >
                  <span className="text-white font-bold">{price}</span>
                  <span className="text-[var(--text-muted)] text-sm">{label}</span>
                  <span className="text-amber-400 text-sm font-semibold">{isEl ? 'Αγορά' : 'Buy'} →</span>
                </button>
              ))}
            </div>
            {purchaseError && (
              <p className="text-xs text-red-400 text-center" role="alert">{purchaseError}</p>
            )}
            <p className="text-xs text-white/30 text-center">
              {isEl ? 'Χωρίς συνδρομή. Δικά σας για πάντα.' : 'No subscription. Yours to keep.'}
            </p>
            <button
              onClick={() => setShowPurchaseModal(false)}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-center"
            >
              {isEl ? 'Ακύρωση' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default AIChatPanel
