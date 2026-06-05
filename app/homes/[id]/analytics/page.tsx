'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'

interface AnalyticsData {
  views: { today: number; thisWeek: number; thisMonth: number }
  uniqueViewers: { thisWeek: number; thisMonth: number }
  avgDurationSeconds: number | null
  durationCaptureRate: number
  saves: number
  topSources: { source: string; count: number }[]
  inquiryRate: string
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-1 font-[var(--font-outfit)]">{label}</p>
      <p className="text-3xl font-bold text-[var(--text)] font-[var(--font-fraunces)]">{value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
    </div>
  )
}

function formatDuration(s: number | null, isEl: boolean): string {
  if (s === null) return isEl ? 'Δεν υπάρχουν αρκετά δεδομένα' : 'Not enough data'
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

const SOURCE_LABELS: Record<string, { en: string; el: string }> = {
  browse: { en: 'Browse', el: 'Αναζήτηση' },
  ai_search: { en: 'AI Search', el: 'AI Αναζήτηση' },
  filter_search: { en: 'Filters', el: 'Φίλτρα' },
  map: { en: 'Map', el: 'Χάρτης' },
  saved: { en: 'Saved', el: 'Αποθηκευμένα' },
  compare: { en: 'Compare', el: 'Σύγκριση' },
  direct: { en: 'Direct link', el: 'Άμεσος σύνδεσμος' },
}

export default function ListingAnalyticsPage() {
  const params = useParams()
  const { language } = useLanguage()
  const isEl = language === 'el'
  const homeKey = params.id as string

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [homeTitle, setHomeTitle] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/homes/${homeKey}/analytics`).then(r => r.json()),
      fetch(`/api/homes/${homeKey}`).then(r => r.json()),
    ])
      .then(([analytics, homeData]) => {
        if (analytics.error) {
          setError(analytics.error === 'subscription_required'
            ? (isEl ? 'Απαιτείται πλάνο Plus ή Pro.' : 'Plus or Pro plan required.')
            : (isEl ? 'Κάτι πήγε στραβά.' : 'Something went wrong.'))
          return
        }
        setData(analytics)
        setHomeTitle(homeData.home?.title || homeData.home?.titleGreek || '')
      })
      .catch(() => setError(isEl ? 'Κάτι πήγε στραβά.' : 'Something went wrong.'))
      .finally(() => setLoading(false))
  }, [homeKey, isEl])

  const maxSource = data?.topSources.length ? Math.max(...data.topSources.map(s => s.count)) : 1

  return (
    <div className="min-h-screen bg-[var(--canvas)] py-12 px-4">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8 flex items-center justify-between">
          <Link href="/homes/my-listings" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
            ← {isEl ? 'Οι αγγελίες μου' : 'My listings'}
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text)] font-[var(--font-fraunces)] mb-1">
            {isEl ? 'Στατιστικά αγγελίας' : 'Listing analytics'}
          </h1>
          {homeTitle && <p className="text-[var(--text-muted)]">{homeTitle}</p>}
        </div>

        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5 animate-pulse">
                <div className="h-3 bg-[var(--ink-soft)] rounded w-2/3 mb-3" />
                <div className="h-8 bg-[var(--ink-soft)] rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-8 text-center">
            <p className="text-[var(--text-muted)]">{error}</p>
            <Link href="/upgrade" className="mt-4 inline-block text-sm text-amber-400 hover:text-amber-300 transition-colors">
              {isEl ? 'Αναβάθμιση πλάνου →' : 'Upgrade plan →'}
            </Link>
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-8">
            {/* Views */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3 font-[var(--font-outfit)]">
                {isEl ? 'Προβολές' : 'Views'}
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <StatCard label={isEl ? 'Σήμερα' : 'Today'} value={data.views.today} />
                <StatCard label={isEl ? 'Αυτή την εβδομάδα' : 'This week'} value={data.views.thisWeek}
                  sub={isEl ? `${data.uniqueViewers.thisWeek} μοναδικοί` : `${data.uniqueViewers.thisWeek} unique`} />
                <StatCard label={isEl ? 'Αυτόν τον μήνα' : 'This month'} value={data.views.thisMonth}
                  sub={isEl ? `${data.uniqueViewers.thisMonth} μοναδικοί` : `${data.uniqueViewers.thisMonth} unique`} />
              </div>
            </section>

            {/* Engagement */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3 font-[var(--font-outfit)]">
                {isEl ? 'Αλληλεπίδραση' : 'Engagement'}
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <StatCard
                  label={isEl ? 'Μέσος χρόνος' : 'Avg time on page'}
                  value={formatDuration(data.avgDurationSeconds, isEl)}
                  sub={data.avgDurationSeconds !== null ? (isEl ? `από ${data.durationCaptureRate}% επισκέψεων` : `from ${data.durationCaptureRate}% of visits`) : undefined}
                />
                <StatCard label={isEl ? 'Αποθηκεύσεις' : 'Saves'} value={data.saves} />
                <StatCard
                  label={isEl ? 'Ποσοστό αιτημάτων' : 'Inquiry rate'}
                  value={`${data.inquiryRate}%`}
                  sub={isEl ? 'αιτήματα / προβολές' : 'inquiries / views'}
                />
              </div>
            </section>

            {/* Traffic sources */}
            {data.topSources.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3 font-[var(--font-outfit)]">
                  {isEl ? 'Πηγές επισκεψιμότητας' : 'Traffic sources'}
                </h2>
                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5 flex flex-col gap-3">
                  {data.topSources.map(s => {
                    const label = SOURCE_LABELS[s.source] ?? { en: s.source, el: s.source }
                    const pct = Math.round((s.count / maxSource) * 100)
                    return (
                      <div key={s.source} className="flex items-center gap-3">
                        <span className="text-sm text-[var(--text-muted)] w-28 shrink-0">{isEl ? label.el : label.en}</span>
                        <div className="flex-1 h-2 bg-[var(--ink-soft)] rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-[var(--text)] w-8 text-right">{s.count}</span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
