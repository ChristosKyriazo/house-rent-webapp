'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'

type Tier = 'free' | 'plus' | 'pro'

const TIERS: { id: Tier; priceEl: string; priceEn: string; labelEl: string; labelEn: string }[] = [
  { id: 'free', priceEl: 'Δωρεάν', priceEn: 'Free', labelEl: 'Βασικό', labelEn: 'Basic' },
  { id: 'plus', priceEl: '€19.99/μήνα', priceEn: '€19.99/month', labelEl: 'Plus', labelEn: 'Plus' },
  { id: 'pro', priceEl: '€39.99/μήνα', priceEn: '€39.99/month', labelEl: 'Pro', labelEn: 'Pro' },
]

const FEATURES: { el: string; en: string; tiers: Tier[] }[] = [
  { en: 'Up to 3 listings', el: 'Έως 3 αγγελίες', tiers: ['free', 'plus', 'pro'] },
  { en: 'Inquiry management', el: 'Διαχείριση αιτημάτων', tiers: ['free', 'plus', 'pro'] },
  { en: 'Booking & calendar', el: 'Κρατήσεις & ημερολόγιο', tiers: ['free', 'plus', 'pro'] },
  { en: 'In-app notifications', el: 'Ειδοποιήσεις εντός εφαρμογής', tiers: ['free', 'plus', 'pro'] },
  { en: 'Unlimited listings', el: 'Απεριόριστες αγγελίες', tiers: ['plus', 'pro'] },
  { en: 'Bulk upload via Excel', el: 'Μαζική ανάρτηση μέσω Excel', tiers: ['plus', 'pro'] },
  { en: 'Cal.com booking sync', el: 'Συγχρονισμός Cal.com', tiers: ['plus', 'pro'] },
  { en: 'Per-listing analytics', el: 'Στατιστικά ανά αγγελία', tiers: ['plus', 'pro'] },
  { en: 'Viber / SMS push alerts', el: 'Ειδοποιήσεις Viber / SMS', tiers: ['plus', 'pro'] },
  { en: 'Verified badge eligibility', el: 'Δυνατότητα Verified badge', tiers: ['plus', 'pro'] },
  { en: 'Standard listing promotion', el: 'Τυπική προώθηση αγγελίας', tiers: ['plus', 'pro'] },
  { en: 'Premium listing placement', el: 'Premium τοποθέτηση αγγελίας', tiers: ['pro'] },
  { en: 'Portfolio-wide analytics', el: 'Στατιστικά συνολικού χαρτοφυλακίου', tiers: ['pro'] },
  { en: 'Lead quality signals', el: 'Δείκτες ποιότητας ενδιαφερόμενων', tiers: ['pro'] },
  { en: 'CSV export', el: 'Εξαγωγή CSV', tiers: ['pro'] },
  { en: 'Agency branding on listings', el: 'Branding γραφείου σε αγγελίες', tiers: ['pro'] },
]

export default function UpgradePage() {
  const router = useRouter()
  const { language } = useLanguage()
  const isEl = language === 'el'

  const [currentTier, setCurrentTier] = useState<Tier>('free')
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<Tier | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        setCurrentTier((d.user?.subscriptionTier ?? 'free') as Tier)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function selectTier(tier: Tier) {
    if (tier === currentTier) return
    setUpgrading(tier)
    setError('')
    try {
      const res = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      if (!res.ok) {
        setError(isEl ? 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.' : 'Something went wrong. Please try again.')
        return
      }
      setCurrentTier(tier)
      router.refresh()
    } catch {
      setError(isEl ? 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.' : 'Something went wrong. Please try again.')
    } finally {
      setUpgrading(null)
    }
  }

  const tierColor: Record<Tier, string> = {
    free: 'border-[var(--border-subtle)]',
    plus: 'border-indigo-500/50',
    pro: 'border-amber-500/50',
  }

  const tierBadge: Record<Tier, string> = {
    free: 'bg-[var(--ink-soft)] text-[var(--text-muted)]',
    plus: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
    pro: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] py-16 px-4">
      <div className="max-w-5xl mx-auto">

        <div className="mb-10">
          <Link href="/profile" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
            ← {isEl ? 'Προφίλ' : 'Profile'}
          </Link>
        </div>

        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-[var(--text)] mb-3">
            {isEl ? 'Επιλέξτε το πλάνο σας' : 'Choose your plan'}
          </h1>
          <p className="text-[var(--text-muted)] max-w-xl mx-auto">
            {isEl
              ? 'Αναβαθμίστε για να ξεκλειδώσετε εργαλεία που σας βοηθούν να διαχειρίζεστε αγγελίες πιο αποτελεσματικά.'
              : 'Upgrade to unlock tools that help you manage listings more effectively.'}
          </p>
          {/* Testing notice — remove when Stripe is live */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--status-info-bg,#1e3a5f)]/30 border border-blue-500/20 text-xs text-blue-400">
            <span>⚙️</span>
            <span>{isEl ? 'Δοκιμαστική λειτουργία — η επιλογή πλάνου εφαρμόζεται αμέσως χωρίς χρέωση.' : 'Test mode — plan selection applies immediately with no charge.'}</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-[var(--text-muted)]">{isEl ? 'Φόρτωση...' : 'Loading...'}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {TIERS.map(tier => {
                const isCurrent = tier.id === currentTier
                const isUpgrading = upgrading === tier.id

                return (
                  <div
                    key={tier.id}
                    className={`relative bg-[var(--surface)] rounded-3xl p-6 border-2 transition-all ${
                      isCurrent
                        ? tierColor[tier.id] + ' shadow-lg'
                        : 'border-[var(--border-subtle)] opacity-80 hover:opacity-100'
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className={`px-3 py-0.5 rounded-full text-xs font-semibold ${tierBadge[tier.id]}`}>
                          {isEl ? 'Τρέχον πλάνο' : 'Current plan'}
                        </span>
                      </div>
                    )}

                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-[var(--text)] mb-1">
                        {isEl ? tier.labelEl : tier.labelEn}
                      </h2>
                      <p className="text-2xl font-bold text-[var(--text)]">
                        {isEl ? tier.priceEl : tier.priceEn}
                      </p>
                    </div>

                    <ul className="space-y-2 mb-8">
                      {FEATURES.filter(f => f.tiers.includes(tier.id)).map(f => (
                        <li key={f.en} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                          <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                          <span>{isEl ? f.el : f.en}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => selectTier(tier.id)}
                      disabled={isCurrent || isUpgrading !== null}
                      className={`w-full py-3 rounded-2xl font-semibold text-sm transition-all ${
                        isCurrent
                          ? 'bg-[var(--ink-soft)] text-[var(--text-muted)] cursor-default'
                          : tier.id === 'pro'
                            ? 'bg-amber-500 hover:bg-amber-400 text-black'
                            : tier.id === 'plus'
                              ? 'bg-indigo-500 hover:bg-indigo-400 text-white'
                              : 'bg-[var(--ink-soft)] text-[var(--text)] hover:bg-[var(--canvas-mid)]'
                      } disabled:opacity-50`}
                    >
                      {isUpgrading
                        ? (isEl ? 'Εφαρμογή...' : 'Applying...')
                        : isCurrent
                          ? (isEl ? 'Τρέχον πλάνο' : 'Current plan')
                          : tier.id === 'free'
                            ? (isEl ? 'Υποβάθμιση σε Δωρεάν' : 'Downgrade to Free')
                            : isEl
                              ? `Αναβάθμιση σε ${tier.labelEl}`
                              : `Upgrade to ${tier.labelEn}`}
                    </button>
                  </div>
                )
              })}
            </div>

            {error && (
              <p className="text-center text-[var(--status-error)] text-sm mb-6">{error}</p>
            )}

            {currentTier !== 'free' && (
              <p className="text-center text-xs text-[var(--text-muted)]">
                {isEl
                  ? 'Η χρέωση και η διαχείριση συνδρομών θα γίνεται μέσω Stripe (σύντομα).'
                  : 'Billing and subscription management will be handled via Stripe (coming soon).'}
              </p>
            )}
          </>
        )}

      </div>
    </div>
  )
}
