'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLanguage } from '@/app/contexts/LanguageContext'
import type { BoostRequestView } from '@/types/team'

type Filter = 'pending' | 'approved' | 'rejected' | 'all'

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
  approved: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
  paid: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
  rejected: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
  expired: 'bg-[var(--surface)] border-[var(--border-subtle)] text-[var(--text-muted)]',
}

export default function BoostRequestsPage() {
  const { isEl } = useLanguage()

  const [requests, setRequests] = useState<BoostRequestView[]>([])
  const [viewerRole, setViewerRole] = useState<'parent' | 'child'>('child')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('pending')
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/team/boost-requests')
      if (res.ok) {
        const json = await res.json()
        setRequests(json.requests)
        setViewerRole(json.viewerRole)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function approve(key: string) {
    setBusyKey(key)
    try {
      const res = await fetch(`/api/team/boost-requests/${key}/approve`, { method: 'POST' })
      const json = await res.json()
      if (res.ok && json.checkoutUrl) { window.location.href = json.checkoutUrl; return }
    } finally {
      setBusyKey(null)
    }
  }

  async function decline(key: string) {
    const reason = prompt(isEl ? 'Λόγος απόρριψης (προαιρετικό):' : 'Reason for declining (optional):') ?? undefined
    setBusyKey(key)
    try {
      await fetch(`/api/team/boost-requests/${key}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      await load()
    } finally {
      setBusyKey(null)
    }
  }

  const statusForFilter = (s: string) => (filter === 'approved' ? s === 'approved' || s === 'paid' : s === filter)
  const filtered = requests.filter((r) => filter === 'all' || statusForFilter(r.status))
  const pendingCount = requests.filter((r) => r.status === 'pending').length

  const filters: { id: Filter; label: string }[] = [
    { id: 'pending', label: `${isEl ? 'Εκκρεμή' : 'Pending'}${pendingCount ? ` (${pendingCount})` : ''}` },
    { id: 'approved', label: isEl ? 'Εγκεκριμένα' : 'Approved' },
    { id: 'rejected', label: isEl ? 'Απορριφθέντα' : 'Rejected' },
    { id: 'all', label: isEl ? 'Όλα' : 'All' },
  ]

  return (
    <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-4xl font-bold text-[var(--text)] mb-1">
          {viewerRole === 'parent' ? (isEl ? 'Αιτήματα προώθησης' : 'Boost requests') : (isEl ? 'Τα αιτήματά μου' : 'My requests')}
        </h1>
        <p className="text-[var(--text-muted)] mb-6">
          {viewerRole === 'parent'
            ? (isEl ? 'Εγκρίνετε και πληρώστε ή απορρίψτε αιτήματα από την ομάδα σας.' : 'Approve & pay or decline requests from your team.')
            : (isEl ? 'Αιτήματα προώθησης προς τον επικεφαλής της ομάδας σας.' : 'Boost requests you sent to your team lead.')}
        </p>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filter === f.id
                  ? 'bg-[var(--accent)] text-[var(--ink)]'
                  : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border-subtle)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="h-24 rounded-2xl bg-[var(--surface)] animate-pulse" />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <div className="text-4xl mb-3">📭</div>
            {isEl ? 'Κανένα αίτημα εδώ.' : 'No requests here.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              return (
                <div key={r.key} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--text)] truncate">{r.home.title}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {viewerRole === 'parent' && <>{r.requester.name || (isEl ? 'Μέλος' : 'Member')} · </>}
                        {isEl ? 'Προώθηση' : 'Boost'} · {r.days} {isEl ? 'μέρες' : 'days'} · €{(r.amountCents / 100).toFixed(2)}
                        {r.proactive && <> · {isEl ? 'από εσάς' : 'by you'}</>}
                      </p>
                      {r.note && <p className="text-sm text-[var(--text-muted)] mt-2 italic">“{r.note}”</p>}
                      {r.decisionNote && <p className="text-sm text-rose-300/80 mt-2">{isEl ? 'Λόγος:' : 'Reason:'} {r.decisionNote}</p>}
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-lg border shrink-0 ${statusStyles[r.status] ?? statusStyles.expired}`}>
                      {isEl
                        ? ({ pending: 'Εκκρεμεί', approved: 'Εγκρίθηκε', paid: 'Πληρώθηκε', rejected: 'Απορρίφθηκε', expired: 'Έληξε' } as Record<string, string>)[r.status] ?? r.status
                        : ({ pending: 'Pending', approved: 'Approved', paid: 'Paid', rejected: 'Rejected', expired: 'Expired' } as Record<string, string>)[r.status] ?? r.status}
                    </span>
                  </div>

                  {viewerRole === 'parent' && r.status === 'pending' && (
                    <div className="flex gap-2 mt-4 justify-end">
                      <button
                        onClick={() => decline(r.key)}
                        disabled={busyKey === r.key}
                        className="text-sm px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--status-error)] transition-colors disabled:opacity-50"
                      >
                        {isEl ? 'Απόρριψη' : 'Decline'}
                      </button>
                      <button
                        onClick={() => approve(r.key)}
                        disabled={busyKey === r.key}
                        className="text-sm px-4 py-2 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] font-semibold disabled:opacity-50"
                      >
                        {busyKey === r.key ? '…' : `${isEl ? 'Έγκριση & πληρωμή' : 'Approve & pay'} €${(r.amountCents / 100).toFixed(2)}`}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
