'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { useLanguage } from '@/app/contexts/LanguageContext'

type Tier = 'free' | 'plus' | 'pro'

const TIER_RANK: Record<Tier, number> = { free: 0, plus: 1, pro: 2 }

// Only show features INCLUDED in each tier — no grayed-out items
const FEATURE_GROUPS: {
  labelEn: string; labelEl: string;
  items: { en: string; el: string; tiers: Tier[] }[]
}[] = [
  {
    labelEn: 'Listings', labelEl: 'Αγγελίες',
    items: [
      { en: '1 listing', el: '1 αγγελία', tiers: ['free'] },
      { en: '10 listings', el: '10 αγγελίες', tiers: ['plus'] },
      { en: 'Unlimited listings', el: 'Απεριόριστες αγγελίες', tiers: ['pro'] },
      { en: 'Bulk upload via Excel + AI descriptions', el: 'Μαζική ανάρτηση + AI περιγραφές', tiers: ['plus', 'pro'] },
    ],
  },
  {
    labelEn: 'Promotions', labelEl: 'Προβολές',
    items: [
      { en: '2 × 7-day promotion slots', el: '2 × 7ήμερες θέσεις προβολής', tiers: ['plus'] },
      { en: '5 × 30-day premium slots', el: '5 × 30ήμερες premium θέσεις', tiers: ['pro'] },
      { en: 'Buy more: €1.99 / 7 days  ·  €4.99 / 30 days', el: 'Αγορά: €1.99 / 7 μέρες  ·  €4.99 / 30 μέρες', tiers: ['plus', 'pro'] },
    ],
  },
  {
    labelEn: 'Inquiries & bookings', labelEl: 'Αιτήματα & κρατήσεις',
    items: [
      { en: 'Inquiry management', el: 'Διαχείριση αιτημάτων', tiers: ['free', 'plus', 'pro'] },
      { en: 'Booking & calendar', el: 'Κρατήσεις & ημερολόγιο', tiers: ['free', 'plus', 'pro'] },
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
  { id: 'pro',  priceEn: '€39.99 / month', priceEl: '€39.99 / μήνα', labelEn: 'Pro',     labelEl: 'Pro'     },
  { id: 'plus', priceEn: '€19.99 / month', priceEl: '€19.99 / μήνα', labelEn: 'Plus',    labelEl: 'Plus'    },
  { id: 'free', priceEn: '€0 / month',     priceEl: '€0 / μήνα',     labelEn: 'Free',    labelEl: 'Βασικό'  },
]

function UpgradePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const isEl = language === 'el'
  const fromParam = searchParams.get('from')

  const [currentTier, setCurrentTier] = useState<Tier>('free')
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<Tier | null>(null)
  const [justChanged, setJustChanged] = useState<Tier | null>(null)
  const [lastChangeWasDowngrade, setLastChangeWasDowngrade] = useState(false)
  const [confirmingDowngrade, setConfirmingDowngrade] = useState<Tier | null>(null)
  const [downgradeResult, setDowngradeResult] = useState<{ slotsRevoked: number; listingsOverLimit: number } | null>(null)
  const [error, setError] = useState('')

  // Listing-selection modal (shown when downgrade would exceed tier limit)
  type SelectionListing = { key: string; title: string | null; titleGreek?: string | null; city: string; pricePerMonth: number; inquiryCount: number }
  const [selectionModal, setSelectionModal] = useState<{
    pendingTier: Tier
    listings: SelectionListing[]
    newLimit: number
    excess: number
    keepKeys: string[]
  } | null>(null)

  // success=true  → returned from Stripe after payment
  // canceled=true → user closed Stripe checkout
  const returnStatus = searchParams.get('success') === 'true'
    ? 'success'
    : searchParams.get('canceled') === 'true'
      ? 'canceled'
      : null
  const returnedTier = (searchParams.get('tier') ?? null) as Tier | null

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => { setCurrentTier((d.user?.subscriptionTier ?? 'free') as Tier) })
      .finally(() => setLoading(false))
  }, [])

  // Re-fetch tier after returning from Stripe so the UI reflects the webhook update
  useEffect(() => {
    if (returnStatus !== 'success') return
    const poll = setInterval(() => {
      fetch('/api/profile')
        .then(r => r.json())
        .then(d => {
          const tier = (d.user?.subscriptionTier ?? 'free') as Tier
          setCurrentTier(tier)
          if (returnedTier && tier === returnedTier) clearInterval(poll)
        })
        .catch(() => {})
    }, 2000)
    const timeout = setTimeout(() => clearInterval(poll), 30000)
    return () => { clearInterval(poll); clearTimeout(timeout) }
  }, [returnStatus, returnedTier])

  async function applyTier(tier: Tier, keepKeys?: string[]) {
    setUpgrading(tier)
    setError('')
    setDowngradeResult(null)
    const isDowngrade = TIER_RANK[tier] < TIER_RANK[currentTier]
    try {
      const body: Record<string, unknown> = { tier }
      if (keepKeys) body.keepKeys = keepKeys
      const res = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { setError(isEl ? 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.' : 'Something went wrong. Try again.'); return }
      const data = await res.json()

      // Upgrade → redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }

      // API wants the user to select which listings to keep
      if (data.needsSelection) {
        // Pre-select the most-engaged listings up to the new limit
        const sorted = [...data.listings].sort((a, b) => (b.inquiryCount ?? 0) - (a.inquiryCount ?? 0))
        const preSelected = sorted.slice(0, data.newLimit).map((l: { key: string }) => l.key)
        setSelectionModal({
          pendingTier: tier,
          listings: data.listings,
          newLimit: data.newLimit,
          excess: data.excess,
          keepKeys: preSelected,
        })
        return
      }

      // Downgrade applied
      setSelectionModal(null)
      setCurrentTier(tier)
      setJustChanged(tier)
      setLastChangeWasDowngrade(isDowngrade)
      setConfirmingDowngrade(null)
      if (isDowngrade && (data.slotsRevoked > 0 || data.listingsHidden > 0)) {
        setDowngradeResult({ slotsRevoked: data.slotsRevoked, listingsOverLimit: data.listingsHidden })
      }
      setTimeout(() => {
        setJustChanged(null)
        if (!isDowngrade && fromParam) {
          const FEATURE_ROUTES: Record<string, string> = {
            'bulk-upload': '/homes/new',
            'analytics': '/homes/my-listings',
            'promote': '/homes/my-listings',
            'csv-export': '/profile',
            'portfolio-analytics': '/profile',
          }
          const dest = fromParam.startsWith('/') ? fromParam : (FEATURE_ROUTES[fromParam] ?? '/profile')
          router.push(dest)
        } else {
          router.refresh()
        }
      }, 2000)
    } catch {
      setError(isEl ? 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.' : 'Something went wrong. Try again.')
    } finally {
      setUpgrading(null)
    }
  }

  function selectTier(tier: Tier) {
    if (tier === currentTier || upgrading) return
    applyTier(tier)
  }

  function handleCardClick(tierId: Tier) {
    if (tierId === currentTier || upgrading) return
    const isDowngrade = TIER_RANK[tierId] < TIER_RANK[currentTier]
    if (isDowngrade && confirmingDowngrade !== tierId) {
      setConfirmingDowngrade(tierId)
      return
    }
    selectTier(tierId)
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] pt-20 pb-16 px-4">
      <div className="max-w-5xl mx-auto">

        <div className="mb-10">
          <Link href="/profile" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
            ← {isEl ? 'Προφίλ' : 'Profile'}
          </Link>
        </div>

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

        <div className="max-w-lg mx-auto mb-10 flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-500/8 border border-amber-500/20">
          <span className="text-amber-400 text-lg shrink-0">⚗️</span>
          <p className="text-sm text-amber-300/80 font-[var(--font-outfit)]">
            {isEl ? 'Δοκιμαστική λειτουργία — η κάρτα σας δεν θα χρεωθεί.' : "Test mode — your card won't be charged."}
          </p>
        </div>

        {returnStatus === 'success' && (
          <div className="max-w-lg mx-auto mb-8 flex items-center gap-3 px-5 py-4 rounded-2xl bg-green-500/10 border border-green-500/30">
            <span className="text-green-400 text-lg shrink-0">✓</span>
            <p className="text-sm text-green-300 font-[var(--font-outfit)]">
              {isEl
                ? `Η αναβάθμισή σας σε ${returnedTier ?? 'Plus'} ολοκληρώθηκε!`
                : `Your upgrade to ${returnedTier ?? 'Plus'} is complete!`}
            </p>
          </div>
        )}

        {returnStatus === 'canceled' && (
          <div className="max-w-lg mx-auto mb-8 flex items-center gap-3 px-5 py-4 rounded-2xl bg-stone-500/10 border border-stone-500/20">
            <span className="text-stone-400 text-lg shrink-0">✕</span>
            <p className="text-sm text-stone-400 font-[var(--font-outfit)]">
              {isEl ? 'Η πληρωμή ακυρώθηκε. Μπορείτε να δοκιμάσετε ξανά οποτεδήποτε.' : 'Payment canceled. You can try again any time.'}
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center text-[var(--text-muted)] py-12">{isEl ? 'Φόρτωση...' : 'Loading...'}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-start">
              {TIERS.map((tier) => {
                const isCurrent = tier.id === currentTier
                const isUpgrading = upgrading === tier.id
                const didJustChange = justChanged === tier.id
                const isPlus = tier.id === 'plus'
                const isPro = tier.id === 'pro'
                const isFree = tier.id === 'free'
                const isDowngrade = TIER_RANK[tier.id] < TIER_RANK[currentTier]
                const isConfirming = confirmingDowngrade === tier.id

                // Only show features included in this tier
                const visibleGroups = FEATURE_GROUPS
                  .map(group => ({
                    ...group,
                    items: group.items.filter(f => f.tiers.includes(tier.id)),
                  }))
                  .filter(group => group.items.length > 0)

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
                    {isPlus && !isCurrent && (
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

                    {/* Current plan badge */}
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

                    {/* Unlock highlight (Plus / Pro only) */}
                    {(isPlus || isPro) && (
                      <div className="mb-5 rounded-xl bg-amber-500/8 border border-amber-500/15 px-4 py-3">
                        <p className="text-xs text-amber-400/70 uppercase tracking-widest font-[var(--font-outfit)] mb-1.5">
                          {isEl ? 'Ξεκλειδώνετε' : 'You unlock'}
                        </p>
                        <p className="text-sm text-[var(--text)]">
                          {isPlus
                            ? (isEl ? '10 αγγελίες, 2 × 7ήμερες θέσεις, analytics, Viber' : '10 listings, 2 × 7-day slots, analytics, Viber alerts')
                            : (isEl ? 'Απεριόριστες αγγελίες, 5 × 30ήμερες premium θέσεις, portfolio analytics, branding' : 'Unlimited listings, 5 × 30-day premium slots, portfolio analytics, branding')}
                        </p>
                      </div>
                    )}

                    {/* Feature list — included only */}
                    <div className="flex-1 space-y-4 mb-8">
                      {visibleGroups.map((group, gi) => (
                        <div key={gi}>
                          {gi > 0 && <div className="border-t border-[var(--border-subtle)] mb-3" />}
                          <ul className="space-y-1.5">
                            {group.items.map((f, fi) => (
                              <li key={fi} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                                <span className={`shrink-0 mt-0.5 text-xs ${isPlus ? 'text-amber-500/70' : isPro ? 'text-stone-400' : 'text-[var(--text-muted)]/60'}`}>
                                  ●
                                </span>
                                <span>{isEl ? f.el : f.en}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleCardClick(tier.id)}
                        disabled={isCurrent || !!upgrading}
                        className={[
                          'group relative w-full py-4 rounded-2xl font-bold text-sm transition-all duration-300 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed',
                          !isCurrent && !didJustChange ? 'hover:scale-[1.02] active:scale-[0.98]' : '',
                          didJustChange
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : isCurrent
                              ? 'bg-[var(--ink-soft)] text-[var(--text-muted)] cursor-default border border-[var(--border-subtle)]'
                              : isConfirming
                                ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                : isDowngrade
                                  ? 'bg-[var(--ink-soft)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:border-[var(--text-muted)]/40'
                                  : isPlus
                                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-[0_4px_24px_rgba(245,158,11,0.4)] hover:shadow-[0_4px_32px_rgba(245,158,11,0.6)]'
                                    : isPro
                                      ? 'bg-stone-700 hover:bg-stone-600 text-stone-100 border border-stone-500/40 shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
                                      : 'bg-[var(--ink-soft)] text-[var(--text)] hover:bg-[var(--canvas-mid)] border border-[var(--border-subtle)]',
                        ].join(' ')}
                      >
                        {isPlus && !isCurrent && !isDowngrade && (
                          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        )}
                        {didJustChange
                          ? `✓ ${lastChangeWasDowngrade ? (isEl ? 'Υποβαθμίστηκε' : 'Downgraded') : (isEl ? 'Ενεργοποιήθηκε' : 'Activated')}`
                          : isUpgrading
                            ? (isEl ? 'Εφαρμογή...' : 'Applying...')
                            : isCurrent
                              ? (isEl ? 'Τρέχον πλάνο' : 'Current plan')
                              : isConfirming
                                ? (isEl ? 'Επιβεβαίωση υποβάθμισης;' : 'Confirm downgrade?')
                                : isDowngrade
                                  ? isFree
                                    ? (isEl ? 'Υποβάθμιση σε Βασικό' : 'Downgrade to Free')
                                    : (isEl ? `Μετάβαση σε ${tier.labelEl}` : `Switch to ${tier.labelEn}`)
                                  : isEl
                                    ? `Αναβάθμιση σε ${tier.labelEl}`
                                    : `Upgrade to ${tier.labelEn}`}
                      </button>

                      {isConfirming && (
                        <>
                          <button onClick={() => setConfirmingDowngrade(null)}
                            className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors py-1">
                            {isEl ? 'Ακύρωση' : 'Cancel'}
                          </button>
                          <p className="text-xs text-[var(--text-muted)]/70 leading-relaxed">
                            {isFree
                              ? (isEl ? 'Αγγελίες πάνω από 1 θα αποκρυφτούν (δεν θα διαγραφούν). Θέσεις προβολής θα απενεργοποιηθούν.' : 'Listings beyond 1 will be hidden — not deleted. Promotion slots will be removed.')
                              : (isEl ? 'Θα χάσετε τις premium θέσεις και τα portfolio analytics.' : "You'll lose premium slots and portfolio analytics.")}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {downgradeResult && (downgradeResult.slotsRevoked > 0 || downgradeResult.listingsOverLimit > 0) && (
              <div className="max-w-lg mx-auto mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/6 px-5 py-4">
                <p className="text-sm font-semibold text-amber-300 mb-1">{isEl ? 'Αλλαγές από την υποβάθμιση' : 'Changes from downgrade'}</p>
                {downgradeResult.slotsRevoked > 0 && (
                  <p className="text-xs text-amber-300/70">
                    {isEl ? `${downgradeResult.slotsRevoked} θέσεις προβολής απενεργοποιήθηκαν.` : `${downgradeResult.slotsRevoked} promotion slot${downgradeResult.slotsRevoked > 1 ? 's' : ''} removed.`}
                  </p>
                )}
                {downgradeResult.listingsOverLimit > 0 && (
                  <p className="text-xs text-amber-300/70 mt-0.5">
                    {isEl
                      ? `${downgradeResult.listingsOverLimit} αγγελίες πάνω από το όριο — αποκρύφτηκαν, δεν διαγράφηκαν.`
                      : `${downgradeResult.listingsOverLimit} listing${downgradeResult.listingsOverLimit > 1 ? 's' : ''} over the limit — hidden, not deleted.`}
                  </p>
                )}
              </div>
            )}

            {error && <p className="text-center text-[var(--status-error)] text-sm mb-6">{error}</p>}

            <p className="text-center text-xs text-[var(--text-muted)]">
              {isEl ? 'Χωρίς δέσμευση · Ακυρώστε οποτεδήποτε · Χρέωση μέσω Stripe (σύντομα)' : 'No commitment · Cancel anytime · Billed via Stripe (coming soon)'}
            </p>
          </>
        )}
      </div>

      {/* Listing selection modal — shown when downgrade would exceed new tier limit */}
      {selectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[var(--surface-high)] rounded-3xl shadow-2xl border border-[var(--border-default)] overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-[var(--border-subtle)]">
              <h2 className="text-xl font-bold text-[var(--text)] mb-1">
                {isEl ? 'Ποιες αγγελίες να κρατήσουμε;' : 'Which listings should we keep?'}
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                {isEl
                  ? `Το πλάνο ${selectionModal.pendingTier.toUpperCase()} επιτρέπει ${selectionModal.newLimit} αγγελί${selectionModal.newLimit === 1 ? 'α' : 'ες'}. Επιλέξτε αυτές που θέλετε να παραμείνουν ενεργές — οι υπόλοιπες θα αποκρυφτούν (δεν θα διαγραφούν).`
                  : `${selectionModal.pendingTier.toUpperCase()} allows ${selectionModal.newLimit} listing${selectionModal.newLimit === 1 ? '' : 's'}. Pick which to keep active — the rest will be hidden, not deleted.`}
              </p>
              <p className="mt-2 text-xs text-amber-300/70">
                {isEl
                  ? `Επιλέξτε ακριβώς ${selectionModal.newLimit} (${selectionModal.keepKeys.length}/${selectionModal.newLimit} επιλεγμένα)`
                  : `Select exactly ${selectionModal.newLimit} (${selectionModal.keepKeys.length}/${selectionModal.newLimit} selected)`}
              </p>
            </div>

            <div className="overflow-y-auto max-h-[50dvh] px-6 py-4 space-y-2">
              {selectionModal.listings.map(l => {
                const checked = selectionModal.keepKeys.includes(l.key)
                const canSelect = checked || selectionModal.keepKeys.length < selectionModal.newLimit
                const inputId = `keep-${l.key}`
                const labelText = (isEl && l.titleGreek) ? l.titleGreek : (l.title ?? l.city)
                return (
                  <label
                    key={l.key}
                    htmlFor={inputId}
                    aria-label={labelText}
                    className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                      checked
                        ? 'border-[var(--accent)]/50 bg-[var(--accent)]/8'
                        : canSelect
                          ? 'border-[var(--border-subtle)] hover:border-[var(--accent)]/30'
                          : 'border-[var(--border-subtle)] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={checked}
                      disabled={!canSelect && !checked}
                      onChange={() => {
                        setSelectionModal(prev => {
                          if (!prev) return prev
                          const next = checked
                            ? prev.keepKeys.filter(k => k !== l.key)
                            : [...prev.keepKeys, l.key]
                          return { ...prev, keepKeys: next }
                        })
                      }}
                      className="mt-0.5 accent-[var(--accent)]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text)] truncate">{labelText}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {l.city} · €{l.pricePerMonth.toLocaleString()}
                        {l.inquiryCount > 0 && (
                          <span className="ml-2 text-[var(--status-info)]">
                            {l.inquiryCount} {isEl ? 'ενδιαφ.' : 'inquir.'}
                          </span>
                        )}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>

            <div className="px-6 py-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
              <button
                onClick={() => { setSelectionModal(null); setConfirmingDowngrade(null) }}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                {isEl ? 'Ακύρωση' : 'Cancel'}
              </button>
              <button
                disabled={selectionModal.keepKeys.length !== selectionModal.newLimit || !!upgrading}
                onClick={() => applyTier(selectionModal.pendingTier, selectionModal.keepKeys)}
                className="px-6 py-3 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--btn-primary-hover-bg)] transition-colors"
              >
                {upgrading
                  ? (isEl ? 'Εφαρμογή...' : 'Applying...')
                  : (isEl ? 'Επιβεβαίωση υποβάθμισης' : 'Confirm downgrade')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <UpgradePageInner />
    </Suspense>
  )
}
