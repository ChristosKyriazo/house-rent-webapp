'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'

interface Rating {
  id: number
  score: number
  comment: string | null
  createdAt: string
  rater: {
    id: number
    name: string | null
    email: string
    role: string
  }
}

export default function UserRatingsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { language } = useLanguage()
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userId = params.userId as string
  const type = searchParams.get('type') // 'owner' or 'renter'

  useEffect(() => {
    if (!userId || !type) {
      setError(getTranslation(language, 'invalidParameters'))
      setLoading(false)
      return
    }

    const fetchRatings = async () => {
      try {
        const response = await fetch(`/api/ratings/${userId}?type=${type}`)
        if (!response.ok) {
          throw new Error('Failed to fetch ratings')
        }
        const data = await response.json()
        setRatings(data.ratings || [])
      } catch (err) {
        console.error('Error fetching ratings:', err)
        setError(getTranslation(language, 'somethingWentWrong'))
      } finally {
        setLoading(false)
      }
    }

    fetchRatings()
  }, [userId, type, language])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2D3748] flex items-center justify-center">
        <p className="text-[#E8D5B7]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#2D3748] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#E8D5B7] text-xl mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-[#E8D5B7] text-[#2D3748] rounded-2xl hover:bg-[#D4C19F] transition-all font-semibold"
          >
            {getTranslation(language, 'goBack')}
          </button>
        </div>
      </div>
    )
  }

  const ratingTypeLabel = type === 'owner' 
    ? getTranslation(language, 'asOwner') 
    : getTranslation(language, 'asUser')

  return (
    <div className="min-h-screen bg-[#2D3748] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-[#E8D5B7]/70 hover:text-[#E8D5B7] transition-colors flex items-center gap-2"
          >
            <span>←</span>
            <span>{getTranslation(language, 'goBack')}</span>
          </button>
          <h1 className="text-4xl font-bold text-[#E8D5B7] mb-2">
            {getTranslation(language, 'allRatings')}
          </h1>
          <p className="text-[#E8D5B7]/70">
            {ratingTypeLabel} • {ratings.length} {ratings.length === 1 ? getTranslation(language, 'rating') : getTranslation(language, 'ratings')}
          </p>
        </div>

        {ratings.length === 0 ? (
          <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-12 text-center shadow-xl border border-[#E8D5B7]/20">
            <p className="text-xl text-[#E8D5B7]/70">{getTranslation(language, 'noRatingsYet')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ratings.map((rating) => (
              <div
                key={rating.id}
                className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-[#E8D5B7]/20"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link
                        href={`/profile?userId=${rating.rater.id}&role=${rating.rater.role}`}
                        className="text-xl font-bold text-[#E8D5B7] hover:text-[#D4C19F] underline transition-colors cursor-pointer"
                      >
                        {rating.rater.name || rating.rater.email.split('@')[0]}
                      </Link>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={`text-lg ${
                              i < rating.score
                                ? 'text-yellow-400'
                                : 'text-[#E8D5B7]/30'
                            }`}
                          >
                            ⭐
                          </span>
                        ))}
                      </div>
                      <span className="text-lg font-bold text-[#E8D5B7]">
                        {rating.score.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-sm text-[#E8D5B7]/60">
                      {new Date(rating.createdAt).toLocaleDateString(
                        language === 'el' ? 'el-GR' : 'en-US',
                        { year: 'numeric', month: 'long', day: 'numeric' }
                      )}
                    </p>
                  </div>
                </div>
                {rating.comment && (
                  <div className="mt-4 pt-4 border-t border-[#E8D5B7]/20">
                    <p className="text-[#E8D5B7]/80">{rating.comment}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

