'use client'

import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'

export default function AppFooter() {
  const { language } = useLanguage()

  return (
    <footer className="relative z-0 border-t border-[var(--border-subtle)] mt-auto py-6 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
        <span>© {new Date().getFullYear()} Kaparro</span>
        <div className="flex items-center gap-4">
          <Link
            href="/privacy"
            className="hover:text-[var(--text)] transition-colors"
          >
            {language === 'el' ? 'Πολιτική Απορρήτου' : 'Privacy Policy'}
          </Link>
          <a
            href="mailto:privacy@kaparro.gr"
            className="hover:text-[var(--text)] transition-colors"
          >
            privacy@kaparro.gr
          </a>
        </div>
      </div>
    </footer>
  )
}
