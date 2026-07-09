'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'

interface ListingRow {
  key: string
  title: string
  titleGreek: string | null
  city: string
  finalized: boolean
  isPromoted: boolean
  daysOnMarket: number
  viewsInPeriod: number
  inquiriesInPeriod: number
  schedulesInPeriod: number
  inquiriesTotal: number
  savesTotal: number
  avgDurationSeconds: number | null
  inquiryRate: string
  status: 'red' | 'yellow' | 'green'
}

interface PortfolioData {
  period: string
  homes: ListingRow[]
  totals: { views: number; inquiries: number; schedules: number; prevViews: number }
  funnel: { views: number; saves: number; inquiries: number; approved: number; finalized: number }
  timeSeries: { label: string; views: number }[]
  topSources: { source: string; count: number }[]
  topAreas: { area: string; views: number }[]
}

type SortCol = 'views' | 'inquiries' | 'saves' | 'avgTime' | 'rate' | 'days'

const STATUS_DOT: Record<string, string> = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  green: 'bg-green-400',
}

// Status is otherwise conveyed by hue alone — unusable when colour-blind or
// read aloud. The dot carries its own accessible name.
const STATUS_LABEL: Record<'en' | 'el', Record<string, string>> = {
  en: { red: 'Low interest', yellow: 'Some interest', green: 'High interest' },
  el: { red: 'Χαμηλό ενδιαφέρον', yellow: 'Μέτριο ενδιαφέρον', green: 'Υψηλό ενδιαφέρον' },
}

function StatusDot({ status, isEl, className = 'w-1.5 h-1.5' }: { status: string; isEl: boolean; className?: string }) {
  return (
    <div
      role="img"
      aria-label={STATUS_LABEL[isEl ? 'el' : 'en'][status] ?? status}
      className={`${className} rounded-full ${STATUS_DOT[status]} shrink-0`}
    />
  )
}

function fmtDur(s: number | null): string {
  if (s === null) return '—'
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function engagementScore(home: ListingRow): number {
  if (home.viewsInPeriod === 0) return 0
  const sr = Math.min(home.savesTotal / home.viewsInPeriod, 1)
  const ir = Math.min(home.inquiriesTotal / home.viewsInPeriod, 1)
  return Math.min(Math.round(sr * 40 + ir * 60), 100)
}

// ─── Period tabs ────────────────────────────────────────────────────────────
function PeriodTabs({ period, onChange, isEl }: {
  period: 'day' | 'week' | 'month'
  onChange: (p: 'day' | 'week' | 'month') => void
  isEl: boolean
}) {
  const tabs = [
    { key: 'day' as const, en: 'Today', el: 'Σήμερα' },
    { key: 'week' as const, en: 'This week', el: 'Εβδομάδα' },
    { key: 'month' as const, en: 'This month', el: 'Μήνας' },
  ]
  return (
    <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl p-1">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            period === t.key
              ? 'bg-amber-500/25 text-amber-300'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          {isEl ? t.el : t.en}
        </button>
      ))}
    </div>
  )
}

// ─── Sort header ─────────────────────────────────────────────────────────────
function SortHeader({ col, current, dir, onSort, children, className = '' }: {
  col: SortCol; current: SortCol; dir: 'asc' | 'desc'
  onSort: (c: SortCol) => void; children: React.ReactNode; className?: string
}) {
  const active = col === current
  return (
    <button
      onClick={() => onSort(col)}
      className={`flex items-center gap-0.5 text-xs uppercase tracking-wider font-[var(--font-outfit)] transition-colors ${
        active ? 'text-amber-400' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
      } ${className}`}
    >
      {children}
      <span className="text-[11px] opacity-70" aria-hidden="true">{active ? (dir === 'desc' ? '↓' : '↑') : '↕'}</span>
    </button>
  )
}

// ─── Daily Pulse ─────────────────────────────────────────────────────────────
function DailyPulse({ data, period, prevViews, isEl, onBarClick, onClearDrill }: {
  data: { label: string; views: number }[]
  period: string; prevViews: number; isEl: boolean
  onBarClick?: (label: string) => void
  onClearDrill?: () => void
}) {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const total = data.reduce((s, d) => s + d.views, 0)
  const max = Math.max(...data.map(d => d.views), 1)
  const delta = prevViews > 0 ? Math.round(((total - prevViews) / prevViews) * 100) : null

  function fmtTick(label: string): string {
    if (period === 'day') return label
    try {
      const d = new Date(label + 'T12:00:00')
      if (period === 'week') return d.toLocaleDateString('en', { weekday: 'short' })
      return d.toLocaleDateString('en', { day: 'numeric', month: 'short' })
    } catch { return label }
  }

  function fmtFull(label: string): string {
    if (period === 'day') return label
    try {
      const d = new Date(label + 'T12:00:00')
      return d.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })
    } catch { return label }
  }

  const n = data.length
  const tickIdxs: number[] = n <= 7
    ? data.map((_, i) => i)
    : period === 'day'
      ? [0, 6, 12, 18, 23]
      : [0, Math.floor(n / 2), n - 1]

  const isClickable = !!onBarClick && period !== 'day'

  const handleBarClick = (label: string) => {
    if (!isClickable) return
    if (selectedLabel === label) {
      setSelectedLabel(null)
      onClearDrill?.()
    } else {
      setSelectedLabel(label)
      onBarClick(label)
    }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (selectedLabel) {
          setSelectedLabel(null)
          onClearDrill?.()
        }
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [selectedLabel, onClearDrill])

  return (
    <div ref={containerRef} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-[var(--font-outfit)] mb-1">
            {isEl ? 'Παλμός Προβολών' : 'View Pulse'}
          </p>
          <p className="text-3xl font-bold text-[var(--text)] font-[var(--font-fraunces)]">{total}</p>
        </div>
        {delta !== null && (
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-semibold ${
            delta >= 0 ? 'bg-green-500/12 text-green-400' : 'bg-red-500/12 text-red-400'
          }`}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
          </div>
        )}
      </div>
      <div className="relative">
        <div className="flex items-end gap-[2px] h-24">
          {data.map((d) => {
            const hPct = d.views > 0 ? Math.max((d.views / max) * 100, 6) : 0
            const isSelected = selectedLabel === d.label
            return (
              <div
                key={d.label}
                onClick={() => handleBarClick(d.label)}
                className={`group/bar relative flex-1 flex flex-col justify-end h-full ${isClickable ? 'cursor-pointer' : ''}`}
              >
                {/* Hover tooltip */}
                {d.views > 0 && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 opacity-0 group-hover/bar:opacity-100 transition-opacity duration-100 flex flex-col items-center">
                    <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                      <p className="text-sm font-bold text-[var(--text)] text-center">{d.views}</p>
                      <p className="text-[11px] text-[var(--text-muted)] text-center">{fmtFull(d.label)}</p>
                      {isClickable && !isSelected && (
                        <p className="text-[11px] text-amber-400/90 text-center mt-0.5">{isEl ? 'κλικ για την ημέρα' : 'click to see that day'}</p>
                      )}
                    </div>
                    <div className="w-px h-1.5 bg-[var(--border-subtle)]" />
                  </div>
                )}
                {/* Bar */}
                <div
                  className={`w-full rounded-t-sm transition-colors duration-100 ${
                    d.views === 0
                      ? 'bg-[var(--ink-soft)]'
                      : isSelected
                        ? 'bg-amber-400'
                        : 'bg-amber-500/35 group-hover/bar:bg-amber-500/70'
                  }`}
                  style={{ height: d.views > 0 ? `${hPct}%` : '3px' }}
                />
              </div>
            )
          })}
        </div>
        <div className="relative h-5 mt-1">
          {tickIdxs.map(idx => (
            <span
              key={idx}
              className="absolute text-[10px] text-[var(--text-muted)] -translate-x-1/2 whitespace-nowrap"
              style={{ left: n <= 1 ? '50%' : `${(idx / (n - 1)) * 100}%` }}
            >
              {fmtTick(data[idx]?.label ?? '')}
            </span>
          ))}
        </div>
      </div>
      {isClickable && (
        <p className="text-[11px] text-[var(--text-muted)] mt-3">
          {isEl
            ? 'Κάντε κλικ σε μια μπάρα για να δείτε την ημέρα · κλικ εκτός για επιστροφή'
            : 'Click a bar to see that day · click outside to go back'}
        </p>
      )}
    </div>
  )
}

// ─── Top Areas ───────────────────────────────────────────────────────────────
function TopAreas({ areas, isEl }: { areas: { area: string; views: number }[]; isEl: boolean }) {
  if (!areas.length) return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-[var(--font-outfit)] mb-3">
        {isEl ? 'Δημοφιλείς περιοχές στην πλατφόρμα' : 'Popular areas on Kaparro'}
      </p>
      <p className="text-sm text-[var(--text-muted)]">{isEl ? 'Καμία προβολή ακόμα σε αυτή την περίοδο' : 'No views yet this period'}</p>
    </div>
  )
  const maxV = areas[0].views
  const medals = ['🥇', '🥈', '🥉']
  const colors = ['bg-amber-400', 'bg-amber-500/70', 'bg-amber-500/45']
  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-[var(--font-outfit)] mb-5">
        {isEl ? 'Δημοφιλείς περιοχές στην πλατφόρμα' : 'Popular areas on Kaparro'}
      </p>
      <div className="flex flex-col gap-4">
        {areas.map((a, i) => (
          <div key={a.area} className="flex items-center gap-3">
            <span className="text-base shrink-0 w-6 text-center">{medals[i]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-[var(--text)] truncate">{a.area}</span>
                <span className="text-xs text-[var(--text-muted)] shrink-0 ml-3 tabular-nums">
                  {a.views.toLocaleString()} {isEl ? 'προβ.' : 'views'}
                </span>
              </div>
              <div className="h-1.5 bg-[var(--ink-soft)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${colors[i]}`}
                  style={{ width: `${Math.round((a.views / maxV) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[var(--text-muted)] mt-4 leading-relaxed">
        {isEl
          ? 'Συνολικές προβολές αγγελιών ανά περιοχή, σε όλη την πλατφόρμα — όχι μόνο στις δικές σας'
          : 'Total listing views per area across the whole platform — not just your listings'}
      </p>
    </div>
  )
}

// ─── Promotion Lift ───────────────────────────────────────────────────────────
function groupStats(group: ListingRow[], daysInPeriod: number) {
  if (group.length === 0) return null
  const tv = group.reduce((s, h) => s + h.viewsInPeriod, 0)
  const ts = group.reduce((s, h) => s + h.savesTotal, 0)
  const ti = group.reduce((s, h) => s + h.inquiriesTotal, 0)
  return {
    totalViews: tv,
    avgDailyViews: tv / (group.length * daysInPeriod),
    avgSaves: ts / group.length,
    avgInqRate: tv > 0 ? (ti / tv * 100) : 0,
    count: group.length,
  }
}

function PromotionLift({ homes, period, isEl }: { homes: ListingRow[]; period: string; isEl: boolean }) {
  const daysInPeriod = period === 'day' ? 1 : period === 'week' ? 7 : 30
  const promoted = homes.filter(h => h.isPromoted)
  const standard = homes.filter(h => !h.isPromoted && !h.finalized)
  const pStats = groupStats(promoted, daysInPeriod)
  const nStats = groupStats(standard, daysInPeriod)
  const bothExist = pStats && nStats

  const viewMultiplier = bothExist && nStats.avgDailyViews > 0
    ? pStats.avgDailyViews / nStats.avgDailyViews : null
  const inqMultiplier = bothExist && nStats.avgInqRate > 0
    ? pStats.avgInqRate / nStats.avgInqRate : null

  // Project: if standard listings were promoted, how many extra inquiries?
  const projectedExtraInq = bothExist && pStats.avgInqRate > nStats.avgInqRate
    ? Math.round(nStats.totalViews * (pStats.avgInqRate - nStats.avgInqRate) / 100)
    : null

  if (!pStats) {
    return (
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5 flex flex-col gap-4">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-[var(--font-outfit)]">
          {isEl ? 'Προώθηση Αγγελιών' : 'Listing Promotion'}
        </p>
        <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 p-4">
          <p className="text-sm font-semibold text-amber-300 mb-2">
            {isEl ? 'Βρείτε ενοικιαστή πιο γρήγορα' : 'Find a tenant faster'}
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed">
            {isEl
              ? 'Οι προωθημένες αγγελίες εμφανίζονται πρώτες στα αποτελέσματα. Περισσότεροι ενδιαφερόμενοι τη βλέπουν — περισσότερα αιτήματα, λιγότερος χρόνος αναμονής.'
              : 'Promoted listings appear at the top of search results. More people see them — which means more inquiries and less time waiting.'}
          </p>
          <Link
            href="/homes/my-listings"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-black text-sm font-bold hover:bg-amber-400 transition-colors"
          >
            ✦ {isEl ? 'Ενεργοποίηση προώθησης →' : 'Activate promotion →'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-[var(--font-outfit)] mb-4">
        {isEl ? 'Προώθηση Αγγελιών' : 'Listing Promotion'}
      </p>

      {/* Plain-language headline */}
      {viewMultiplier !== null && viewMultiplier > 1.1 && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 mb-4">
          <p className="text-base font-semibold text-amber-300 leading-snug">
            {isEl
              ? <>Οι προωθημένες αγγελίες σου βλέπονται <span className="text-amber-400 font-bold">{viewMultiplier.toFixed(1)}× περισσότερο</span> από τις κανονικές.</>
              : <>Your promoted listings are seen <span className="text-amber-400 font-bold">{viewMultiplier.toFixed(1)}× more</span> than your standard ones.</>
            }
          </p>
          {inqMultiplier !== null && inqMultiplier > 1.1 && (
            <p className="text-xs text-[var(--text-muted)] mt-1.5">
              {isEl
                ? `Επίσης δέχονται ${inqMultiplier.toFixed(1)}× περισσότερα αιτήματα ενοικίασης.`
                : `They also receive ${inqMultiplier.toFixed(1)}× more rental inquiries.`}
            </p>
          )}
        </div>
      )}

      {/* All promoted — positive message */}
      {pStats && !nStats && (
        <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 mb-4">
          <p className="text-sm font-semibold text-green-300">
            {isEl ? `✓ Όλες οι ${pStats.count} αγγελίες σου προωθούνται` : `✓ All ${pStats.count} of your listings are promoted`}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {isEl ? 'Εμφανίζονται πρώτες στα αποτελέσματα και στον χάρτη.' : 'They appear first in search results and on the map.'}
          </p>
        </div>
      )}

      {/* Projected gain — simple sentence */}
      {projectedExtraInq !== null && projectedExtraInq > 0 && (
        <div className="rounded-xl bg-[var(--ink-soft)] border border-[var(--border-subtle)] px-4 py-3 mb-4">
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            {isEl
              ? <>{isEl ? 'Αν προωθήσεις και τις υπόλοιπες ' : ''}<span className="text-[var(--text)] font-semibold">{nStats!.count}</span>{' αγγελίες, εκτιμάται ότι θα πάρεις '}<span className="text-green-400 font-semibold">+{projectedExtraInq} επιπλέον αιτήματα</span>{' αυτήν την περίοδο.'}</>
              : <>Promote your other <span className="text-[var(--text)] font-semibold">{nStats!.count}</span> listing{nStats!.count > 1 ? 's' : ''} and you could get an estimated <span className="text-green-400 font-semibold">+{projectedExtraInq} more {projectedExtraInq === 1 ? 'inquiry' : 'inquiries'}</span> this period.</>
            }
          </p>
        </div>
      )}

      {/* Simple numbers — no bars */}
      {bothExist && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-amber-500/8 border border-amber-500/15 p-3">
            <p className="text-[10px] text-amber-400/70 uppercase tracking-wider mb-1">{isEl ? 'Προωθημένες' : 'Promoted'} ({pStats.count})</p>
            <p className="text-xl font-bold text-amber-400 tabular-nums">{pStats.avgDailyViews.toFixed(1)}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{isEl ? 'προβ./μέρα κατά μέσο όρο' : 'avg views / day'}</p>
          </div>
          <div className="rounded-xl bg-[var(--ink-soft)] border border-[var(--border-subtle)] p-3">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">{isEl ? 'Κανονικές' : 'Standard'} ({nStats.count})</p>
            <p className="text-xl font-bold text-[var(--text-muted)] tabular-nums">{nStats.avgDailyViews.toFixed(1)}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{isEl ? 'προβ./μέρα κατά μέσο όρο' : 'avg views / day'}</p>
          </div>
        </div>
      )}

      {nStats && nStats.count > 0 && (
        <Link
          href="/homes/my-listings"
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/8 transition-colors text-sm font-semibold"
        >
          ✦ {isEl ? `Προώθηση ${nStats.count === 1 ? 'της υπόλοιπης αγγελίας' : `των ${nStats.count} υπόλοιπων αγγελιών`} →` : `Promote ${nStats.count === 1 ? 'your remaining listing' : `your ${nStats.count} remaining listings`} →`}
        </Link>
      )}
    </div>
  )
}

// ─── Most Interest ───────────────────────────────────────────────────────────
// Listings are still ranked by engagementScore, but the score itself is not
// shown: the views/saves/inquiries it is derived from are printed on each row,
// so a 0-100 composite only added a number that needed a legend to decode.
function MostInterest({ homes, isEl }: { homes: ListingRow[]; isEl: boolean }) {
  const scored = [...homes]
    .map(h => ({ ...h, score: engagementScore(h) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-[var(--font-outfit)]">
          {isEl ? 'Μεγαλύτερο ενδιαφέρον' : 'Most interest'}
        </p>
      </div>
      {scored.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-4">
          {isEl ? 'Καμία προβολή ακόμα σε αυτή την περίοδο' : 'No views yet this period'}
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--border-subtle)]">
          {scored.map((home, idx) => {
            const title = isEl ? (home.titleGreek ?? home.title) : home.title
            return (
              <div key={home.key} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)] tabular-nums w-4 shrink-0">{idx + 1}</span>
                  <StatusDot status={home.status} isEl={isEl} />
                  <Link
                    href={`/homes/${home.key}/analytics`}
                    className="flex-1 text-sm font-medium text-[var(--text)] hover:text-[var(--accent)] transition-colors truncate min-w-0"
                  >
                    {title}
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 pl-6">
                  <span className="text-[11px] text-[var(--text-muted)]">{fmtNum(home.viewsInPeriod)} {isEl ? 'προβολές' : 'views'}</span>
                  <span className="text-[11px] text-amber-500/40" aria-hidden="true">·</span>
                  <span className="text-[11px] text-[var(--text-muted)]">{home.savesTotal} {isEl ? 'αποθηκεύσεις' : 'saves'}</span>
                  <span className="text-[11px] text-amber-500/40" aria-hidden="true">·</span>
                  <span className="text-[11px] text-[var(--text-muted)]">{home.inquiriesTotal} {isEl ? 'αιτήματα' : 'inquiries'}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Plus: basic view + blurred Pro teaser ────────────────────────────────────
function PlusView({ data, isEl }: {
  data: PortfolioData; isEl: boolean
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: isEl ? 'Αποθηκεύσεις' : 'Saves', value: data.funnel.saves },
          { label: isEl ? 'Νέα αιτήματα' : 'New inquiries', value: data.totals.inquiries },
          { label: isEl ? 'Νέα ραντεβού' : 'New schedules', value: data.totals.schedules },
        ].map(s => (
          <div key={s.label} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-[var(--font-outfit)] mb-2">{s.label}</p>
            <p className="text-3xl font-bold text-[var(--text)] font-[var(--font-fraunces)]">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
        <div className="grid grid-cols-[1fr_4rem_4rem_4rem] gap-3 px-5 py-3 border-b border-[var(--border-subtle)]">
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-[var(--font-outfit)]">{isEl ? 'Αγγελία' : 'Listing'}</span>
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-[var(--font-outfit)] text-right">{isEl ? 'Αποθ.' : 'Saves'}</span>
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-[var(--font-outfit)] text-right">{isEl ? 'Αιτ.' : 'Inq.'}</span>
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-[var(--font-outfit)] text-right">{isEl ? 'Ραντ.' : 'Sched.'}</span>
        </div>
        {data.homes.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[var(--text-muted)] text-center">{isEl ? 'Δεν υπάρχουν αγγελίες.' : 'No listings yet.'}</p>
        ) : (
          data.homes.map(home => {
            const title = isEl ? (home.titleGreek ?? home.title) : home.title
            return (
              <div key={home.key} className="grid grid-cols-[1fr_4rem_4rem_4rem] gap-3 px-5 py-4 border-b border-[var(--border-subtle)] last:border-0 items-center hover:bg-[var(--ink-soft)]/40 transition-colors">
                <div className="min-w-0 flex items-center gap-2">
                  <StatusDot status={home.status} isEl={isEl} className="w-2 h-2" />
                  <Link href={`/homes/${home.key}/analytics`} className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)] transition-colors truncate">
                    {title}
                  </Link>
                </div>
                <span className="text-sm text-[var(--text-muted)] text-right">{home.savesTotal}</span>
                <span className="text-sm text-[var(--text-muted)] text-right">{home.inquiriesInPeriod}</span>
                <span className="text-sm text-[var(--text-muted)] text-right">{home.schedulesInPeriod}</span>
              </div>
            )
          })
        )}
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-amber-500/20">
        <div className="opacity-25 pointer-events-none select-none blur-sm p-5 flex flex-col gap-5">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
            <div className="flex items-end gap-px h-16">
              {data.timeSeries.slice(0, 20).map((d) => (
                <div key={d.label} className="flex-1 bg-amber-500/30 rounded-t" style={{ height: `${Math.max((d.views / Math.max(...data.timeSeries.map(x => x.views), 1)) * 100, 2)}%` }} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5 h-32" />
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5 h-32" />
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--canvas)]/70 backdrop-blur-[1px] p-8">
          <p className="text-lg font-bold text-[var(--text)] font-[var(--font-fraunces)] text-center">
            {isEl ? 'Περισσότερα με το Pro' : 'More with Pro'}
          </p>
          <p className="text-sm text-[var(--text-muted)] text-center max-w-xs">
            {isEl
              ? 'Ζωντανές προβολές, τάσεις, σύγκριση προωθήσεων και βαθμολογία ενδιαφέροντος.'
              : 'Live view tracking, trends, promotion comparison, and engagement scores.'}
          </p>
          <Link href="/upgrade" className="px-5 py-2.5 bg-amber-500 text-black rounded-xl font-semibold hover:bg-amber-400 transition-colors text-sm">
            {isEl ? 'Αναβάθμιση σε Pro →' : 'Upgrade to Pro →'}
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Pro: full analytics view ─────────────────────────────────────────────────
function ProView({ data, period, sortCol, sortDir, handleSort, isEl, onBarClick, drillDate, onClearDrill }: {
  data: PortfolioData
  period: 'day' | 'week' | 'month'
  sortCol: SortCol
  sortDir: 'asc' | 'desc'
  handleSort: (c: SortCol) => void
  isEl: boolean
  onBarClick?: (label: string) => void
  drillDate?: string | null
  onClearDrill?: () => void
}) {
  const delta = data.totals.prevViews > 0
    ? Math.round(((data.totals.views - data.totals.prevViews) / data.totals.prevViews) * 100)
    : null

  const sorted = [...data.homes].sort((a, b) => {
    const m = sortDir === 'desc' ? -1 : 1
    switch (sortCol) {
      case 'views':     return m * (a.viewsInPeriod - b.viewsInPeriod)
      case 'inquiries': return m * (a.inquiriesTotal - b.inquiriesTotal)
      case 'saves':     return m * (a.savesTotal - b.savesTotal)
      case 'avgTime':   return m * ((a.avgDurationSeconds ?? 0) - (b.avgDurationSeconds ?? 0))
      case 'rate':      return m * (parseFloat(a.inquiryRate) - parseFloat(b.inquiryRate))
      case 'days':      return m * (a.daysOnMarket - b.daysOnMarket)
    }
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-[var(--font-outfit)] mb-2">{isEl ? 'Προβολές' : 'Views'}</p>
          <div className="flex items-end gap-3">
            <p className="text-3xl font-bold text-[var(--text)] font-[var(--font-fraunces)]">{data.totals.views}</p>
            {delta !== null && (
              <span className={`text-xs font-semibold mb-1 ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {delta >= 0 ? '↑' : '↓'}{Math.abs(delta)}%
              </span>
            )}
          </div>
        </div>
        {[
          { label: isEl ? 'Νέα αιτήματα' : 'New inquiries', value: data.totals.inquiries },
          { label: isEl ? 'Νέα ραντεβού' : 'New schedules', value: data.totals.schedules },
        ].map(s => (
          <div key={s.label} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-[var(--font-outfit)] mb-2">{s.label}</p>
            <p className="text-3xl font-bold text-[var(--text)] font-[var(--font-fraunces)]">{s.value}</p>
          </div>
        ))}
      </div>

      {drillDate && onClearDrill && (
        <div className="flex items-center gap-3">
          <button
            onClick={onClearDrill}
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            ← {isEl ? 'Πίσω' : 'Back'}
          </button>
          <span className="text-xs text-amber-400/70">
            {isEl ? 'Φιλτράρισμα:' : 'Filtered:'} {drillDate}
          </span>
        </div>
      )}
      <DailyPulse data={data.timeSeries} period={period} prevViews={data.totals.prevViews} isEl={isEl} onBarClick={onBarClick} onClearDrill={onClearDrill} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col gap-6">
          <PromotionLift homes={data.homes} period={period} isEl={isEl} />
          {data.topAreas?.length > 0 && <TopAreas areas={data.topAreas} isEl={isEl} />}
        </div>
        <MostInterest homes={data.homes} isEl={isEl} />
      </div>

      {/* Listings table */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)]">
      <div className="bg-[var(--surface)] min-w-[600px] overflow-hidden rounded-2xl">
        <div className="grid grid-cols-[1.5rem_1rem_1fr_4.5rem_5rem_4rem_4rem_4.5rem_4rem] gap-3 px-5 py-3 border-b border-[var(--border-subtle)]">
          <span /><span />
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-[var(--font-outfit)]">{isEl ? 'Αγγελία' : 'Listing'}</span>
          <SortHeader col="views" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">{isEl ? 'Προβ.' : 'Views'}</SortHeader>
          <SortHeader col="avgTime" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">{isEl ? 'Χρόνος' : 'Time'}</SortHeader>
          <SortHeader col="saves" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">{isEl ? 'Αποθ.' : 'Saves'}</SortHeader>
          <SortHeader col="inquiries" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">{isEl ? 'Αιτ.' : 'Inq.'}</SortHeader>
          <SortHeader col="rate" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">{isEl ? 'Αιτ. %' : 'Inq. %'}</SortHeader>
          <SortHeader col="days" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">{isEl ? 'Ημέρες' : 'Days'}</SortHeader>
        </div>
        {sorted.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[var(--text-muted)] text-center">{isEl ? 'Δεν υπάρχουν αγγελίες.' : 'No listings yet.'}</p>
        ) : sorted.map(home => {
          const title = isEl ? (home.titleGreek ?? home.title) : home.title
          return (
            <div
              key={home.key}
              className="grid grid-cols-[1.5rem_1rem_1fr_4.5rem_5rem_4rem_4rem_4.5rem_4rem] gap-3 px-5 py-4 border-b border-[var(--border-subtle)] last:border-0 items-center hover:bg-[var(--ink-soft)]/40 transition-colors"
            >
              <div className="flex justify-center"><StatusDot status={home.status} isEl={isEl} className="w-2 h-2" /></div>
              <div className="flex justify-center">{home.isPromoted && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}</div>
              <div className="min-w-0">
                <Link href={`/homes/${home.key}/analytics`} className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)] transition-colors truncate block">{title}</Link>
                <p className="text-xs text-[var(--text-muted)] truncate">{home.city}</p>
              </div>
              <span className="text-sm font-semibold text-[var(--text)] text-right">{home.viewsInPeriod}</span>
              <span className="text-sm text-[var(--text-muted)] text-right">{fmtDur(home.avgDurationSeconds)}</span>
              <span className="text-sm text-[var(--text-muted)] text-right">{home.savesTotal}</span>
              <span className="text-sm text-[var(--text-muted)] text-right">{home.inquiriesTotal}</span>
              <span className="text-sm text-[var(--text-muted)] text-right">{home.inquiryRate}%</span>
              <span className="text-sm text-right">
                {home.finalized ? <span className="text-purple-400/70 text-xs">—</span> : <span className="text-[var(--text-muted)]">{home.daysOnMarket}</span>}
              </span>
            </div>
          )
        })}
      </div>
      </div>

      {/* Traffic sources */}
      {data.topSources.length > 0 && (() => {
        const maxC = Math.max(...data.topSources.map(s => s.count), 1)
        const sourceLabel: Record<string, { en: string; el: string }> = {
          browse: { en: 'Browse', el: 'Αναζήτηση' },
          ai_search: { en: 'AI Search', el: 'AI Αναζήτηση' },
          filter_search: { en: 'Filters', el: 'Φίλτρα' },
          map: { en: 'Map', el: 'Χάρτης' },
          saved: { en: 'Saved', el: 'Αποθηκευμένα' },
          compare: { en: 'Compare', el: 'Σύγκριση' },
          direct: { en: 'Direct', el: 'Άμεσος' },
        }
        return (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-[var(--font-outfit)] mb-4">{isEl ? 'Πηγές' : 'Sources'}</p>
            <div className="flex flex-col gap-3">
              {data.topSources.map(s => {
                const lbl = sourceLabel[s.source] ?? { en: s.source, el: s.source }
                return (
                  <div key={s.source} className="flex items-center gap-3">
                    <span className="text-xs text-[var(--text-muted)] w-20 shrink-0">{isEl ? lbl.el : lbl.en}</span>
                    <div className="flex-1 h-2 bg-[var(--ink-soft)] rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.round((s.count / maxC) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-[var(--text)] w-6 text-right">{s.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* CSV export */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            const rows = [['Title', 'City', 'Views', 'Avg time', 'Saves', 'Inquiries', 'Rate', 'Days']]
            sorted.forEach(h => rows.push([
              isEl ? (h.titleGreek ?? h.title) : h.title,
              h.city, String(h.viewsInPeriod), fmtDur(h.avgDurationSeconds),
              String(h.savesTotal), String(h.inquiriesTotal), h.inquiryRate + '%',
              h.finalized ? '—' : String(h.daysOnMarket),
            ]))
            const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = 'analytics.csv'; a.click()
            URL.revokeObjectURL(url)
          }}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
        >
          ↓ {isEl ? 'Εξαγωγή CSV' : 'Export CSV'}
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { language } = useLanguage()
  const isEl = language === 'el'
  const router = useRouter()

  const [tier, setTier] = useState<'free' | 'plus' | 'pro'>('free')
  const [tierRedirecting, setTierRedirecting] = useState(false)
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month')
  const [drillDate, setDrillDate] = useState<string | null>(null)
  const [preDrillPeriod, setPreDrillPeriod] = useState<'day' | 'week' | 'month'>('month')
  const [sortCol, setSortCol] = useState<SortCol>('views')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const fetchData = useCallback((p: string, date?: string, signal?: AbortSignal) => {
    const url = date
      ? `/api/homes/portfolio-analytics?period=${p}&date=${date}`
      : `/api/homes/portfolio-analytics?period=${p}`
    return fetch(url, signal ? { signal } : undefined)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch((e) => { if (e?.name !== 'AbortError') console.error(e) })
  }, [])

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(p => {
        if (!p.user) { router.push('/login'); return }
        const t = (p.user.subscriptionTier ?? 'free') as 'free' | 'plus' | 'pro'
        setTier(t)
        if (t === 'free') { setTierRedirecting(true); setTimeout(() => router.push('/upgrade'), 2000); return }
        return fetchData('month')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router, fetchData])

  useEffect(() => {
    if (tier === 'free') return
    if (drillDate) return
    const controller = new AbortController()
    fetchData(period, undefined, controller.signal)
    return () => controller.abort()
  }, [period, tier, fetchData, drillDate])

  useEffect(() => {
    if (tier === 'free' || drillDate) return
    const interval = setInterval(() => {
      const controller = new AbortController()
      fetchData(period, undefined, controller.signal)
    }, 30_000)
    return () => clearInterval(interval)
  }, [period, tier, fetchData, drillDate])

  function handleBarClick(label: string) {
    // label is a date string (YYYY-MM-DD) for week/month views
    if (period === 'day') return
    setPreDrillPeriod(period)
    setDrillDate(label)
    setPeriod('day')
    fetchData('day', label)
  }

  function handleClearDrill() {
    setDrillDate(null)
    setPeriod(preDrillPeriod)
    fetchData(preDrillPeriod)
  }

  function handleSort(col: SortCol) {
    if (col === sortCol) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(col); setSortDir('desc') }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--canvas)] py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 w-32 bg-[var(--ink-soft)] rounded-xl animate-pulse mb-12" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5 h-24 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (tierRedirecting) {
    return (
      <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-[var(--text)] mb-2">
            {isEl ? 'Τα αναλυτικά είναι διαθέσιμα στο Plus και Pro' : 'Analytics are available on Plus and Pro'}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            {isEl ? 'Μεταφορά στις επιλογές αναβάθμισης...' : 'Redirecting to upgrade options...'}
          </p>
        </div>
      </div>
    )
  }

  if (tier === 'free') return null

  const isPlus = tier === 'plus'
  const isPro = tier === 'pro'

  return (
    <div className="min-h-screen bg-[var(--canvas)] py-12 px-4">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)] font-[var(--font-fraunces)]">
            {isEl ? 'Αναλυτικά' : 'Analytics'}
          </h1>
          {(isPlus || isPro) && !drillDate && <PeriodTabs period={period} onChange={setPeriod} isEl={isEl} />}
        </div>

        {isPlus && !data && (
          <p className="text-sm text-[var(--text-muted)] text-center py-12">{isEl ? 'Φόρτωση...' : 'Loading…'}</p>
        )}
        {isPlus && data && <PlusView data={data} isEl={isEl} />}

        {isPro && !data && (
          <p className="text-sm text-[var(--text-muted)] text-center py-12">{isEl ? 'Φόρτωση...' : 'Loading…'}</p>
        )}
        {isPro && data && (
          <ProView
            data={data}
            period={period}
            sortCol={sortCol}
            sortDir={sortDir}
            handleSort={handleSort}
            isEl={isEl}
            onBarClick={handleBarClick}
            drillDate={drillDate}
            onClearDrill={handleClearDrill}
          />
        )}
      </div>
    </div>
  )
}
