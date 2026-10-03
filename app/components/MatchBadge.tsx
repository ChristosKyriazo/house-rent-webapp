'use client'

import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { BREAKDOWN_LABELS, reasonText, type MatchBreakdown, type MatchReason } from '@/lib/search/match-reasons'

/**
 * The AI match percentage, clickable: opens why the home scored what it scored — the reasons
 * in words, and how each part of the score came out. Everything shown comes from the search
 * response (lib/search/match-reasons.ts), computed from the same numbers as the percentage.
 */
export default function MatchBadge({
  percentage,
  reasons,
  breakdown,
  className,
  align = 'right',
  placement = 'below',
}: {
  percentage: number
  reasons?: MatchReason[] | null
  breakdown?: MatchBreakdown | null
  className: string
  align?: 'left' | 'right'
  /** 'above' where the badge sits near the bottom of the screen (the map card). */
  placement?: 'below' | 'above'
}) {
  const { language, isEl } = useLanguage()
  const lang = language === 'el' ? 'el' : 'en'
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const explainable = Boolean(reasons?.length || breakdown?.parts.length)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const label = `${percentage.toFixed(0)}% ${isEl ? 'ταίριασμα' : 'match'}`
  if (!explainable) return <span className={className}>{label}</span>

  const icon = { good: '✓', partial: '~', bad: '✗' } as const
  const iconColor = { good: 'text-green-400', partial: 'text-amber-400', bad: 'text-red-400' } as const

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
        aria-expanded={open}
        aria-label={isEl ? `${label} — γιατί;` : `${label} — why?`}
        className={`${className} cursor-pointer underline decoration-dotted underline-offset-2 hover:brightness-110`}
      >
        {label} <span aria-hidden>ⓘ</span>
      </button>

      {open && (
        <div
          role="dialog"
          className={`absolute z-40 w-72 ${placement === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'} max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 text-left shadow-2xl backdrop-blur-xl ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          <p className="mb-2 text-sm font-semibold text-[var(--text)]">
            {isEl ? `Γιατί ${percentage.toFixed(0)}%` : `Why ${percentage.toFixed(0)}%`}
          </p>

          {reasons && reasons.length > 0 && (
            <ul className="mb-3 space-y-1.5">
              {reasons.map((r, i) => (
                <li key={i} className="flex gap-2 text-xs leading-snug text-[var(--text)]">
                  <span className={`flex-none font-bold ${iconColor[r.tone]}`} aria-hidden>{icon[r.tone]}</span>
                  <span>{reasonText(r, lang)}</span>
                </li>
              ))}
            </ul>
          )}

          {breakdown && breakdown.parts.length > 0 && (
            <div className="space-y-1.5 border-t border-[var(--border-subtle)] pt-3">
              {breakdown.parts.map(p => (
                <div key={p.part}>
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                    <span>{BREAKDOWN_LABELS[p.part][lang]}</span>
                    <span>{Math.round(p.value * 100)}% · {isEl ? 'βάρος' : 'weight'} {Math.round(p.share * 100)}%</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-[var(--ink-soft)]">
                    <div
                      className={`h-full rounded-full ${p.value >= 0.7 ? 'bg-green-500' : p.value >= 0.4 ? 'bg-amber-500' : 'bg-stone-500'}`}
                      style={{ width: `${Math.round(p.value * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {breakdown.adjustments.map(a => (
                <div key={a.kind} className="flex justify-between text-[11px]">
                  <span className="text-[var(--text-muted)]">{BREAKDOWN_LABELS[a.kind][lang]}</span>
                  <span className={a.points >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {a.points >= 0 ? '+' : ''}{a.points.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 text-[10px] text-[var(--text-muted)]">
            {isEl
              ? 'Υπολογίζεται από την αναζήτησή σας και τα στοιχεία της αγγελίας.'
              : 'Calculated from your search and the listing’s details.'}
          </p>
        </div>
      )}
    </div>
  )
}
