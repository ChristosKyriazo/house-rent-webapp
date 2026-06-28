'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getCityName, getCountryName, getAreaName, getHomeTitle } from '@/lib/area-utils'
import { SkeletonList } from '@/app/components/SkeletonCard'
import { SaveButton } from '@/app/components/SaveButton'

interface SavedEntry {
  id: number
  createdAt: string
  home: {
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
    bathrooms: number
    sizeSqMeters: number | null
    photos: string | null
    finalized: boolean
  }
}

export default function SavedHomesPage() {
  const { language } = useLanguage()
  const [saved, setSaved] = useState<SavedEntry[]>([])
  const [areas, setAreas] = useState<{ name: string; nameGreek: string | null; city: string | null; cityGreek: string | null; country: string | null; countryGreek: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const isEl = language === 'el'

  useEffect(() => {
    setLoading(true)
    setFetchError(false)
    Promise.all([
      fetch('/api/homes/saved').then(r => r.json()),
      fetch('/api/areas').then(r => r.json()),
    ]).then(([savedData, areasData]) => {
      setSaved(savedData.saved ?? [])
      setAreas(areasData.areas ?? [])
    }).catch(() => setFetchError(true)).finally(() => setLoading(false))
  }, [retryCount])

  const handleUnsave = (homeKey: string) => {
    setSaved(prev => prev.filter(s => s.home.key !== homeKey))
  }

  const parsePhotos = (raw: string | null): string[] => {
    if (!raw) return []
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [] } catch { return [] }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 h-10 w-48 rounded-xl bg-[var(--surface)] animate-pulse" />
          <SkeletonList count={3} />
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[var(--text-muted)] mb-4">
            {isEl ? 'Σφάλμα φόρτωσης. Δοκιμάστε ξανά.' : 'Failed to load saved properties. Please try again.'}
          </p>
          <button onClick={() => setRetryCount(c => c + 1)} className="btn-primary">
            {isEl ? 'Επανάληψη' : 'Retry'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
      <div className="max-w-5xl mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-[var(--text)] mb-2">
            {isEl ? 'Αποθηκευμένα ακίνητα' : 'Saved Properties'}
          </h1>
          <p className="text-[var(--text-muted)]">
            {isEl ? 'Τα ακίνητα που έχετε αποθηκεύσει' : 'Properties you\'ve saved for later'}
          </p>
        </div>

        {saved.length === 0 ? (
          <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-12 text-center shadow-xl border border-[var(--border-subtle)]">
            <p className="text-5xl mb-4">♡</p>
            <p className="text-xl text-[var(--text-muted)] mb-6">
              {isEl ? 'Δεν έχετε αποθηκεύσει ακίνητα ακόμα' : 'No saved properties yet'}
            </p>
            <Link href="/homes" className="btn-primary">
              {isEl ? 'Αναζήτηση ακινήτων' : 'Browse properties'}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {saved.map(({ home }) => {
              const photos = parsePhotos(home.photos)
              const thumb = photos[0]
              return (
                <div
                  key={home.key}
                  className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-[var(--border-subtle)] hover:border-[var(--accent)]/35 transition-all transform hover:-translate-y-1"
                >
                  <div className="flex gap-4 items-start">
                    {thumb && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={home.title}
                        className="w-24 h-20 rounded-xl object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/homes/${home.key}`} className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-[var(--text)] truncate hover:text-[var(--accent)] transition-colors">
                            {getHomeTitle(language, home)}
                          </h3>
                          <p className="text-[var(--text-muted)] text-sm mt-1">
                            📍 {home.area ? `${getAreaName(home.area, areas, language)}, ` : ''}
                            {getCityName(home.city, areas, language)}, {getCountryName(home.country, areas, language)}
                          </p>
                          <p className="text-[var(--accent)] font-bold mt-2">
                            €{home.pricePerMonth.toLocaleString()}{home.listingType === 'rent' ? '/mo' : ''}
                          </p>
                          <p className="text-[var(--text-muted)] text-sm">
                            {home.bedrooms} {isEl ? 'υπνοδ.' : 'bed'} · {home.bathrooms} {isEl ? 'μπάν.' : 'bath'}
                            {home.sizeSqMeters ? ` · ${home.sizeSqMeters}m²` : ''}
                          </p>
                        </Link>
                        <SaveButton
                          homeKey={home.key}
                          initialSaved={true}
                          onToggle={saved => { if (!saved) handleUnsave(home.key) }}
                          size="md"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
