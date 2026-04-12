'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'
import NotificationPopup from '@/app/components/NotificationPopup'
import { getCityName, getCountryName } from '@/lib/area-utils'

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
  createdAt: string
}

interface Home {
  id: number
  key: string
  title: string
  street: string | null
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

  // Find the first unapproved and not dismissed inquiry (oldest)
  const unapprovedInquiries = inquiries.filter(inq => !inq.approved && !inq.dismissed)
  const currentInquiry = unapprovedInquiries.length > 0 ? unapprovedInquiries[0] : null
  const currentIndex = currentInquiry ? inquiries.findIndex(inq => inq.id === currentInquiry.id) : -1

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
              {home.title}
            </h1>
          </Link>
          <p className="text-[var(--text-muted)]">
            {home.street && `${home.street}, `}
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
              <div className="bg-green-500/20 border border-green-500/50 rounded-2xl p-4 mb-6 text-center">
                <p className="text-green-400 font-semibold">
                  {getTranslation(language, 'allInquiriesProcessed')}
                </p>
              </div>
            )}
          <div className="space-y-4">
            {inquiries
              .filter(inq => !inq.dismissed) // Filter out dismissed inquiries
              .map((inquiry, index) => {
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
                      ? 'border-green-500/50'
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
                          <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-semibold">
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

                    {!isApproved && (
                      <div className="flex items-center gap-3 ml-4">
                        {isCurrent ? (
                          <>
                            <button
                              onClick={() => router.push(`/homes/${home.key}/set-availability?inquiryId=${inquiry.id}`)}
                              disabled={processingId === inquiry.id}
                              className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processingId === inquiry.id
                                ? getTranslation(language, 'loading')
                                : getTranslation(language, 'approve')}
                            </button>
                            <button
                              onClick={() => handleDismiss(inquiry.id)}
                              disabled={processingId === inquiry.id}
                              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processingId === inquiry.id
                                ? getTranslation(language, 'loading')
                                : getTranslation(language, 'dismiss')}
                            </button>
                          </>
                        ) : (
                          <p className="text-[var(--text)]/50 text-sm italic">
                            {getTranslation(language, 'pendingApproval')}
                          </p>
                        )}
                      </div>
                    )}
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
    </div>
  )
}

