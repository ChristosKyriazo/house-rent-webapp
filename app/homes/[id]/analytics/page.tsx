'use client'

import { useState, useEffect, useCallback } from 'react'
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
  inquiryPipeline: { pending: number; approved: number; dismissed: number; finalized: number }
  repeatVisitors: number
  hotSignal: boolean
  hotSignalCount: number
  daysOnMarket: number
  finalized: boolean
  timeSeries: { date: string; views: number }[]
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

function TimeSeriesChart({ data }: { data: { date: string; views: number }[] }) {
  const max = Math.max(...data.map(d => d.views), 1)
  return (
    <div className="flex items-end gap-px h-20">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 bg-amber-500/35 hover:bg-amber-400/55 rounded-t transition-colors cursor-default"
          style={{ height: `${Math.max((d.views / max) * 100, 2)}%` }}
          title={`${d.date}: ${d.views}`}
        />
      ))}
    </div>
  )
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
  const fetchAnalytics = useCallback(() => {
    return fetch(`/api/homes/${homeKey}/analytics`)
      .then(r => r.json())
      .then(analytics => {
        if (analytics.error) return
        setData(analytics)
      })
      .catch(() => {})
  }, [homeKey])

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

  // Live polling — 30s interval
  useEffect(() => {
    if (error) return
    const interval = setInterval(fetchAnalytics, 30_000)
    return () => clearInterval(interval)
  }, [fetchAnalytics, error])

  const maxSource = data?.topSources.length ? Math.max(...data.topSources.map(s => s.count)) : 1
  const pipeline = data?.inquiryPipeline
  const totalInquiries = pipeline ? pipeline.pending + pipeline.approved + pipeline.dismissed + pipeline.finalized : 0

  return (
    <div className="min-h-screen bg-[var(--canvas)] py-12 px-4">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8">
          <Link href="/homes/analytics" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
            ← {isEl ? 'Αναλυτικά' : 'Analytics'}
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

            {/* Hot signal banner */}
            {data.hotSignal && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 flex items-start gap-3">
                <span className="text-xl">🔥</span>
                <div>
                  <p className="text-sm font-semibold text-amber-300">
                    {isEl ? 'Υψηλό ενδιαφέρον' : 'High interest signal'}
                  </p>
                  <p className="text-xs text-amber-400/70 mt-0.5">
                    {isEl
                      ? `${data.hotSignalCount} ${data.hotSignalCount === 1 ? 'επισκέπτης' : 'επισκέπτες'} επέστρεψαν 3+ φορές τις τελευταίες 7 μέρες`
                      : `${data.hotSignalCount} ${data.hotSignalCount === 1 ? 'person' : 'people'} viewed this listing 3+ times in the last 7 days`}
                  </p>
                </div>
              </div>
            )}

            {/* Views */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3 font-[var(--font-outfit)]">
                {isEl ? 'Προβολές' : 'Views'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label={isEl ? 'Σήμερα' : 'Today'} value={data.views.today} />
                <StatCard
                  label={isEl ? 'Αυτή την εβδομάδα' : 'This week'}
                  value={data.views.thisWeek}
                  sub={isEl ? `${data.uniqueViewers.thisWeek} μοναδικοί` : `${data.uniqueViewers.thisWeek} unique`}
                />
                <StatCard
                  label={isEl ? 'Αυτόν τον μήνα' : 'This month'}
                  value={data.views.thisMonth}
                  sub={isEl ? `${data.uniqueViewers.thisMonth} μοναδικοί` : `${data.uniqueViewers.thisMonth} unique`}
                />
              </div>
            </section>

            {/* 30-day chart */}
            {data.timeSeries.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3 font-[var(--font-outfit)]">
                  {isEl ? 'Τελευταίες 30 ημέρες' : 'Last 30 days'}
                </h2>
                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] px-5 pt-5 pb-3">
                  <TimeSeriesChart data={data.timeSeries} />
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-[var(--text-muted)]">{data.timeSeries[0]?.date}</span>
                    <span className="text-xs text-[var(--text-muted)]">{data.timeSeries[data.timeSeries.length - 1]?.date}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Engagement */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3 font-[var(--font-outfit)]">
                {isEl ? 'Αλληλεπίδραση' : 'Engagement'}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label={isEl ? 'Μέσος χρόνος' : 'Avg time on page'}
                  value={formatDuration(data.avgDurationSeconds, isEl)}
                  sub={data.avgDurationSeconds !== null
                    ? (isEl ? `από ${data.durationCaptureRate}% επισκέψεων` : `from ${data.durationCaptureRate}% of visits`)
                    : undefined}
                />
                <StatCard label={isEl ? 'Αποθηκεύσεις' : 'Saves'} value={data.saves} />
                <StatCard
                  label={isEl ? 'Επαναλαμβ.' : 'Repeat visitors'}
                  value={data.repeatVisitors}
                  sub={isEl ? 'επισκέψεις 2+ φορές / 30μ.' : '2+ visits in 30d'}
                />
                <StatCard
                  label={isEl ? 'Μέρες ενεργή' : 'Days active'}
                  value={data.finalized ? '—' : data.daysOnMarket}
                  sub={data.finalized ? (isEl ? 'Ολοκληρώθηκε' : 'Finalized') : undefined}
                />
              </div>
            </section>

            {/* Inquiry pipeline */}
            {totalInquiries > 0 && pipeline && (
              <section>
                <h2 className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3 font-[var(--font-outfit)]">
                  {isEl ? 'Αιτήματα' : 'Inquiry pipeline'}
                </h2>
                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-[var(--text-muted)]">
                      {isEl ? `${totalInquiries} αιτήματα συνολικά · ${data.inquiryRate}% ποσοστό` : `${totalInquiries} total · ${data.inquiryRate}% inquiry rate`}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: 'pending', label: isEl ? 'Σε αναμονή' : 'Pending', color: 'bg-blue-500/25 text-blue-300', count: pipeline.pending },
                      { key: 'approved', label: isEl ? 'Εγκεκριμένα' : 'Approved', color: 'bg-green-500/25 text-green-300', count: pipeline.approved },
                      { key: 'dismissed', label: isEl ? 'Απορρίφθηκαν' : 'Dismissed', color: 'bg-[var(--ink-soft)] text-[var(--text-muted)]', count: pipeline.dismissed },
                      { key: 'finalized', label: isEl ? 'Ολοκληρώθηκαν' : 'Finalized', color: 'bg-purple-500/25 text-purple-300', count: pipeline.finalized },
                    ].map(s => (
                      <div key={s.key} className={`rounded-xl p-3 text-center ${s.color}`}>
                        <p className="text-2xl font-bold">{s.count}</p>
                        <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* No inquiries yet — show rate only */}
            {totalInquiries === 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3 font-[var(--font-outfit)]">
                  {isEl ? 'Αιτήματα' : 'Inquiries'}
                </h2>
                <StatCard
                  label={isEl ? 'Ποσοστό αιτημάτων' : 'Inquiry rate'}
                  value={`${data.inquiryRate}%`}
                  sub={isEl ? 'αιτήματα / προβολές μήνα' : 'inquiries / monthly views'}
                />
              </section>
            )}

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
