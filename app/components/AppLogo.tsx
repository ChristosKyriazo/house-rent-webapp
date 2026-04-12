'use client'

import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'

type AppLogoProps = {
  className?: string
}

/** Monoline mark + wordmark — same ink everywhere, no gradient mismatch. */
export default function AppLogo({ className = '' }: AppLogoProps) {
  const { language } = useLanguage()

  return (
    <Link
      href="/"
      className={`pointer-events-auto inline-flex items-center gap-2.5 rounded-xl border border-[var(--btn-secondary-border)] bg-[var(--btn-secondary-bg)] px-2.5 py-1.5 transition-colors hover:border-[var(--accent)]/50 hover:bg-[rgba(32,42,58,0.98)] ${className}`}
      aria-label={getTranslation(language, 'homeLogoAria')}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]">
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden>
          <path
            d="M6 18 L16 8 L26 18"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M10 18 V26 H22 V18"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path d="M16 14 V18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </span>
      <span className="font-display hidden text-[0.8125rem] font-semibold tracking-tight text-[var(--text)] sm:inline">
        House Rent
      </span>
    </Link>
  )
}
