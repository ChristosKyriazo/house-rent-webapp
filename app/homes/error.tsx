'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function HomesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--bg)]">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🏠</div>
        <h1 className="text-2xl font-bold text-[var(--text)] mb-3">Could not load listings</h1>
        <p className="text-[var(--text-muted)] mb-8">There was a problem fetching properties. Check your connection and try again.</p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-2xl font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-hover-bg)] transition-all"
          >
            Retry
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-2xl font-semibold border border-[var(--border-subtle)] text-[var(--text)] hover:bg-[var(--ink-soft)] transition-all"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
