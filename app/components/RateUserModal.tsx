'use client'

import { useState } from 'react'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'
import NotificationPopup from './NotificationPopup'

interface RateUserModalProps {
  userId: number
  userName: string
  userEmail: string
  inquiryId: number
  onClose: () => void
  onSuccess: () => void
}

export default function RateUserModal({
  userId,
  userName,
  userEmail,
  inquiryId,
  onClose,
  onSuccess,
}: RateUserModalProps) {
  const { language } = useLanguage()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleSubmit = async () => {
    if (submitting) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ratedUserId: userId,
          type: 'renter',
          score: rating,
          comment: comment.trim() || null,
        }),
      })

      if (response.ok) {
        setNotification({
          type: 'success',
          message: getTranslation(language, 'ratingSubmitted') || 'Rating submitted successfully',
        })
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1500)
      } else {
        const data = await response.json()
        setNotification({
          type: 'error',
          message: data.error || getTranslation(language, 'ratingFailed'),
        })
      }
    } catch (error) {
      console.error('Error submitting rating:', error)
      setNotification({
        type: 'error',
        message: getTranslation(language, 'ratingFailed'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {notification && (
        <NotificationPopup
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
          language={language}
        />
      )}
      
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#1A202C] rounded-3xl shadow-2xl border border-[#E8D5B7]/20 max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#E8D5B7]">
              {getTranslation(language, 'rateUser')}
            </h2>
            <button
              onClick={onClose}
              className="text-[#E8D5B7]/70 hover:text-[#E8D5B7] transition-colors text-2xl"
            >
              ×
            </button>
          </div>

          <div className="mb-6">
            <p className="text-[#E8D5B7] mb-2">
              <span className="font-semibold">{getTranslation(language, 'user')}:</span>{' '}
              {userName || userEmail.split('@')[0]}
            </p>
            <p className="text-[#E8D5B7]/70 text-sm">{userEmail}</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-3">
              {getTranslation(language, 'rating')}
            </label>
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i + 1)}
                  className={`text-4xl transition-all ${
                    i < rating
                      ? 'text-yellow-400 scale-110'
                      : 'text-[#E8D5B7]/30 hover:text-[#E8D5B7]/50'
                  }`}
                >
                  ★
                </button>
              ))}
              <span className="ml-2 text-[#E8D5B7] font-semibold">{rating}/5</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-2">
              {getTranslation(language, 'comment')} ({getTranslation(language, 'optional') || 'Optional'})
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={getTranslation(language, 'commentPlaceholder')}
              rows={4}
              className="w-full px-4 py-2 bg-[#2D3748] border border-[#E8D5B7]/30 rounded-xl text-[#E8D5B7] focus:outline-none focus:border-[#E8D5B7] resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-[#2D3748] hover:bg-[#374151] text-[#E8D5B7] rounded-xl font-semibold transition-all disabled:opacity-50"
            >
              {getTranslation(language, 'cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
            >
              {submitting ? getTranslation(language, 'submitting') : getTranslation(language, 'submitRating')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

