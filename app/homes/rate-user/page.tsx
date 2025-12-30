'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { useRole } from '@/app/contexts/RoleContext'
import { getTranslation } from '@/lib/translations'
import { getCityName, getCountryName } from '@/lib/area-utils'

interface FinalizedInquiry {
  id: number
  key: string
  home: {
    id: number
    key: string
    title: string
    street: string | null
    city: string
    country: string
  }
  otherUser: {
    id: number
    key: string
    name: string | null
    email: string
  }
  finalizedAt: string
  alreadyRated: boolean
  lastRatingDate?: string // Date when rating was last created/updated
}

export default function RateUserPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const { selectedRole, actualRole } = useRole()
  const [finalizedInquiries, setFinalizedInquiries] = useState<FinalizedInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInquiry, setSelectedInquiry] = useState<FinalizedInquiry | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [areas, setAreas] = useState<Array<{ city: string | null; cityGreek: string | null; country: string | null; countryGreek: string | null }>>([])

  const displayRole = (actualRole === 'both' && selectedRole) 
    ? selectedRole 
    : (actualRole || 'user')

  useEffect(() => {
    if (displayRole !== 'owner') {
      router.push('/profile')
      return
    }

    const fetchData = async () => {
      try {
        const response = await fetch('/api/inquiries/finalized?role=owner')
        if (response.ok) {
          const data = await response.json()
          setFinalizedInquiries(data.finalizedInquiries || [])
        } else {
          if (response.status === 401) {
            router.push('/login')
          }
        }
      } catch (error) {
        console.error('Error fetching finalized inquiries:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router, displayRole])

  // Fetch areas for city/country translation
  useEffect(() => {
    fetch('/api/areas')
      .then((res) => res.json())
      .then((data) => {
        setAreas(data.areas || [])
      })
      .catch((error) => {
        console.error('Error fetching areas for translation:', error)
      })
  }, [])

  const handleSubmitRating = async () => {
    if (!selectedInquiry || submitting) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ratedUserId: selectedInquiry.otherUser.id,
          type: 'renter',
          score: rating,
          comment: comment.trim() || null,
        }),
      })

      if (response.ok) {
        // Refresh the inquiries list to get updated lastRatingDate
        // This ensures the "Rate Again" button disappears immediately after rating
        const inquiriesRes = await fetch(`/api/inquiries/finalized?role=${actualRole || 'user'}`)
        if (inquiriesRes.ok) {
          const inquiriesData = await inquiriesRes.json()
          setFinalizedInquiries(inquiriesData.finalizedInquiries || [])
        } else {
          // Fallback: Update the inquiry to mark as rated
          setFinalizedInquiries(prev => 
            prev.map(inq => 
              inq.id === selectedInquiry.id 
                ? { ...inq, alreadyRated: true, lastRatingDate: new Date().toISOString() }
                : inq
            )
          )
        }
        setSelectedInquiry(null)
        setComment('')
        setRating(5)
      } else {
        const data = await response.json()
        alert(data.error || getTranslation(language, 'ratingFailed'))
      }
    } catch (error) {
      console.error('Error submitting rating:', error)
      alert(getTranslation(language, 'ratingFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2D3748] flex items-center justify-center">
        <p className="text-[#E8D5B7]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#2D3748] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/homes/approved"
            className="text-[#E8D5B7]/70 hover:text-[#E8D5B7] mb-4 inline-block transition-colors"
          >
            ← {getTranslation(language, 'back')}
          </Link>
          <h1 className="text-4xl font-bold text-[#E8D5B7] mb-2">
            {getTranslation(language, 'rateUser')}
          </h1>
          <p className="text-[#E8D5B7]/70">
            {getTranslation(language, 'rateUserDescription')}
          </p>
        </div>

        {finalizedInquiries.length === 0 ? (
          <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-[#E8D5B7]/20 text-center">
            <p className="text-xl text-[#E8D5B7]/70">{getTranslation(language, 'noFinalizedInquiries')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {finalizedInquiries.map((inquiry) => {
              // Check if re-rating is available (1 minute after last rating - creation or update)
              const canReRate = inquiry.alreadyRated && inquiry.lastRatingDate && (() => {
                const now = new Date()
                const ratingDate = new Date(inquiry.lastRatingDate) // This is updatedAt if rating was updated, otherwise createdAt
                // 1 minute for testing (1 * 60 * 1000)
                // For production: 6 months = 6 * 30 * 24 * 60 * 60 * 1000
                const reRateInterval = 1 * 60 * 1000 // 1 minute for testing
                const nextReRateDate = new Date(ratingDate.getTime() + reRateInterval)
                return now >= nextReRateDate
              })()

              return (
                <div key={inquiry.id} className="space-y-3">
                  <Link
                    href={`/homes/ratings/${inquiry.home.key}`}
                    className="block bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-[#E8D5B7]/20 transition-all duration-300 hover:scale-105 hover:border-[#E8D5B7]/40 hover:shadow-2xl cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-[#E8D5B7] mb-2">
                          {inquiry.home.title}
                        </h3>
                        <p className="text-[#E8D5B7]/70 mb-3">
                          📍 {inquiry.home.street && `${inquiry.home.street}, `}
                          {getCityName(inquiry.home.city, areas, language)}, {getCountryName(inquiry.home.country, areas, language)}
                        </p>
                        <div className="bg-[#2D3748]/50 rounded-xl p-4 border border-[#E8D5B7]/20">
                          <p className="text-sm text-[#E8D5B7]/70 mb-1">
                            {getTranslation(language, 'user')}:
                          </p>
                          <p className="text-lg font-semibold text-[#E8D5B7]">
                            {inquiry.otherUser.name || inquiry.otherUser.email.split('@')[0]}
                          </p>
                          <p className="text-sm text-[#E8D5B7]/60">
                            {inquiry.otherUser.email}
                          </p>
                        </div>
                      </div>
                      {inquiry.alreadyRated && (
                        <span className="bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ml-4">
                          ✓ {getTranslation(language, 'rated')}
                        </span>
                      )}
                    </div>
                  </Link>
                  
                  {/* Small re-rating button below if eligible */}
                  {canReRate && (
                    <button
                      onClick={() => setSelectedInquiry(inquiry)}
                      className="w-full px-4 py-2 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold text-sm"
                    >
                      {getTranslation(language, 'rateAgain') || 'Rate Again'}
                    </button>
                  )}
                  
                  {/* Rate Now button if not rated yet */}
                  {!inquiry.alreadyRated && (
                    <button
                      onClick={() => setSelectedInquiry(inquiry)}
                      className="w-full px-4 py-2 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold text-sm"
                    >
                      {getTranslation(language, 'rateNow')}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Rating Modal */}
        {selectedInquiry && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#1A202C] rounded-3xl shadow-2xl border border-[#E8D5B7]/20 max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#E8D5B7]">
                  {getTranslation(language, 'rateUser')}
                </h2>
                <button
                  onClick={() => {
                    setSelectedInquiry(null)
                    setComment('')
                    setRating(5)
                  }}
                  className="text-[#E8D5B7]/70 hover:text-[#E8D5B7] text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-[#E8D5B7] mb-2">
                    {getTranslation(language, 'property')}: {selectedInquiry.home.title}
                  </p>
                  <p className="text-[#E8D5B7]/70 mb-4">
                    {getTranslation(language, 'user')}: {selectedInquiry.otherUser.name || selectedInquiry.otherUser.email.split('@')[0]}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8D5B7] mb-3">
                    {getTranslation(language, 'rating')}:
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`text-4xl transition-transform hover:scale-110 ${
                          star <= rating ? 'text-yellow-400' : 'text-[#E8D5B7]/30'
                        }`}
                      >
                        ⭐
                      </button>
                    ))}
                    <span className="ml-4 text-lg font-semibold text-[#E8D5B7]">
                      {rating}/5
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8D5B7] mb-2">
                    {getTranslation(language, 'comment')} ({getTranslation(language, 'optional')}):
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                    placeholder={getTranslation(language, 'commentPlaceholder')}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => {
                      setSelectedInquiry(null)
                      setComment('')
                      setRating(5)
                    }}
                    className="flex-1 px-6 py-3 bg-[#2D3748] hover:bg-[#2D3748]/80 text-[#E8D5B7] rounded-xl font-semibold transition-all"
                  >
                    {getTranslation(language, 'cancel')}
                  </button>
                  <button
                    onClick={handleSubmitRating}
                    disabled={submitting}
                    className="flex-1 px-6 py-3 bg-[#E8D5B7] hover:bg-[#D4C19F] text-[#2D3748] rounded-xl font-semibold transition-all disabled:opacity-50"
                  >
                    {submitting ? getTranslation(language, 'submitting') : getTranslation(language, 'submitRating')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



