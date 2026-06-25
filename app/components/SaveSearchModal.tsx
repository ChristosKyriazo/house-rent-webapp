'use client'

import { useState } from 'react'

interface SaveSearchModalProps {
  type: 'filter' | 'ai'
  filterParams?: Record<string, unknown>
  conversationKey?: string
  defaultName?: string
  language: string
  onClose: () => void
  onSaved: () => void
}

export default function SaveSearchModal({
  type,
  filterParams,
  conversationKey,
  defaultName,
  language,
  onClose,
  onSaved,
}: SaveSearchModalProps) {
  const [name, setName] = useState(defaultName ?? '')
  const [minMatchPercent, setMinMatchPercent] = useState(70)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)

    try {
      const body: Record<string, unknown> = { type, name: name.trim() || null }

      if (type === 'filter') {
        body.filterParams = filterParams ?? {}
      } else {
        body.conversationKey = conversationKey
        body.minMatchPercent = minMatchPercent
      }

      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Error ${res.status}`)
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const isEl = language === 'el'

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[var(--surface)] rounded-3xl p-8 w-full max-w-md shadow-2xl border border-[var(--border-subtle)] animate-scaleIn">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--text)]">
            {isEl ? 'Αποθήκευση αναζήτησης' : 'Save this search'}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-[var(--text-muted)] mb-6">
          {type === 'filter'
            ? (isEl ? 'Θα λαμβάνεις ειδοποίηση όταν δημοσιευτεί νέα αγγελία που ταιριάζει με τα φίλτρα σου.' : 'You\'ll be notified when a new listing matching your filters is published.')
            : (isEl ? 'Θα λαμβάνεις ειδοποίηση όταν δημοσιευτεί νέα αγγελία με ομοιότητα ≥ το ποσοστό που ορίζεις.' : `You'll be notified when a new listing matches your AI search at or above the threshold you set.`)}
        </p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              {isEl ? 'Όνομα (προαιρετικό)' : 'Name (optional)'}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={isEl ? 'π.χ. 2άρι Αθήνα κέντρο' : 'e.g. 2-bed Athens centre'}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          {type === 'ai' && (
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                {isEl ? `Ελάχιστη ομοιότητα: ${minMatchPercent}%` : `Minimum match: ${minMatchPercent}%`}
              </label>
              <input
                type="range"
                min={30}
                max={95}
                step={5}
                value={minMatchPercent}
                onChange={e => setMinMatchPercent(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
              <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                <span>{isEl ? 'Πιο χαλαρό' : 'Broader'}</span>
                <span>{isEl ? 'Πιο αυστηρό' : 'Stricter'}</span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-[var(--status-error)]">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)]/40 transition-colors text-sm"
            >
              {isEl ? 'Ακύρωση' : 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-3 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-hover-bg)] transition-colors text-sm font-semibold disabled:opacity-50"
            >
              {saving ? (isEl ? 'Αποθήκευση...' : 'Saving...') : (isEl ? 'Αποθήκευση' : 'Save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
