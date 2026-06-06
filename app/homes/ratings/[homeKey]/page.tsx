'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'
import StarRating from '@/app/components/StarRating'

interface Review {
  comment: string
  raterName: string | null
  createdAt: string
  type: 'movein_house' | 'moveout_house'
}

interface HomeRatings {
  homeKey: string
  homeTitle: string
  ownerRole: string
  houseScore: number | null
  ownerScore: number | null
  combinedScore: number | null
  totalRatings: number
  reviews: Review[]
}

function ScoreCard({ label, score }: { label: string; score: number | null }) {
  return (
    <div className="flex-1 bg-[var(--surface)] rounded-3xl p-6 border border-[var(--border-subtle)] shadow-xl flex flex-col items-center gap-2">
      <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
      <p className="text-5xl font-bold text-[var(--text)]">
        {score != null ? score.toFixed(1) : '—'}
      </p>
      <StarRating rating={score ?? 0} size="base" />
    </div>
  )
}

export default function HomeRatingsPage() {
  const params = useParams()
  const router = useRouter()
  const { language } = useLanguage()
  const [data, setData] = useState<HomeRatings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const homeKey = params.homeKey as string

  useEffect(() => {
    if (!homeKey) return
    fetch(`/api/ratings/home/${homeKey}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch')
        return r.json()
      })
      .then(setData)
      .catch(() => setError(getTranslation(language, 'somethingWentWrong')))
      .finally(() => setLoading(false))
  }, [homeKey, language])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <p className="text-[var(--text)]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text)] text-xl mb-4">{error ?? 'Not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] rounded-2xl hover:bg-[var(--btn-primary-hover-bg)] transition-all font-semibold"
          >
            {getTranslation(language, 'goBack')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors flex items-center gap-2"
          >
            <span>←</span>
            <span>{getTranslation(language, 'goBack')}</span>
          </button>
          <h1 className="text-4xl font-bold text-[var(--text)] mb-1">{data.homeTitle}</h1>
          <p className="text-[var(--text-muted)]">
            {data.totalRatings > 0
              ? `${data.totalRatings} ${data.totalRatings === 1 ? 'rating' : 'ratings'}`
              : 'No ratings yet'}
          </p>
        </div>

        {/* Score cards */}
        <div className="flex gap-4 mb-10">
          <ScoreCard label="Property" score={data.houseScore} />
          <ScoreCard label="Owner" score={data.ownerScore} />
        </div>

        {/* Written reviews */}
        {data.reviews.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-[var(--text)] mb-4">Written reviews</h2>
            <div className="space-y-4">
              {data.reviews.map((review, i) => (
                <div
                  key={i}
                  className="bg-[var(--surface)] rounded-3xl p-6 border border-[var(--border-subtle)] shadow-xl"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-[var(--text)]">
                      {review.raterName ?? 'Anonymous'}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        review.type === 'movein_house'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {review.type === 'movein_house' ? 'Move-in' : 'Move-out'}
                      </span>
                      <p className="text-sm text-[var(--text-muted)]">
                        {new Date(review.createdAt).toLocaleDateString(
                          language === 'el' ? 'el-GR' : 'en-US',
                          { year: 'numeric', month: 'long', day: 'numeric' }
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="text-[var(--text-muted)] leading-relaxed">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.totalRatings === 0 && (
          <div className="bg-[var(--surface)] rounded-3xl p-12 text-center shadow-xl border border-[var(--border-subtle)]">
            <p className="text-xl text-[var(--text-muted)]">
              {getTranslation(language, 'noRatingsForThisHouse') || 'No ratings for this house yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
