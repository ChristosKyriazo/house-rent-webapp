'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
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
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any
    initMap: () => void
  }
}

function MapContent() {
  const { language } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  const isEl = language === 'el'
  const mapRef = useRef<HTMLDivElement>(null)
  const [homes, setHomes] = useState<Home[]>([])
  const [selected, setSelected] = useState<Home | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapError, setMapError] = useState(false)
  const type = searchParams.get('type') ?? 'rent'

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  useEffect(() => {
    fetch(`/api/homes?listingType=${type}&limit=200`)
      .then(r => r.json())
      .then(d => setHomes((d.homes ?? []).filter((h: Home) => h.latitude && h.longitude)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [type])

  useEffect(() => {
    if (!apiKey || !mapRef.current || homes.length === 0) return

    const initMap = () => {
      if (!window.google || !mapRef.current) return
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 37.9838, lng: 23.7275 }, // Athens default
        zoom: 12,
        styles: [{ featureType: 'all', stylers: [{ saturation: -20 }] }],
      })

      homes.forEach(home => {
        if (!home.latitude || !home.longitude) return
        const marker = new window.google.maps.Marker({
          position: { lat: home.latitude, lng: home.longitude },
          map,
          title: getHomeTitle(language, home),
          label: {
            text: `€${(home.pricePerMonth / 1000).toFixed(0)}k`,
            color: '#0c0f14',
            fontWeight: 'bold',
            fontSize: '11px',
          },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 18,
            fillColor: '#e3a75f',
            fillOpacity: 1,
            strokeColor: '#b87a3d',
            strokeWeight: 1.5,
          },
        })
        marker.addListener('click', () => setSelected(home))
      })
    }

    if (window.google) {
      initMap()
    } else {
      window.initMap = initMap
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`
      script.async = true
      script.onerror = () => setMapError(true)
      document.head.appendChild(script)
    }
  }, [homes, apiKey, language])

  const parsePhotos = (raw: string | null) => {
    try { const p = JSON.parse(raw ?? '[]'); return Array.isArray(p) ? p : [] } catch { return [] }
  }

  if (!apiKey) return (
    <div className="min-h-screen bg-[var(--ink-soft)] flex flex-col items-center justify-center gap-4 p-8">
      <p className="text-5xl">🗺️</p>
      <p className="text-xl font-bold text-[var(--text)]">{isEl ? 'Η προβολή χάρτη δεν είναι διαθέσιμη' : 'Map view unavailable'}</p>
      <p className="text-[var(--text-muted)] text-center max-w-sm">
        {isEl ? 'Ορίστε το NEXT_PUBLIC_GOOGLE_MAPS_API_KEY για να ενεργοποιήσετε τον χάρτη.' : 'Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the map.'}
      </p>
      <Link href="/homes" className="btn-secondary">{isEl ? 'Πίσω στη λίστα' : 'Back to list'}</Link>
    </div>
  )

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--ink-soft)] px-4 py-3">
        <button onClick={() => router.back()} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
          ← {isEl ? 'Πίσω' : 'Back'}
        </button>
        <h1 className="text-sm font-bold text-[var(--text)]">
          🗺 {isEl ? `${homes.length} ακίνητα στον χάρτη` : `${homes.length} properties on map`}
        </h1>
        <div className="flex gap-2">
          {(['rent', 'buy'] as const).map(t => (
            <Link
              key={t}
              href={`/homes/map?type=${t}`}
              className={`rounded-xl px-3 py-1 text-xs font-semibold transition-all ${type === t ? 'bg-[var(--accent)] text-[var(--ink)]' : 'bg-[var(--surface)] text-[var(--text-muted)]'}`}
            >
              {t === 'rent' ? (isEl ? 'Ενοικίαση' : 'Rent') : (isEl ? 'Αγορά' : 'Buy')}
            </Link>
          ))}
        </div>
      </div>

      <div className="relative flex-1">
        {/* Map */}
        <div ref={mapRef} className="h-full w-full" />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--ink-soft)]">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)]/25 border-t-[var(--accent)] animate-spin" />
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
            <button
              onClick={() => setSelected(null)}
              className="absolute right-3 top-3 text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              ✕
            </button>
            {parsePhotos(selected.photos)[0] && (
              <img src={parsePhotos(selected.photos)[0]} alt={selected.title} className="mb-3 h-32 w-full rounded-xl object-cover" />
            )}
            <p className="font-bold text-[var(--text)] line-clamp-2">{getHomeTitle(language, selected)}</p>
            <p className="mt-1 text-sm text-[var(--accent)] font-semibold">
              €{selected.pricePerMonth.toLocaleString()}{selected.listingType === 'rent' ? '/mo' : ''}
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
