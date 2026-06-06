'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'
import NotificationPopup from '@/app/components/NotificationPopup'
import { getCityName, getCountryName, getHomeTitle, getHomeStreet } from '@/lib/area-utils'

interface Inquiry {
  id: number
  key: string
  user: {
    id: number
    name: string | null
    email: string
    role: string
    rating: number
  }
  approved: boolean
  dismissed: boolean
  finalized: boolean
  createdAt: string
}

interface Home {
  id: number
  key: string
  title: string
  titleGreek?: string | null
  street: string | null
  streetGreek?: string | null
  city: string
  country: string
}

export default function HomeInquiriesPage() {
  const params = useParams()
  const router = useRouter()
  const { language } = useLanguage()
  const [home, setHome] = useState<Home | null>(null)
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [areas, setAreas] = useState<Array<{ city: string | null; cityGreek: string | null; country: string | null; countryGreek: string | null }>>([])
  const [highlightedInquiryId, setHighlightedInquiryId] = useState<number | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [confirmingInquiry, setConfirmingInquiry] = useState<Inquiry | null>(null)
  const [moveInDate, setMoveInDate] = useState('')
  const [moveOutDate, setMoveOutDate] = useState('')
  const [finalizing, setFinalizing] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const homeKey = params.homeKey as string
        
        // Check for inquiryId in URL query params
        const searchParams = new URLSearchParams(window.location.search)
        const inquiryIdParam = searchParams.get('inquiryId')
        if (inquiryIdParam) {
          setHighlightedInquiryId(parseInt(inquiryIdParam))
        }
        
        const response = await fetch(`/api/inquiries/${homeKey}`)
        
        if (!response.ok) {
          if (response.status === 403 || response.status === 404) {
            router.push('/homes/inquiries')
            return
          }
          throw new Error('Failed to fetch inquiries')
        }

        const data = await response.json()
        setHome(data.home)
        setInquiries(data.inquiries || [])

      } catch (error) {
        console.error('Error fetching inquiries:', error)
        router.push('/homes/inquiries')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.homeKey, router])
  
  // Scroll to highlighted inquiry when it loads
  useEffect(() => {
    if (highlightedInquiryId && inquiries.length > 0) {
      const element = document.getElementById(`inquiry-${highlightedInquiryId}`)
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.classList.add('ring-4', 'ring-yellow-500', 'ring-opacity-50')
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-yellow-500', 'ring-opacity-50')
          }, 3000)
        }, 500)
      }
    }
  }, [highlightedInquiryId, inquiries])

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

  const handleDismiss = async (inquiryId: number) => {
    if (!home) return

    setProcessingId(inquiryId)
    try {
      const response = await fetch(`/api/inquiries/${home.key}/${inquiryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      })

      if (!response.ok) {
        throw new Error('Failed to process inquiry')
      }

      // Refresh inquiries to get updated data (dismissed inquiries are marked, not deleted)
      const inquiriesRes = await fetch(`/api/inquiries/${home.key}`)
      if (inquiriesRes.ok) {
        const data = await inquiriesRes.json()
        setInquiries(data.inquiries || [])
      }
    } catch (error) {
      console.error('Error processing inquiry:', error)
      setNotification({ type: 'error', message: getTranslation(language, 'somethingWentWrong') })
    } finally {
      setProcessingId(null)
    }
  }

  const handleConfirmTenant = async () => {
    if (!home || !confirmingInquiry || !moveInDate || finalizing) return
    setFinalizing(true)
    try {
      const res = await fetch(`/api/inquiries/${home.key}/${confirmingInquiry.id}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moveInDate: new Date(moveInDate).toISOString(),
          moveOutDate: moveOutDate ? new Date(moveOutDate).toISOString() : undefined,
        }),
      })
      if (res.ok) {
        setNotification({ type: 'success', message: 'Finalization request sent to tenant.' })
        setConfirmingInquiry(null)
        setMoveInDate('')
        setMoveOutDate('')
        const refreshed = await fetch(`/api/inquiries/${home.key}`)
        if (refreshed.ok) setInquiries((await refreshed.json()).inquiries || [])
      } else {
        const data = await res.json()
        setNotification({ type: 'error', message: data.error || 'Failed to send finalization.' })
      }
    } catch {
      setNotification({ type: 'error', message: 'Something went wrong.' })
    } finally {
      setFinalizing(false)
    }
  }

  // Find the first unapproved and not dismissed inquiry (oldest)
  const unapprovedInquiries = inquiries.filter(inq => !inq.approved && !inq.dismissed)
  const currentInquiry = unapprovedInquiries.length > 0 ? unapprovedInquiries[0] : null
  const _currentIndex = currentInquiry ? inquiries.findIndex(inq => inq.id === currentInquiry.id) : -1

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <p className="text-[var(--text)]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  if (!home) {
    return null
  }

  return (
    <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/homes/inquiries"
            className="text-[var(--text-muted)] hover:text-[var(--text)] mb-4 inline-block transition-colors"
          >
            ← {getTranslation(language, 'back')}
          </Link>
          <Link
            href={`/homes/${home.key}?from=inquiries`}
            className="block group"
          >
            <h1 className="text-4xl font-bold text-[var(--text)] mb-2 group-hover:text-[var(--accent)] transition-colors">
              {getHomeTitle(language, home)}
            </h1>
          </Link>
          <p className="text-[var(--text-muted)]">
            {getHomeStreet(language, home) && `${getHomeStreet(language, home)}, `}
            {getCityName(home.city, areas, language)}, {getCountryName(home.country, areas, language)}
          </p>
        </div>

        {inquiries.length === 0 ? (
          <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-[var(--border-subtle)] text-center">
            <p className="text-[var(--text-muted)] text-lg">
              {getTranslation(language, 'noInquiriesForThisHome')}
            </p>
          </div>
        ) : (
          <>
            {unapprovedInquiries.length === 0 && inquiries.length > 0 && (
              <div className="bg-[var(--status-success-bg)] border border-[var(--status-success)] rounded-2xl p-4 mb-6 text-center">
                <p className="text-[var(--status-success)] font-semibold">
                  {getTranslation(language, 'allInquiriesProcessed')}
                </p>
              </div>
            )}
          <div className="space-y-4">
            {inquiries
              .filter(inq => !inq.dismissed) // Filter out dismissed inquiries
              .map((inquiry, _index) => {
              const isCurrent = inquiry.id === currentInquiry?.id
              const isApproved = inquiry.approved
              const isGrayedOut = !isCurrent && !isApproved
              const isHighlighted = inquiry.id === highlightedInquiryId

              return (
                <div
                  id={`inquiry-${inquiry.id}`}
                  key={inquiry.id}
                  className={`bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-6 shadow-xl border transition-all ${
                    isGrayedOut
                      ? 'border-[var(--border-subtle)] opacity-50'
                      : isApproved
                      ? 'border-[var(--status-success)]'
                      : isHighlighted
                      ? 'border-yellow-500/70 ring-4 ring-yellow-500/30'
                      : 'border-[var(--border-subtle)]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Link
                          href={`/profile?userId=${inquiry.user.id}&role=${inquiry.user.role || 'user'}`}
                          className="text-xl font-bold text-[var(--text)] hover:text-[var(--accent)] underline transition-colors cursor-pointer"
                        >
                          {inquiry.user.name || inquiry.user.email.split('@')[0]}
                        </Link>
                        {isApproved && (
                          <span className="bg-[var(--status-success-bg)] text-[var(--status-success)] px-3 py-1 rounded-full text-sm font-semibold">
                            {getTranslation(language, 'approved')}
                          </span>
                        )}
                      </div>
                      <p className="text-[var(--text-muted)] mb-2">{inquiry.user.email}</p>
                      <p className="text-[var(--text-muted)] text-xs mt-2">
                        {getTranslation(language, 'inquiryDate')}:{' '}
                        {new Date(inquiry.createdAt).toLocaleDateString(
                          language === 'el' ? 'el-GR' : 'en-US',
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      {isApproved && !inquiry.finalized && (
                        <button
                          onClick={() => setConfirmingInquiry(inquiry)}
                          className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all font-semibold text-sm"
                        >
                          Confirm tenant
                        </button>
                      )}
                      {isApproved && inquiry.finalized && (
                        <span className="bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-full text-sm font-semibold">
                          Deal closed
                        </span>
                      )}
                      {!isApproved && (
                        <>
                          {isCurrent ? (
                            <>
                              <button
                                onClick={() => router.push(`/homes/${home.key}/set-availability?inquiryId=${inquiry.id}`)}
                                disabled={processingId === inquiry.id}
                                className="px-6 py-3 bg-[var(--status-success)] hover:opacity-90 text-white rounded-xl transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {processingId === inquiry.id ? getTranslation(language, 'loading') : getTranslation(language, 'approve')}
                              </button>
                              <button
                                onClick={() => handleDismiss(inquiry.id)}
                                disabled={processingId === inquiry.id}
                                className="px-6 py-3 bg-[var(--status-error)] hover:opacity-90 text-white rounded-xl transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {processingId === inquiry.id ? getTranslation(language, 'loading') : getTranslation(language, 'dismiss')}
                              </button>
                            </>
                          ) : (
                            <p className="text-[var(--text)]/50 text-sm italic">{getTranslation(language, 'pendingApproval')}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            </div>
          </>
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

      {/* Confirm tenant modal */}
      {confirmingInquiry && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setConfirmingInquiry(null)}>
          <div className="bg-[var(--ink-soft)] rounded-3xl shadow-2xl border border-[var(--border-subtle)] max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[var(--text)]">Confirm this tenant</h2>
              <button onClick={() => setConfirmingInquiry(null)} className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl">×</button>
            </div>

            <div className="bg-[var(--ink-soft)]/50 rounded-xl p-4 border border-[var(--border-subtle)] mb-6">
              <p className="text-sm text-[var(--text-muted)] mb-1">Tenant</p>
              <p className="font-semibold text-[var(--text)]">{confirmingInquiry.user.name || confirmingInquiry.user.email.split('@')[0]}</p>
              <p className="text-sm text-[var(--text-muted)]">{confirmingInquiry.user.email}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="move-in-date" className="block text-sm font-medium text-[var(--text-muted)] mb-1">Move-in date <span className="text-red-400">*</span></label>
                <input
                  id="move-in-date"
                  type="date"
                  value={moveInDate}
                  onChange={e => setMoveInDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label htmlFor="move-out-date" className="block text-sm font-medium text-[var(--text-muted)] mb-1">Move-out date <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
                <input
                  id="move-out-date"
                  type="date"
                  value={moveOutDate}
                  onChange={e => setMoveOutDate(e.target.value)}
                  min={moveInDate || new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)] mb-6">
              A notification will be sent to the tenant to accept or decline. Once accepted, the deal is confirmed and ratings will unlock on schedule.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmingInquiry(null)}
                disabled={finalizing}
                className="flex-1 px-4 py-3 bg-[var(--ink-soft)] text-[var(--text)] rounded-xl font-semibold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTenant}
                disabled={finalizing || !moveInDate}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
              >
                {finalizing ? 'Sending...' : 'Send to tenant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

