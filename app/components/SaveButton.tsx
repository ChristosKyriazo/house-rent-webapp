'use client'

import { useState } from 'react'
import { useLanguage } from '@/app/contexts/LanguageContext'

interface SaveButtonProps {
  homeKey: string
  initialSaved?: boolean
  onToggle?: (saved: boolean) => void
  size?: 'sm' | 'md'
}

export function SaveButton({ homeKey, initialSaved = false, onToggle, size = 'md' }: SaveButtonProps) {
  const [saved, setSaved] = useState(initialSaved)
  const [loading, setLoading] = useState(false)
  const { language } = useLanguage()

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      if (saved) {
        await fetch(`/api/homes/saved?homeKey=${homeKey}`, { method: 'DELETE' })
        setSaved(false)
        onToggle?.(false)
      } else {
        await fetch('/api/homes/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ homeKey }),
        })
        setSaved(true)
        onToggle?.(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const sizeClass = size === 'sm' ? 'text-base p-1.5' : 'text-xl p-2'

  return (
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
  )
}
