'use client'

import { useCallback, useState } from 'react'
import { useReverification } from '@clerk/nextjs'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'
import { formatDateTimeFull } from '@/lib/format'
import ConfirmDialog from '@/app/components/ConfirmDialog'

/**
 * Private, encrypted meeting notes (see app/api/meeting-notes/route.ts).
 *
 * Nothing is fetched until the owner asks: the notes are locked by default, and opening them
 * goes through Clerk's identity re-check. Decrypted text lives only in this component's state
 * — never in localStorage, the URL or any cache (the API answers with `no-store`).
 */

interface MeetingWithNote {
  bookingKey: string
  startTime: string
  endTime: string
  status: string
  visitorName: string | null
  note: { key: string; text: string | null; updatedAt: string } | null
}

const MAX_CHARS = 5000

/** Fetch that hands Clerk's "re-verify first" answer to useReverification, which prompts and retries. */
async function notesFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const body = await res.json().catch(() => ({}))
  return { ...body, __status: res.status }
}

function useNotesApi() {
  const request = useReverification(notesFetch)
  return request
}

function NoteEditor({
  bookingKey,
  initialText,
  onSaved,
  onDeleted,
  onCancel,
}: {
  bookingKey: string
  initialText: string
  onSaved: (text: string) => void
  onDeleted: () => void
  onCancel?: () => void
}) {
  const { language } = useLanguage()
  const t = (k: Parameters<typeof getTranslation>[1]) => getTranslation(language, k)
  const request = useNotesApi()
  const [text, setText] = useState(initialText)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const save = async () => {
    if (!text.trim()) return
    setBusy(true)
    try {
      const r = await request('/api/meeting-notes', { method: 'PUT', body: JSON.stringify({ bookingKey, text }) })
      if (r.__status !== 200) throw new Error()
      setStatus('saved')
      onSaved(text.trim())
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
      const r = await request(`/api/meeting-notes?bookingKey=${encodeURIComponent(bookingKey)}`, { method: 'DELETE' })
      if (r.__status !== 200 && r.__status !== 404) throw new Error()
      setText('')
      onDeleted()
    } catch {
      setStatus('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={e => { setText(e.target.value.slice(0, MAX_CHARS)); setStatus('idle') }}
        placeholder={t('meetingNotesPlaceholder')}
        rows={4}
        // Keep the browser from remembering or suggesting personal data.
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--ink-soft)] p-3 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
      />
      <p className="text-xs text-[var(--text-muted)]">{t('meetingNotesPrivacy')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={save}
          disabled={busy || !text.trim() || text.trim() === initialText.trim()}
          className="btn-primary rounded-xl px-4 py-1.5 text-sm disabled:opacity-50"
        >
          {t('meetingNotesSave')}
        </button>
        {onCancel && (
          <button onClick={onCancel} disabled={busy} className="rounded-xl px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
            {t('meetingNotesCancel')}
          </button>
        )}
        {initialText && (
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

/** Locked-until-asked loader shared by both views. */
function useLockedNotes(query: string) {
  const request = useNotesApi()
  const [meetings, setMeetings] = useState<MeetingWithNote[] | null>(null)
  const [state, setState] = useState<'locked' | 'loading' | 'open' | 'error' | 'unavailable' | 'cancelled'>('locked')

  const unlock = useCallback(async () => {
    setState('loading')
    try {
      const r = await request(`/api/meeting-notes?${query}`)
      if (r.__status === 503) { setState('unavailable'); return }
      if (r.__status !== 200) { setState('error'); return }
      setMeetings(r.meetings as MeetingWithNote[])
      setState('open')
    } catch {
      // Thrown when the user dismisses the identity check.
      setState('cancelled')
    }
  }, [query, request])

  const lock = () => { setMeetings(null); setState('locked') }
  return { meetings, setMeetings, state, unlock, lock }
}

function LockedState({ state, onUnlock }: { state: string; onUnlock: () => void }) {
  const { language } = useLanguage()
  const t = (k: Parameters<typeof getTranslation>[1]) => getTranslation(language, k)
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

/** One meeting's note — shown to the host inside the booking details. */
export function MeetingNotesPanel({ bookingKey }: { bookingKey: string }) {
  const { language } = useLanguage()
  const { meetings, setMeetings, state, unlock } = useLockedNotes(`bookingKey=${encodeURIComponent(bookingKey)}`)
  const current = meetings?.[0]

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] p-4">
      <h3 className="mb-2 text-sm font-semibold text-[var(--text)]">{getTranslation(language, 'meetingNotesTitle')}</h3>
      {state !== 'open' || !current ? (
        <LockedState state={state} onUnlock={unlock} />
      ) : (
        <NoteEditor
          bookingKey={bookingKey}
          initialText={current.note?.text ?? ''}
          onSaved={text => setMeetings([{ ...current, note: { key: current.note?.key ?? '', text, updatedAt: new Date().toISOString() } }])}
          onDeleted={() => setMeetings([{ ...current, note: null }])}
        />
      )}
    </section>
  )
}

/** Every meeting for a listing — who visited, when, and the owner's own notes. */
export function HomeVisitNotes({ homeKey }: { homeKey: string }) {
  const { language } = useLanguage()
  const t = (k: Parameters<typeof getTranslation>[1]) => getTranslation(language, k)
  const { meetings, setMeetings, state, unlock, lock } = useLockedNotes(`homeKey=${encodeURIComponent(homeKey)}`)
  const [editing, setEditing] = useState<string | null>(null)

  const update = (bookingKey: string, note: MeetingWithNote['note']) =>
    setMeetings(prev => prev?.map(m => (m.bookingKey === bookingKey ? { ...m, note } : m)) ?? null)

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text)]">{t('visitNotesTitle')}</h2>
        {state === 'open' && (
          <button onClick={lock} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]">🔒</button>
        )}
      </div>
      {state !== 'open' || !meetings ? (
        <LockedState state={state} onUnlock={unlock} />
      ) : meetings.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{t('visitNotesNone')}</p>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {meetings.map(m => (
            <li key={m.bookingKey} className="py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-[var(--text)]">
                  {t('visitNotesVisitor')}: {m.visitorName ?? '—'}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {formatDateTimeFull(m.startTime, language)} · {m.status}
                </p>
              </div>
              {editing === m.bookingKey ? (
                <div className="mt-2">
                  <NoteEditor
                    bookingKey={m.bookingKey}
                    initialText={m.note?.text ?? ''}
                    onSaved={text => { update(m.bookingKey, { key: m.note?.key ?? '', text, updatedAt: new Date().toISOString() }); setEditing(null) }}
                    onDeleted={() => { update(m.bookingKey, null); setEditing(null) }}
                    onCancel={() => setEditing(null)}
                  />
                </div>
              ) : (
                <div className="mt-1 flex items-start justify-between gap-3">
                  <p className={`whitespace-pre-wrap text-sm ${m.note?.text ? 'text-[var(--text)]' : 'italic text-[var(--text-muted)]'}`}>
                    {m.note?.text ?? t('visitNotesNoNote')}
                  </p>
                  <button onClick={() => setEditing(m.bookingKey)} className="flex-none text-xs text-[var(--accent)] hover:underline">
                    {t('meetingNotesEdit')}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
