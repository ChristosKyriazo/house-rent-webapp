'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Language } from '@/lib/translations'
import { localeFor } from '@/lib/format'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  mounted: boolean
  /** `language === 'el'` — read this instead of re-deriving it in each component. */
  isEl: boolean
  /** BCP 47 tag for Intl formatting. Prefer the `lib/format` helpers over using this directly. */
  locale: string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('el')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language | null
    if (saved === 'el' || saved === 'en') setLanguageState(saved)
    setMounted(true)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }

  const toggleLanguage = () => {
    setLanguageState((currentLang) => {
      const newLang = currentLang === 'el' ? 'en' : 'el'
      localStorage.setItem('language', newLang)
      return newLang
    })
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        mounted,
        isEl: language === 'el',
        locale: localeFor(language),
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
