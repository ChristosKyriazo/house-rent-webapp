'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'
import NotificationPopup from '@/app/components/NotificationPopup'

interface FinalizeNotification {
  id: number
  type: string
  message: string
  homeKey: string
  inquiryId: number | null
  createdAt: string
}

interface FinalizeNotificationModalProps {
  notification: FinalizeNotification | null
  onClose: () => void
  onApprove: () => void
  onDismiss: () => void
}

export default function FinalizeNotificationModal({
  notification,
  onClose,
  onApprove,
  onDismiss,
}: FinalizeNotificationModalProps) {
  const { language } = useLanguage()
  const router = useRouter()
  const [home, setHome] = useState<any>(null)
  const [sender, setSender] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  useEffect(() => {
    if (!notification || !notification.inquiryId) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        // Fetch inquiry details to get home and sender info
        const inquiryRes = await fetch(`/api/inquiries/${notification.homeKey}/${notification.inquiryId}`)
        if (inquiryRes.ok) {
          const inquiryData = await inquiryRes.json()
          setHome(inquiryData.home)
          
          // Determine sender: if notification is for owner, sender is user; if for user, sender is owner
          const profileRes = await fetch('/api/profile')
          if (profileRes.ok) {
            const profileData = await profileRes.json()
            if (profileData.user) {
              // If current user is owner, sender is the user who inquired
              // If current user is the inquirer, sender is the owner
              if (inquiryData.inquiry.user.id === profileData.user.id) {
                setSender(inquiryData.inquiry.home.owner)
              } else {
                setSender(inquiryData.inquiry.user)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching finalize data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [notification])

  const handleApprove = async () => {
    if (!notification || !notification.inquiryId || processing) return
    
    setProcessing(true)
    try {
      const response = await fetch(`/api/inquiries/${notification.homeKey}/${notification.inquiryId}/finalize`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })

      if (response.ok) {
        onApprove()
        // Redirect to rating page based on role
        // Need to determine if current user is owner or user
        const profileRes = await fetch('/api/profile')
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          if (profileData.user) {
            const userRole = profileData.user.role || 'user'
            if (userRole === 'owner' || userRole === 'both') {
              router.push('/homes/rate-user')
            } else {
              router.push('/homes/rate-owner')
            }
          } else {
            router.push('/homes/approved')
          }
        } else {
          router.push('/homes/approved')
        }
      } else {
        const data = await response.json()
        setToast({ type: 'error', message: data.error || getTranslation(language, 'finalizeFailed') })
      }
    } catch (error) {
      console.error('Error approving finalization:', error)
      setToast({ type: 'error', message: getTranslation(language, 'finalizeFailed') })
    } finally {
      setProcessing(false)
    }
  }

  const handleDismiss = async () => {
    if (!notification || !notification.inquiryId || processing) return
    
    setProcessing(true)
    try {
      const response = await fetch(`/api/inquiries/${notification.homeKey}/${notification.inquiryId}/finalize`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      })

      if (response.ok) {
        onDismiss()
      } else {
        const data = await response.json()
        setToast({ type: 'error', message: data.error || getTranslation(language, 'finalizeFailed') })
      }
    } catch (error) {
      console.error('Error dismissing finalization:', error)
      setToast({ type: 'error', message: getTranslation(language, 'finalizeFailed') })
    } finally {
      setProcessing(false)
    }
  }

  if (!notification) return null

  return (
    <>
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1A202C] rounded-3xl shadow-2xl border border-[#E8D5B7]/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-[#E8D5B7]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-2xl font-bold text-[#E8D5B7]">
              {getTranslation(language, 'finalizeDeal')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#E8D5B7]/70 hover:text-[#E8D5B7] transition-colors text-2xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-[#E8D5B7]/70">{getTranslation(language, 'loading')}</p>
            </div>
          ) : (
            <>
              {/* Warning Message */}
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4">
                <p className="text-yellow-400 font-semibold text-center">
                  {getTranslation(language, 'finalizeDealDescription')}
                </p>
              </div>

              {/* House Information */}
              {home && (
                <div className="bg-[#2D3748]/50 rounded-xl p-4 border border-[#E8D5B7]/20">
                  <h3 className="text-lg font-semibold text-[#E8D5B7] mb-3">
                    {getTranslation(language, 'propertyInformation')}
                  </h3>
                  <div className="space-y-2 text-[#E8D5B7]/80">
                    <p><span className="font-semibold">{getTranslation(language, 'title')}:</span> {home.title}</p>
                    {home.street && (
                      <p>
                        <span className="font-semibold">{getTranslation(language, 'street')}:</span> {home.street}
                      </p>
                    )}
                    <p>
                      <span className="font-semibold">{getTranslation(language, 'city')}:</span> {home.city}, {home.country}
                    </p>
                    <p>
                      <span className="font-semibold">{getTranslation(language, 'pricePerMonth')}:</span> €{home.pricePerMonth?.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Sender Information */}
              {sender && (
                <div className="bg-[#2D3748]/50 rounded-xl p-4 border border-[#E8D5B7]/20">
                  <h3 className="text-lg font-semibold text-[#E8D5B7] mb-3">
                    {getTranslation(language, 'senderInformation')}
                  </h3>
                  <div className="space-y-2 text-[#E8D5B7]/80">
                    <p>
                      <span className="font-semibold">{getTranslation(language, 'name')}:</span> {sender.name || sender.email.split('@')[0]}
                    </p>
                    <p>
                      <span className="font-semibold">{getTranslation(language, 'email')}:</span> {sender.email}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleDismiss}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-xl font-semibold transition-all disabled:opacity-50"
                >
                  {getTranslation(language, 'dismissFinalization')}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
                >
                  {processing ? getTranslation(language, 'loading') : getTranslation(language, 'approveFinalization')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

    {toast && (
      <NotificationPopup
        type={toast.type}
        message={toast.message}
        language={language}
        onClose={() => setToast(null)}
        className="z-[10001]"
      />
    )}
    </>
  )
}

