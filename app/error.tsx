'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'
import { useLanguage } from '@/app/contexts/LanguageContext'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { language } = useLanguage()

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--bg)]">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-2xl font-bold text-[var(--text)] mb-3">
          {language === 'el' ? 'Κάτι πήγε στραβά' : 'Something went wrong'}
        </h1>
        <p className="text-[var(--text-muted)] mb-8">
          {language === 'el'
            ? 'Παρουσιάστηκε απρόσμενο σφάλμα. Δοκιμάστε ξανά ή επιστρέψτε στην αρχική σελίδα.'
            : 'An unexpected error occurred. Please try again or return to the homepage.'}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-6 py-3 rounded-2xl font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-hover-bg)] transition-all"
          >
            {language === 'el' ? 'Δοκιμή ξανά' : 'Try again'}
          </button>
          <Link
            href="/homes"
            className="px-6 py-3 rounded-2xl font-semibold border border-[var(--border-subtle)] text-[var(--text)] hover:bg-[var(--ink-soft)] transition-all"
          >
            {language === 'el' ? 'Αγγελίες' : 'Go to listings'}
          </Link>
        </div>
      </div>
    </div>
  )
}
