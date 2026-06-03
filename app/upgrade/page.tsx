'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { useLanguage } from '@/app/contexts/LanguageContext'

type Tier = 'free' | 'plus' | 'pro'

const FEATURE_GROUPS: {
  labelEn: string; labelEl: string;
  items: { en: string; el: string; tiers: Tier[] }[]
}[] = [
  {
    labelEn: 'Listings', labelEl: 'Αγγελίες',
    items: [
      { en: 'Up to 3 listings', el: 'Έως 3 αγγελίες', tiers: ['free'] },
      { en: 'Unlimited listings', el: 'Απεριόριστες αγγελίες', tiers: ['plus', 'pro'] },
      { en: 'Bulk upload via Excel + AI descriptions', el: 'Μαζική ανάρτηση + AI περιγραφές', tiers: ['plus', 'pro'] },
      { en: '2 always-on promotion slots', el: '2 θέσεις προβολής (πάντα ενεργές)', tiers: ['plus'] },
      { en: '5 always-on slots — ranked above Plus', el: '5 θέσεις προβολής — πάνω από Plus', tiers: ['pro'] },
      { en: 'Pay-per-boost: €4.99 / 30 days (extra listings)', el: 'Boost €4.99 / 30 μέρες (επιπλέον αγγελίες)', tiers: ['plus', 'pro'] },
    ],
  },
  {
    labelEn: 'Inquiries & bookings', labelEl: 'Αιτήματα & κρατήσεις',
    items: [
      { en: 'Inquiry management', el: 'Διαχείριση αιτημάτων', tiers: ['free', 'plus', 'pro'] },
      { en: 'Booking & calendar', el: 'Κρατήσεις & ημερολόγιο', tiers: ['free', 'plus', 'pro'] },
      { en: 'Cal.com booking sync', el: 'Συγχρονισμός Cal.com', tiers: ['plus', 'pro'] },
      { en: 'Lead quality signals', el: 'Δείκτες ποιότητας ενδιαφερόμενων', tiers: ['pro'] },
    ],
  },
  {
    labelEn: 'Analytics & insights', labelEl: 'Στατιστικά',
    items: [
      { en: 'In-app notifications', el: 'Ειδοποιήσεις εντός εφαρμογής', tiers: ['free', 'plus', 'pro'] },
      { en: 'Viber / SMS push alerts', el: 'Ειδοποιήσεις Viber / SMS', tiers: ['plus', 'pro'] },
      { en: 'Per-listing analytics', el: 'Στατιστικά ανά αγγελία', tiers: ['plus', 'pro'] },
      { en: 'Portfolio-wide analytics', el: 'Στατιστικά χαρτοφυλακίου', tiers: ['pro'] },
      { en: 'CSV export', el: 'Εξαγωγή CSV', tiers: ['pro'] },
    ],
  },
  {
    labelEn: 'Trust & branding', labelEl: 'Αξιοπιστία',
    items: [
      { en: 'Verified badge eligibility', el: 'Δυνατότητα Verified badge', tiers: ['plus', 'pro'] },
      { en: 'Agency branding on listings', el: 'Branding γραφείου σε αγγελίες', tiers: ['pro'] },
    ],
  },
]

const TIERS: { id: Tier; priceEn: string; priceEl: string; labelEn: string; labelEl: string }[] = [
  { id: 'pro',  priceEn: '€39.99/month', priceEl: '€39.99/μήνα', labelEn: 'Pro',  labelEl: 'Pro'  },
  { id: 'plus', priceEn: '€19.99/month', priceEl: '€19.99/μήνα', labelEn: 'Plus', labelEl: 'Plus' },
  { id: 'free', priceEn: 'Free',         priceEl: 'Δωρεάν',       labelEn: 'Free', labelEl: 'Βασικό' },
]

function hasTierFeature(tierId: Tier, tiers: Tier[]): boolean {
  return tiers.includes(tierId)
}

function UpgradePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const isEl = language === 'el'
  const fromParam = searchParams.get('from')

  const [currentTier, setCurrentTier] = useState<Tier>('free')
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<Tier | null>(null)
  const [justUpgraded, setJustUpgraded] = useState<Tier | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => { setCurrentTier((d.user?.subscriptionTier ?? 'free') as Tier) })
      .finally(() => setLoading(false))
  }, [])

  async function selectTier(tier: Tier) {
    if (tier === currentTier || upgrading) return
    setUpgrading(tier)
    setError('')
    try {
      const res = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      if (!res.ok) { setError(isEl ? 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.' : 'Something went wrong. Try again.'); return }
      setCurrentTier(tier)
      setJustUpgraded(tier)
      setTimeout(() => {
        setJustUpgraded(null)
        if (fromParam) router.push(fromParam.startsWith('/') ? fromParam : `/${fromParam}`)
        else router.refresh()
      }, 2000)
    } catch {
      setError(isEl ? 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.' : 'Something went wrong. Try again.')
    } finally {
      setUpgrading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] py-16 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Back link */}
        <div className="mb-10">
          <Link href="/profile" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
            ← {isEl ? 'Προφίλ' : 'Profile'}
          </Link>
        </div>

        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-[var(--text)] mb-3 font-[var(--font-fraunces)]">
            {isEl ? 'Επιλέξτε το πλάνο σας' : 'Choose your plan'}
          </h1>
          <p className="text-[var(--text-muted)] max-w-md mx-auto">
            {isEl
              ? 'Αναβαθμίστε για να αποκτήσετε εργαλεία που κάνουν τη διαχείριση ακινήτων πιο αποτελεσματική.'
              : 'Upgrade to unlock tools that make property management more effective.'}
          </p>
        </div>

        {/* Test mode notice */}
        <div className="max-w-lg mx-auto mb-10 flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-500/8 border border-amber-500/20">
          <span className="text-amber-400 text-lg shrink-0">⚗️</span>
          <p className="text-sm text-amber-300/80 font-[var(--font-outfit)]">
            {isEl
              ? 'Δοκιμαστική λειτουργία — η κάρτα σας δεν θα χρεωθεί.'
              : 'Test mode — your card won\'t be charged.'}
          </p>
        </div>

        {loading ? (
          <div className="text-center text-[var(--text-muted)] py-12">{isEl ? 'Φόρτωση...' : 'Loading...'}</div>
        ) : (
          <>
            {/* Tier cards — Pro first (anchors high), Plus elevated (the pick), Free last */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-start">
              {TIERS.map((tier) => {
                const isCurrent = tier.id === currentTier
                const isUpgrading = upgrading === tier.id
                const didJustUpgrade = justUpgraded === tier.id
                const isPlus = tier.id === 'plus'
                const isPro = tier.id === 'pro'
                const isFree = tier.id === 'free'

                return (
                  <div
                    key={tier.id}
                    className={[
                      'relative rounded-3xl border p-6 transition-all duration-300 flex flex-col',
                      isCurrent ? 'order-first md:order-none' : '',
                      isPlus
                        ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/20 to-[var(--surface)] md:scale-[1.03] md:z-10 shadow-[0_0_0_1px_rgba(251,191,36,0.15),0_8px_32px_rgba(251,191,36,0.08)]'
                        : isPro
                          ? 'border-stone-400/20 bg-gradient-to-b from-stone-800/30 to-[var(--surface)]'
                          : 'border-[var(--border-subtle)] bg-[var(--surface)]',
                    ].join(' ')}
                  >
                    {/* Most popular badge */}
                    {isPlus && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                        <span className="px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-amber-500 text-stone-950 font-[var(--font-outfit)]">
                          {isEl ? 'Πιο δημοφιλές' : 'Most popular'}
                        </span>
                      </div>
                    )}

                    {/* Current plan indicator */}
                    {isCurrent && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-[var(--ink-soft)] text-[var(--text-muted)] border border-[var(--border-subtle)] font-[var(--font-outfit)]">
                          {isEl ? 'Τρέχον πλάνο' : 'Current plan'}
                        </span>
                      </div>
                    )}

                    <div className="mt-4 mb-6">
                      <h2 className="text-xl font-bold text-[var(--text)] mb-1 font-[var(--font-fraunces)]">
                        {isEl ? tier.labelEl : tier.labelEn}
                      </h2>
                      <p className={`text-2xl font-bold ${isPlus ? 'text-amber-400' : 'text-[var(--text)]'}`}>
                        {isEl ? tier.priceEl : tier.priceEn}
                      </p>
                    </div>

                    {/* What you unlock highlight (Plus/Pro only) */}
                    {(isPlus || isPro) && (
                      <div className="mb-5 rounded-xl bg-amber-500/8 border border-amber-500/15 px-4 py-3">
                        <p className="text-xs text-amber-400/70 uppercase tracking-widest font-[var(--font-outfit)] mb-1.5">
                          {isEl ? 'Ξεκλειδώνετε' : 'You unlock'}
                        </p>
                        <p className="text-sm text-[var(--text)]">
                          {isPlus
                            ? (isEl ? 'Απεριόριστες αγγελίες, 2 θέσεις προβολής, analytics, Viber ειδοποιήσεις' : 'Unlimited listings, 2 promotion slots, analytics, Viber alerts')
                            : (isEl ? 'Όλα τα Plus + 5 θέσεις πάνω από Plus, portfolio analytics, branding' : 'Everything in Plus + 5 slots ranked above Plus, portfolio analytics, branding')}
                        </p>
                      </div>
                    )}

                    {/* Feature groups */}
                    <div className="flex-1 space-y-4 mb-8">
                      {FEATURE_GROUPS.map((group, gi) => {
                        const groupItems = group.items.filter(f => hasTierFeature(tier.id, f.tiers) || !hasTierFeature(tier.id, f.tiers))
                        if (groupItems.length === 0) return null
                        return (
                          <div key={gi}>
                            {gi > 0 && <div className="border-t border-[var(--border-subtle)] mb-3" />}
                            <ul className="space-y-1.5">
                              {groupItems.map((f, fi) => {
                                const included = hasTierFeature(tier.id, f.tiers)
                                return (
                                  <li key={fi} className={`flex items-start gap-2 text-sm ${included ? 'text-[var(--text-muted)]' : 'text-[var(--text-muted)]/30'}`}>
                                    <span className={`shrink-0 mt-0.5 text-xs ${included ? (isPlus ? 'text-amber-500/70' : isPro ? 'text-stone-400' : 'text-[var(--text-muted)]/60') : ''}`}>
                                      {included ? '●' : '—'}
                                    </span>
                                    <span>{isEl ? f.el : f.en}</span>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )
                      })}
                    </div>

                    {/* CTA button */}
                    <button
                      onClick={() => selectTier(tier.id)}
                      disabled={isCurrent || !!upgrading}
                      className={[
                        'group relative w-full py-4 rounded-2xl font-bold text-sm transition-all duration-300 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed',
                        !isCurrent && !didJustUpgrade ? 'hover:scale-[1.02] active:scale-[0.98]' : '',
                        didJustUpgrade
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : isCurrent
                            ? 'bg-[var(--ink-soft)] text-[var(--text-muted)] cursor-default border border-[var(--border-subtle)]'
                            : isPlus
                              ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-[0_4px_24px_rgba(245,158,11,0.4)] hover:shadow-[0_4px_32px_rgba(245,158,11,0.6)]'
                              : isPro
                                ? 'bg-stone-700 hover:bg-stone-600 text-stone-100 border border-stone-500/40 shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
                                : 'bg-[var(--ink-soft)] text-[var(--text)] hover:bg-[var(--canvas-mid)] border border-[var(--border-subtle)]',
                      ].join(' ')}
                    >
                      {/* shimmer on Plus */}
                      {isPlus && !isCurrent && (
                        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      )}
                      {didJustUpgrade
                        ? `✓ ${isEl ? 'Ενεργοποιήθηκε' : 'Activated'}`
                        : isUpgrading
                          ? (isEl ? 'Εφαρμογή...' : 'Applying...')
                          : isCurrent
                            ? (isEl ? 'Τρέχον πλάνο' : 'Current plan')
                            : isFree
                              ? (isEl ? 'Υποβάθμιση σε Δωρεάν' : 'Downgrade to Free')
                              : isEl
                                ? `Αναβάθμιση σε ${tier.labelEl}`
                                : `Upgrade to ${tier.labelEn}`}
                    </button>
                  </div>
                )
              })}
            </div>

            {error && <p className="text-center text-[var(--status-error)] text-sm mb-6">{error}</p>}

            <p className="text-center text-xs text-[var(--text-muted)]">
              {isEl
                ? 'Χωρίς δέσμευση · Ακυρώστε οποτεδήποτε · Χρέωση μέσω Stripe (σύντομα)'
                : 'No commitment · Cancel anytime · Billed via Stripe (coming soon)'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function UpgradePage() {
  return (
    <Suspense>
      <UpgradePageInner />
    </Suspense>
  )
}
