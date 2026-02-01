'use client'

import { useState } from 'react'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'

interface Home {
  id: number
  key: string
  title: string
  description: string | null
  descriptionGreek: string | null
  city: string
  country: string
  area: string | null
  listingType: string
  pricePerMonth: number
  bedrooms: number
  bathrooms: number
  sizeSqMeters: number | null
}

interface PromoteModalProps {
  home: Home | null
  subscription: number | null
  onClose: () => void
  onSuccess: () => void
}

export default function PromoteModal({ home, subscription, onClose, onSuccess }: PromoteModalProps) {
  const { language } = useLanguage()
  const [promoting, setPromoting] = useState(false)
  const [error, setError] = useState('')

  if (!home) return null

  const handlePromote = async (days: number) => {
    setPromoting(true)
    setError('')

    try {
      const response = await fetch('/api/homes/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeKey: home.key,
          days,
          isPremium: days === 30,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || getTranslation(language, 'promoteFailed') || 'Failed to promote home')
        setPromoting(false)
        return
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(getTranslation(language, 'promoteFailed') || 'Failed to promote home')
      setPromoting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A202C]/95 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[#E8D5B7]/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#E8D5B7]">
            {getTranslation(language, 'promoteHome') || 'Promote Home'}
          </h2>
          <button
            onClick={onClose}
            className="text-[#E8D5B7]/70 hover:text-[#E8D5B7] text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-50/80 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-[#E8D5B7] mb-2">{home.title}</h3>
          <p className="text-[#E8D5B7]/70 text-sm mb-4">
            {home.city}, {home.country}
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[#E8D5B7]/70">{getTranslation(language, 'price')}: </span>
              <span className="text-[#E8D5B7] font-semibold">€{home.pricePerMonth.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[#E8D5B7]/70">{getTranslation(language, 'bedrooms')}: </span>
              <span className="text-[#E8D5B7] font-semibold">{home.bedrooms}</span>
            </div>
            <div>
              <span className="text-[#E8D5B7]/70">{getTranslation(language, 'bathrooms')}: </span>
              <span className="text-[#E8D5B7] font-semibold">{home.bathrooms}</span>
            </div>
            {home.sizeSqMeters && (
              <div>
                <span className="text-[#E8D5B7]/70">{getTranslation(language, 'sizeSqMeters')}: </span>
                <span className="text-[#E8D5B7] font-semibold">{home.sizeSqMeters} m²</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {subscription === 2 && (
            <button
              onClick={() => handlePromote(7)}
              disabled={promoting}
              className="w-full px-6 py-4 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {promoting ? getTranslation(language, 'loading') : getTranslation(language, 'promoteFor7Days') || 'Promote for 7 days'}
            </button>
          )}

          {subscription === 3 && (
            <>
              <button
                onClick={() => handlePromote(7)}
                disabled={promoting}
                className="w-full px-6 py-4 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {promoting ? getTranslation(language, 'loading') : getTranslation(language, 'promoteFor7Days') || 'Promote for 7 days'}
              </button>
              <button
                onClick={() => handlePromote(30)}
                disabled={promoting}
                className="w-full px-6 py-4 bg-gradient-to-r from-[#E8D5B7] to-[#D4C19F] text-[#2D3748] rounded-xl hover:from-[#D4C19F] hover:to-[#E8D5B7] transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {promoting ? getTranslation(language, 'loading') : getTranslation(language, 'premiumPromoteFor30Days') || 'Premium Promote for 30 days'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}



