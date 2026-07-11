'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'
import type { AgencyOverviewResponse, TeamMember } from '@/types/team'

// Static Tailwind strings per color slot (0 = lead). No interpolation — Tailwind 4 purges dynamic classes.
const AGENT_COLORS = [
  { dot: 'bg-blue-500', text: 'text-blue-300', ring: 'border-blue-500/40' },
  { dot: 'bg-emerald-500', text: 'text-emerald-300', ring: 'border-emerald-500/40' },
  { dot: 'bg-violet-500', text: 'text-violet-300', ring: 'border-violet-500/40' },
  { dot: 'bg-amber-500', text: 'text-amber-300', ring: 'border-amber-500/40' },
  { dot: 'bg-rose-500', text: 'text-rose-300', ring: 'border-rose-500/40' },
  { dot: 'bg-cyan-500', text: 'text-cyan-300', ring: 'border-cyan-500/40' },
  { dot: 'bg-orange-500', text: 'text-orange-300', ring: 'border-orange-500/40' },
  { dot: 'bg-fuchsia-500', text: 'text-fuchsia-300', ring: 'border-fuchsia-500/40' },
  { dot: 'bg-teal-500', text: 'text-teal-300', ring: 'border-teal-500/40' },
  { dot: 'bg-yellow-500', text: 'text-yellow-300', ring: 'border-yellow-500/40' },
]
const colorFor = (slot: number) => AGENT_COLORS[slot % AGENT_COLORS.length]

export default function AgencyPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const isEl = language === 'el'

  const [data, setData] = useState<AgencyOverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/team/overview')
      if (res.status === 403) { setForbidden(true); return }
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function sendInvite() {
    setInviteBusy(true)
    setInviteError(null)
    setInviteLink(null)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), message: inviteMessage.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) {
        setInviteError(json.message || (isEl ? 'Η πρόσκληση απέτυχε.' : 'Invite failed.'))
        return
      }
      setInviteLink(json.inviteUrl)
      setInviteEmail('')
      setInviteMessage('')
      await load()
    } catch {
      setInviteError(isEl ? 'Η πρόσκληση απέτυχε.' : 'Invite failed.')
    } finally {
      setInviteBusy(false)
    }
  }

  async function revokeInvite(key: string) {
    await fetch(`/api/team/invitations/${key}`, { method: 'DELETE' })
    await load()
  }

  async function removeMember(id: number) {
    if (!confirm(isEl ? 'Αφαίρεση μέλους; Οι αγγελίες του θα μεταφερθούν σε εσάς.' : "Remove this broker? Their listings will transfer to you.")) return
    await fetch(`/api/team/members/${id}`, { method: 'DELETE' })
    await load()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 h-10 w-56 rounded-xl bg-[var(--surface)] animate-pulse" />
          <div className="h-40 rounded-2xl bg-[var(--surface)] animate-pulse" />
        </div>
      </div>
    )
  }

  if (forbidden || !data) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-5xl mb-4">🏢</div>
          <h1 className="text-2xl font-bold text-[var(--text)] mb-2">{isEl ? 'Δεν έχετε ομάδα ακόμα' : 'You don’t lead a team yet'}</h1>
          <p className="text-[var(--text-muted)] mb-6">
            {isEl
              ? 'Αναβαθμίστε σε Pro και προσκαλέστε μεσίτες για να χτίσετε την ομάδα σας.'
              : 'Upgrade to Pro and invite brokers to build your team.'}
          </p>
          <Link href="/upgrade" className="inline-block px-6 py-3 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] font-semibold">
            {isEl ? 'Αναβάθμιση σε Pro' : 'Upgrade to Pro'}
          </Link>
        </div>
      </div>
    )
  }

  const { summary, members, invitations } = data
  const kpis = [
    { label: isEl ? 'Αγγελίες' : 'Listings', value: summary.totalListings },
    { label: isEl ? 'Ενεργές προωθήσεις' : 'Active boosts', value: summary.activeBoosts },
    { label: isEl ? 'Ραντεβού (7 μέρες)' : 'Viewings (7d)', value: summary.viewingsThisWeek },
    { label: isEl ? 'Μ.Ο. αξιολόγησης' : 'Avg rating', value: summary.avgRating != null ? `${summary.avgRating}★` : '—' },
  ]

  return (
    <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-[var(--text)] mb-1">
              🏢 {summary.agencyName || (isEl ? 'Η Ομάδα μου' : 'My Team')}
            </h1>
            <p className="text-[var(--text-muted)]">
              {summary.memberCount} {isEl ? 'μέλη' : 'members'}
            </p>
          </div>
          <button
            onClick={() => { setInviteOpen(true); setInviteError(null); setInviteLink(null) }}
            className="shrink-0 px-5 py-3 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] font-semibold shadow-lg shadow-[var(--accent)]/15"
          >
            + {isEl ? 'Πρόσκληση μεσίτη' : 'Invite a broker'}
          </button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-5 text-center">
              <div className="text-2xl font-bold text-[var(--text)]">{k.value}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Members */}
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-3">{isEl ? 'Μέλη ομάδας' : 'Team members'}</h2>
        <div className="space-y-3 mb-8">
          {members.map((m: TeamMember) => {
            const c = colorFor(m.colorSlot)
            return (
              <div key={m.id} className={`rounded-2xl border ${c.ring} bg-[var(--surface)] px-5 py-4`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-3 h-3 rounded-full ${c.dot} shrink-0`} />
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--text)] truncate">
                        {m.name || m.email}
                        {m.isLead && <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">({isEl ? 'εσείς' : 'you'})</span>}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {m.listingCount} {isEl ? 'αγγελίες' : 'listings'} · {m.avgRating != null ? `${m.avgRating}★ (${m.ratingCount})` : (isEl ? 'χωρίς αξιολ.' : 'no ratings')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.pendingBoostRequests > 0 && (
                      <Link href="/homes/agency/requests" className="text-xs px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-semibold">
                        ● {m.pendingBoostRequests} {isEl ? 'αιτήματα' : 'requests'}
                      </Link>
                    )}
                    <button
                      onClick={() => router.push(`/homes/my-listings?agent=${m.id}`)}
                      className="text-xs px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    >
                      {isEl ? 'Αγγελίες' : 'Listings'}
                    </button>
                    {!m.isLead && (
                      <button
                        onClick={() => removeMember(m.id)}
                        className="text-xs px-3 py-1.5 rounded-xl border border-[var(--status-error)]/30 text-[var(--status-error)] hover:bg-[var(--status-error-bg)] transition-colors"
                      >
                        {isEl ? 'Αφαίρεση' : 'Remove'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-3">{isEl ? 'Εκκρεμείς προσκλήσεις' : 'Pending invitations'}</h2>
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div key={inv.key} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--text)] truncate">✉ {inv.inviteeEmail}</p>
                    <p className="text-xs text-[var(--text-muted)]">{isEl ? 'Λήγει' : 'Expires'} {new Date(inv.expiresAt).toLocaleDateString(isEl ? 'el-GR' : 'en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <button onClick={() => revokeInvite(inv.key)} className="text-xs px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--status-error)] transition-colors">
                    {isEl ? 'Ακύρωση' : 'Cancel'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setInviteOpen(false)}>
          <div className="w-full max-w-md rounded-3xl border border-[var(--border-subtle)] bg-[var(--ink-soft)] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--text)]">{isEl ? 'Πρόσκληση μεσίτη' : 'Invite a broker'}</h3>
              <button onClick={() => setInviteOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">✕</button>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {isEl
                ? 'Θα αποκτήσουν τα Pro χαρακτηριστικά σας και εσείς θα καλύπτετε τη συνδρομή τους.'
                : "They’ll get your Pro features, and you’ll cover their subscription."}
            </p>

            {inviteLink ? (
              <div className="space-y-3">
                <p className="text-sm text-emerald-400">{isEl ? '✓ Η πρόσκληση δημιουργήθηκε. Μοιραστείτε τον σύνδεσμο:' : '✓ Invite created. Share this link:'}</p>
                <div className="flex gap-2">
                  <input readOnly value={inviteLink} className="flex-1 min-w-0 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text)]" />
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                    className="px-3 py-2 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-xs font-semibold shrink-0"
                  >
                    {copied ? (isEl ? 'Αντιγράφηκε' : 'Copied') : (isEl ? 'Αντιγραφή' : 'Copy')}
                  </button>
                </div>
                <button onClick={() => setInviteOpen(false)} className="w-full mt-2 px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] text-sm">
                  {isEl ? 'Κλείσιμο' : 'Done'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={isEl ? 'email@παράδειγμα.gr' : 'email@example.com'}
                  className="w-full rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] px-3 py-2.5 text-sm text-[var(--text)]"
                />
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder={isEl ? 'Προαιρετικό μήνυμα' : 'Optional message'}
                  rows={2}
                  className="w-full rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] px-3 py-2.5 text-sm text-[var(--text)]"
                />
                {inviteError && <p className="text-sm text-[var(--status-error)]">{inviteError}</p>}
                <button
                  onClick={sendInvite}
                  disabled={inviteBusy || !inviteEmail.trim()}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] font-semibold disabled:opacity-50"
                >
                  {inviteBusy ? (isEl ? 'Αποστολή…' : 'Sending…') : (isEl ? 'Αποστολή πρόσκλησης →' : 'Send invite →')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
