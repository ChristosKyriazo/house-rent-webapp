'use client'

import { useRouter } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'
import { GraphicSearchBanner } from '@/app/components/visual/PageGraphics'

export default function SearchPage() {
  const router = useRouter()
  const { language } = useLanguage()

  const handleChoice = (type: 'rent' | 'buy') => {
    router.push(`/homes?type=${type}`)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 pb-20 pt-12">
      <div className="w-full max-w-lg space-y-8">
        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--ink-soft)]/50 shadow-inner motion-safe:animate-fade-in-slow">
          <GraphicSearchBanner className="h-14 w-full sm:h-[4.5rem]" />
        </div>

        <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-8 shadow-xl backdrop-blur-sm">
          <h2 className="mb-8 text-center text-2xl font-bold text-[var(--text)]">
            {getTranslation(language, 'whatAreYouLookingFor')}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              onClick={() => handleChoice('rent')}
              className="btn-primary px-8 py-6 text-lg"
            >
              🏠 {getTranslation(language, 'rent')}
            </button>
            <button
              onClick={() => handleChoice('buy')}
              className="btn-primary px-8 py-6 text-lg"
            >
              💰 {getTranslation(language, 'buy')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
