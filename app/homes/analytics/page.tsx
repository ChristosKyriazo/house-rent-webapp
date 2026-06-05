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
  isPromoted: boolean
  daysOnMarket: number
  viewsInPeriod: number
  inquiriesInPeriod: number
  schedulesInPeriod: number
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
  totals: { views: number; inquiries: number; schedules: number; prevViews: number }
  funnel: { views: number; saves: number; inquiries: number; approved: number; finalized: number }
  timeSeries: { label: string; views: number }[]
  topSources: { source: string; count: number }[]
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

const SOURCE_LABELS: Record<string, { en: string; el: string }> = {
  browse: { en: 'Browse', el: 'Αναζήτηση' },
  ai_search: { en: 'AI Search', el: 'AI Αναζήτηση' },
  filter_search: { en: 'Filters', el: 'Φίλτρα' },
  map: { en: 'Map', el: 'Χάρτης' },
  saved: { en: 'Saved', el: 'Αποθηκευμένα' },
  compare: { en: 'Compare', el: 'Σύγκριση' },
  direct: { en: 'Direct link', el: 'Άμεσος σύνδεσμος' },
}

function fmtDur(s: number | null): string {
  if (s === null) return '—'
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function engagementScore(home: ListingRow): number {
  if (home.viewsInPeriod === 0) return 0
  const saveRate = Math.min(home.savesTotal / home.viewsInPeriod, 1)
  const inqRate = Math.min(home.inquiriesTotal / home.viewsInPeriod, 1)
  return Math.min(Math.round(saveRate * 40 + inqRate * 60), 100)
}

function SortHeader({ col, current, dir, onSort, children, className = '' }: {
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
      <span className="text-[10px] opacity-60">{active ? (dir === 'desc' ? '↓' : '↑') : '↕'}</span>
    </button>
  )
}

// ─── Graph 1: Daily Pulse ───────────────────────────────────────────────────
function DailyPulse({ data, period, prevViews, isEl }: {
  data: { label: string; views: number }[]
  period: string
  prevViews: number
  isEl: boolean
}) {
  const totalViews = data.reduce((s, d) => s + d.views, 0)
  const max = Math.max(...data.map(d => d.views), 1)
  const peakIdx = data.reduce((pi, d, i) => d.views > data[pi].views ? i : pi, 0)
  const delta = prevViews > 0 ? Math.round(((totalViews - prevViews) / prevViews) * 100) : null
  const nowHour = new Date().getHours()

  const firstLabel = data[0]?.label ?? ''
  const lastLabel = data[data.length - 1]?.label ?? ''
  const midLabel = data[Math.floor(data.length / 2)]?.label ?? ''

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-[var(--font-outfit)] mb-1">
            {isEl ? 'Καθημερινή ροή' : 'Daily Pulse'}
          </p>
          <p className="text-3xl font-bold text-[var(--text)] font-[var(--font-fraunces)]">{totalViews}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{isEl ? 'προβολές στην περίοδο' : 'views this period'}</p>
        </div>
        {delta !== null && (
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-semibold ${
            delta >= 0 ? 'bg-green-500/12 text-green-400' : 'bg-red-500/12 text-red-400'
          }`}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
            <span className="text-xs font-normal opacity-70 ml-1">
              {isEl ? 'vs προηγ.' : 'vs prev'}
            </span>
          </div>
        )}
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-px h-20">
        {data.map((d, i) => {
          const isPeak = i === peakIdx && d.views > 0
          const isCurrent = period === 'day' && i === nowHour
          return (
            <div
              key={i}
              className={`flex-1 rounded-t transition-all cursor-default ${
                isPeak ? 'bg-amber-400' : isCurrent ? 'bg-amber-500/70 ring-1 ring-amber-400' : 'bg-amber-500/30 hover:bg-amber-500/50'
              }`}
              style={{ height: `${Math.max((d.views / max) * 100, d.views > 0 ? 4 : 1)}%` }}
              title={`${d.label}: ${d.views}`}
            />
          )
        })}
      </div>

      {/* Axis labels */}
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-[var(--text-muted)]">{firstLabel}</span>
        <span className="text-[10px] text-[var(--text-muted)]">{midLabel}</span>
        <span className="text-[10px] text-[var(--text-muted)]">{lastLabel}</span>
      </div>

      {/* Peak callout */}
      {data[peakIdx]?.views > 0 && (
        <p className="text-xs text-[var(--text-muted)] mt-3">
          {isEl ? 'Κορύφωση:' : 'Peak:'}{' '}
          <span className="text-amber-400 font-medium">{data[peakIdx].views} {isEl ? 'προβολές' : 'views'}</span>
          {' '}{isEl ? 'στις' : 'at'} {data[peakIdx].label}
        </p>
      )}
    </div>
  )
}

// ─── Graph 2: Promotion Lift ────────────────────────────────────────────────
function MetricRow({ label, value, max, isPromoted }: { label: string; value: number; max: number; isPromoted: boolean }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
        <span className="text-xs font-semibold text-[var(--text)]">
          {value < 1 ? value.toFixed(2) : value.toFixed(1)}
        </span>
      </div>
      <div className="h-2 bg-[var(--ink-soft)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isPromoted ? 'bg-amber-500' : 'bg-[var(--text-muted)]/40'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function groupStats(group: ListingRow[], daysInPeriod: number) {
  if (group.length === 0) return null
  const totalViews = group.reduce((s, h) => s + h.viewsInPeriod, 0)
  const totalSaves = group.reduce((s, h) => s + h.savesTotal, 0)
  const totalInq = group.reduce((s, h) => s + h.inquiriesTotal, 0)
  return {
    avgDailyViews: totalViews / (group.length * daysInPeriod),
    avgSaves: totalSaves / group.length,
    avgInqRate: totalViews > 0 ? (totalInq / totalViews * 100) : 0,
    count: group.length,
  }
}

function PromotionLift({ homes, period, isEl }: { homes: ListingRow[]; period: string; isEl: boolean }) {
  const promoted = homes.filter(h => h.isPromoted)
  const notPromoted = homes.filter(h => !h.isPromoted && !h.finalized)
  const daysInPeriod = period === 'day' ? 1 : period === 'week' ? 7 : 30

  const pStats = groupStats(promoted, daysInPeriod)
  const nStats = groupStats(notPromoted, daysInPeriod)
  const bothExist = pStats && nStats

  const maxDailyViews = Math.max(pStats?.avgDailyViews ?? 0, nStats?.avgDailyViews ?? 0, 1)
  const maxSaves = Math.max(pStats?.avgSaves ?? 0, nStats?.avgSaves ?? 0, 1)
  const maxRate = Math.max(pStats?.avgInqRate ?? 0, nStats?.avgInqRate ?? 0, 1)

  const liftMultiplier = bothExist && nStats.avgDailyViews > 0
    ? (pStats.avgDailyViews / nStats.avgDailyViews).toFixed(1)
    : null

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-[var(--font-outfit)] mb-1">
            {isEl ? 'Απόδοση Προώθησης' : 'Promotion Lift'}
          </p>
          {liftMultiplier && (
            <p className="text-2xl font-bold text-amber-400 font-[var(--font-fraunces)]">
              {liftMultiplier}×
              <span className="text-sm font-normal text-[var(--text-muted)] ml-2">
                {isEl ? 'περισσότερες προβολές/μέρα' : 'more views/day'}
              </span>
            </p>
          )}
          {!liftMultiplier && !pStats && (
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {isEl ? 'Δεν υπάρχουν ενεργές προωθήσεις' : 'No active promotions'}
            </p>
          )}
          {!liftMultiplier && pStats && !nStats && (
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {isEl ? 'Όλες οι αγγελίες σας προωθούνται' : 'All your listings are promoted'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] shrink-0">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />{isEl ? 'Προωθ.' : 'Promoted'}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--text-muted)]/40 inline-block" />{isEl ? 'Κανονικές' : 'Standard'}</span>
        </div>
      </div>

      {!pStats ? (
        // No promoted listings — show teaser
        <div className="rounded-xl border border-dashed border-amber-500/30 p-4 text-center">
          <p className="text-sm text-amber-400/60 mb-1">{isEl ? 'Ενεργοποιήστε μια προώθηση για να δείτε τη διαφορά' : 'Activate a promotion slot or boost to unlock lift data'}</p>
          <Link href="/homes/my-listings" className="text-xs text-amber-400 hover:underline">{isEl ? 'Διαχείριση αγγελιών →' : 'Manage listings →'}</Link>
        </div>
      ) : (
        <div className={`grid gap-6 ${bothExist ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {/* Promoted column */}
          {pStats && (
            <div className="border-l-2 border-amber-500 pl-4">
              <p className="text-xs font-semibold text-amber-400 mb-3">
                {isEl ? `Προωθημένες (${pStats.count})` : `Promoted (${pStats.count})`}
              </p>
              <MetricRow label={isEl ? 'Προβολές/μέρα' : 'Views/day'} value={pStats.avgDailyViews} max={maxDailyViews} isPromoted={true} />
              <MetricRow label={isEl ? 'Αποθ. ανά αγγελία' : 'Saves/listing'} value={pStats.avgSaves} max={maxSaves} isPromoted={true} />
              <MetricRow label={isEl ? 'Ποσοστό αιτημάτων %' : 'Inquiry rate %'} value={pStats.avgInqRate} max={maxRate} isPromoted={true} />
            </div>
          )}
          {/* Non-promoted column */}
          {nStats && (
            <div className="border-l-2 border-[var(--border-subtle)] pl-4">
              <p className="text-xs font-semibold text-[var(--text-muted)] mb-3">
                {isEl ? `Κανονικές (${nStats.count})` : `Standard (${nStats.count})`}
              </p>
              <MetricRow label={isEl ? 'Προβολές/μέρα' : 'Views/day'} value={nStats.avgDailyViews} max={maxDailyViews} isPromoted={false} />
              <MetricRow label={isEl ? 'Αποθ. ανά αγγελία' : 'Saves/listing'} value={nStats.avgSaves} max={maxSaves} isPromoted={false} />
              <MetricRow label={isEl ? 'Ποσοστό αιτημάτων %' : 'Inquiry rate %'} value={nStats.avgInqRate} max={maxRate} isPromoted={false} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Graph 3: Engagement Depth Score ───────────────────────────────────────
function EngagementDepth({ homes, isEl }: { homes: ListingRow[]; isEl: boolean }) {
  const scored = [...homes]
    .map(h => ({ ...h, score: engagementScore(h) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  const maxViews = Math.max(...homes.map(h => h.viewsInPeriod), 1)

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-[var(--font-outfit)] mb-1">
        {isEl ? 'Βάθος Ενδιαφέροντος' : 'Engagement Depth'}
      </p>
      <p className="text-xs text-[var(--text-muted)] mb-5">
        {isEl ? 'Πόσο σοβαρά ενδιαφέρονται οι επισκέπτες ανά αγγελία' : 'How seriously visitors engage with each listing'}
      </p>

      {scored.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-4">{isEl ? 'Δεν υπάρχουν δεδομένα.' : 'No data yet.'}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {scored.map(home => {
            const displayTitle = isEl ? (home.titleGreek ?? home.title) : home.title
            const viewsPct = (home.viewsInPeriod / maxViews) * 100
            const savesPct = home.viewsInPeriod > 0
              ? Math.min((home.savesTotal / home.viewsInPeriod) * viewsPct, viewsPct)
              : 0
            const inqPct = home.viewsInPeriod > 0
              ? Math.min((home.inquiriesTotal / home.viewsInPeriod) * viewsPct, viewsPct)
              : 0
            const cfg = STATUS_CONFIG[home.status]

            return (
              <div key={home.key} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
                <Link
                  href={`/homes/${home.key}/analytics`}
                  className="w-28 text-xs text-[var(--text)] hover:text-[var(--accent)] transition-colors truncate shrink-0"
                >
                  {displayTitle}
                </Link>

                {/* Thermometer bar */}
                <div className="flex-1 relative h-3 bg-[var(--ink-soft)] rounded-full overflow-hidden min-w-0">
                  {/* Views layer — reach */}
                  <div
                    className="absolute inset-y-0 left-0 bg-amber-500/25 rounded-full"
                    style={{ width: `${viewsPct}%` }}
                  />
                  {/* Saves layer — interest */}
                  <div
                    className="absolute inset-y-0 left-0 bg-amber-500/65 rounded-full"
                    style={{ width: `${savesPct}%` }}
                  />
                  {/* Inquiries layer — intent */}
                  <div
                    className="absolute inset-y-0 left-0 bg-amber-700 rounded-full"
                    style={{ width: `${inqPct}%` }}
                  />
                </div>

                {/* Score badge */}
                {home.score >= 60 ? (
                  <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full font-bold shrink-0 w-10 text-center">
                    {home.score}
                  </span>
                ) : (
                  <span className="text-xs text-[var(--text-muted)] shrink-0 w-10 text-right">
                    {home.score || '—'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-5 mt-5 pt-4 border-t border-[var(--border-subtle)]">
        {[
          { color: 'bg-amber-500/25', label: isEl ? 'Προβολές' : 'Views' },
          { color: 'bg-amber-500/65', label: isEl ? 'Αποθηκεύσεις' : 'Saves' },
          { color: 'bg-amber-700', label: isEl ? 'Αιτήματα' : 'Inquiries' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-2.5 rounded-sm ${l.color}`} />
            <span className="text-xs text-[var(--text-muted)]">{l.label}</span>
          </div>
        ))}
        <span className="ml-auto text-xs text-[var(--text-muted)]">{isEl ? 'Σκορ ≥60 = 🔥' : 'Score ≥60 = 🔥'}</span>
      </div>
    </div>
  )
}

// ─── Funnel Bar ─────────────────────────────────────────────────────────────
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

// ─── Page ───────────────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (!isPro) return
    fetchPortfolio(period)
  }, [period, isPro, fetchPortfolio])

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
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5 animate-pulse h-24" />
          ))}
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
          {isPro && (
            <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl p-1 shrink-0">
              {(['day', 'week', 'month'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    period === p ? 'bg-amber-500/25 text-amber-300' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
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
            <div className="grid grid-cols-3 gap-4">
              {[isEl ? 'Προβολές' : 'Visits', isEl ? 'Αιτήματα' : 'Inquiries', isEl ? 'Ραντεβού' : 'Schedules'].map(l => (
                <div key={l} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-1 font-[var(--font-outfit)]">{l}</p>
                  <div className="h-8 w-16 bg-[var(--ink-soft)] rounded animate-pulse" />
                </div>
              ))}
            </div>
            <div className="relative rounded-2xl overflow-hidden border border-amber-500/20">
              <div className="opacity-15 pointer-events-none p-6 flex flex-col gap-6">
                <div className="h-28 flex items-end gap-px">
                  {[40,60,30,80,50,70,90,45,65,55,75,85,40,60,30,80].map((h,i) => (
                    <div key={i} className="flex-1 bg-amber-500 rounded-t" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 h-28">
                  <div className="bg-[var(--ink-soft)] rounded-xl" />
                  <div className="bg-[var(--ink-soft)] rounded-xl" />
                </div>
              </div>
              <div className="absolute inset-0 bg-[var(--canvas)]/75 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-8">
                <p className="text-5xl">📊</p>
                <p className="text-xl font-bold text-[var(--text)] font-[var(--font-fraunces)] text-center">
                  {isEl ? 'Portfolio Analytics — μόνο Pro' : 'Portfolio Analytics — Pro only'}
                </p>
                <p className="text-sm text-[var(--text-muted)] text-center max-w-xs">
                  {isEl
                    ? 'Τάσεις σε πραγματικό χρόνο, σύγκριση προωθήσεων, βαθμολογία ενδιαφέροντος ανά αγγελία.'
                    : 'Live trends, promotion lift comparison, per-listing engagement scores, and more.'}
                </p>
                <Link href="/upgrade" className="px-6 py-3 bg-amber-500 text-black rounded-2xl font-semibold hover:bg-amber-400 transition-colors">
                  {isEl ? 'Αναβάθμιση σε Pro →' : 'Upgrade to Pro →'}
                </Link>
                {tier === 'free' && (
                  <p className="text-xs text-[var(--text-muted)]">
                    {isEl ? 'Plus: αναλυτικά ανά αγγελία' : 'Plus includes per-listing analytics'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pro full view */}
        {isPro && data && (
          <div className="flex flex-col gap-6">

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: isEl ? 'Προβολές' : 'Visits', value: data.totals.views },
                { label: isEl ? 'Νέα αιτήματα' : 'New inquiries', value: data.totals.inquiries },
                { label: isEl ? 'Νέα ραντεβού' : 'New schedules', value: data.totals.schedules },
              ].map(s => (
                <div key={s.label} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-1 font-[var(--font-outfit)]">{s.label}</p>
                  <p className="text-3xl font-bold text-[var(--text)] font-[var(--font-fraunces)]">{s.value}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{isEl ? PERIOD_LABELS[period].el : PERIOD_LABELS[period].en}</p>
                </div>
              ))}
            </div>

            {/* Graph 1: Daily Pulse */}
            <DailyPulse
              data={data.timeSeries}
              period={period}
              prevViews={data.totals.prevViews}
              isEl={isEl}
            />

            {/* Graphs 2+3 side by side on wider screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PromotionLift homes={data.homes} period={period} isEl={isEl} />
              <EngagementDepth homes={data.homes} isEl={isEl} />
            </div>

            {/* Traffic sources */}
            {data.topSources.length > 0 && (
              <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-[var(--font-outfit)] mb-4">
                  {isEl ? 'Πηγές επισκεψιμότητας' : 'Traffic sources'}
                </p>
                <div className="flex flex-col gap-3">
                  {(() => {
                    const maxCount = Math.max(...data.topSources.map(s => s.count), 1)
                    return data.topSources.map(s => {
                      const lbl = SOURCE_LABELS[s.source] ?? { en: s.source, el: s.source }
                      const pct = Math.round((s.count / maxCount) * 100)
                      return (
                        <div key={s.source} className="flex items-center gap-3">
                          <span className="text-xs text-[var(--text-muted)] w-24 shrink-0">{isEl ? lbl.el : lbl.en}</span>
                          <div className="flex-1 h-2 bg-[var(--ink-soft)] rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-[var(--text)] w-8 text-right">{s.count}</span>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            )}

            {/* Conversion funnel */}
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-[var(--font-outfit)] mb-4">
                {isEl ? 'Funnel μετατροπής' : 'Conversion funnel'}
              </p>
              <div className="flex flex-col gap-3">
                <FunnelBar label={isEl ? 'Προβολές' : 'Views'} value={data.funnel.views} max={data.funnel.views} color="bg-amber-500" />
                <FunnelBar label={isEl ? 'Νέες αποθ.' : 'New saves'} value={data.funnel.saves} max={data.funnel.views} color="bg-blue-500" />
                <FunnelBar label={isEl ? 'Νέα αιτήματα' : 'New inquiries'} value={data.funnel.inquiries} max={data.funnel.views} color="bg-green-500" />
                <FunnelBar label={isEl ? 'Εγκεκριμένα' : 'Approved'} value={data.funnel.approved} max={data.funnel.views} color="bg-emerald-500" />
                <FunnelBar label={isEl ? 'Ολοκλήρωση' : 'Finalized'} value={data.funnel.finalized} max={data.funnel.views} color="bg-purple-500" />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-3">
                {isEl ? 'Προβολές/αποθ./αιτ. = επιλεγμένη περίοδος · Εγκεκρ./Ολοκλ. = συνολικά' : 'Views/saves/inquiries = selected period · Approved/finalized = all time'}
              </p>
            </div>

            {/* Listings table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-[var(--font-outfit)]">
                  {isEl ? 'Αγγελίες' : 'Listings'}
                </p>
                <button
                  onClick={() => {
                    const rows = [['Status', 'Promoted', 'Title', 'City', 'Views', 'Avg time (period)', 'Saves', 'Inquiries', 'Rate', 'Days active']]
                    sorted.forEach(h => {
                      rows.push([
                        h.status, h.isPromoted ? 'yes' : 'no',
                        isEl ? (h.titleGreek ?? h.title) : h.title,
                        h.city, String(h.viewsInPeriod), fmtDur(h.avgDurationSeconds),
                        String(h.savesTotal), String(h.inquiriesTotal), h.inquiryRate + '%',
                        h.finalized ? 'finalized' : String(h.daysOnMarket),
                      ])
                    })
                    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
                    const blob = new Blob([csv], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = 'portfolio.csv'; a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                >
                  ↓ {isEl ? 'Εξαγωγή CSV' : 'CSV export'}
                </button>
              </div>

              <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
                <div className="grid grid-cols-[1.5rem_1rem_1fr_4.5rem_5rem_4rem_4rem_4.5rem_5rem] gap-3 px-5 py-3 border-b border-[var(--border-subtle)]">
                  <span /><span />
                  <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-[var(--font-outfit)]">{isEl ? 'Αγγελία' : 'Listing'}</span>
                  <SortHeader col="views" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">{isEl ? 'Επισκ.' : 'Visits'}</SortHeader>
                  <SortHeader col="avgTime" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">{isEl ? 'Χρόνος' : 'Avg time'}</SortHeader>
                  <SortHeader col="saves" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">{isEl ? 'Αποθ.' : 'Saves'}</SortHeader>
                  <SortHeader col="inquiries" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">{isEl ? 'Αιτ.' : 'Inq.'}</SortHeader>
                  <SortHeader col="rate" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">{isEl ? 'Ποσοστό' : 'Rate'}</SortHeader>
                  <SortHeader col="days" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">{isEl ? 'Ημέρες' : 'Days'}</SortHeader>
                </div>

                {sorted.map(home => {
                  const cfg = STATUS_CONFIG[home.status]
                  const displayTitle = isEl ? (home.titleGreek ?? home.title) : home.title
                  return (
                    <div
                      key={home.key}
                      className="grid grid-cols-[1.5rem_1rem_1fr_4.5rem_5rem_4rem_4rem_4.5rem_5rem] gap-3 px-5 py-4 border-b border-[var(--border-subtle)] last:border-0 items-center hover:bg-[var(--ink-soft)]/40 transition-colors"
                    >
                      <div className="flex items-center justify-center">
                        <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} title={isEl ? cfg.label.el : cfg.label.en} />
                      </div>
                      <div className="flex items-center justify-center">
                        {home.isPromoted && (
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" title={isEl ? 'Προωθημένη' : 'Promoted'} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/homes/${home.key}/analytics`} className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)] transition-colors truncate block">
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
                })}
              </div>

              <div className="mt-3 px-1 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-6">
                  {(['red', 'yellow', 'green'] as const).map(s => (
                    <div key={s} className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
                      <span className="text-xs text-[var(--text-muted)]">{isEl ? STATUS_CONFIG[s].label.el : STATUS_CONFIG[s].label.en}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="text-xs text-[var(--text-muted)]">{isEl ? 'Προωθημένη' : 'Promoted'}</span>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  {isEl
                    ? 'Επισκ./Χρόνος = επιλεγμένη περίοδος · Αποθ./Αιτ. = συνολικά · Ημέρες = ενεργά'
                    : 'Visits/Avg time = period · Saves/Inq. = all time · Days = active only'}
                </p>
              </div>
            </div>

          </div>
        )}

        {isPro && !data && !loading && (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-8 text-center">
            <p className="text-[var(--text-muted)]">{isEl ? 'Δεν υπάρχουν δεδομένα ακόμα.' : 'No data yet.'}</p>
            <Link href="/homes/new" className="mt-4 inline-block text-sm text-[var(--accent)] hover:underline">
              {isEl ? '+ Νέα αγγελία' : '+ New listing'}
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
