'use client'

import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'

export default function NotFound() {
  const { language } = useLanguage()

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--bg)]">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-[var(--text-muted)]/30 mb-2">404</div>
        <h1 className="text-2xl font-bold text-[var(--text)] mb-3">
          {language === 'el' ? 'Η σελίδα δεν βρέθηκε' : 'Page not found'}
        </h1>
        <p className="text-[var(--text-muted)] mb-8">
          {language === 'el'
            ? 'Η σελίδα που ψάχνετε δεν υπάρχει ή έχει μετακινηθεί.'
            : 'The page you are looking for does not exist or has been moved.'}
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/homes"
            className="px-6 py-3 rounded-2xl font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-hover-bg)] transition-all"
          >
            {language === 'el' ? 'Αρχική σελίδα' : 'Browse listings'}
          </Link>
          <Link
            href="/"
            className="px-6 py-3 rounded-2xl font-semibold border border-[var(--border-subtle)] text-[var(--text)] hover:bg-[var(--ink-soft)] transition-all"
          >
            {language === 'el' ? 'Αρχική' : 'Home'}
          </Link>
        </div>
      </div>
    </div>
  )
}
