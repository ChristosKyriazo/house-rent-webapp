import { useMemo } from 'react'
import { useLanguage } from '@/app/contexts/LanguageContext'

/**
 * Hook to get the appropriate description based on current language
 * Uses stored descriptions instead of translating on-the-fly
 */
export function useTranslatedDescription(
  description: string | null | undefined,
  descriptionGreek: string | null | undefined
) {
  const { language } = useLanguage()

  const translatedDescription = useMemo(() => {
    if (language === 'el' && descriptionGreek) {
      return descriptionGreek
    }
    return description || null
  }, [language, description, descriptionGreek])

  return { translatedDescription, translating: false }
}

