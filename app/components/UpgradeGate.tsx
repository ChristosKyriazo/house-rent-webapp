'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { meetsMinimumTier } from '@/lib/subscription-utils'

type Tier = 'plus' | 'pro'
type Mode = 'drawer' | 'overlay' | 'replace'
type Feature = 'bulk-upload' | 'analytics' | 'promote' | 'csv-export' | 'portfolio-analytics'

const FEATURE_COPY: Record<Feature, { en: string; el: string; descEn: string; descEl: string; tier: Tier }> = {
  'bulk-upload': {
    en: 'Bulk upload',
    el: 'Μαζική ανάρτηση',
    descEn: 'Import 50+ listings from Excel in one shot — AI writes the descriptions for you.',
    descEl: 'Εισάγετε 50+ αγγελίες από Excel — η AI γράφει τις περιγραφές για εσάς.',
    tier: 'plus',
  },
  'analytics': {
    en: 'Listing analytics',
    el: 'Στατιστικά αγγελίας',
    descEn: 'See who\'s viewing your listing, how long they stay, and where they come from.',
    descEl: 'Δείτε ποιος βλέπει την αγγελία σας, πόσο μένει και από πού έρχεται.',
    tier: 'plus',
  },
  'promote': {
    en: 'Promote listing',
    el: 'Προώθηση αγγελίας',
    descEn: 'Boost your listing to the top of search results and reach more renters faster.',
    descEl: 'Ανεβάστε την αγγελία σας στην κορυφή των αποτελεσμάτων και φτάστε σε περισσότερους ενοικιαστές.',
    tier: 'plus',
  },
  'csv-export': {
    en: 'CSV export',
    el: 'Εξαγωγή CSV',
    descEn: 'Export all your inquiries and bookings as a spreadsheet.',
    descEl: 'Εξάγετε όλα τα αιτήματα και τις κρατήσεις σας ως υπολογιστικό φύλλο.',
    tier: 'pro',
  },
  'portfolio-analytics': {
    en: 'Portfolio analytics',
    el: 'Στατιστικά χαρτοφυλακίου',
    descEn: 'See performance across all your listings in one dashboard.',
    descEl: 'Δείτε την απόδοση όλων των αγγελιών σας σε ένα dashboard.',
    tier: 'pro',
  },
}

interface UpgradeGateProps {
  requiredTier: Tier
  currentTier: string
  feature: Feature
  mode?: Mode
  children: React.ReactNode
}

function UpgradeDrawer({
  feature,
  onClose,
}: {
  feature: Feature
  onClose: () => void
}) {
  const { isEl } = useLanguage()
  const copy = FEATURE_COPY[feature]

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/60 z-[9998] backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-[var(--ink-soft)] z-[9999] shadow-2xl flex flex-col p-8 border-l border-[var(--border-subtle)]"
        style={{ animation: 'slideInRight 0.25s ease-out both' }}
      >
        <button
          onClick={onClose}
          className="self-end text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-8"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="flex-1">
          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 mb-6">
            {copy.tier === 'pro' ? 'Pro' : 'Plus'}
          </span>

          <h2 className="text-2xl font-bold text-[var(--text)] mb-3 font-[var(--font-fraunces)]">
            {isEl ? copy.el : copy.en}
          </h2>
          <p className="text-[var(--text-muted)] leading-relaxed mb-10">
            {isEl ? copy.descEl : copy.descEn}
          </p>

          <Link
            href={`/upgrade?from=${feature}`}
            onClick={onClose}
            className="block w-full text-center py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold transition-all"
          >
            {isEl
              ? `Αναβάθμιση σε ${copy.tier === 'pro' ? 'Pro' : 'Plus'}`
              : `Upgrade to ${copy.tier === 'pro' ? 'Pro' : 'Plus'}`}
          </Link>
          <button
            onClick={onClose}
            className="block w-full text-center mt-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            {isEl ? 'Ίσως αργότερα' : 'Maybe later'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>,
    document.body
  )
}

export default function UpgradeGate({
  requiredTier,
  currentTier,
  feature,
  mode = 'drawer',
  children,
}: UpgradeGateProps) {
  const { isEl } = useLanguage()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const copy = FEATURE_COPY[feature]

  useEffect(() => { setMounted(true) }, [])

  const unlocked = meetsMinimumTier(currentTier, requiredTier)
  if (unlocked) return <>{children}</>

  if (mode === 'drawer') {
    return (
      <>
        <div
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDrawerOpen(true) }}
          className="cursor-pointer"
        >
          {children}
        </div>
        {mounted && drawerOpen && (
          <UpgradeDrawer feature={feature} onClose={() => setDrawerOpen(false)} />
        )}
      </>
    )
  }

  if (mode === 'overlay') {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none opacity-40 blur-[2px]">
          {children}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="text-3xl">🔒</span>
          <Link
            href={`/upgrade?from=${feature}`}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-semibold transition-all"
          >
            {isEl
              ? `Ξεκλείδωμα με ${copy.tier === 'pro' ? 'Pro' : 'Plus'}`
              : `Unlock with ${copy.tier === 'pro' ? 'Pro' : 'Plus'}`}
          </Link>
        </div>
      </div>
    )
  }

  // mode === 'replace'
  return (
    <Link
      href={`/upgrade?from=${feature}`}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-400 text-xs hover:bg-amber-500/10 transition-colors"
    >
      ⭐ {isEl ? copy.el : copy.en}
      <span className="opacity-60">— {isEl ? `Απαιτείται ${copy.tier === 'pro' ? 'Pro' : 'Plus'}` : `Requires ${copy.tier === 'pro' ? 'Pro' : 'Plus'}`}</span>
    </Link>
  )
}
