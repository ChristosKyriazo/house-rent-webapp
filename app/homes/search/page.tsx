'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'
import { GraphicSearchBanner } from '@/app/components/visual/PageGraphics'

interface SearchEntry {
  query: string
  type: 'rent' | 'buy' | null
  ts: number
}

export default function SearchPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const isEl = language === 'el'
  const [history, setHistory] = useState<SearchEntry[]>([])

  useEffect(() => {
    fetch('/api/homes/search-history')
      .then(r => r.json())
      .then(d => setHistory(d.searches ?? []))
      .catch(() => {})
  }, [])

  const handleChoice = (type: 'rent' | 'buy') => {
    router.push(`/homes?type=${type}`)
  }

  const replaySearch = (entry: SearchEntry) => {
    router.push(`/homes?type=${entry.type ?? 'rent'}&query=${encodeURIComponent(entry.query)}`)
  }

  const clearHistory = async () => {
    await fetch('/api/homes/search-history', { method: 'DELETE' })
    setHistory([])
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 pb-20 pt-12">
      <div className="w-full max-w-lg space-y-8">
        <h1 className="text-center text-3xl font-bold text-[var(--text)]">
          {isEl ? 'Αναζήτηση ακινήτων' : 'Search properties'}
        </h1>
        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--ink-soft)]/50 shadow-inner motion-safe:animate-fade-in-slow">
          <GraphicSearchBanner className="h-14 w-full sm:h-[4.5rem]" />
        </div>

        <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-8 shadow-xl backdrop-blur-sm">
          <h2 className="mb-8 text-center text-2xl font-bold text-[var(--text)]">
            {getTranslation(language, 'whatAreYouLookingFor')}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button type="button" onClick={() => handleChoice('rent')} className="btn-primary px-8 py-6 text-lg">
              🏠 {getTranslation(language, 'rent')}
            </button>
            <button type="button" onClick={() => handleChoice('buy')} className="btn-primary px-8 py-6 text-lg">
              💰 {getTranslation(language, 'buy')}
            </button>
          </div>
        </div>

        {history.length > 0 && (
          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-xl backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                🕐 {isEl ? 'Πρόσφατες αναζητήσεις' : 'Recent searches'}
              </h3>
              <button
                onClick={clearHistory}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--status-error)] transition-colors"
              >
                {isEl ? 'Διαγραφή' : 'Clear'}
              </button>
            </div>
            <div className="space-y-2">
              {history.map((entry) => (
                <button
                  key={entry.ts}
                  onClick={() => replaySearch(entry)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--ink-soft)]"
                >
                  <span className="text-[var(--text-muted)]">🔍</span>
                  <span className="flex-1 truncate text-sm text-[var(--text)]">{entry.query}</span>
                  {entry.type && (
                    <span className="shrink-0 rounded-lg bg-[var(--ink-soft)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                      {entry.type === 'rent' ? (isEl ? 'Ενοικίαση' : 'Rent') : (isEl ? 'Αγορά' : 'Buy')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
