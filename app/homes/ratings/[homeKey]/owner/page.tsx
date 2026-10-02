'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'
import StarRating from '@/app/components/StarRating'
import { localeFor } from '@/lib/format'

interface DimensionScore {
  label: string
  score: number | null
}

interface OwnerRatings {
  homeKey: string
  homeTitle: string
  ownerName: string | null
  ownerRole: string
  ownerScore: number | null
  dimensions: {
    handover: number | null
    ownerFair: number | null
    moveoutHandling: number | null
  }
  totalRatings: number
  reviews: Array<{
    comment: string
    raterName: string | null
    createdAt: string
    type: 'movein_house' | 'moveout_house'
  }>
}

function DimensionBar({ label, score }: DimensionScore) {
  const pct = score != null ? (score / 5) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-[var(--text-muted)] w-44 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-[var(--border-subtle)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-[var(--text)] w-8 text-right">
        {score != null ? score.toFixed(1) : '—'}
      </span>
    </div>
  )
}

export default function OwnerRatingsPage() {
  const params = useParams()
  const router = useRouter()
  const { language } = useLanguage()
  const [data, setData] = useState<OwnerRatings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const homeKey = params.homeKey as string

  useEffect(() => {
    if (!homeKey) return
    fetch(`/api/ratings/home/${homeKey}/owner`)
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

  const ownerLabel = data.ownerRole === 'broker' ? 'House Owner' : (data.ownerName || 'Owner')

  const dimensions = [
    { label: 'Move-in handover', score: data.dimensions.handover },
    { label: 'Fairness during tenancy', score: data.dimensions.ownerFair },
    { label: 'Move-out handling', score: data.dimensions.moveoutHandling },
  ].filter(d => d.score !== null)

  return (
    <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors flex items-center gap-2"
            >
              <span>←</span>
              <span>{getTranslation(language, 'goBack')}</span>
            </button>
            <Link
              href={`/homes/ratings/${homeKey}`}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors underline"
            >
              View property ratings
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-[var(--text)] mb-1">{ownerLabel}</h1>
          <p className="text-[var(--text-muted)]">{data.homeTitle}</p>
        </div>

        {/* Overall score */}
        <div className="bg-[var(--surface)] rounded-3xl p-8 border border-[var(--border-subtle)] shadow-xl mb-6 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
          <div className="text-center shrink-0">
            <p className="text-5xl sm:text-6xl font-bold text-[var(--text)] mb-2">
              {data.ownerScore != null ? data.ownerScore.toFixed(1) : '—'}
            </p>
            <StarRating rating={data.ownerScore ?? 0} size="lg" />
            <p className="text-sm text-[var(--text-muted)] mt-2">
              {data.totalRatings > 0
                ? `${data.totalRatings} ${data.totalRatings === 1 ? 'rating' : 'ratings'}`
                : 'No ratings yet'}
            </p>
          </div>
          {dimensions.length > 0 && (
            <div className="flex-1 space-y-3">
              {dimensions.map(d => (
                <DimensionBar key={d.label} label={d.label} score={d.score} />
              ))}
            </div>
          )}
        </div>

        {/* Written reviews */}
        {data.reviews.length > 0 ? (
          <div>
            <h2 className="text-xl font-bold text-[var(--text)] mb-4">Reviews</h2>
            <div className="space-y-4">
              {data.reviews.map((review, i) => (
                <div
                  key={i}
                  className="bg-[var(--surface)] rounded-3xl p-6 border border-[var(--border-subtle)] shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-1">
                    <p className="font-semibold text-[var(--text)]">
                      {review.raterName ?? 'Anonymous'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        review.type === 'movein_house'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {review.type === 'movein_house' ? 'Move-in' : 'Move-out'}
                      </span>
                      <p className="text-sm text-[var(--text-muted)]">
                        {new Date(review.createdAt).toLocaleDateString(
                          localeFor(language),
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
        ) : (
          <div className="bg-[var(--surface)] rounded-3xl p-12 text-center shadow-xl border border-[var(--border-subtle)]">
            <p className="text-xl text-[var(--text-muted)]">No written reviews yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
