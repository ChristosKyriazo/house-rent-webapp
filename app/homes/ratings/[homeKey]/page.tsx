'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'
import StarRating from '@/app/components/StarRating'
import NotificationPopup from '@/app/components/NotificationPopup'

interface Rating {
  id: number
  key: string
  score: number
  comment: string | null
  createdAt: string
  updatedAt: string
  inquiryId: number
  homeKey: string
  homeTitle: string
  ratingType?: string // 'owner' or 'renter' - helps determine the type when editing
  isBrokerOwned?: boolean // Flag to indicate if house is broker-owned
  rater: {
    id: number
    name: string | null
    email: string
  }
  ratedUser: {
    id: number
    name: string | null
    email: string
  }
}

export default function HomeRatingsPage() {
  const params = useParams()
  const router = useRouter()
  const { language } = useLanguage()
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingRating, setEditingRating] = useState<Rating | null>(null)
  const [editScore, setEditScore] = useState(5)
  const [editComment, setEditComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const homeKey = params.homeKey as string

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user ID
        const profileRes = await fetch('/api/profile')
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          if (profileData.user) {
            setCurrentUserId(profileData.user.id)
          }
        }

        // Fetch ratings for this home
        const response = await fetch(`/api/ratings/home/${homeKey}`)
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

    if (homeKey) {
      fetchData()
    }
  }, [homeKey, language])

  // Check if rating can be edited (within 3 days of creation)
  // Note: Since we now create new ratings instead of updating, we only check createdAt
  const canEditRating = (rating: Rating) => {
    if (!currentUserId || rating.rater.id !== currentUserId) return false
    const now = new Date()
    const ratingDate = new Date(rating.createdAt)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    return ratingDate > threeDaysAgo
  }

  const handleEdit = (rating: Rating) => {
    setEditingRating(rating)
    setEditScore(rating.score)
    setEditComment(rating.comment || '')
  }

  const handleSaveEdit = async () => {
    if (!editingRating || submitting) return

    setSubmitting(true)
    try {
      // Update the existing rating using PUT endpoint
      const response = await fetch(`/api/ratings/update/${editingRating.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: editScore,
          comment: editComment.trim() || null,
        }),
      })

      if (response.ok) {
        // Refresh ratings
        const ratingsRes = await fetch(`/api/ratings/home/${homeKey}`)
        if (ratingsRes.ok) {
          const data = await ratingsRes.json()
          setRatings(data.ratings || [])
        }
        setEditingRating(null)
        setEditComment('')
        setEditScore(5)
      } else {
        const data = await response.json()
        setNotification({ type: 'error', message: data.error || getTranslation(language, 'ratingFailed') })
      }
    } catch (error) {
      console.error('Error updating rating:', error)
      setNotification({ type: 'error', message: getTranslation(language, 'ratingFailed') })
    } finally {
      setSubmitting(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <p className="text-[var(--text)]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text)] text-xl mb-4">{error}</p>
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

  // Filter ratings to show only those made by current user
  const myRatings = ratings.filter(rating => rating.rater.id === currentUserId)

  return (
    <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors flex items-center gap-2"
          >
            <span>←</span>
            <span>{getTranslation(language, 'goBack')}</span>
          </button>
          <h1 className="text-4xl font-bold text-[var(--text)] mb-2">
            {getTranslation(language, 'houseRatings') || 'House Ratings'}
          </h1>
          {ratings.length > 0 && (
            <p className="text-[var(--text-muted)]">
              {ratings[0].homeTitle}
            </p>
          )}
        </div>

        {myRatings.length === 0 ? (
          <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-12 text-center shadow-xl border border-[var(--border-subtle)]">
            <p className="text-xl text-[var(--text-muted)]">
              {getTranslation(language, 'noRatingsForThisHouse') || 'No ratings for this house yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {myRatings.map((rating) => {
              const canEdit = canEditRating(rating)
              const isEditing = editingRating?.id === rating.id

              return (
                <div
                  key={rating.id}
                  className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-[var(--border-subtle)]"
                >
                  {!isEditing ? (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-semibold text-[var(--text)]">
                              {rating.isBrokerOwned && rating.ratingType === 'owner' 
                                ? getTranslation(language, 'ownerRating') || 'Owner Rating'
                                : `${getTranslation(language, 'rated')}: ${rating.ratedUser.name || rating.ratedUser.email.split('@')[0]}`}
                            </span>
                            <StarRating rating={rating.score} size="lg" />
                            <span className="text-lg font-bold text-[var(--text)] ml-2">
                              {rating.score.toFixed(1)}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--text-muted)]">
                            {new Date(rating.createdAt).toLocaleDateString(
                              language === 'el' ? 'el-GR' : 'en-US',
                              { year: 'numeric', month: 'long', day: 'numeric' }
                            )}
                            {rating.updatedAt !== rating.createdAt && (
                              <span className="ml-2">
                                ({getTranslation(language, 'updated')} {new Date(rating.updatedAt).toLocaleDateString(
                                  language === 'el' ? 'el-GR' : 'en-US',
                                  { year: 'numeric', month: 'long', day: 'numeric' }
                                )})
                              </span>
                            )}
                          </p>
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(rating)}
                            className="ml-4 px-4 py-2 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] rounded-xl hover:bg-[var(--btn-primary-hover-bg)] transition-all font-semibold whitespace-nowrap"
                          >
                            {getTranslation(language, 'edit') || 'Edit'}
                          </button>
                        )}
                      </div>
                      {rating.comment && (
                        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                          <p className="text-[var(--text-muted)]">{rating.comment}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text)] mb-3">
                          {getTranslation(language, 'rating')}:
                        </label>
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setEditScore(star)}
                              className={`text-4xl transition-transform hover:scale-110 ${
                                star <= editScore ? 'text-yellow-400' : 'text-[var(--text)]/30'
                              }`}
                            >
                              ⭐
                            </button>
                          ))}
                          <span className="ml-4 text-lg font-semibold text-[var(--text)]">
                            {editScore}/5
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text)] mb-2">
                          {getTranslation(language, 'comment')}:
                        </label>
                        <textarea
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text)] placeholder:text-[var(--text)]/50 resize-none"
                          rows={4}
                          placeholder={getTranslation(language, 'commentPlaceholder')}
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleSaveEdit}
                          disabled={submitting}
                          className="px-6 py-3 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] rounded-xl hover:bg-[var(--btn-primary-hover-bg)] transition-all font-semibold disabled:opacity-50"
                        >
                          {submitting ? getTranslation(language, 'saving') : getTranslation(language, 'save')}
                        </button>
                        <button
                          onClick={() => {
                            setEditingRating(null)
                            setEditComment('')
                            setEditScore(5)
                          }}
                          className="px-6 py-3 bg-[var(--ink-soft)] text-[var(--text)] rounded-xl hover:bg-[var(--ink-soft)] transition-all font-semibold"
                        >
                          {getTranslation(language, 'cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {notification && (
        <NotificationPopup
          type={notification.type}
          message={notification.message}
          language={language}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  )
}

