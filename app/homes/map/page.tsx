'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getCityName, getHomeTitle } from '@/lib/area-utils'
import MatchBadge from '@/app/components/MatchBadge'
import type { MatchBreakdown, MatchReason } from '@/lib/search/match-reasons'

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
  matchPercentage?: number | null
  matchReasons?: MatchReason[] | null
  matchBreakdown?: MatchBreakdown | null
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

/**
 * A home's circle. Selected, it inverts — dark fill, white text, thick accent ring, a
 * little bigger and above its neighbours — so the one whose card is open stands out
 * (as on Airbnb/Booking).
 */
function markerStyle(home: Home, isSelected: boolean) {
  const pct = home.matchPercentage
  const hasScore = pct != null
  const fillColor = hasScore
    ? pct >= 80 ? '#4ade80' : pct >= 60 ? '#e3a75f' : '#78716c'
    : '#e3a75f'
  const strokeColor = hasScore
    ? pct >= 80 ? '#16a34a' : pct >= 60 ? '#b87a3d' : '#57534e'
    : '#b87a3d'
  const text = hasScore
    ? `${Math.round(pct)}%`
    : home.listingType === 'rent'
      ? `€${home.pricePerMonth.toLocaleString()}/μ`
      : home.pricePerMonth >= 1000 ? `€${(home.pricePerMonth / 1000).toFixed(0)}k` : `€${home.pricePerMonth.toLocaleString()}`
  return {
    label: { text, color: isSelected ? '#ffffff' : '#0c0f14', fontWeight: 'bold', fontSize: isSelected ? '11px' : '10px' },
    icon: {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: isSelected ? 22 : 18,
      fillColor: isSelected ? '#0c0f14' : fillColor,
      fillOpacity: 1,
      strokeColor: isSelected ? fillColor : strokeColor,
      strokeWeight: isSelected ? 4 : 1.5,
    },
    zIndex: isSelected ? Number(window.google.maps.Marker.MAX_ZINDEX) + 10_000 : undefined,
  }
}

function MapContent() {
  const { language, isEl } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()

  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clustererRef = useRef<any>(null)
  /** Bumped on every render pass so a slower, older pass can't add stale markers. */
  const renderPassRef = useRef(0)
  const homesRef = useRef<Home[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const homeByMarkerRef = useRef(new Map<any, Home>())
  const languageRef = useRef(language)
  const scriptTaggedRef = useRef(false)
  const loadedLangRef = useRef<string | null>(null)
  // Set synchronously by the AI-session restore effect so the manual-mode
  // fetch effect (which still sees the stale mode === 'manual' on this mount
  // pass) doesn't clobber the restored AI results with the full listing set.
  const aiSessionRestoredRef = useRef(false)

  const [homes, setHomes] = useState<Home[]>([])
  const [selected, setSelected] = useState<Home | null>(null)
  /** Homes in a cluster that zooming cannot split (same building, or already fully zoomed in). */
  const [selectedGroup, setSelectedGroup] = useState<Home[] | null>(null)
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
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

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
            aiSessionRestoredRef.current = true
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
    // aiSessionRestoredRef guards the mount pass where mode is still the
    // stale 'manual' default while a saved AI session is being restored
    if (mode === 'manual' && !aiSessionRestoredRef.current) fetchHomes(filters)
  }, [type]) // eslint-disable-line react-hooks/exhaustive-deps

  // Once the restored AI mode has landed, the guard has served its purpose —
  // clear it so later type changes in manual mode fetch normally
  useEffect(() => {
    if (mode === 'ai') aiSessionRestoredRef.current = false
  }, [mode])

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

      // Acknowledgement and the policy's next question are separate fields; show both, as
      // the main chat panel does. `||` showed the question only when there was no
      // acknowledgement, i.e. never.
      const assistantMsg = [chatData.assistantMessage, chatData.followUpQuestion].filter(Boolean).join(' ')
      if (assistantMsg) setAiMessages(prev => [...prev, { role: 'assistant', content: assistantMsg }])

      // Step 2: Immediately search with accumulated filters so far
      const searchRes = await fetch('/api/homes/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Search on the conversation's accumulated intent, not the last message: "600" or
        // "ναι" embedded as the query left semantic and feature matching scoring nothing.
        body: JSON.stringify({
          query: chatData.intentText && chatData.intentText.trim() ? chatData.intentText : msg,
          type,
          preExtractedFilters: chatData.filters,
          conversationKey: chatData.conversationKey ?? null,
        }),
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

  // Purchase pack — hand off to Stripe Checkout. Credits are granted by the
  // webhook after payment, so nothing about prompt state is updated here.
  async function purchasePack(size: '10' | '25' | '50') {
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

  function resetAISession() {
    setAiMessages([])
    setAiInput('')
    setConversationKey(null)
    setAiPromptCount(0)
    setHomes([])
    try { sessionStorage.removeItem(MAP_AI_SESSION_KEY) } catch { /* ignore */ }
    fetchHomes(filters)
  }

  /** Remove markers and the clusterer while `google` still exists. Never throws. */
  function teardownMarkers() {
    try {
      clustererRef.current?.clearMarkers()
      clustererRef.current?.setMap?.(null)
      markersRef.current.forEach(m => m.setMap(null))
    } catch {
      // Already gone — nothing left to clean up.
    }
    clustererRef.current = null
    markersRef.current = []
  }

  async function renderMarkers() {
    if (!window.google || !mapInstanceRef.current) return
    const pass = ++renderPassRef.current
    clustererRef.current?.clearMarkers()
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    setSelected(null)
    setSelectedGroup(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const homeByMarker = new Map<any, Home>()

    homesRef.current.forEach(home => {
      if (!home.latitude || !home.longitude) return
      const lang = languageRef.current
      // No `map` here — the clusterer decides whether each marker shows on its own or
      // folds into a numbered group.
      const marker = new window.google.maps.Marker({
        position: { lat: home.latitude, lng: home.longitude },
        title: getHomeTitle(lang, home),
        ...markerStyle(home, false),
      })
      marker.addListener('click', () => { setSelectedGroup(null); setSelected(home) })
      markersRef.current.push(marker)
      homeByMarker.set(marker, home)
    })

    // Loaded on demand: the library needs `google.maps`, which only exists in the browser
    // once the Maps script has run.
    const { MarkerClusterer, SuperClusterAlgorithm } = await import('@googlemaps/markerclusterer')
    if (pass !== renderPassRef.current || !mapInstanceRef.current) return

    const map = mapInstanceRef.current
    if (!clustererRef.current || clustererRef.current.getMap?.() !== map) {
      clustererRef.current?.setMap?.(null)
      clustererRef.current = new MarkerClusterer({
        map,
        // Cluster at every zoom level: listings at the same address overlap no matter how
        // far you zoom in, so they must stay grouped (and countable) all the way down.
        algorithm: new SuperClusterAlgorithm({ radius: 60, maxZoom: 21 }),
        renderer: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          render: ({ count, position }: { count: number; position: any }) =>
            new window.google.maps.Marker({
              position,
              label: { text: String(count), color: '#0c0f14', fontWeight: 'bold', fontSize: '12px' },
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: Math.min(18 + Math.log2(count) * 4, 34),
                fillColor: '#e3a75f',
                fillOpacity: 0.95,
                strokeColor: '#ffffff',
                strokeWeight: 3,
              },
              title: languageRef.current === 'el' ? `${count} ακίνητα` : `${count} homes`,
              zIndex: Number(window.google.maps.Marker.MAX_ZINDEX) + count,
            }),
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClusterClick: (_event: unknown, cluster: any, clusterMap: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const members = (cluster.markers as any[])
            .map(m => homeByMarkerRef.current.get(m))
            .filter((h): h is Home => Boolean(h))
          const positions = new Set(members.map(h => `${h.latitude?.toFixed(5)},${h.longitude?.toFixed(5)}`))
          const zoom = clusterMap.getZoom() ?? 0
          // Zooming can't separate homes at one address — list them instead, like Airbnb.
          if (positions.size <= 1 || zoom >= 18) {
            setSelected(null)
            setSelectedGroup(members)
          } else if (cluster.bounds) {
            clusterMap.fitBounds(cluster.bounds, 60)
          }
        },
      })
    }
    homeByMarkerRef.current = homeByMarker
    clustererRef.current.addMarkers(markersRef.current)
  }

  useEffect(() => {
    if (!apiKey || !mapRef.current) return
    const lang = language === 'el' ? 'el' : 'en'

    // If language changed after the map was already loaded, tear down and reload
    if (window.google && loadedLangRef.current && loadedLangRef.current !== lang) {
      teardownMarkers()
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

    return () => {
      // Markers/clusters first: the clusterer's clearMarkers() re-renders through the global
      // `google`, so removing it before this threw "google is not defined" during unmount —
      // the crash screen users saw on "View property" (retry worked because it re-ran later).
      teardownMarkers()
      document.querySelector('script[src*="maps.googleapis.com"]')?.remove()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).google
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).initMap
      mapInstanceRef.current = null
      scriptTaggedRef.current = false
    }
  }, [apiKey, language])

  useEffect(() => { renderMarkers() }, [homes, language])

  // Restyle in place when the selection changes — no re-render of the markers or clusters.
  useEffect(() => {
    if (!window.google) return
    for (const marker of markersRef.current) {
      const home = homeByMarkerRef.current.get(marker)
      if (!home) continue
      const style = markerStyle(home, selected?.id === home.id)
      marker.setIcon(style.icon)
      marker.setLabel(style.label)
      marker.setZIndex(style.zIndex ?? null)
    }
  }, [selected])  

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
    <div className="flex h-[100dvh] flex-col">
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
          <div className="absolute top-3 left-16 z-10 w-[calc(100vw-5.5rem)] max-w-[20rem] rounded-2xl bg-[var(--surface)]/90 backdrop-blur-md border border-white/10 shadow-2xl p-4 flex flex-col gap-3 max-h-[calc(100vh-8rem)] overflow-y-auto">

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
              {purchaseError && (
                <p className="text-xs text-red-400 text-center" role="alert">{purchaseError}</p>
              )}
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
        {selectedGroup && selectedGroup.length > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-80 max-w-[calc(100vw-2rem)] max-h-[60vh] flex flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="font-bold text-[var(--text)]">
                {selectedGroup.length} {isEl ? 'ακίνητα εδώ' : 'homes here'}
              </p>
              <button onClick={() => setSelectedGroup(null)} className="text-[var(--text-muted)] hover:text-[var(--text)]">✕</button>
            </div>
            <ul className="overflow-y-auto px-2 pb-2">
              {selectedGroup.map(home => (
                <li key={home.id}>
                  <Link
                    href={`/homes/${home.key}?from=map`}
                    onClick={saveAISession}
                    className="flex items-center gap-3 rounded-xl p-2 hover:bg-[var(--ink-soft)]"
                  >
                    {parsePhotos(home.photos)[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={parsePhotos(home.photos)[0]} alt={home.title} className="h-12 w-12 flex-none rounded-lg object-cover" />
                    ) : (
                      <div className="h-12 w-12 flex-none rounded-lg bg-[var(--ink-soft)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text)]">{getHomeTitle(language, home)}</p>
                      <p className="text-xs text-[var(--accent)] font-semibold">
                        €{home.pricePerMonth.toLocaleString()}
                        {home.listingType === 'rent' ? (isEl ? '/μήνα' : '/mo') : ''}
                        <span className="text-[var(--text-muted)] font-normal"> · {home.bedrooms} {isEl ? 'υπνοδ.' : 'bed'}</span>
                      </p>
                    </div>
                    {home.matchPercentage != null && (
                      <span className="flex-none text-xs font-bold text-[var(--text-muted)]">{Math.round(home.matchPercentage)}%</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {selected && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 shadow-2xl backdrop-blur-xl">
            <button onClick={() => setSelected(null)} className="absolute right-3 top-3 text-[var(--text-muted)] hover:text-[var(--text)]">✕</button>
            {parsePhotos(selected.photos)[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={parsePhotos(selected.photos)[0]} alt={selected.title} className="mb-3 h-32 w-full rounded-xl object-cover" />
            )}
            <p className="font-bold text-[var(--text)] line-clamp-2">{getHomeTitle(language, selected)}</p>
            {selected.matchPercentage != null && (
              <div className="mt-1 mb-1">
                <MatchBadge
                  percentage={selected.matchPercentage}
                  reasons={selected.matchReasons}
                  breakdown={selected.matchBreakdown}
                  placement="above"
                  align="left"
                  className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${selected.matchPercentage >= 80 ? 'bg-green-500/20 text-green-400' : selected.matchPercentage >= 60 ? 'bg-amber-500/20 text-amber-400' : 'bg-stone-500/20 text-stone-400'}`}
                />
              </div>
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
