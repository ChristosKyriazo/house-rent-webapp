'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'

export default function OverlimitBanner() {
  const { language } = useLanguage()
  const isEl = language === 'el'
  const [hiddenCount, setHiddenCount] = useState(0)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.user) return
        setRole(d.user.role ?? null)
        setHiddenCount(d.user.overlimitHiddenCount ?? 0)
      })
      .catch(() => {})
  }, [])

  const isOwner = role === 'owner' || role === 'both' || role === 'broker'
  if (!isOwner || hiddenCount === 0) return null

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/20">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-amber-300 font-medium">
          {isEl
            ? `${hiddenCount} αγγελί${hiddenCount === 1 ? 'α κρύφτηκε' : 'ες κρύφτηκαν'} λόγω υποβάθμισης πλάνου — τα δεδομένα σας είναι ασφαλή.`
            : `${hiddenCount} listing${hiddenCount === 1 ? '' : 's'} hidden due to plan downgrade — your data is safe.`}
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/homes/my-listings?tab=hidden"
            className="text-xs font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors"
          >
            {isEl ? 'Διαχείριση' : 'Manage'}
          </Link>
          <Link
            href="/upgrade"
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400 transition-colors"
          >
            {isEl ? 'Αναβάθμιση' : 'Upgrade'}
          </Link>
        </div>
      </div>
    </div>
  )
}
