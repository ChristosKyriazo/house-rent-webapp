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
      <span className="text-[9px] opacity-50">{active ? (dir === 'desc' ? '↓' : '↑') : '↕'}</span>
    </button>
  )
}

// ─── Daily Pulse ─────────────────────────────────────────────────────────────
function DailyPulse({ data, period, prevViews, isEl }: {
  data: { label: string; views: number }[]
  period: string; prevViews: number; isEl: boolean
}) {
  const total = data.reduce((s, d) => s + d.views, 0)
  const max = Math.max(...data.map(d => d.views), 1)
  const peakIdx = data.reduce((pi, d, i) => d.views > data[pi].views ? i : pi, 0)
  const delta = prevViews > 0 ? Math.round(((total - prevViews) / prevViews) * 100) : null
  const nowHour = new Date().getHours()

  function fmtTick(label: string): string {
    if (period === 'day') return label
    try {
      const d = new Date(label + 'T12:00:00')
      if (period === 'week') return d.toLocaleDateString('en', { weekday: 'short' })
      return d.toLocaleDateString('en', { day: 'numeric', month: 'short' })
    } catch { return label }
  }

  const n = data.length
  const tickIdxs: number[] = n <= 7
    ? data.map((_, i) => i)
    : period === 'day'
      ? [0, 6, 12, 18, 23]
      : [0, Math.floor(n / 2), n - 1]

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
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
          {data.map((d, i) => {
            const isPeak = i === peakIdx && d.views > 0
            const isCurrent = period === 'day' && i === nowHour
            const hPct = d.views > 0 ? Math.max((d.views / max) * 100, 6) : 0
            return (
              <div
                key={d.label}
                title={`${fmtTick(d.label)}: ${d.views}`}
                className="flex-1 flex flex-col justify-end h-full"
              >
                <div
                  className={`w-full rounded-t-sm transition-all ${
                    isPeak ? 'bg-amber-400' :
                    isCurrent ? 'bg-amber-500/80 ring-1 ring-inset ring-amber-300/50' :
                    d.views === 0 ? 'bg-[var(--ink-soft)]' :
                    'bg-amber-500/35 hover:bg-amber-500/55'
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
      {data[peakIdx]?.views > 0 && (
        <p className="text-xs text-[var(--text-muted)] mt-3">
          {isEl ? 'Κορύφωση' : 'Peak'}{' '}
          <span className="text-amber-400 font-medium">{data[peakIdx].views}</span>
          {' '}{isEl ? 'στις' : 'at'} {fmtTick(data[peakIdx].label)}
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
        {isEl ? 'Κορυφαίες Περιοχές' : 'Top Areas'}
      </p>
      <p className="text-sm text-[var(--text-muted)]">{isEl ? 'Δεν υπάρχουν δεδομένα ακόμα' : 'No data yet'}</p>
    </div>
  )
  const maxV = areas[0].views
  const medals = ['🥇', '🥈', '🥉']
  const colors = ['bg-amber-400', 'bg-amber-500/70', 'bg-amber-500/45']
  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-[var(--font-outfit)] mb-5">
        {isEl ? 'Κορυφαίες Περιοχές — Πλατφόρμα' : 'Top Areas — Platform Wide'}
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
      <p className="text-[10px] text-[var(--text-muted)] mt-4 leading-relaxed">
        {isEl
          ? 'Συνολικές all-time προβολές αγγελιών ανά περιοχή στην πλατφόρμα'
          : 'All-time listing views per area across the entire platform'}
      </p>
    </div>
  )
}

// ─── Promotion Lift ───────────────────────────────────────────────────────────
function MetricRow({ label, value, max, isPromoted }: {
  label: string; value: number; max: number; isPromoted: boolean
}) {
  const pct = Math.round((value / max) * 100)
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
        <span className="text-xs font-semibold text-[var(--text)]">{value < 1 ? value.toFixed(2) : value.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-[var(--ink-soft)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${isPromoted ? 'bg-amber-500' : 'bg-[var(--text-muted)]/40'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function groupStats(group: ListingRow[], daysInPeriod: number) {
  if (group.length === 0) return null
  const tv = group.reduce((s, h) => s + h.viewsInPeriod, 0)
  const ts = group.reduce((s, h) => s + h.savesTotal, 0)
  const ti = group.reduce((s, h) => s + h.inquiriesTotal, 0)
  return {
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
  const maxDV = Math.max(pStats?.avgDailyViews ?? 0, nStats?.avgDailyViews ?? 0, 1)
  const maxS = Math.max(pStats?.avgSaves ?? 0, nStats?.avgSaves ?? 0, 1)
  const maxR = Math.max(pStats?.avgInqRate ?? 0, nStats?.avgInqRate ?? 0, 1)
  const multiplier = bothExist && nStats.avgDailyViews > 0
    ? (pStats.avgDailyViews / nStats.avgDailyViews).toFixed(1) : null

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-[var(--font-outfit)] mb-1">
            {isEl ? 'Απόδοση Προώθησης' : 'Promotion Lift'}
          </p>
          {multiplier && (
            <p className="text-2xl font-bold text-amber-400 font-[var(--font-fraunces)]">
              {multiplier}×
              <span className="text-sm font-normal text-[var(--text-muted)] ml-2">
                {isEl ? 'προβολές/μέρα' : 'views/day'}
              </span>
            </p>
          )}
          {!pStats && <p className="text-sm text-[var(--text-muted)] mt-1">{isEl ? 'Χωρίς ενεργή προώθηση' : 'No active promotions'}</p>}
          {pStats && !nStats && <p className="text-sm text-[var(--text-muted)] mt-1">{isEl ? 'Όλες προωθούνται' : 'All listings promoted'}</p>}
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] shrink-0">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />{isEl ? 'Προωθ.' : 'Promo'}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--text-muted)]/40" />{isEl ? 'Κανον.' : 'Std'}</span>
        </div>
      </div>
      {!pStats ? (
        <div className="rounded-xl border border-dashed border-amber-500/30 p-4 text-center">
          <Link href="/homes/my-listings" className="text-xs text-amber-400/70 hover:text-amber-400">{isEl ? 'Ενεργοποίηση προώθησης →' : 'Activate a promotion slot →'}</Link>
        </div>
      ) : (
        <div className={`grid gap-6 ${bothExist ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {pStats && (
            <div className="border-l-2 border-amber-500 pl-4">
              <p className="text-xs font-semibold text-amber-400 mb-3">{isEl ? `Προωθ. (${pStats.count})` : `Promoted (${pStats.count})`}</p>
              <MetricRow label={isEl ? 'Προβολές/μέρα' : 'Views/day'} value={pStats.avgDailyViews} max={maxDV} isPromoted={true} />
              <MetricRow label={isEl ? 'Αποθ./αγγελία' : 'Saves/listing'} value={pStats.avgSaves} max={maxS} isPromoted={true} />
              <MetricRow label={isEl ? 'Ποσοστό αιτ. %' : 'Inquiry rate %'} value={pStats.avgInqRate} max={maxR} isPromoted={true} />
            </div>
          )}
          {nStats && (
            <div className="border-l-2 border-[var(--border-subtle)] pl-4">
              <p className="text-xs font-semibold text-[var(--text-muted)] mb-3">{isEl ? `Κανον. (${nStats.count})` : `Standard (${nStats.count})`}</p>
              <MetricRow label={isEl ? 'Προβολές/μέρα' : 'Views/day'} value={nStats.avgDailyViews} max={maxDV} isPromoted={false} />
              <MetricRow label={isEl ? 'Αποθ./αγγελία' : 'Saves/listing'} value={nStats.avgSaves} max={maxS} isPromoted={false} />
              <MetricRow label={isEl ? 'Ποσοστό αιτ. %' : 'Inquiry rate %'} value={nStats.avgInqRate} max={maxR} isPromoted={false} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Engagement Depth ────────────────────────────────────────────────────────
function EngagementDepth({ homes, isEl }: { homes: ListingRow[]; isEl: boolean }) {
  const maxV = Math.max(...homes.map(h => h.viewsInPeriod), 1)
  const scored = [...homes]
    .map(h => ({ ...h, score: engagementScore(h) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-[var(--font-outfit)] mb-5">
        {isEl ? 'Βάθος Ενδιαφέροντος' : 'Engagement Depth'}
      </p>
      {scored.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-4">{isEl ? 'Χωρίς δεδομένα' : 'No data yet'}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {scored.map(home => {
            const vp = (home.viewsInPeriod / maxV) * 100
            const sp = home.viewsInPeriod > 0 ? Math.min((home.savesTotal / home.viewsInPeriod) * vp, vp) : 0
            const ip = home.viewsInPeriod > 0 ? Math.min((home.inquiriesTotal / home.viewsInPeriod) * vp, vp) : 0
            const title = isEl ? (home.titleGreek ?? home.title) : home.title
            return (
              <div key={home.key} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${STATUS_DOT[home.status]} shrink-0`} />
                <Link href={`/homes/${home.key}/analytics`} className="w-28 text-xs text-[var(--text)] hover:text-[var(--accent)] transition-colors truncate shrink-0">
                  {title}
                </Link>
                <div className="flex-1 relative h-3 bg-[var(--ink-soft)] rounded-full overflow-hidden min-w-0">
                  <div className="absolute inset-y-0 left-0 bg-amber-500/25 rounded-full" style={{ width: `${vp}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-amber-500/65 rounded-full" style={{ width: `${sp}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-amber-700 rounded-full" style={{ width: `${ip}%` }} />
                </div>
                {home.score >= 60 ? (
                  <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full font-bold shrink-0 w-10 text-center">{home.score}</span>
                ) : (
                  <span className="text-xs text-[var(--text-muted)] shrink-0 w-10 text-right">{home.score || '—'}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
      <div className="flex items-center gap-5 mt-5 pt-4 border-t border-[var(--border-subtle)]">
        {[
          { cls: 'bg-amber-500/25', label: isEl ? 'Προβολές' : 'Views' },
          { cls: 'bg-amber-500/65', label: isEl ? 'Αποθ.' : 'Saves' },
          { cls: 'bg-amber-700', label: isEl ? 'Αιτ.' : 'Inq.' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-2.5 rounded-sm ${l.cls}`} />
            <span className="text-xs text-[var(--text-muted)]">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Plus: basic view + blurred Pro teaser ────────────────────────────────────
function PlusView({ data, period, isEl }: {
  data: PortfolioData; period: 'day' | 'week' | 'month'; isEl: boolean
}) {
  const isEl_ = isEl
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: isEl_ ? 'Αποθηκεύσεις' : 'Saves', value: data.funnel.saves },
          { label: isEl_ ? 'Νέα αιτήματα' : 'New inquiries', value: data.totals.inquiries },
          { label: isEl_ ? 'Νέα ραντεβού' : 'New schedules', value: data.totals.schedules },
        ].map(s => (
          <div key={s.label} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-[var(--font-outfit)] mb-2">{s.label}</p>
            <p className="text-3xl font-bold text-[var(--text)] font-[var(--font-fraunces)]">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
        <div className="grid grid-cols-[1fr_4rem_4rem_4rem] gap-3 px-5 py-3 border-b border-[var(--border-subtle)]">
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-[var(--font-outfit)]">{isEl_ ? 'Αγγελία' : 'Listing'}</span>
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-[var(--font-outfit)] text-right">{isEl_ ? 'Αποθ.' : 'Saves'}</span>
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-[var(--font-outfit)] text-right">{isEl_ ? 'Αιτ.' : 'Inq.'}</span>
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-[var(--font-outfit)] text-right">{isEl_ ? 'Ραντ.' : 'Sched.'}</span>
        </div>
        {data.homes.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[var(--text-muted)] text-center">{isEl_ ? 'Δεν υπάρχουν αγγελίες.' : 'No listings yet.'}</p>
        ) : (
          data.homes.map(home => {
            const title = isEl_ ? (home.titleGreek ?? home.title) : home.title
            return (
              <div key={home.key} className="grid grid-cols-[1fr_4rem_4rem_4rem] gap-3 px-5 py-4 border-b border-[var(--border-subtle)] last:border-0 items-center hover:bg-[var(--ink-soft)]/40 transition-colors">
                <div className="min-w-0 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${STATUS_DOT[home.status]} shrink-0`} />
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
            {isEl_ ? 'Περισσότερα με το Pro' : 'More with Pro'}
          </p>
          <p className="text-sm text-[var(--text-muted)] text-center max-w-xs">
            {isEl_
              ? 'Ζωντανές προβολές, τάσεις, σύγκριση προωθήσεων και βαθμολογία ενδιαφέροντος.'
              : 'Live view tracking, trends, promotion comparison, and engagement scores.'}
          </p>
          <Link href="/upgrade" className="px-5 py-2.5 bg-amber-500 text-black rounded-xl font-semibold hover:bg-amber-400 transition-colors text-sm">
            {isEl_ ? 'Αναβάθμιση σε Pro →' : 'Upgrade to Pro →'}
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Pro: full analytics view ─────────────────────────────────────────────────
function ProView({ data, period, sortCol, sortDir, handleSort, isEl }: {
  data: PortfolioData
  period: 'day' | 'week' | 'month'
  sortCol: SortCol
  sortDir: 'asc' | 'desc'
  handleSort: (c: SortCol) => void
  isEl: boolean
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

      <DailyPulse data={data.timeSeries} period={period} prevViews={data.totals.prevViews} isEl={isEl} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PromotionLift homes={data.homes} period={period} isEl={isEl} />
        <EngagementDepth homes={data.homes} isEl={isEl} />
      </div>

      {data.topAreas?.length > 0 && (
        <TopAreas areas={data.topAreas} isEl={isEl} />
      )}

      {/* Listings table */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)]">
      <div className="bg-[var(--surface)] min-w-[600px] overflow-hidden rounded-2xl">
        <div className="grid grid-cols-[1.5rem_1rem_1fr_4.5rem_5rem_4rem_4rem_4.5rem_4rem] gap-3 px-5 py-3 border-b border-[var(--border-subtle)]">
          <span /><span />
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-[var(--font-outfit)]">{isEl ? 'Αγγελία' : 'Listing'}</span>
          <SortHeader col="views" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">{isEl ? 'Επισκ.' : 'Views'}</SortHeader>
          <SortHeader col="avgTime" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">{isEl ? 'Χρόνος' : 'Time'}</SortHeader>
          <SortHeader col="saves" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">{isEl ? 'Αποθ.' : 'Saves'}</SortHeader>
          <SortHeader col="inquiries" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">{isEl ? 'Αιτ.' : 'Inq.'}</SortHeader>
          <SortHeader col="rate" current={sortCol} dir={sortDir} onSort={handleSort} className="justify-end">{isEl ? 'Ποσ.' : 'Rate'}</SortHeader>
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
              <div className="flex justify-center"><div className={`w-2 h-2 rounded-full ${STATUS_DOT[home.status]}`} /></div>
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
  const [sortCol, setSortCol] = useState<SortCol>('views')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const fetchData = useCallback((p: string) => {
    return fetch(`/api/homes/portfolio-analytics?period=${p}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
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
    fetchData(period)
  }, [period, tier, fetchData])

  useEffect(() => {
    if (tier === 'free') return
    const interval = setInterval(() => fetchData(period), 30_000)
    return () => clearInterval(interval)
  }, [period, tier, fetchData])

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

        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[var(--text)] font-[var(--font-fraunces)]">
            {isEl ? 'Αναλυτικά' : 'Analytics'}
          </h1>
          {(isPlus || isPro) && <PeriodTabs period={period} onChange={setPeriod} isEl={isEl} />}
        </div>

        {isPlus && !data && (
          <p className="text-sm text-[var(--text-muted)] text-center py-12">{isEl ? 'Φόρτωση...' : 'Loading…'}</p>
        )}
        {isPlus && data && <PlusView data={data} period={period} isEl={isEl} />}

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
          />
        )}
      </div>
    </div>
  )
}
