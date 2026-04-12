'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { useRole } from '@/app/contexts/RoleContext'
import { getTranslation } from '@/lib/translations'
import Link from 'next/link'
import NotificationPopup from '@/app/components/NotificationPopup'
import ConfirmDialog from '@/app/components/ConfirmDialog'

interface Booking {
  id: number
  key: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  status: string
  userId?: number
  owner: {
    id: number
    name: string | null
    email: string
    occupation?: string | null
    role?: string
  }
  user: {
    id: number
    name: string | null
    email: string
    occupation?: string | null
  }
  home?: {
    key: string
    title: string
    street?: string
    city?: string
    country?: string
  }
}

interface UserRatings {
  ownerRating: number | null
  ownerCount: number
  renterRating: number | null
  renterCount: number
}

interface HouseRatings {
  houseOwnerRating: number | null
  houseOwnerCount: number
}

interface BookingDetailsModalProps {
  booking: Booking | null
  onClose: () => void
  isOwner: boolean
  onReschedule?: () => void
  onCancel?: () => void
  currentUserId?: number
}

export default function BookingDetailsModal({ booking, onClose, isOwner, onReschedule, onCancel, currentUserId }: BookingDetailsModalProps) {
  const { language } = useLanguage()
  const [ratings, setRatings] = useState<UserRatings | null>(null)
  const [houseRatings, setHouseRatings] = useState<HouseRatings | null>(null)
  const [loadingRatings, setLoadingRatings] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  
  // Check if current user is the user (not owner) in this booking
  const isUser = currentUserId && booking && (booking.userId === currentUserId || booking.user.id === currentUserId)
  
  // Check if owner is a broker
  const isBroker = booking?.owner?.role === 'broker'
  // Check if user is viewing (not owner)
  const isUserViewing = !isOwner && isUser

  // Check if booking can be rescheduled
  // Users: scheduled status, >24 hours away
  // Owners: scheduled status, anytime
  const canReschedule = booking?.status === 'scheduled' && (
    isUser 
      ? (new Date(booking.startTime).getTime() - new Date().getTime()) > 24 * 60 * 60 * 1000
      : !isUser // Owners can reschedule anytime
  )

  // Check if booking can be cancelled (both user and owner, scheduled status, and meeting hasn't started)
  const now = new Date()
  const meetingStartTime = booking ? new Date(booking.startTime) : null
  const canCancel = booking?.status === 'scheduled' && 
                   (isUser || isOwner) && 
                   meetingStartTime && 
                   meetingStartTime > now // Meeting hasn't started yet

  const handleCancelClick = () => {
    if (!booking || !onCancel) return
    setCancelConfirmOpen(true)
  }

  const performCancelBooking = async () => {
    if (!booking || !onCancel) return

    setCancelConfirmOpen(false)
    setCancelling(true)
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel booking')
      }

      onCancel()
      onClose()
    } catch (error) {
      console.error('Error cancelling booking:', error)
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : getTranslation(language, 'somethingWentWrong'),
      })
    } finally {
      setCancelling(false)
    }
  }

  useEffect(() => {
    if (!booking) return

    const fetchRatings = async () => {
      setLoadingRatings(true)
      try {
        // If user viewing a broker's booking, get house ratings instead of broker ratings
        if (isUserViewing && isBroker && booking.home?.key) {
          // Fetch house ratings for broker-owned properties
          const homeResponse = await fetch(`/api/homes/${booking.home.key}`)
          if (homeResponse.ok) {
            const homeData = await homeResponse.json()
            if (homeData.home?.owner?.ratings) {
              setHouseRatings({
                houseOwnerRating: homeData.home.owner.ratings.ownerRating,
                houseOwnerCount: homeData.home.owner.ratings.ownerCount,
              })
            }
          }
        } else {
          // If user viewing, get owner ratings. If owner viewing, get user ratings
          const targetUserId = isOwner ? booking.user.id : booking.owner.id
          const response = await fetch(`/api/ratings?userId=${targetUserId}`)
          if (response.ok) {
            const data = await response.json()
            setRatings(data.ratings)
          }
        }
      } catch (error) {
        console.error('Error fetching ratings:', error)
      } finally {
        setLoadingRatings(false)
      }
    }

    fetchRatings()
  }, [booking, isOwner, isUserViewing, isBroker])

  if (!booking) return null

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString(language === 'el' ? 'el-GR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const otherPerson = isOwner ? booking.user : booking.owner
  const ratingType = isOwner ? 'renter' : 'owner'
  
  // For user viewing broker: use house ratings, otherwise use person ratings
  const relevantRating = isUserViewing && isBroker 
    ? houseRatings?.houseOwnerRating 
    : (isOwner ? ratings?.renterRating : ratings?.ownerRating)
  const relevantCount = isUserViewing && isBroker
    ? houseRatings?.houseOwnerCount
    : (isOwner ? ratings?.renterCount : ratings?.ownerCount)
  
  // Determine if rating should be clickable (only for house ratings when user views broker)
  const isRatingClickable = isUserViewing && isBroker && booking.home?.key && relevantRating !== null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[var(--ink-soft)] rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-subtle)] shadow-2xl animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-[var(--text)]">
            {getTranslation(language, 'bookingDetails')}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* Booking Information */}
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-[var(--text)] mb-2">
              {booking.title}
            </h3>
            {booking.description && (
              <p className="text-[var(--text-muted)]">{booking.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                {getTranslation(language, 'date')}
              </label>
              <p className="text-[var(--text)]">{formatDate(booking.startTime)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                {getTranslation(language, 'time')}
              </label>
              <p className="text-[var(--text)]">
                {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                {getTranslation(language, 'status')}
              </label>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                booking.status === 'scheduled'
                  ? 'bg-blue-500/20 text-blue-400'
                  : booking.status === 'completed'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {booking.status}
              </span>
            </div>
          </div>

          {booking.home && (
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  {getTranslation(language, 'property')}
                </label>
                <Link
                  href={`/homes/${booking.home.key}`}
                  className="text-[var(--text)] hover:text-[var(--accent)] underline"
                >
                  {booking.home.title}
                </Link>
              </div>
              {(booking.home.street || booking.home.city || booking.home.country) && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                    {getTranslation(language, 'address')}
                  </label>
                  <p className="text-[var(--text)]">
                    {[booking.home.street, booking.home.city, booking.home.country]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Other Person Information */}
          <div className="border-t border-[var(--border-subtle)] pt-6">
            <h3 className="text-xl font-semibold text-[var(--text)] mb-4">
              {isOwner ? getTranslation(language, 'userInformation') : getTranslation(language, 'ownerInformation')}
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  {getTranslation(language, 'name')}
                </label>
                <p className="text-[var(--text)]">
                  {otherPerson.name || getTranslation(language, 'notSet')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  {getTranslation(language, 'email')}
                </label>
                <p className="text-[var(--text)]">{otherPerson.email}</p>
              </div>
              {otherPerson.occupation && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                    {getTranslation(language, 'occupation')}
                  </label>
                  <p className="text-[var(--text)]">{otherPerson.occupation}</p>
                </div>
              )}

              {/* Ratings */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  {isUserViewing && isBroker ? getTranslation(language, 'houseRatings') || 'House Ratings' : getTranslation(language, 'ratings')}
                </label>
                {loadingRatings ? (
                  <p className="text-[var(--text-muted)]">{getTranslation(language, 'loading')}</p>
                ) : relevantRating ? (
                  <Link
                    href={isRatingClickable ? `/homes/ratings/${booking.home?.key}` : '#'}
                    onClick={(e) => {
                      if (!isRatingClickable) {
                        e.preventDefault()
                      }
                    }}
                    className={isRatingClickable ? 'flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer' : 'flex items-center gap-2'}
                  >
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={`text-2xl ${
                            i < Math.round(relevantRating)
                              ? 'text-yellow-400'
                              : 'text-[var(--text)]/30'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-[var(--text)] font-semibold">
                      {relevantRating.toFixed(1)}
                    </span>
                    <span className="text-[var(--text-muted)] text-sm">
                      ({relevantCount} {getTranslation(language, 'ratings')})
                    </span>
                    {isRatingClickable && (
                      <span className="text-[var(--text-muted)] text-xs ml-2 underline">
                        {getTranslation(language, 'viewAll') || 'View all'}
                      </span>
                    )}
                  </Link>
                ) : (
                  <p className="text-[var(--text-muted)]">
                    {getTranslation(language, 'noRatingsYet')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-end gap-4">
          {canCancel && onCancel && (
            <button
              onClick={handleCancelClick}
              disabled={cancelling}
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? getTranslation(language, 'cancelling') : getTranslation(language, 'cancelBooking')}
            </button>
          )}
          {canReschedule && onReschedule && (
            <button
              onClick={() => {
                onReschedule()
                onClose()
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold"
            >
              {getTranslation(language, 'reschedule')}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-3 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] rounded-xl hover:bg-[var(--btn-primary-hover-bg)] transition-all font-semibold"
          >
            {getTranslation(language, 'close')}
          </button>
        </div>
      </div>

      {toast && (
        <NotificationPopup
          type={toast.type}
          message={toast.message}
          language={language}
          onClose={() => setToast(null)}
          className="z-[60]"
        />
      )}

      <ConfirmDialog
        open={cancelConfirmOpen}
        message={getTranslation(language, 'confirmCancelBooking')}
        onConfirm={performCancelBooking}
        onCancel={() => setCancelConfirmOpen(false)}
        language={language}
        variant="danger"
      />
    </div>
  )
}

