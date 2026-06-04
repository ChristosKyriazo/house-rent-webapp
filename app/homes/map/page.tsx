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

interface PromptState {
  used: number
  limit: number
  remaining: number
  packCredits: number
  canSearch: boolean
  isPaid?: boolean
  guest?: boolean
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
const FREE_LIMIT = 3

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

  const [homes, setHomes] = useState<Home[]>([])
  const [selected, setSelected] = useState<Home | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapError, setMapError] = useState(false)

  // Panel state
  const [panelOpen, setPanelOpen] = useState(true)
  const [mode, setMode] = useState<'manual' | 'ai'>('manual')

  // Manual filters — pre-populated from URL params
  const type = searchParams.get('type') ?? 'rent'
  const [filters, setFilters] = useState({
    minPrice: searchParams.get('minPrice') ?? '',
    maxPrice: searchParams.get('maxPrice') ?? '',
    minBedrooms: searchParams.get('minBedrooms') ?? '',
    area: searchParams.get('area') ?? '',
  })

  // AI search state
  const [aiQuery, setAiQuery] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [promptState, setPromptState] = useState<PromptState>({ used: 0, limit: FREE_LIMIT, remaining: FREE_LIMIT, packCredits: 0, canSearch: true })
  const [showPaywall, setShowPaywall] = useState(false)
  const [purchaseLoading, setPurchaseLoading] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  homesRef.current = homes
  languageRef.current = language

  // Load prompt state on mount
  useEffect(() => {
    fetch('/api/ai-prompt-usage')
      .then(r => r.json())
      .then((d: PromptState) => {
        if (d.guest) {
          // Guest: read from localStorage
          const stored = parseInt(localStorage.getItem(GUEST_STORAGE_KEY) ?? '0', 10)
          setPromptState({ used: stored, limit: FREE_LIMIT, remaining: Math.max(0, FREE_LIMIT - stored), packCredits: 0, canSearch: stored < FREE_LIMIT, guest: true })
        } else {
          setPromptState(d)
        }
      })
      .catch(() => {})
  }, [])

  // Fetch homes (manual filter mode)
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

  useEffect(() => { fetchHomes(filters) }, [type]) // eslint-disable-line react-hooks/exhaustive-deps

  // Consume one AI search credit
  async function consumeCredit(): Promise<boolean> {
    if (promptState.guest) {
      const stored = parseInt(localStorage.getItem(GUEST_STORAGE_KEY) ?? '0', 10)
      if (stored >= FREE_LIMIT && promptState.packCredits === 0) return false
      localStorage.setItem(GUEST_STORAGE_KEY, String(stored + 1))
      setPromptState(p => ({ ...p, used: stored + 1, remaining: Math.max(0, FREE_LIMIT - stored - 1), canSearch: stored + 1 < FREE_LIMIT }))
      return true
    }
    const res = await fetch('/api/ai-prompt-usage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'consume' }) })
    if (res.status === 402) { setShowPaywall(true); return false }
    const data = await res.json()
    setPromptState(p => ({ ...p, remaining: data.remaining, packCredits: data.packCredits, canSearch: data.canSearch }))
    return true
  }

  // AI search
  async function runAiSearch() {
    if (!aiQuery.trim() || aiLoading) return
    if (!promptState.canSearch) { setShowPaywall(true); return }
    const ok = await consumeCredit()
    if (!ok) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/homes/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery, type }),
      })
      const data = await res.json()
      const matched = (data.homes ?? []).filter((h: Home) => h.latitude && h.longitude)
      setHomes(matched)
    } catch { /* silent */ } finally {
      setAiLoading(false)
    }
  }

  // Purchase pack (test mode — instant grant)
  async function purchasePack(size: '10' | '25' | '50') {
    setPurchaseLoading(true)
    try {
      const res = await fetch('/api/ai-prompt-usage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'purchase', pack: size }) })
      const data = await res.json()
      setPromptState(p => ({ ...p, packCredits: data.packCredits, canSearch: true }))
      setShowPaywall(false)
    } catch { /* silent */ } finally {
      setPurchaseLoading(false)
    }
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

      // Pin colour: amber→green gradient for AI match, flat amber for manual
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
              : home.pricePerMonth >= 1000
                ? `€${(home.pricePerMonth / 1000).toFixed(0)}k`
                : `€${home.pricePerMonth.toLocaleString()}`,
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

  // Effect 1: load Maps script once
  useEffect(() => {
    if (!apiKey || !mapRef.current) return
    const lang = language === 'el' ? 'el' : 'en'
    const initMapInstance = () => {
      if (!mapRef.current) return
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 37.9838, lng: 23.7275 },
        zoom: 12,
        styles: [{ featureType: 'all', stylers: [{ saturation: -20 }] }],
      })
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey])

  // Effect 2: re-render markers when homes/language change
  useEffect(() => { renderMarkers() }, [homes, language])  

  const parsePhotos = (raw: string | null) => {
    try { const p = JSON.parse(raw ?? '[]'); return Array.isArray(p) ? p : [] } catch { return [] }
  }

  // Prompt counter dots
  const dots = Array.from({ length: promptState.limit <= 3 ? 3 : 5 }, (_, i) => i < promptState.remaining)

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

        {/* Filter panel toggle button */}
        <button
          onClick={() => setPanelOpen(o => !o)}
          className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface)]/90 backdrop-blur-sm border border-[var(--border-subtle)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors shadow-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 8h12M9 12h6" /></svg>
          {panelOpen ? (isEl ? 'Κλείσιμο' : 'Close') : (isEl ? 'Φίλτρα' : 'Filters')}
        </button>

        {/* Filter panel */}
        {panelOpen && (
          <div className="absolute top-3 left-16 z-10 w-72 md:w-80 rounded-2xl bg-[var(--surface)]/90 backdrop-blur-md border border-white/10 shadow-2xl p-4 flex flex-col gap-3">
            {/* Mode toggle */}
            <div className="flex rounded-full bg-[var(--canvas)] p-1">
              {(['manual', 'ai'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-semibold transition-all ${mode === m ? 'bg-[var(--accent)] text-[var(--ink)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
                  {m === 'manual'
                    ? <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>{isEl ? 'Φίλτρα' : 'Filters'}</>
                    : <><span className={`text-sm ${mode === 'ai' ? '' : ''}`}>✦</span>{isEl ? 'AI' : 'AI'}</>}
                </button>
              ))}
            </div>

            {mode === 'manual' ? (
              <>
                {/* Price range */}
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

                {/* Bedrooms */}
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

                {/* Area */}
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1 block">{isEl ? 'Περιοχή' : 'Area'}</label>
                  <input type="text" placeholder={isEl ? 'π.χ. Κολωνάκι' : 'e.g. Kolonaki'} value={filters.area}
                    onChange={e => setFilters(f => ({ ...f, area: e.target.value }))}
                    className="w-full bg-[var(--canvas)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--text)] placeholder:text-white/30 focus:outline-none focus:border-amber-500/50" />
                </div>

                <button onClick={() => fetchHomes(filters)}
                  className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-[var(--ink)] text-sm font-bold transition-all hover:opacity-90 active:scale-95">
                  {isEl ? 'Εφαρμογή' : 'Apply filters'}
                </button>

                {(filters.minPrice || filters.maxPrice || filters.minBedrooms || filters.area) && (
                  <button onClick={() => { const reset = { minPrice: '', maxPrice: '', minBedrooms: '', area: '' }; setFilters(reset); fetchHomes(reset) }}
                    className="text-xs text-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                    {isEl ? 'Εκκαθάριση φίλτρων' : 'Clear filters'}
                  </button>
                )}
              </>
            ) : (
              /* AI search mode */
              <>
                <div className="relative">
                  <textarea
                    value={aiQuery}
                    onChange={e => setAiQuery(e.target.value.slice(0, AI_QUERY_MAX))}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAiSearch() } }}
                    placeholder={isEl ? 'Περιγράψτε το ιδανικό σπίτι σας…' : 'Describe your ideal home…'}
                    rows={3}
                    className="w-full bg-[var(--canvas)] border border-amber-500/40 focus:border-amber-500 rounded-xl px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-white/30 focus:outline-none resize-none"
                    disabled={!promptState.canSearch && !showPaywall}
                  />
                  <span className="absolute bottom-2 right-3 text-[10px] text-white/30">{aiQuery.length}/{AI_QUERY_MAX}</span>
                </div>

                {/* Prompt counter dots */}
                <div className="flex items-center gap-2 justify-center">
                  <div className="flex gap-1.5">
                    {dots.map((filled, i) => (
                      <span key={i} className={`w-2 h-2 rounded-full transition-all ${filled ? 'bg-amber-500' : 'border border-white/20'}`} />
                    ))}
                  </div>
                  <span className={`text-xs ${promptState.remaining === 1 && !promptState.isPaid ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>
                    {promptState.isPaid
                      ? (promptState.packCredits > 0
                          ? (isEl ? `${promptState.packCredits} pack` : `${promptState.packCredits} pack left`)
                          : (isEl ? `${promptState.remaining}/${promptState.limit} αυτόν τον μήνα` : `${promptState.remaining}/${promptState.limit} this month`))
                      : (isEl ? `${promptState.remaining} αναζητήσεις` : `${promptState.remaining} searches left`)}
                  </span>
                </div>

                {!showPaywall ? (
                  <button onClick={runAiSearch} disabled={aiLoading || !aiQuery.trim() || !promptState.canSearch}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95">
                    {aiLoading ? (isEl ? 'Αναζήτηση…' : 'Searching…') : (isEl ? 'Αναζήτηση με AI' : 'AI Search')}
                  </button>
                ) : (
                  /* Paywall card */
                  <div className="rounded-xl bg-[var(--surface)] border border-amber-500/30 p-4 flex flex-col gap-3">
                    <p className="font-[var(--font-fraunces)] text-sm italic text-white/80 text-center">
                      {isEl ? '"Βρείτε το σπίτι σας, όχι απλά μια αγγελία."' : '"Find your place, not just a listing."'}
                    </p>
                    {[{ size: '10' as const, price: '€2.99', label: isEl ? '10 AI αναζητήσεις' : '10 AI searches' },
                      { size: '25' as const, price: '€5.99', label: isEl ? '25 AI αναζητήσεις' : '25 AI searches' }].map(pack => (
                      <button key={pack.size} onClick={() => purchasePack(pack.size)} disabled={purchaseLoading}
                        className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[var(--canvas)] border border-white/10 hover:border-amber-500/30 transition-all disabled:opacity-50">
                        <span className="text-white font-semibold text-sm">{pack.price}</span>
                        <span className="text-[var(--text-muted)] text-xs">{pack.label}</span>
                        <span className="text-xs text-amber-400 font-semibold">{isEl ? 'Αγορά' : 'Buy'}</span>
                      </button>
                    ))}
                    <p className="text-[10px] text-white/30 text-center">{isEl ? 'Χωρίς συνδρομή. Δικά σας για πάντα.' : 'No subscription. Yours to keep.'}</p>
                    <button onClick={() => setShowPaywall(false)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-center">
                      {isEl ? 'Ακύρωση' : 'Cancel'}
                    </button>
                  </div>
                )}

                {homes.length > 0 && homes[0].matchPercentage != null && (
                  <button onClick={() => { setMode('manual'); fetchHomes(filters) }}
                    className="text-xs text-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                    {isEl ? 'Εκκαθάριση AI αποτελεσμάτων' : 'Clear AI results'}
                  </button>
                )}
              </>
            )}
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
              {isEl ? 'Δεν βρέθηκαν αγγελίες με τοποθεσία για αυτά τα φίλτρα.' : 'No listings with location data found for these filters.'}
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
            <Link href={`/homes/${selected.key}`} className="mt-3 block w-full text-center btn-primary rounded-xl py-2 text-sm">
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
