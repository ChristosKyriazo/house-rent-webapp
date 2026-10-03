'use client'

import { useCallback, useMemo, useState } from 'react'
import { useReverification } from '@clerk/nextjs'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'
import { formatDateShort, formatDateTimeFull } from '@/lib/format'
import ConfirmDialog from '@/app/components/ConfirmDialog'

/**
 * Visitors of a listing with the owner's private notes (app/api/visitor-notes/route.ts).
 *
 * Locked until the owner asks — opening goes through Clerk's identity re-check. Decrypted
 * notes and visitor details live only in component state: never localStorage, the URL or a
 * cache (the API answers `no-store`). Search and filters run here, after unlocking.
 */

type Outcome = 'interested' | 'maybe' | 'not_a_fit' | 'offer'

interface Visitor {
  handle: string
  profile: {
    name: string | null
    firstName: string | null
    lastName: string | null
    imageUrl: string | null
    occupation: string | null
    email: string | null
    phone: string | null
    verified: boolean
    tenantScore: number | null
  }
  visits: Array<{ bookingKey: string; startTime: string; status: string }>
  upcoming: boolean
  note: { text: string; outcome: Outcome | null; followUp: boolean; updatedAt: string } | null
  legacyNotes: Array<{ date: string; text: string }>
}

const MAX_CHARS = 5000
type TKey = Parameters<typeof getTranslation>[1]

const OUTCOME_KEYS: Record<Outcome, TKey> = {
  interested: 'outcomeInterested',
  maybe: 'outcomeMaybe',
  not_a_fit: 'outcomeNotAFit',
  offer: 'outcomeOffer',
}
const OUTCOME_STYLE: Record<Outcome, string> = {
  interested: 'bg-green-500/15 text-green-400 border-green-500/30',
  offer: 'bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]/40',
  maybe: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  not_a_fit: 'bg-stone-500/15 text-stone-400 border-stone-500/30',
}

/** Hands Clerk's "re-verify first" answer to useReverification, which prompts and retries. */
async function notesFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const body = await res.json().catch(() => ({}))
  return { ...body, __status: res.status }
}

function useT() {
  const { language } = useLanguage()
  return { language, t: (k: TKey) => getTranslation(language, k) }
}

function displayName(p: Visitor['profile']) {
  const full = [p.firstName, p.lastName].filter(Boolean).join(' ')
  return full || p.name || p.email || '—'
}

function initials(p: Visitor['profile']) {
  return displayName(p).split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function Avatar({ profile, size = 40 }: { profile: Visitor['profile']; size?: number }) {
  return profile.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={profile.imageUrl} alt="" width={size} height={size} className="flex-none rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div className="flex flex-none items-center justify-center rounded-full bg-[var(--ink-soft)] text-xs font-bold text-[var(--text-muted)]" style={{ width: size, height: size }}>
      {initials(profile)}
    </div>
  )
}

function OutcomeChip({ outcome }: { outcome: Outcome }) {
  const { t } = useT()
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${OUTCOME_STYLE[outcome]}`}>{t(OUTCOME_KEYS[outcome])}</span>
}

/** Who the visitor is — read live from their account, never stored in the note. */
function VisitorCard({ visitor }: { visitor: Visitor }) {
  const { t, language } = useT()
  const p = visitor.profile
  return (
    <div className="flex gap-3 rounded-xl bg-[var(--ink-soft)] p-3">
      <Avatar profile={p} size={48} />
      <div className="min-w-0 space-y-0.5 text-sm">
        <p className="font-semibold text-[var(--text)]">
          {displayName(p)} {p.verified && <span title="verified" className="text-[var(--accent)]">✓</span>}
        </p>
        {p.occupation && <p className="text-xs text-[var(--text-muted)]">{p.occupation}</p>}
        {p.phone && <p className="text-xs"><a href={`tel:${p.phone}`} className="text-[var(--accent)] hover:underline">{p.phone}</a></p>}
        {p.email && <p className="truncate text-xs"><a href={`mailto:${p.email}`} className="text-[var(--accent)] hover:underline">{p.email}</a></p>}
        <p className="text-xs text-[var(--text-muted)]">
          {t('visitorTenantRating')}: {p.tenantScore != null ? `★ ${p.tenantScore.toFixed(1)}` : t('visitorNoRating')}
        </p>
        <p className="text-[11px] text-[var(--text-muted)]">
          {visitor.visits.map(v => `${formatDateTimeFull(v.startTime, language)} (${v.status})`).join(' · ')}
        </p>
      </div>
    </div>
  )
}

function NoteEditor({ visitor, onSaved, onDeleted, onCancel }: {
  visitor: Visitor
  onSaved: (note: NonNullable<Visitor['note']>) => void
  onDeleted: () => void
  onCancel?: () => void
}) {
  const { t, language } = useT()
  const request = useReverification(notesFetch)
  const initialText = visitor.note?.text
    ?? visitor.legacyNotes.map(n => `${formatDateShort(n.date, language)}: ${n.text}`).join('\n\n')
  const [text, setText] = useState(initialText)
  const [outcome, setOutcome] = useState<Outcome | null>(visitor.note?.outcome ?? null)
  const [followUp, setFollowUp] = useState(visitor.note?.followUp ?? false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const empty = !text.trim() && !outcome && !followUp
  const hasSomething = Boolean(visitor.note || visitor.legacyNotes.length)

  const save = async () => {
    if (empty) return
    setBusy(true)
    try {
      const r = await request('/api/visitor-notes', {
        method: 'PUT',
        body: JSON.stringify({ bookingKey: visitor.handle, text: text.trim(), outcome, followUp }),
      })
      if (r.__status !== 200) throw new Error()
      setStatus('saved')
      onSaved({ text: text.trim(), outcome, followUp, updatedAt: new Date().toISOString() })
    } catch {
      setStatus('error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setConfirmDelete(false)
    setBusy(true)
    try {
      const r = await request(`/api/visitor-notes?bookingKey=${encodeURIComponent(visitor.handle)}`, { method: 'DELETE' })
      if (r.__status !== 200 && r.__status !== 404) throw new Error()
      onDeleted()
    } catch {
      setStatus('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-[var(--text-muted)]">{t('outcomeLabel')}:</span>
        {(Object.keys(OUTCOME_KEYS) as Outcome[]).map(o => (
          <button
            key={o}
            type="button"
            onClick={() => { setOutcome(outcome === o ? null : o); setStatus('idle') }}
            aria-pressed={outcome === o}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${outcome === o ? OUTCOME_STYLE[o] + ' font-semibold' : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text)]'}`}
          >
            {t(OUTCOME_KEYS[o])}
          </button>
        ))}
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-[var(--text)]">
        <input type="checkbox" checked={followUp} onChange={e => { setFollowUp(e.target.checked); setStatus('idle') }} />
        ⚑ {t('followUp')} <span className="text-[var(--text-muted)]">— {t('followUpHint')}</span>
      </label>
      {!visitor.note && visitor.legacyNotes.length > 0 && (
        <p className="text-[11px] text-amber-400">{t('visitorEarlierNotes')}</p>
      )}
      <textarea
        value={text}
        onChange={e => { setText(e.target.value.slice(0, MAX_CHARS)); setStatus('idle') }}
        placeholder={t('meetingNotesPlaceholder')}
        rows={4}
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--ink-soft)] p-3 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
      />
      <p className="text-xs text-[var(--text-muted)]">{t('meetingNotesPrivacy')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={save} disabled={busy || empty} className="btn-primary rounded-xl px-4 py-1.5 text-sm disabled:opacity-50">
          {t('meetingNotesSave')}
        </button>
        {onCancel && (
          <button onClick={onCancel} disabled={busy} className="rounded-xl px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
            {t('meetingNotesCancel')}
          </button>
        )}
        {hasSomething && (
          <button onClick={() => setConfirmDelete(true)} disabled={busy} className="ml-auto rounded-xl px-3 py-1.5 text-sm text-red-400 hover:text-red-300">
            {t('meetingNotesDelete')}
          </button>
        )}
        <span className="text-xs text-[var(--text-muted)]">{text.length}/{MAX_CHARS}</span>
        {status === 'saved' && <span className="text-xs text-green-400">{t('meetingNotesSaved')}</span>}
        {status === 'error' && <span className="text-xs text-red-400">{t('meetingNotesError')}</span>}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title={t('meetingNotesDelete')}
        message={t('meetingNotesDeleteConfirm')}
        confirmLabel={t('meetingNotesDelete')}
        cancelLabel={t('meetingNotesCancel')}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
        language={language}
        variant="danger"
      />
    </div>
  )
}

function useLockedVisitors(query: string) {
  const request = useReverification(notesFetch)
  const [visitors, setVisitors] = useState<Visitor[] | null>(null)
  const [state, setState] = useState<'locked' | 'loading' | 'open' | 'error' | 'unavailable' | 'cancelled'>('locked')

  const unlock = useCallback(async () => {
    setState('loading')
    try {
      const r = await request(`/api/visitor-notes?${query}`)
      if (r.__status === 503) { setState('unavailable'); return }
      if (r.__status !== 200) { setState('error'); return }
      setVisitors(r.visitors as Visitor[])
      setState('open')
    } catch {
      setState('cancelled') // the identity check was dismissed
    }
  }, [query, request])

  const lock = () => { setVisitors(null); setState('locked') }
  const update = (handle: string, note: Visitor['note']) =>
    setVisitors(prev => prev?.map(v => (v.handle === handle ? { ...v, note, legacyNotes: note ? [] : v.legacyNotes } : v)) ?? null)
  return { visitors, state, unlock, lock, update }
}

function Locked({ state, onUnlock }: { state: string; onUnlock: () => void }) {
  const { t } = useT()
  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--text-muted)]">🔒 {t('meetingNotesLockedHint')}</p>
      {state === 'unavailable' && <p className="text-xs text-red-400">{t('meetingNotesUnavailable')}</p>}
      {state === 'error' && <p className="text-xs text-red-400">{t('meetingNotesError')}</p>}
      {state === 'cancelled' && <p className="text-xs text-amber-400">{t('meetingNotesCancelled')}</p>}
      <button
        onClick={onUnlock}
        disabled={state === 'loading'}
        className="rounded-xl border border-[var(--border-subtle)] px-4 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--ink-soft)] disabled:opacity-50"
      >
        {state === 'loading' ? '…' : t('meetingNotesUnlock')}
      </button>
    </div>
  )
}

/** Listing page: every visitor, one row per person — scannable, searchable, filterable. */
export function VisitorsSection({ homeKey }: { homeKey: string }) {
  const { t, language } = useT()
  const { visitors, state, unlock, lock, update } = useLockedVisitors(`homeKey=${encodeURIComponent(homeKey)}`)
  const [tab, setTab] = useState<'upcoming' | 'past'>('past')
  const [query, setQuery] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState<Outcome | 'all'>('all')
  const [open, setOpen] = useState<string | null>(null)

  const counts = useMemo(() => ({
    upcoming: visitors?.filter(v => v.upcoming).length ?? 0,
    past: visitors?.filter(v => !v.upcoming).length ?? 0,
  }), [visitors])

  const shown = useMemo(() => {
    if (!visitors) return []
    const q = query.trim().toLowerCase()
    return visitors
      .filter(v => (tab === 'upcoming' ? v.upcoming : !v.upcoming))
      .filter(v => outcomeFilter === 'all' || v.note?.outcome === outcomeFilter)
      .filter(v => !q || displayName(v.profile).toLowerCase().includes(q))
      .sort((a, b) => {
        const f = Number(Boolean(b.note?.followUp)) - Number(Boolean(a.note?.followUp))
        if (f !== 0) return f
        const at = new Date(a.visits[0].startTime).getTime()
        const bt = new Date(b.visits[0].startTime).getTime()
        return tab === 'upcoming' ? at - bt : bt - at
      })
  }, [visitors, tab, query, outcomeFilter])

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text)]">
          {t('visitorsTitle')}{visitors ? ` (${visitors.length})` : ''}
        </h2>
        {state === 'open' && <button onClick={lock} title="Lock" className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]">🔒</button>}
      </div>

      {state !== 'open' || !visitors ? (
        <Locked state={state} onUnlock={unlock} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {(['upcoming', 'past'] as const).map(k => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${tab === k ? 'bg-[var(--accent)] text-[var(--ink)]' : 'border border-[var(--border-subtle)] text-[var(--text-muted)]'}`}
              >
                {t(k === 'upcoming' ? 'visitorsUpcoming' : 'visitorsPast')} {counts[k]}
              </button>
            ))}
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('visitorsSearch')}
              className="min-w-[10rem] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--ink-soft)] px-3 py-1 text-sm text-[var(--text)]"
            />
            <select
              value={outcomeFilter}
              onChange={e => setOutcomeFilter(e.target.value as Outcome | 'all')}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--ink-soft)] px-2 py-1 text-sm text-[var(--text)]"
            >
              <option value="all">{t('visitorsAllOutcomes')}</option>
              {(Object.keys(OUTCOME_KEYS) as Outcome[]).map(o => <option key={o} value={o}>{t(OUTCOME_KEYS[o])}</option>)}
            </select>
          </div>

          {shown.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{visitors.length === 0 ? t('visitorsEmpty') : t('visitorsNoMatches')}</p>
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {shown.map(v => {
                const last = v.visits[0]
                const isOpen = open === v.handle
                const preview = v.note?.text || v.legacyNotes[0]?.text || ''
                return (
                  <li key={v.handle} className="py-2">
                    <button
                      onClick={() => setOpen(isOpen ? null : v.handle)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left hover:bg-[var(--ink-soft)]"
                    >
                      <Avatar profile={v.profile} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--text)]">
                          {v.note?.followUp && <span className="mr-1 text-[var(--accent)]" title={t('followUp')}>⚑</span>}
                          {displayName(v.profile)}
                          {v.profile.occupation && <span className="font-normal text-[var(--text-muted)]"> · {v.profile.occupation}</span>}
                        </p>
                        <p className="truncate text-xs text-[var(--text-muted)]">
                          {v.upcoming ? `${t('visitorUpcomingVisit')}: ` : ''}
                          {v.visits.length} {t(v.visits.length === 1 ? 'visitorVisitOne' : 'visitorVisits')} · {formatDateShort(last.startTime, language)}
                          {preview && <> · “{preview.split('\n')[0].slice(0, 80)}”</>}
                        </p>
                      </div>
                      {v.note?.outcome && <OutcomeChip outcome={v.note.outcome} />}
                    </button>
                    {isOpen && (
                      <div className="mt-2 space-y-3 pl-1">
                        <VisitorCard visitor={v} />
                        <NoteEditor
                          visitor={v}
                          onSaved={note => update(v.handle, note)}
                          onDeleted={() => update(v.handle, null)}
                          onCancel={() => setOpen(null)}
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

/** Calendar meeting: who this visitor is, and the owner's note about them for this listing. */
export function VisitorNotePanel({ bookingKey }: { bookingKey: string }) {
  const { t } = useT()
  const { visitors, state, unlock, update } = useLockedVisitors(`bookingKey=${encodeURIComponent(bookingKey)}`)
  const v = visitors?.[0]
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] p-4">
      <h3 className="mb-2 text-sm font-semibold text-[var(--text)]">{t('meetingNotesTitle')}</h3>
      {state !== 'open' || !v ? (
        <Locked state={state} onUnlock={unlock} />
      ) : (
        <div className="space-y-3">
          <VisitorCard visitor={v} />
          <NoteEditor visitor={v} onSaved={note => update(v.handle, note)} onDeleted={() => update(v.handle, null)} />
        </div>
      )}
    </section>
  )
}
