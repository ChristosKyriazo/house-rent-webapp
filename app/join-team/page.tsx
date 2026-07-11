'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import type { InvitationDetails } from '@/types/team'

function JoinTeamInner() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token')
  const { language } = useLanguage()
  const { isSignedIn, isLoaded } = useUser()
  const isEl = language === 'el'

  const [details, setDetails] = useState<InvitationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch(`/api/team/invite/${token}`)
      .then((r) => r.json())
      .then((d) => setDetails(d))
      .finally(() => setLoading(false))
  }, [token])

  async function respond(action: 'accept' | 'decline') {
    if (!token) return
    setBusy(action)
    setError(null)
    try {
      const res = await fetch(`/api/team/invite/${token}/${action}`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || (isEl ? 'Κάτι πήγε στραβά.' : 'Something went wrong.'))
        return
      }
      router.push(action === 'accept' ? '/homes/my-listings' : '/')
    } finally {
      setBusy(null)
    }
  }

  if (loading || !isLoaded) {
    return <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center"><div className="h-40 w-full max-w-md mx-4 rounded-3xl bg-[var(--surface)] animate-pulse" /></div>
  }

  const invalid = !token || !details?.valid
  const agency = details?.agencyName || details?.inviterName || (isEl ? 'μια ομάδα' : 'a team')

  return (
    <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-8 text-center">
        <div className="text-5xl mb-4">🤝</div>

        {invalid ? (
          <>
            <h1 className="text-xl font-bold text-[var(--text)] mb-2">{isEl ? 'Μη έγκυρη πρόσκληση' : 'Invitation not valid'}</h1>
            <p className="text-[var(--text-muted)] mb-6">
              {details?.reason === 'expired'
                ? (isEl ? 'Αυτή η πρόσκληση έχει λήξει.' : 'This invitation has expired.')
                : details?.reason === 'already_decided'
                ? (isEl ? 'Αυτή η πρόσκληση έχει ήδη απαντηθεί.' : 'This invitation has already been answered.')
                : (isEl ? 'Δεν βρέθηκε αυτή η πρόσκληση.' : 'This invitation could not be found.')}
            </p>
            <Link href="/" className="inline-block px-6 py-3 rounded-2xl border border-[var(--border-subtle)] text-[var(--text)]">{isEl ? 'Αρχική' : 'Home'}</Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-[var(--text)] mb-2">{isEl ? 'Γίνετε μέλος ομάδας μεσιτών' : 'Join a broker team'}</h1>
            <p className="text-[var(--text-muted)] mb-5">
              <span className="font-semibold text-[var(--text)]">{agency}</span> {isEl ? 'σας προσκάλεσε στην ομάδα τους στο Kaparro.' : 'invited you to join their team on Kaparro.'}
            </p>

            <ul className="text-left text-sm text-[var(--text-muted)] space-y-2 mb-5">
              <li>✓ {isEl ? 'Αποκτάτε Pro χαρακτηριστικά, πληρωμένα από την ομάδα' : 'You get Pro features, paid by the team'}</li>
              <li>✓ {isEl ? 'Ο επικεφαλής βλέπει αγγελίες, ημερολόγιο & αξιολογήσεις σας' : 'The team lead sees your listings, calendar & ratings'}</li>
              <li>✓ {isEl ? 'Οι προωθήσεις χρειάζονται την έγκρισή του' : 'Boosts & paid promotions need their approval'}</li>
              <li className="text-amber-400">⚠ {isEl ? 'Το τρέχον πληρωμένο πλάνο σας θα ακυρωθεί' : 'Your current paid plan will be cancelled'}</li>
            </ul>

            {details?.reason === 'email_mismatch' && (
              <p className="text-xs text-amber-400 mb-4">
                {isEl ? 'Προσοχή: είστε συνδεδεμένος με διαφορετικό email από αυτό της πρόσκλησης.' : 'Note: you’re signed in with a different email than the invite was sent to.'}
              </p>
            )}
            {error && <p className="text-sm text-[var(--status-error)] mb-4">{error}</p>}

            {!isSignedIn ? (
              <div className="space-y-3">
                <Link
                  href={`/signup?invite=${token}`}
                  className="inline-block w-full px-6 py-3 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] font-semibold"
                >
                  {isEl ? 'Δημιουργία λογαριασμού μεσίτη' : 'Create your broker account'}
                </Link>
                <Link
                  href={`/login?redirect_url=${encodeURIComponent(`/join-team?token=${token}`)}`}
                  className="block text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                >
                  {isEl ? 'Έχετε ήδη λογαριασμό; Σύνδεση' : 'Already have an account? Sign in'}
                </Link>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => respond('decline')}
                  disabled={busy !== null}
                  className="flex-1 px-4 py-3 rounded-2xl border border-[var(--border-subtle)] text-[var(--text-muted)] disabled:opacity-50"
                >
                  {busy === 'decline' ? '…' : (isEl ? 'Απόρριψη' : 'Decline')}
                </button>
                <button
                  onClick={() => respond('accept')}
                  disabled={busy !== null}
                  className="flex-1 px-4 py-3 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] font-semibold disabled:opacity-50"
                >
                  {busy === 'accept' ? '…' : (isEl ? 'Αποδοχή & εγγραφή' : 'Accept & join')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function JoinTeamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--ink-soft)]" />}>
      <JoinTeamInner />
    </Suspense>
  )
}
