'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="btn-icon-dock pointer-events-auto opacity-0" aria-hidden>
        <span>EN</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleLanguage()
      }}
      className="btn-icon-dock pointer-events-auto"
      aria-label="Toggle language"
      style={{ pointerEvents: 'auto', isolation: 'isolate' }}
    >
      {language === 'el' ? 'ΕΛ' : 'EN'}
    </button>
  )
}
