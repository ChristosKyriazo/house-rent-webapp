'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'

interface ListingRow {
  key: string
  title: string
  titleGreek: string | null
  city: string
  listingType: string
  pricePerMonth: number
  finalized: boolean
  daysOnMarket: number
  viewsInPeriod: number
  inquiriesInPeriod: number
  inquiriesTotal: number
  savesTotal: number
  approved: number
  finalizedCount: number
  inquiryRate: string
  avgDurationSeconds: number | null
  status: 'red' | 'yellow' | 'green'
}

interface PortfolioData {
  period: string
  homes: ListingRow[]
  totals: { views: number; inquiries: number; schedules: number }
  funnel: { views: number; saves: number; inquiries: number; approved: number; finalized: number }
  timeSeries: { date: string; views: number }[]
}

type SortCol = 'views' | 'inquiries' | 'saves' | 'avgTime' | 'rate' | 'days'

const STATUS_CONFIG = {
  red: { dot: 'bg-red-500', label: { en: 'Needs attention', el: 'Χρειάζεται προσοχή' } },
  yellow: { dot: 'bg-yellow-400', label: { en: 'Average', el: 'Μέτρια' } },
  green: { dot: 'bg-green-400', label: { en: 'Active', el: 'Ενεργή' } },
}

const PERIOD_LABELS = {
  day: { en: 'Today', el: 'Σήμερα' },
  week: { en: 'This week', el: 'Εβδομάδα' },
  month: { en: 'This month', el: 'Μήνας' },
}

function fmtDur(s: number | null): string {
  if (s === null) return '—'
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function TimeSeriesChart({ data }: { data: { date: string; views: number }[] }) {
  const max = Math.max(...data.map(d => d.views), 1)
  return (
    <div className="flex items-end gap-px h-24">
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

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--text-muted)] w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 bg-[var(--ink-soft)] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-[var(--text)] w-10 text-right">{value}</span>
    </div>
  )
}

function SortHeader({
  col, current, dir, onSort, children, className = '',
}: {
  col: SortCol; current: SortCol; dir: 'asc' | 'desc'; onSort: (c: SortCol) => void; children: React.ReactNode; className?: string
}) {
  const active = col === current
  return (
    <button
      onClick={() => onSort(col)}
      className={`flex items-center gap-1 text-xs uppercase tracking-wider font-[var(--font-outfit)] transition-colors ${
        active ? 'text-amber-400' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
      } ${className}`}
    >
      {children}
      <span className="text-[10px] opacity-60">
        {active ? (dir === 'desc' ? '↓' : '↑') : '↕'}
      </span>
    </button>
  )
}

export default function PortfolioAnalyticsPage() {
  const { language } = useLanguage()
  const router = useRouter()
  const isEl = language === 'el'

  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tier, setTier] = useState<'free' | 'plus' | 'pro'>('free')
  const [isPro, setIsPro] = useState(false)
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month')
  const [sortCol, setSortCol] = useState<SortCol>('views')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchPortfolio = useCallback((p: string) => {
    return fetch(`/api/homes/portfolio-analytics?period=${p}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setData(d); setLastUpdated(new Date()) } })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(p => {
        if (!p.user) { router.push('/login'); return }
        const t = p.user.subscriptionTier ?? 'free'
        setTier(t)
        setIsPro(t === 'pro')
        if (t === 'pro') return fetchPortfolio('month')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router, fetchPortfolio])

  // Re-fetch when period changes
  useEffect(() => {
    if (!isPro) return
    fetchPortfolio(period)
  }, [period, isPro, fetchPortfolio])

  // Live polling — 30s interval
  useEffect(() => {
    if (!isPro) return
    const interval = setInterval(() => fetchPortfolio(period), 30_000)
    return () => clearInterval(interval)
  }, [period, isPro, fetchPortfolio])

  function handleSort(col: SortCol) {
    if (col === sortCol) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const sorted = data ? [...data.homes].sort((a, b) => {
    const m = sortDir === 'desc' ? -1 : 1
    switch (sortCol) {
      case 'views':     return m * (a.viewsInPeriod - b.viewsInPeriod)
      case 'inquiries': return m * (a.inquiriesTotal - b.inquiriesTotal)
      case 'saves':     return m * (a.savesTotal - b.savesTotal)
      case 'avgTime':   return m * ((a.avgDurationSeconds ?? 0) - (b.avgDurationSeconds ?? 0))
      case 'rate':      return m * (parseFloat(a.inquiryRate) - parseFloat(b.inquiryRate))
      case 'days':      return m * (a.daysOnMarket - b.daysOnMarket)
    }
  }) : []

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--canvas)] py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-4 mb-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5 animate-pulse h-24" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] py-12 px-4">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8 flex items-center justify-between">
          <Link href="/homes/my-listings" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
            ← {isEl ? 'Οι αγγελίες μου' : 'My listings'}
          </Link>
          {lastUpdated && (
            <span className="text-xs text-[var(--text-muted)]">
              {isEl ? 'Ενημ.' : 'Updated'} {lastUpdated.toLocaleTimeString(isEl ? 'el-GR' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text)] font-[var(--font-fraunces)] mb-1">
              {isEl ? 'Στατιστικά Portfolio' : 'Portfolio Analytics'}
            </h1>
            {data && (
              <p className="text-[var(--text-muted)]">
                {data.homes.length} {isEl ? 'αγγελίες' : `listing${data.homes.length !== 1 ? 's' : ''}`}
              </p>
            )}
          </div>

          {/* Period filter */}
          {isPro && (
            <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl p-1 shrink-0">
              {(['day', 'week', 'month'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    period === p
                      ? 'bg-amber-500/25 text-amber-300'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {isEl ? PERIOD_LABELS[p].el : PERIOD_LABELS[p].en}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Plus upgrade wall */}
        {!isPro && (
          <div className="flex flex-col gap-8">
            <section>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: isEl ? 'Προβολές' : 'Visits' },
                  { label: isEl ? 'Αιτήματα' : 'Inquiries' },
                  { label: isEl ? 'Ραντεβού' : 'Schedules' },
                ].map(s => (
                  <div key={s.label} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-1 font-[var(--font-outfit)]">{s.label}</p>
                    <div className="h-8 w-16 bg-[var(--ink-soft)] rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </section>
            <div className="relative rounded-2xl overflow-hidden border border-amber-500/20">
              <div className="opacity-20 pointer-events-none p-6 flex flex-col gap-6">
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 py-3 border-b border-[var(--border-subtle)]">
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <div className="flex-1 h-4 bg-[var(--ink-soft)] rounded" />
                      <div className="w-16 h-4 bg-[var(--ink-soft)] rounded" />
                      <div className="w-12 h-4 bg-[var(--ink-soft)] rounded" />
                    </div>
                  ))}
                </div>
                <div className="flex items-end gap-px h-24">
                  {[40, 60, 30, 80, 50, 70, 90, 45, 65, 55, 75, 85].map((h, i) => (
                    <div key={i} className="flex-1 bg-amber-500 rounded-t" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="absolute inset-0 bg-[var(--canvas)]/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-8">
                <p className="text-4xl">📊</p>
                <p className="text-xl font-bold text-[var(--text)] font-[var(--font-fraunces)] text-center">
                  {isEl ? 'Portfolio Analytics — μόνο Pro' : 'Portfolio Analytics — Pro only'}
                </p>
                <p className="text-sm text-[var(--text-muted)] text-center max-w-sm">
                  {isEl
                    ? 'Αναλυτικά για όλες τις αγγελίες σας, funnel μετατροπής και τάσεις 30 ημερών — σε πραγματικό χρόνο.'
                    : 'Detailed stats for all your listings, conversion funnel, and 30-day trends — updated live.'}
                </p>
                <Link href="/upgrade" className="px-6 py-3 bg-amber-500 text-black rounded-2xl font-semibold hover:bg-amber-400 transition-colors">
                  {isEl ? 'Αναβάθμιση σε Pro →' : 'Upgrade to Pro →'}
                </Link>
                {tier === 'free' && (
                  <p className="text-xs text-[var(--text-muted)]">
                    {isEl ? 'Ξεκινήστε με Plus για αναλυτικά ανά αγγελία' : 'Start with Plus for per-listing analytics'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pro full view */}
        {isPro && data && (
          <div className="flex flex-col gap-8">

            {/* Stat cards */}
            <section>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: isEl ? 'Προβολές' : 'Visits', value: data.totals.views },
                  { label: isEl ? 'Νέα αιτήματα' : 'New inquiries', value: data.totals.inquiries },
                  { label: isEl ? 'Νέα ραντεβού' : 'New schedules', value: data.totals.schedules },
                ].map(s => (
                  <div key={s.label} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-1 font-[var(--font-outfit)]">{s.label}</p>
                    <p className="text-3xl font-bold text-[var(--text)] font-[var(--font-fraunces)]">{s.value}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {isEl ? PERIOD_LABELS[period].el : PERIOD_LABELS[period].en}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* 30-day time series (fixed window, always last 30 days) */}
            {data.timeSeries.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3 font-[var(--font-outfit)]">
                  {isEl ? 'Τελευταίες 30 ημέρες — όλες οι αγγελίες' : 'Last 30 days — all listings'}
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

            {/* Portfolio funnel (all-time) */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3 font-[var(--font-outfit)]">
                {isEl ? 'Funnel μετατροπής — συνολικά' : 'Conversion funnel — all time'}
              </h2>
              <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5 flex flex-col gap-3">
                <FunnelBar label={isEl ? 'Προβολές' : 'Views'} value={data.funnel.views} max={data.funnel.views} color="bg-amber-500" />
                <FunnelBar label={isEl ? 'Αποθηκεύσεις' : 'Saves'} value={data.funnel.saves} max={data.funnel.views} color="bg-blue-500" />
                <FunnelBar label={isEl ? 'Αιτήματα' : 'Inquiries'} value={data.funnel.inquiries} max={data.funnel.views} color="bg-green-500" />
                <FunnelBar label={isEl ? 'Εγκεκριμένα' : 'Approved'} value={data.funnel.approved} max={data.funnel.views} color="bg-emerald-500" />
                <FunnelBar label={isEl ? 'Ολοκλήρωση' : 'Finalized'} value={data.funnel.finalized} max={data.funnel.views} color="bg-purple-500" />
              </div>
            </section>

            {/* Listings table */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-[var(--font-outfit)]">
                  {isEl ? 'Αγγελίες' : 'Listings'}
                </h2>
                <button
                  onClick={() => {
                    const rows = [['Status', 'Title', 'City', 'Views (period)', 'Avg time (30d)', 'Saves', 'Inquiries (total)', 'Rate', 'Days listed']]
                    sorted.forEach(h => {
                      rows.push([
                        h.status,
                        language === 'el' ? (h.titleGreek ?? h.title) : h.title,
                        h.city,
                        String(h.viewsInPeriod),
                        fmtDur(h.avgDurationSeconds),
                        String(h.savesTotal),
                        String(h.inquiriesTotal),
                        h.inquiryRate + '%',
                        String(h.daysOnMarket),
                      ])
                    })
                    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
                    const blob = new Blob([csv], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = 'portfolio.csv'; a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex items-center gap-1"
                >
                  ↓ {isEl ? 'Εξαγωγή CSV' : 'CSV export'}
                </button>
              </div>

              <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1.5rem_1fr_4.5rem_5rem_4rem_4rem_4.5rem_5rem] gap-3 px-5 py-3 border-b border-[var(--border-subtle)]">
                  <span />
                  <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-[var(--font-outfit)]">
                    {isEl ? 'Αγγελία' : 'Listing'}
                  </span>
                  <SortHeader col="views" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">
                    {isEl ? 'Επισκ.' : 'Visits'}
                  </SortHeader>
                  <SortHeader col="avgTime" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">
                    {isEl ? 'Χρόνος' : 'Avg time'}
                  </SortHeader>
                  <SortHeader col="saves" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">
                    {isEl ? 'Αποθ.' : 'Saves'}
                  </SortHeader>
                  <SortHeader col="inquiries" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">
                    {isEl ? 'Αιτ.' : 'Inq.'}
                  </SortHeader>
                  <SortHeader col="rate" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">
                    {isEl ? 'Ποσοστό' : 'Rate'}
                  </SortHeader>
                  <SortHeader col="days" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">
                    {isEl ? 'Ημέρες' : 'Days'}
                  </SortHeader>
                </div>

                {sorted.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
                    {isEl ? 'Δεν υπάρχουν αγγελίες.' : 'No listings yet.'}
                  </p>
                ) : (
                  sorted.map(home => {
                    const cfg = STATUS_CONFIG[home.status]
                    const displayTitle = language === 'el' ? (home.titleGreek ?? home.title) : home.title
                    return (
                      <div
                        key={home.key}
                        className="grid grid-cols-[1.5rem_1fr_4.5rem_5rem_4rem_4rem_4.5rem_5rem] gap-3 px-5 py-4 border-b border-[var(--border-subtle)] last:border-0 items-center hover:bg-[var(--ink-soft)]/40 transition-colors"
                      >
                        <div className="flex items-center justify-center">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${cfg.dot} shrink-0`}
                            title={isEl ? cfg.label.el : cfg.label.en}
                          />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/homes/${home.key}/analytics`}
                            className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)] transition-colors truncate block"
                          >
                            {displayTitle}
                          </Link>
                          <p className="text-xs text-[var(--text-muted)] truncate">{home.city}</p>
                        </div>
                        <span className="text-sm font-semibold text-[var(--text)] text-right">{home.viewsInPeriod}</span>
                        <span className="text-sm text-[var(--text-muted)] text-right">{fmtDur(home.avgDurationSeconds)}</span>
                        <span className="text-sm text-[var(--text-muted)] text-right">{home.savesTotal}</span>
                        <span className="text-sm text-[var(--text-muted)] text-right">{home.inquiriesTotal}</span>
                        <span className="text-sm text-[var(--text-muted)] text-right">{home.inquiryRate}%</span>
                        <span className="text-sm text-right">
                          {home.finalized
                            ? <span className="text-purple-400/70 text-xs">done</span>
                            : <span className="text-[var(--text-muted)]">{home.daysOnMarket}d</span>}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Legend + column notes */}
              <div className="mt-3 px-1 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-6">
                  {(['red', 'yellow', 'green'] as const).map(s => (
                    <div key={s} className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
                      <span className="text-xs text-[var(--text-muted)]">{isEl ? STATUS_CONFIG[s].label.el : STATUS_CONFIG[s].label.en}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  {isEl
                    ? 'Επισκ. = επιλεγμένη περίοδος · Χρόνος = μέσος (30ήμ.) · Αιτ. = συνολικά · Ημέρες = ενεργά (μη ολοκληρωμένα)'
                    : 'Visits = selected period · Avg time = last 30 days · Inq. = all time · Days = active days (not finalized)'}
                </p>
              </div>
            </section>

          </div>
        )}

        {/* Pro with no data */}
        {isPro && !data && !loading && (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-8 text-center">
            <p className="text-[var(--text-muted)]">
              {isEl ? 'Δεν υπάρχουν δεδομένα ακόμα.' : 'No data yet.'}
            </p>
            <Link href="/homes/new" className="mt-4 inline-block text-sm text-[var(--accent)] hover:underline">
              {isEl ? '+ Νέα αγγελία' : '+ New listing'}
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
