'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getCityName, getHomeTitle } from '@/lib/area-utils'

interface Home {
  id: number
  key: string
  title: string
  titleGreek?: string | null
  city: string
  country: string
  area: string | null
  listingType: string
  pricePerMonth: number
  bedrooms: number
  latitude: number | null
  longitude: number | null
  photos: string | null
  matchPercentage?: number
}

interface AIChatMessage { role: 'user' | 'assistant'; content: string }

interface PromptState {
  used: number; limit: number; remaining: number
  packCredits: number; canSearch: boolean; isPaid?: boolean; guest?: boolean
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any
    initMap: () => void
  }
}

const AI_QUERY_MAX = 200
const GUEST_STORAGE_KEY = 'kaparro_ai_map_searches'
const MAP_AI_SESSION_KEY = 'mapAISession'
const FREE_LIMIT = 10
const SESSION_TTL_MS = 60 * 60 * 1000 // 1 hour

function MapContent() {
  const { language } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  const isEl = language === 'el'

  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([])
  const homesRef = useRef<Home[]>([])
  const languageRef = useRef(language)
  const scriptTaggedRef = useRef(false)
  const loadedLangRef = useRef<string | null>(null)

  const [homes, setHomes] = useState<Home[]>([])
  const [selected, setSelected] = useState<Home | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapError, setMapError] = useState(false)

  const [panelOpen, setPanelOpen] = useState(true)
  const [mode, setMode] = useState<'manual' | 'ai'>('manual')

  const type = searchParams.get('type') ?? 'rent'
  const [filters, setFilters] = useState({
    minPrice: searchParams.get('minPrice') ?? '',
    maxPrice: searchParams.get('maxPrice') ?? '',
    minBedrooms: searchParams.get('minBedrooms') ?? '',
    area: searchParams.get('area') ?? '',
  })

  // AI conversational state
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [conversationKey, setConversationKey] = useState<string | null>(null)
  const [aiPromptCount, setAiPromptCount] = useState(0)
  const [promptState, setPromptState] = useState<PromptState>({ used: 0, limit: FREE_LIMIT, remaining: FREE_LIMIT, packCredits: 0, canSearch: true })
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [purchaseLoading, setPurchaseLoading] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  homesRef.current = homes
  languageRef.current = language

  // Sync filter state to URL so browser back works after navigating to a listing
  const syncFiltersToUrl = useCallback((f: typeof filters) => {
    const params = new URLSearchParams({ type })
    if (f.minPrice) params.set('minPrice', f.minPrice)
    if (f.maxPrice) params.set('maxPrice', f.maxPrice)
    if (f.minBedrooms) params.set('minBedrooms', f.minBedrooms)
    if (f.area) params.set('area', f.area)
    router.replace(`/homes/map?${params}`, { scroll: false })
  }, [type, router])

  // Load prompt state + restore AI session on mount
  useEffect(() => {
    fetch('/api/ai-prompt-usage')
      .then(r => r.json())
      .then((d: PromptState) => {
        if (d.guest) {
          const stored = parseInt(localStorage.getItem(GUEST_STORAGE_KEY) ?? '0', 10)
          setPromptState({ used: stored, limit: FREE_LIMIT, remaining: Math.max(0, FREE_LIMIT - stored), packCredits: 0, canSearch: stored < FREE_LIMIT, guest: true })
        } else {
          setPromptState(d)
        }
      })
      .catch(() => {})

    // Restore AI chat session from sessionStorage if recent
    try {
      const raw = sessionStorage.getItem(MAP_AI_SESSION_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (Date.now() - saved.savedAt < SESSION_TTL_MS) {
          setAiMessages(saved.messages ?? [])
          setConversationKey(saved.conversationKey ?? null)
          setAiPromptCount(saved.promptCount ?? 0)
          if (saved.homes?.length) {
            setHomes(saved.homes)
            setMode('ai')
            setLoading(false)
            return
          }
        }
        sessionStorage.removeItem(MAP_AI_SESSION_KEY)
      }
    } catch { /* ignore */ }
  }, [])

  // Fetch homes (manual mode)
  const fetchHomes = useCallback((f: typeof filters) => {
    setLoading(true)
    const params = new URLSearchParams({ listingType: type, limit: '200' })
    if (f.minPrice) params.set('minPrice', f.minPrice)
    if (f.maxPrice) params.set('maxPrice', f.maxPrice)
    if (f.minBedrooms) params.set('minBedrooms', f.minBedrooms)
    if (f.area) params.set('areas', f.area)
    fetch(`/api/homes?${params}`)
      .then(r => r.json())
      .then(d => setHomes((d.homes ?? []).filter((h: Home) => h.latitude && h.longitude)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [type])

  useEffect(() => {
    if (mode === 'manual') fetchHomes(filters)
  }, [type]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save AI session to sessionStorage before navigating to a listing
  const saveAISession = useCallback(() => {
    if (mode !== 'ai' || aiMessages.length === 0) return
    try {
      sessionStorage.setItem(MAP_AI_SESSION_KEY, JSON.stringify({
        messages: aiMessages,
        conversationKey,
        promptCount: aiPromptCount,
        homes: homesRef.current,
        savedAt: Date.now(),
      }))
    } catch { /* ignore */ }
  }, [mode, aiMessages, conversationKey, aiPromptCount])

  // Consume one AI search credit
  async function consumeCredit(): Promise<{ ok: boolean; remaining: number; pack: number }> {
    if (promptState.guest) {
      const stored = parseInt(localStorage.getItem(GUEST_STORAGE_KEY) ?? '0', 10)
      if (stored >= FREE_LIMIT && promptState.packCredits === 0) return { ok: false, remaining: 0, pack: 0 }
      const newStored = stored + 1
      const newRemaining = Math.max(0, FREE_LIMIT - newStored)
      localStorage.setItem(GUEST_STORAGE_KEY, String(newStored))
      setPromptState(p => ({ ...p, used: newStored, remaining: newRemaining, canSearch: newRemaining > 0 }))
      return { ok: true, remaining: newRemaining, pack: promptState.packCredits }
    }
    const res = await fetch('/api/ai-prompt-usage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'consume' }) })
    if (res.status === 402) { setShowPurchaseModal(true); return { ok: false, remaining: 0, pack: promptState.packCredits } }
    const data = await res.json()
    setPromptState(p => ({ ...p, remaining: data.remaining, packCredits: data.packCredits, canSearch: data.canSearch }))
    return { ok: true, remaining: data.remaining ?? 0, pack: data.packCredits ?? 0 }
  }

  // Send an AI chat message → get filters → immediately search → update pins
  async function sendAIMessage() {
    const msg = aiInput.trim()
    if (!msg || aiLoading) return
    if (!promptState.canSearch && promptState.packCredits === 0) { setShowPurchaseModal(true); return }

    const { ok, remaining: newRemaining, pack: newPack } = await consumeCredit()
    if (!ok) return

    setAiInput('')
    setAiLoading(true)
    const newCount = aiPromptCount + 1
    setAiPromptCount(newCount)
    setAiMessages(prev => [...prev, { role: 'user', content: msg }])

    try {
      // Step 1: AI chat turn → extract accumulated filters
      const chatRes = await fetch('/api/homes/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, conversationKey, type }),
      })
      const chatData = await chatRes.json()
      if (!chatRes.ok) throw new Error(chatData.error ?? 'Chat error')
      setConversationKey(chatData.conversationKey)

      // Add assistant message (follow-up question or summary)
      const assistantMsg = chatData.assistantMessage || chatData.followUpQuestion || ''
      if (assistantMsg) setAiMessages(prev => [...prev, { role: 'assistant', content: assistantMsg }])

      // Step 2: Immediately search with accumulated filters so far
      const searchRes = await fetch('/api/homes/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: msg, type, preExtractedFilters: chatData.filters }),
      })
      const searchData = await searchRes.json()
      const matched = (searchData.homes ?? []).filter((h: Home) => h.latitude && h.longitude)
      setHomes(matched)

      // Tell the user if this was their last available search
      if (newRemaining === 0 && newPack === 0) {
        const limitMsg = isEl
          ? 'Αυτό είναι το τελικό αποτέλεσμα με τις διαθέσιμες αναζητήσεις σας. Αγοράστε περισσότερες για να συνεχίσετε να βελτιώνετε.'
          : 'This is your final result with your current searches. Purchase more to keep refining.'
        setAiMessages(prev => [...prev, { role: 'assistant', content: limitMsg }])
      }
    } catch {
      setAiMessages(prev => [...prev, { role: 'assistant', content: isEl ? 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.' : 'Something went wrong. Try again.' }])
    } finally {
      setAiLoading(false)
    }
  }

  // Purchase pack
  async function purchasePack(size: '10' | '25' | '50') {
    setPurchaseLoading(true)
    try {
      const res = await fetch('/api/ai-prompt-usage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'purchase', pack: size }) })
      const data = await res.json()
      setPromptState(p => ({ ...p, packCredits: data.packCredits, canSearch: true }))
      setShowPurchaseModal(false)
    } catch { /* silent */ } finally {
      setPurchaseLoading(false)
    }
  }

  function resetAISession() {
    setAiMessages([])
    setAiInput('')
    setConversationKey(null)
    setAiPromptCount(0)
    setHomes([])
    try { sessionStorage.removeItem(MAP_AI_SESSION_KEY) } catch { /* ignore */ }
    fetchHomes(filters)
  }

  function renderMarkers() {
    if (!window.google || !mapInstanceRef.current) return
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    setSelected(null)

    homesRef.current.forEach(home => {
      if (!home.latitude || !home.longitude) return
      const lang = languageRef.current
      const pct = home.matchPercentage
      const hasScore = pct != null

      const fillColor = hasScore
        ? pct >= 80 ? '#4ade80' : pct >= 60 ? '#e3a75f' : '#78716c'
        : '#e3a75f'
      const strokeColor = hasScore
        ? pct >= 80 ? '#16a34a' : pct >= 60 ? '#b87a3d' : '#57534e'
        : '#b87a3d'

      const label = hasScore
        ? { text: `${Math.round(pct)}%`, color: '#0c0f14', fontWeight: 'bold', fontSize: '10px' }
        : {
            text: home.listingType === 'rent'
              ? `€${home.pricePerMonth.toLocaleString()}/μ`
              : home.pricePerMonth >= 1000 ? `€${(home.pricePerMonth / 1000).toFixed(0)}k` : `€${home.pricePerMonth.toLocaleString()}`,
            color: '#0c0f14', fontWeight: 'bold', fontSize: '10px',
          }

      const marker = new window.google.maps.Marker({
        position: { lat: home.latitude, lng: home.longitude },
        map: mapInstanceRef.current,
        title: getHomeTitle(lang, home),
        label,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 18, fillColor, fillOpacity: 1, strokeColor, strokeWeight: 1.5 },
      })
      marker.addListener('click', () => setSelected(home))
      markersRef.current.push(marker)
    })
  }

  useEffect(() => {
    if (!apiKey || !mapRef.current) return
    const lang = language === 'el' ? 'el' : 'en'

    // If language changed after the map was already loaded, tear down and reload
    if (window.google && loadedLangRef.current && loadedLangRef.current !== lang) {
      document.querySelector('script[src*="maps.googleapis.com"]')?.remove()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).google
      mapInstanceRef.current = null
      scriptTaggedRef.current = false
    }

    const initMapInstance = () => {
      if (!mapRef.current) return
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 37.9838, lng: 23.7275 },
        zoom: 12,
        // Move Map/Satellite toggle to top-right so it doesn't clash with our filter panel
        mapTypeControlOptions: { position: window.google.maps.ControlPosition.TOP_RIGHT },
        styles: [{ featureType: 'all', stylers: [{ saturation: -20 }] }],
      })
      loadedLangRef.current = lang
      renderMarkers()
    }

    if (window.google) {
      if (!mapInstanceRef.current) initMapInstance()
    } else if (!scriptTaggedRef.current) {
      scriptTaggedRef.current = true
      window.initMap = initMapInstance
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&language=${lang}`
      script.async = true
      script.onerror = () => setMapError(true)
      document.head.appendChild(script)
    } else {
      window.initMap = initMapInstance
    }
   
  }, [apiKey, language])

  useEffect(() => { renderMarkers() }, [homes, language])  

  const parsePhotos = (raw: string | null) => {
    try { const p = JSON.parse(raw ?? '[]'); return Array.isArray(p) ? p : [] } catch { return [] }
  }

  const canSendAI = !aiLoading && aiInput.trim().length > 0 && (promptState.canSearch || promptState.packCredits > 0)
  const atAILimit = aiPromptCount >= FREE_LIMIT && !promptState.isPaid && promptState.packCredits === 0
  const searchesLeft = promptState.isPaid
    ? promptState.remaining
    : Math.max(0, FREE_LIMIT - aiPromptCount)

  if (!apiKey) return (
    <div className="min-h-screen bg-[var(--ink-soft)] flex flex-col items-center justify-center gap-4 p-8">
      <p className="text-5xl">🗺️</p>
      <p className="text-xl font-bold text-[var(--text)]">{isEl ? 'Η προβολή χάρτη δεν είναι διαθέσιμη' : 'Map view unavailable'}</p>
      <Link href="/homes" className="btn-secondary">{isEl ? 'Πίσω στη λίστα' : 'Back to list'}</Link>
    </div>
  )

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--ink-soft)] px-4 py-3 pt-[max(4rem,calc(env(safe-area-inset-top)+3.5rem))]">
        <button onClick={() => router.back()} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
          ← {isEl ? 'Πίσω' : 'Back'}
        </button>
        <div className="flex gap-1 rounded-2xl bg-[var(--surface)] p-1 border border-[var(--border-subtle)]">
          {(['rent', 'buy'] as const).map(t => (
            <Link key={t} href={`/homes/map?type=${t}`}
              className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition-all ${type === t ? 'bg-[var(--accent)] text-[var(--ink)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
              {t === 'rent' ? (isEl ? 'Ενοικίαση' : 'Rent') : (isEl ? 'Αγορά' : 'Buy')}
            </Link>
          ))}
        </div>
        <div className="w-16" />
      </div>

      <div className="relative flex-1">
        <div ref={mapRef} className="h-full w-full" />

        {/* Filter panel toggle */}
        <button
          onClick={() => setPanelOpen(o => !o)}
          className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface)]/90 backdrop-blur-sm border border-[var(--border-subtle)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors shadow-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 8h12M9 12h6" /></svg>
          {panelOpen ? (isEl ? 'Κλείσιμο' : 'Close') : (isEl ? 'Φίλτρα' : 'Filters')}
        </button>

        {/* Filter panel */}
        {panelOpen && (
          <div className="absolute top-3 left-16 z-10 w-72 md:w-80 rounded-2xl bg-[var(--surface)]/90 backdrop-blur-md border border-white/10 shadow-2xl p-4 flex flex-col gap-3 max-h-[calc(100vh-8rem)] overflow-y-auto">

            {/* Mode toggle */}
            <div className="flex rounded-full bg-[var(--canvas)] p-1 shrink-0">
              {(['manual', 'ai'] as const).map(m => (
                <button key={m} onClick={() => {
                  setMode(m)
                  if (m === 'manual') fetchHomes(filters)
                }}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-semibold transition-all ${mode === m ? 'bg-[var(--accent)] text-[var(--ink)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
                  {m === 'manual'
                    ? <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>{isEl ? 'Φίλτρα' : 'Filters'}</>
                    : <><span>✦</span>{isEl ? 'AI Αναζήτηση' : 'AI Search'}</>}
                </button>
              ))}
            </div>

            {mode === 'manual' ? (
              <>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-[var(--text-muted)] mb-1 block">{isEl ? 'Από €' : 'Min €'}</label>
                    <input type="number" placeholder="0" value={filters.minPrice}
                      onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                      className="w-full bg-[var(--canvas)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--text)] placeholder:text-white/30 focus:outline-none focus:border-amber-500/50" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-[var(--text-muted)] mb-1 block">{isEl ? 'Έως €' : 'Max €'}</label>
                    <input type="number" placeholder="∞" value={filters.maxPrice}
                      onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                      className="w-full bg-[var(--canvas)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--text)] placeholder:text-white/30 focus:outline-none focus:border-amber-500/50" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1.5 block">{isEl ? 'Υπνοδωμάτια' : 'Bedrooms'}</label>
                  <div className="flex gap-1.5">
                    {['', '1', '2', '3', '4'].map(v => (
                      <button key={v} onClick={() => setFilters(f => ({ ...f, minBedrooms: v }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filters.minBedrooms === v ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'border-white/10 text-[var(--text-muted)] hover:border-white/20'}`}>
                        {v === '' ? (isEl ? 'Όλα' : 'All') : v === '4' ? '4+' : v}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1 block">{isEl ? 'Περιοχή' : 'Area'}</label>
                  <input type="text" placeholder={isEl ? 'π.χ. Κολωνάκι' : 'e.g. Kolonaki'} value={filters.area}
                    onChange={e => setFilters(f => ({ ...f, area: e.target.value }))}
                    className="w-full bg-[var(--canvas)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--text)] placeholder:text-white/30 focus:outline-none focus:border-amber-500/50" />
                </div>

                <button onClick={() => { syncFiltersToUrl(filters); fetchHomes(filters) }}
                  className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-[var(--ink)] text-sm font-bold transition-all hover:opacity-90 active:scale-95">
                  {isEl ? 'Εφαρμογή' : 'Apply filters'}
                </button>

                {(filters.minPrice || filters.maxPrice || filters.minBedrooms || filters.area) && (
                  <button onClick={() => { const r = { minPrice: '', maxPrice: '', minBedrooms: '', area: '' }; setFilters(r); syncFiltersToUrl(r); fetchHomes(r) }}
                    className="text-xs text-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                    {isEl ? 'Εκκαθάριση φίλτρων' : 'Clear filters'}
                  </button>
                )}
              </>
            ) : (
              /* AI conversational mode */
              <>
                {/* Chat messages */}
                {aiMessages.length > 0 && (
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {aiMessages.map((m, i) => (
                      <div key={i} className={`text-xs px-3 py-2 rounded-xl leading-relaxed ${m.role === 'user' ? 'bg-amber-500/15 text-amber-200 self-end ml-6' : 'bg-[var(--canvas)] text-[var(--text-muted)] self-start mr-6'}`}>
                        {m.content}
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="flex gap-1 items-center px-3 py-2 bg-[var(--canvas)] rounded-xl self-start w-14">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:300ms]" />
                      </div>
                    )}
                  </div>
                )}

                {/* Input or limit CTA */}
                {atAILimit ? (
                  <button onClick={() => setShowPurchaseModal(true)}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold transition-all">
                    ✦ {isEl ? 'Αγορά περισσότερων αναζητήσεων' : 'Get more searches'}
                  </button>
                ) : (
                  <div className="relative">
                    <textarea
                      value={aiInput}
                      onChange={e => setAiInput(e.target.value.slice(0, AI_QUERY_MAX))}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIMessage() } }}
                      placeholder={aiMessages.length === 0
                        ? (isEl ? 'Περιγράψτε το ιδανικό σπίτι σας…' : 'Describe your ideal home…')
                        : (isEl ? 'Προσθέστε περισσότερες λεπτομέρειες…' : 'Add more details…')}
                      rows={2}
                      className="w-full bg-[var(--canvas)] border border-amber-500/40 focus:border-amber-500 rounded-xl px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-white/30 focus:outline-none resize-none"
                      disabled={aiLoading}
                    />
                    <span className="absolute bottom-2 right-3 text-[10px] text-white/30">{aiInput.length}/{AI_QUERY_MAX}</span>
                  </div>
                )}

                {/* Search counter + last-search warning */}
                {!atAILimit && aiPromptCount > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <div className="text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${searchesLeft <= 3 && promptState.packCredits === 0 ? 'border-amber-500/40 bg-amber-500/10 text-amber-400' : 'border-white/10 text-[var(--text-muted)]'}`}>
                        {promptState.packCredits > 0 && searchesLeft > 0
                          ? (isEl ? `${searchesLeft} δωρ. + ${promptState.packCredits} pack` : `${searchesLeft} free + ${promptState.packCredits} pack`)
                          : promptState.packCredits > 0
                            ? (isEl ? `${promptState.packCredits} από pack` : `${promptState.packCredits} from pack`)
                            : (isEl ? `${searchesLeft} / ${FREE_LIMIT} αυτόν τον μήνα` : `${searchesLeft} / ${FREE_LIMIT} this month`)}
                      </span>
                    </div>
                    {searchesLeft === 1 && promptState.packCredits === 0 && (
                      <p className="text-[10px] text-amber-400/80 bg-amber-500/8 border border-amber-500/20 rounded-xl px-2.5 py-1.5 leading-relaxed text-center">
                        {isEl
                          ? 'Τελευταία αναζήτηση — αγοράστε περισσότερες για να συνεχίσετε.'
                          : 'Last search — purchase more to keep refining.'}
                      </p>
                    )}
                  </div>
                )}

                {!atAILimit && (
                  <button onClick={sendAIMessage} disabled={!canSendAI}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95">
                    {aiLoading ? (isEl ? 'Αναζήτηση…' : 'Searching…') : (isEl ? 'Αποστολή' : 'Send')}
                  </button>
                )}

                {aiMessages.length > 0 && (
                  <button onClick={resetAISession} className="text-xs text-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                    {isEl ? 'Νέα αναζήτηση' : 'New search'}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Purchase modal */}
        {showPurchaseModal && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-amber-500/30 p-6 flex flex-col gap-4 shadow-2xl">
              <p className="font-[var(--font-fraunces)] text-lg italic text-white/90 text-center">
                {isEl ? '"Βρείτε το σπίτι σας, όχι απλά μια αγγελία."' : '"Find your place, not just a listing."'}
              </p>
              <div className="flex flex-col gap-2">
                {([['10', '€2.99', isEl ? '10 αναζητήσεις' : '10 AI searches'], ['25', '€5.99', isEl ? '25 αναζητήσεις' : '25 AI searches'], ['50', '€9.99', isEl ? '50 αναζητήσεις' : '50 AI searches']] as const).map(([size, price, label]) => (
                  <button key={size} onClick={() => purchasePack(size)} disabled={purchaseLoading}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--canvas)] border border-white/10 hover:border-amber-500/40 transition-all disabled:opacity-50">
                    <span className="text-white font-bold">{price}</span>
                    <span className="text-[var(--text-muted)] text-sm">{label}</span>
                    <span className="text-amber-400 text-sm font-semibold">{isEl ? 'Αγορά' : 'Buy'} →</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/30 text-center">{isEl ? 'Χωρίς συνδρομή. Δικά σας για πάντα.' : 'No subscription. Yours to keep.'}</p>
              <button onClick={() => setShowPurchaseModal(false)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-center">
                {isEl ? 'Ακύρωση' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--ink-soft)]">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)]/25 border-t-[var(--accent)] animate-spin" />
          </div>
        )}

        {!loading && !mapError && homes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--ink-soft)] gap-3 pointer-events-none">
            <p className="text-4xl">📍</p>
            <p className="text-[var(--text-muted)] text-sm text-center max-w-xs">
              {isEl ? 'Δεν βρέθηκαν αγγελίες για αυτά τα φίλτρα.' : 'No listings found for these filters.'}
            </p>
          </div>
        )}

        {mapError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--ink-soft)] gap-3">
            <p className="text-[var(--text-muted)]">{isEl ? 'Σφάλμα φόρτωσης χάρτη' : 'Failed to load map'}</p>
            <Link href="/homes" className="btn-secondary text-sm">{isEl ? 'Πίσω στη λίστα' : 'Back to list'}</Link>
          </div>
        )}

        {/* Selected home popup */}
        {selected && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 shadow-2xl backdrop-blur-xl">
            <button onClick={() => setSelected(null)} className="absolute right-3 top-3 text-[var(--text-muted)] hover:text-[var(--text)]">✕</button>
            {parsePhotos(selected.photos)[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={parsePhotos(selected.photos)[0]} alt={selected.title} className="mb-3 h-32 w-full rounded-xl object-cover" />
            )}
            <p className="font-bold text-[var(--text)] line-clamp-2">{getHomeTitle(language, selected)}</p>
            {selected.matchPercentage != null && (
              <span className={`inline-block mt-1 mb-1 text-xs font-bold px-2 py-0.5 rounded-full ${selected.matchPercentage >= 80 ? 'bg-green-500/20 text-green-400' : selected.matchPercentage >= 60 ? 'bg-amber-500/20 text-amber-400' : 'bg-stone-500/20 text-stone-400'}`}>
                {Math.round(selected.matchPercentage)}% {isEl ? 'ταίριασμα' : 'match'}
              </span>
            )}
            <p className="mt-1 text-sm text-[var(--accent)] font-semibold">
              €{selected.pricePerMonth.toLocaleString()}
              {selected.listingType === 'rent' ? (isEl ? '/μήνα' : '/mo') : (isEl ? ' συνολικά' : ' total')}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {selected.bedrooms} {isEl ? 'υπνοδ.' : 'bed'} · {getCityName(selected.city, [], language)}
            </p>
            {/* Pass ?from=map so listing back button returns here via router.back() */}
            <Link
              href={`/homes/${selected.key}?from=map`}
              onClick={saveAISession}
              className="mt-3 block w-full text-center btn-primary rounded-xl py-2 text-sm"
            >
              {isEl ? 'Προβολή' : 'View property'}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)]/25 border-t-[var(--accent)] animate-spin" />
      </div>
    }>
      <MapContent />
    </Suspense>
  )
}
