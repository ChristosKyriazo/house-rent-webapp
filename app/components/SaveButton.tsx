'use client'

import { useState, lazy, Suspense } from 'react'
import { useLanguage } from '@/app/contexts/LanguageContext'

const ViberAlertModal = lazy(() => import('./ViberAlertModal'))

const SESSION_KEY = 'kaparro_viber_offered'

interface SaveButtonProps {
  homeKey: string
  initialSaved?: boolean
  onToggle?: (saved: boolean) => void
  size?: 'sm' | 'md'
}

export function SaveButton({ homeKey, initialSaved = false, onToggle, size = 'md' }: SaveButtonProps) {
  const [saved, setSaved] = useState(initialSaved)
  const [loading, setLoading] = useState(false)
  const [showViber, setShowViber] = useState(false)
  const { language } = useLanguage()

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      if (saved) {
        const res = await fetch(`/api/homes/saved?homeKey=${homeKey}`, { method: 'DELETE' })
        if (res.ok) {
          setSaved(false)
          onToggle?.(false)
        }
      } else {
        const res = await fetch('/api/homes/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ homeKey }),
        })
        if (res.ok) {
          setSaved(true)
          onToggle?.(true)
          maybeShowViberOffer()
        }
      }
    } finally {
      setLoading(false)
    }
  }

  function maybeShowViberOffer() {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SESSION_KEY)) return
    // Check if viber already active before showing
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        if (!d.user?.viberAlertsActive) {
          sessionStorage.setItem(SESSION_KEY, '1')
          setShowViber(true)
        }
      })
      .catch(() => {})
  }

  const sizeClass = size === 'sm' ? 'text-base p-1.5' : 'text-xl p-2'

  return (
    <>
      <button
        onClick={toggle}
        disabled={loading}
        title={saved ? (language === 'el' ? 'Αφαίρεση από αποθηκευμένα' : 'Remove from saved') : (language === 'el' ? 'Αποθήκευση ακινήτου' : 'Save property')}
        aria-label={saved ? (language === 'el' ? 'Αφαίρεση από αποθηκευμένα' : 'Remove from saved') : (language === 'el' ? 'Αποθήκευση ακινήτου' : 'Save property')}
        className={`${sizeClass} rounded-full transition-all hover:scale-110 active:scale-95 ${
          saved
            ? 'text-[var(--status-error)] bg-[var(--status-error-bg)]'
            : 'text-[var(--text-muted)] bg-[var(--ink-soft)] hover:text-[var(--status-error)]'
        }`}
      >
        {saved ? '♥' : '♡'}
      </button>

      {showViber && (
        <Suspense fallback={null}>
          <ViberAlertModal onClose={() => setShowViber(false)} />
        </Suspense>
      )}
    </>
  )
}
