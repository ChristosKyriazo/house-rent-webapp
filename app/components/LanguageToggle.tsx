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
      <div className="fixed top-4 right-4 z-[60] px-4 py-2 bg-[#E8D5B7] text-[#2D3748] rounded-xl">
        <span className="opacity-0">🇬🇷 ΕΛ</span>
      </div>
    )
  }

  return (
    <button
      onClick={toggleLanguage}
      className="fixed top-4 right-4 z-[60] px-4 py-2 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold text-sm shadow-lg shadow-[#E8D5B7]/20 hover:shadow-xl transform hover:-translate-y-0.5"
      aria-label="Toggle language"
    >
      {language === 'el' ? '🇬🇷 ΕΛ' : '🇬🇧 EN'}
    </button>
  )
}

