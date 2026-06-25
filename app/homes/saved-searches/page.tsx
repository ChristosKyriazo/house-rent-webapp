'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'

interface SavedSearch {
  key: string
  name: string | null
  type: 'filter' | 'ai'
  filterParams: Record<string, unknown> | null
  queryText: string | null
  minMatchPercent: number | null
  notificationsEnabled: boolean
  lastNotifiedAt: string | null
  createdAt: string
}

export default function SavedSearchesPage() {
  const { language } = useLanguage()
  const [searches, setSearches] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toastError, setToastError] = useState<string | null>(null)
  const isEl = language === 'el'
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  async function load() {
    try {
      const res = await fetch('/api/saved-searches')
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setSearches(data.searches ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function toggleNotifications(key: string, current: boolean) {
    const prev = searches
    setSearches(s => s.map(x => x.key === key ? { ...x, notificationsEnabled: !current } : x))
    try {
      const res = await fetch(`/api/saved-searches/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationsEnabled: !current }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setSearches(prev)
      setToastError(isEl ? 'Αποτυχία ενημέρωσης' : 'Failed to update')
      setTimeout(() => setToastError(null), 3000)
    }
  }

  function updateThresholdLocal(key: string, value: number) {
    setSearches(s => s.map(x => x.key === key ? { ...x, minMatchPercent: value } : x))
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key])
    debounceTimers.current[key] = setTimeout(async () => {
      try {
        const res = await fetch(`/api/saved-searches/${key}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ minMatchPercent: value }),
        })
        if (!res.ok) throw new Error()
      } catch {
        setToastError(isEl ? 'Αποτυχία αποθήκευσης' : 'Failed to save')
        setTimeout(() => setToastError(null), 3000)
      }
    }, 400)
  }

  async function deleteSearch(key: string) {
    const prev = searches
    setSearches(s => s.filter(x => x.key !== key))
    try {
      const res = await fetch(`/api/saved-searches/${key}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
    } catch {
      setSearches(prev)
      setToastError(isEl ? 'Αποτυχία διαγραφής' : 'Failed to delete')
      setTimeout(() => setToastError(null), 3000)
    }
  }

  function describeSavedFilters(search: SavedSearch): string {
    if (search.type === 'ai') {
      return search.queryText ? `"${search.queryText.slice(0, 80)}${search.queryText.length > 80 ? '…' : ''}"` : (isEl ? 'AI αναζήτηση' : 'AI search')
    }
    const fp = search.filterParams ?? {}
    const parts: string[] = []
    if (fp.city) parts.push(fp.city as string)
    if (fp.country) parts.push(fp.country as string)
    if (fp.minBedrooms) parts.push(`${fp.minBedrooms}+ ${isEl ? 'υπν.' : 'beds'}`)
    if (fp.maxPrice) parts.push(`≤€${fp.maxPrice}`)
    if (fp.minPrice) parts.push(`≥€${fp.minPrice}`)
    return parts.length > 0 ? parts.join(', ') : (isEl ? 'Χωρίς φίλτρα' : 'No filters')
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/homes" className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">
              {isEl ? 'Αποθηκευμένες αναζητήσεις' : 'Saved searches'}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {isEl ? 'Λαμβάνεις ειδοποίηση όταν δημοσιευτεί νέα αγγελία που ταιριάζει.' : 'Get notified when a matching new listing is published.'}
            </p>
          </div>
        </div>

        {toastError && (
          <div className="mb-4 px-4 py-3 rounded-2xl bg-[var(--status-error-bg,#3d1a1a)] text-[var(--status-error)] border border-[var(--status-error)]/30 text-sm">
            {toastError}
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[var(--surface)] rounded-3xl p-5 border border-[var(--border-subtle)] animate-pulse">
                <div className="h-4 bg-[var(--ink-soft)] rounded w-1/2 mb-3" />
                <div className="h-3 bg-[var(--ink-soft)] rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="bg-[var(--status-error-bg,#3d1a1a)] text-[var(--status-error)] rounded-2xl p-5 border border-[var(--status-error)]/30">
            {error}
          </div>
        )}

        {!loading && !error && searches.length === 0 && (
          <div className="bg-[var(--surface)] rounded-3xl p-12 text-center border border-[var(--border-subtle)]">
            <div className="text-5xl mb-4">🔔</div>
            <p className="text-lg font-semibold text-[var(--text)] mb-2">
              {isEl ? 'Καμία αποθηκευμένη αναζήτηση' : 'No saved searches yet'}
            </p>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              {isEl ? 'Κάνε μια αναζήτηση και πάτησε "Αποθήκευση" για να ξεκινήσεις να λαμβάνεις ειδοποιήσεις.' : 'Run a search and click "Save search" to start receiving notifications.'}
            </p>
            <Link href="/homes" className="btn-primary inline-flex px-5 py-2 text-sm rounded-xl">
              {isEl ? 'Αναζήτηση ακινήτων' : 'Browse listings'}
            </Link>
          </div>
        )}

        {!loading && searches.length > 0 && (
          <div className="space-y-4">
            {searches.map(search => (
              <div
                key={search.key}
                className="bg-[var(--surface)] rounded-3xl p-5 border border-[var(--border-subtle)] transition-opacity"
                style={{ opacity: search.notificationsEnabled ? 1 : 0.6 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${search.type === 'ai' ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'bg-[var(--ink-soft)] text-[var(--text-muted)]'}`}>
                        {search.type === 'ai' ? 'AI' : (isEl ? 'Φίλτρα' : 'Filter')}
                      </span>
                      {!search.notificationsEnabled && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--ink-soft)] text-[var(--text-muted)]">
                          {isEl ? 'Απενεργοποιημένο' : 'Paused'}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-[var(--text)] truncate">
                      {search.name ?? describeSavedFilters(search)}
                    </p>
                    {search.name && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                        {describeSavedFilters(search)}
                      </p>
                    )}
                    {search.type === 'ai' && search.minMatchPercent !== null && (
                      <div className="mt-3">
                        <label className="text-xs text-[var(--text-muted)]">
                          {isEl ? `Ελάχιστη ομοιότητα: ` : `Min match: `}
                          <span className="font-bold text-[var(--accent)]">{search.minMatchPercent}%</span>
                        </label>
                        <input
                          type="range"
                          min={30}
                          max={95}
                          step={5}
                          value={search.minMatchPercent}
                          onChange={e => updateThresholdLocal(search.key, Number(e.target.value))}
                          className="w-full mt-1 accent-[var(--accent)]"
                        />
                        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-0.5">
                          <span>30%</span>
                          <span>95%</span>
                        </div>
                      </div>
                    )}
                    {search.lastNotifiedAt && (
                      <p className="text-xs text-[var(--text-muted)] mt-2">
                        {isEl ? 'Τελευταία ειδοποίηση:' : 'Last notified:'}{' '}
                        {new Date(search.lastNotifiedAt).toLocaleDateString(isEl ? 'el-GR' : 'en-GB')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleNotifications(search.key, search.notificationsEnabled)}
                      title={search.notificationsEnabled ? (isEl ? 'Παύση ειδοποιήσεων' : 'Pause notifications') : (isEl ? 'Ενεργοποίηση ειδοποιήσεων' : 'Resume notifications')}
                      className={`p-2 rounded-xl transition-colors ${search.notificationsEnabled ? 'text-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20' : 'text-[var(--text-muted)] bg-[var(--ink-soft)] hover:bg-[var(--ink-soft)]/80'}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </button>

                    <button
                      onClick={() => deleteSearch(search.key)}
                      title={isEl ? 'Διαγραφή' : 'Delete'}
                      className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg,#3d1a1a)] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
