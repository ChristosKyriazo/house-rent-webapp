'use client'

import { Suspense, useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { useRole } from '@/app/contexts/RoleContext'
import { getTranslation, translateValue } from '@/lib/translations'
import { getAreaName, getCityName, getCountryName, getHomeTitle, getHomeStreet } from '@/lib/area-utils'
import { useTranslatedDescription } from '@/app/hooks/useTranslatedDescription'
import StarRating from '@/app/components/StarRating'
import NotificationPopup from '@/app/components/NotificationPopup'
import ConfirmDialog from '@/app/components/ConfirmDialog'

interface Home {
  id: number
  key: string
  title: string
  titleGreek?: string | null
  description: string | null
  descriptionGreek: string | null
  street: string | null
  streetGreek?: string | null
  city: string
  country: string
  area: string | null
  listingType: string
  pricePerMonth: number
  bedrooms: number
  bathrooms: number
  floor: number | null
  heatingCategory: string | null
  heatingAgent: string | null
  parking: boolean | null
  sizeSqMeters: number | null
  yearBuilt: number | null
  yearRenovated: number | null
  availableFrom: string
  photos: string | null
  closestMetro: number | null
  closestSchool: number | null
  closestHospital: number | null
  closestPark: number | null
  closestUniversity: number | null
  energyClass: string | null
  owner: {
    id: number
    email: string
    name: string | null
    role: string
    createdAt: string
    isBroker?: boolean
  }
  ratings?: {
    houseScore: number | null
    ownerScore: number | null
    combinedScore: number | null
    totalRatings: number
    reviews: Array<{ comment: string; raterName: string | null; createdAt: string; type: string }>
  }
}

function HomeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const [home, setHome] = useState<Home | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [showOwnerModal, setShowOwnerModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false)
  const [lightboxPhotoIndex, setLightboxPhotoIndex] = useState(0)
  const [thumbnailScrollPosition, setThumbnailScrollPosition] = useState(0)
  const [_thumbnailScrollRatio, setThumbnailScrollRatio] = useState(1)
  const [sliderTrackWidth, setSliderTrackWidth] = useState(400)
  const [isDragging, setIsDragging] = useState(false)
  const [inquiryStatus, setInquiryStatus] = useState<'inquired' | 'approved' | 'dismissed' | null>(null)
  const [inquiryId, setInquiryId] = useState<number | null>(null)
  const [isFinalized, setIsFinalized] = useState(false)
  const [finalizeRequestSent, setFinalizeRequestSent] = useState(false)
  const [pendingFinalization, setPendingFinalization] = useState(false)
  const [updatingInquiry, setUpdatingInquiry] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [dismissingFinalization, setDismissingFinalization] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [areas, setAreas] = useState<Array<{ name: string; nameGreek: string | null; city: string | null; cityGreek: string | null; country: string | null; countryGreek: string | null; safety: number | null; vibe: string | null }>>([])
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [rejectFinalizationConfirmOpen, setRejectFinalizationConfirmOpen] = useState(false)
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false)
  const [hasBookableAvailability, setHasBookableAvailability] = useState(false)
  const [hasScheduledViewingAppointment, setHasScheduledViewingAppointment] = useState(false)
  const { selectedRole, actualRole } = useRole()
  const thumbnailScrollRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef<string>('')
  
  // Translate description based on current language
  const { translatedDescription } = useTranslatedDescription(
    home?.description || null,
    home?.descriptionGreek || null
  )
  
  // Determine display role for UI: if user has "both" role, use selectedRole, otherwise use actualRole or userRole
  const displayRole = (actualRole === 'both' && selectedRole) 
    ? selectedRole 
    : (actualRole || userRole || 'user')

  // Parse photos safely - use useMemo to ensure consistent hook order
   
   
  const photos = useMemo(() => {
    if (!home || !home.photos || home.photos.trim() === '') {
      return []
    }
    try {
      const parsed = JSON.parse(home.photos)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.error('Error parsing photos:', error)
      return []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home?.photos])

  const fromParam = searchParams.get('from')
  const fromMyListings = fromParam === 'my-listings'
  const fromApproved = fromParam === 'approved'
  const fromInquiries = fromParam === 'inquiries'
  const fromCalendar = fromParam === 'calendar'
  const fromMyInquiries = fromParam === 'my-inquiries'

  // Get filter type from sessionStorage to preserve it in return link
  const fromMap = fromParam === 'map'

  const getReturnUrl = () => {
    if (fromMyListings) return '/homes/my-listings'
    if (fromApproved) return '/homes/approved'
    if (fromInquiries) return '/homes/inquiries'
    if (fromCalendar) return '/homes/calendar'
    if (fromMyInquiries) return '/homes/my-inquiries'
    if (fromMap) return null // handled via router.back()

    // Check if we have stored filter type in sessionStorage
    try {
      const storedFilterType = sessionStorage.getItem('homesFilterType')
      if (storedFilterType === 'ai' || storedFilterType === 'manual') {
        return `/homes?filter=${storedFilterType}`
      }
    } catch {
      // Ignore sessionStorage errors
    }

    return '/homes'
  }

  const getReturnButtonText = () => {
    if (fromMyListings) return getTranslation(language, 'returnToListings') || 'Return to Listings'
    if (fromApproved) return getTranslation(language, 'returnToApproved') || 'Return to Approved Listings'
    if (fromInquiries) return getTranslation(language, 'returnToInquiries') || 'Return to Inquiries'
    if (fromCalendar) return getTranslation(language, 'returnToCalendar') || 'Return to Calendar'
    if (fromMyInquiries) return getTranslation(language, 'returnToMyInquiries') || 'Return to My Inquiries'
    if (fromMap) return language === 'el' ? '← Πίσω στον χάρτη' : '← Back to map'
    return getTranslation(language, 'returnToSearch') || 'Return to Search'
  }

  const fetchHomeData = async (signal?: AbortSignal) => {
    try {
      const homeId = params.id as string
      const fetchOpts = (extra?: RequestInit) => ({ signal, ...extra })

      // Fetch profile + home in parallel — eliminates waterfall
      const [profileResponse, homeResponse] = await Promise.all([
        fetch('/api/profile', fetchOpts()),
        fetch(`/api/homes/${homeId}`, fetchOpts({ cache: 'no-store' })),
      ])

      if (signal?.aborted) return

      let profileData = null
      if (profileResponse.ok) {
        profileData = await profileResponse.json()
        if (profileData.user) {
          setCurrentUserId(profileData.user.id)
          setUserRole(profileData.user.role || 'user')
        }
      }

      if (!homeResponse.ok) { router.push('/homes'); return }
      const data = await homeResponse.json()
      if (!data.home) { router.push('/homes'); return }
      setHome(data.home)
      setHasBookableAvailability(false)
      setHasScheduledViewingAppointment(false)

      // Check if user has an inquiry for this home and its status
      if (profileData && profileData.user) {
        // Fetch inquiries + notifications in parallel
        const [inquiriesRes, notificationsRes] = await Promise.all([
          fetch('/api/inquiries', fetchOpts()),
          fetch('/api/notifications', fetchOpts()),
        ])

        if (signal?.aborted) return

        let currentInquiryId: number | null = null
        if (inquiriesRes.ok) {
          const inquiriesData = await inquiriesRes.json()
          if (inquiriesData.inquiryStatus) {
            const status = inquiriesData.inquiryStatus[data.home.id] || null
            setInquiryStatus(status)
            currentInquiryId = inquiriesData.inquiryIds?.[data.home.id] ?? null
            if (currentInquiryId) setInquiryId(currentInquiryId)
            if (inquiriesData.finalizedHomes?.[data.home.id]) setIsFinalized(true)
            if (status === 'dismissed') {
              setToast({ type: 'info', message: language === 'el' ? 'Ο ιδιοκτήτης δεν επέλεξε το αίτημά σας. Συνεχίστε την αναζήτηση.' : 'The owner declined your inquiry. Continue searching below.' })
              setTimeout(() => router.push('/homes'), 3000)
              return
            }
          }
        }

        if (notificationsRes.ok && currentInquiryId) {
          const notificationsData = await notificationsRes.json()
          const pendingFinalize = notificationsData.notifications?.find(
            (n: { type: string; inquiryId: number | null; viewed: boolean }) =>
              n.type === 'finalize' && n.inquiryId === currentInquiryId && !n.viewed
          )
          if (pendingFinalize) setPendingFinalization(true)
        }

        if (currentInquiryId) {
          // Fetch approved inquiries for users in parallel with availability check
          const isRenterViewing = data.home.owner.id !== profileData.user.id
          const isUser = profileData.user.role === 'user' || (profileData.user.role === 'both' && displayRole === 'user')
          const hasApprovedInquiry = isRenterViewing && status === 'approved'

          const parallelFetches: Promise<Response>[] = []
          if (isUser) parallelFetches.push(fetch(`/api/inquiries/approved?role=user`, fetchOpts()))
          if (hasApprovedInquiry) {
            parallelFetches.push(
              fetch(`/api/homes/${data.home.key}/availability`, fetchOpts()),
              fetch(`/api/bookings?inquiryId=${currentInquiryId}`, fetchOpts()),
            )
          }

          const parallelResults = await Promise.all(parallelFetches)
          if (signal?.aborted) return

          let idx = 0
          if (isUser) {
            const approvedRes = parallelResults[idx++]
            if (approvedRes?.ok) {
              const approvedData = await approvedRes.json()
              const approvedInquiry = approvedData.approvedInquiries?.find((inq: { id: number; waitingForFinalization?: boolean }) => inq.id === currentInquiryId)
              if (approvedInquiry?.waitingForFinalization) setPendingFinalization(true)
            }
          }

          if (hasApprovedInquiry) {
            const avRes = parallelResults[idx++]
            const bookingsRes = parallelResults[idx++]
            if (bookingsRes?.ok) {
              const bookingsData = await bookingsRes.json()
              setHasScheduledViewingAppointment(
                (bookingsData.bookings || []).some((b: { status?: string }) => (b.status || '').toLowerCase() === 'scheduled')
              )
            }
            if (avRes?.ok) {
              const avData = await avRes.json()
              const today = new Date(); today.setHours(0, 0, 0, 0)
              setHasBookableAvailability(
                (avData.availabilities || []).some((a: { date: string; inquiryId: number | null }) => {
                  const d = new Date(a.date)
                  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
                  return day >= today && (a.inquiryId == null || a.inquiryId === currentInquiryId)
                })
              )
            }
          }

        }
        
        // For owners: check if they have approved inquiries for this home
        // Also check if inquiryId is provided in URL params
        const inquiryIdParam = searchParams.get('inquiryId')
        if (inquiryIdParam) {
          const inquiryIdNum = parseInt(inquiryIdParam)
          if (!isNaN(inquiryIdNum)) {
            setInquiryId(inquiryIdNum)
            setInquiryStatus('approved')
          }
        }
        
        if ((profileData.user.role === 'owner' || profileData.user.role === 'both') && data.home.owner.id === profileData.user.id) {
          const approvedInquiriesRes = await fetch(`/api/inquiries/approved?role=owner`)
          if (approvedInquiriesRes.ok) {
            const approvedData = await approvedInquiriesRes.json()
            const approvedInquiry = approvedData.approvedInquiries?.find((inq: { id: number; home: { key: string }; finalized?: boolean; waitingForFinalization?: boolean }) =>
              inquiryIdParam ? inq.id === parseInt(inquiryIdParam) : inq.home.key === data.home.key
            )
            if (approvedInquiry) {
              setInquiryId(approvedInquiry.id)
              setInquiryStatus('approved')
              if (approvedInquiry.finalized) {
                setIsFinalized(true)
              }
              if (approvedInquiry.waitingForFinalization) {
                setPendingFinalization(true)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      router.push('/homes')
    } finally {
      setLoading(false)
    }
  }

   
   
  useEffect(() => {
    if (!params.id) return
    const controller = new AbortController()
    fetchHomeData(controller.signal)
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router])

  // Check for pending finalization when inquiryId changes
  useEffect(() => {
    const checkPendingFinalization = async () => {
      // Calculate isOwner here to avoid dependency issues
      const userIsOwner = currentUserId !== null && home !== null && home.owner.id === currentUserId
      
      if (inquiryId && !userIsOwner) {
        try {
          const notificationsRes = await fetch('/api/notifications')
          if (notificationsRes.ok) {
            const notificationsData = await notificationsRes.json()
            const pendingFinalize = notificationsData.notifications?.find(
              (n: { type: string; inquiryId: number; viewed: boolean }) => n.type === 'finalize' && n.inquiryId === inquiryId && !n.viewed
            )
            if (pendingFinalize) {
              setPendingFinalization(true)
            }
          }
        } catch (error) {
          console.error('Error checking pending finalization:', error)
        }
      }
    }

    checkPendingFinalization()
  }, [inquiryId, currentUserId, home])


  const handleFinalize = async () => {
    if (!home || !inquiryId || finalizing || isFinalized || finalizeRequestSent) return
    
    setFinalizing(true)
    try {
      const response = await fetch(`/api/inquiries/${home.key}/${inquiryId}/finalize`, {
        method: 'POST',
      })
      
      if (response.ok) {
        setFinalizeRequestSent(true)
      } else {
        const data = await response.json()
        setToast({ type: 'error', message: data.error || getTranslation(language, 'finalizeFailed') })
      }
    } catch (error) {
      console.error('Error finalizing:', error)
      setToast({ type: 'error', message: getTranslation(language, 'finalizeFailed') })
    } finally {
      setFinalizing(false)
    }
  }

  const handleApproveFinalization = async () => {
    if (!home || !inquiryId || finalizing || isFinalized) return
    
    setFinalizing(true)
    try {
      const response = await fetch(`/api/inquiries/${home.key}/${inquiryId}/finalize`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      
      if (response.ok) {
        setIsFinalized(true)
        setPendingFinalization(false)
        router.refresh()
      } else {
        const data = await response.json()
        setToast({ type: 'error', message: data.error || getTranslation(language, 'finalizeFailed') })
      }
    } catch (error) {
      console.error('Error approving finalization:', error)
      setToast({ type: 'error', message: getTranslation(language, 'finalizeFailed') })
    } finally {
      setFinalizing(false)
    }
  }

  const handleRejectFinalization = () => {
    if (!home || !inquiryId || dismissingFinalization) return
    setRejectFinalizationConfirmOpen(true)
  }

  const confirmRejectFinalization = async () => {
    if (!home || !inquiryId) return

    setRejectFinalizationConfirmOpen(false)
    setDismissingFinalization(true)
    try {
      const response = await fetch(`/api/inquiries/${home.key}/${inquiryId}/finalize`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      })
      
      if (response.ok) {
        router.push('/homes')
      } else {
        const data = await response.json()
        setToast({ type: 'error', message: data.error || getTranslation(language, 'somethingWentWrong') })
      }
    } catch (error) {
      console.error('Error rejecting finalization:', error)
      setToast({ type: 'error', message: getTranslation(language, 'somethingWentWrong') })
    } finally {
      setDismissingFinalization(false)
    }
  }

  const handleInquiry = async () => {
    if (!home || updatingInquiry) return
    
    setUpdatingInquiry(true)
    
    try {
      if (inquiryStatus === 'inquired') {
        // Remove inquiry (only if it's not approved or dismissed)
        const response = await fetch(`/api/inquiries?homeId=${home.id}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setInquiryStatus(null)
        } else {
          const text = await response.text()
          let data = {}
          try {
            data = JSON.parse(text)
          } catch {
            data = { error: text || 'Unknown error' }
          }
          console.error('Failed to remove inquiry:', data, response.status)
        }
      } else if (!inquiryStatus) {
        // Create inquiry (only if no inquiry exists)
        const response = await fetch('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ homeId: home.id }),
        })
        if (response.ok) {
          setInquiryStatus('inquired')
        } else {
          const text = await response.text()
          let data = {}
          try {
            data = JSON.parse(text)
          } catch {
            data = { error: text || 'Unknown error' }
          }
          console.error('Failed to create inquiry:', data, response.status)
        }
      }
    } catch (error) {
      console.error('Error updating inquiry:', error)
    } finally {
      setUpdatingInquiry(false)
    }
  }

  // Calculate slider track width
  useEffect(() => {
    const updateTrackWidth = () => {
      if (thumbnailScrollRef.current?.parentElement) {
        setSliderTrackWidth(thumbnailScrollRef.current.parentElement.clientWidth - 32)
      }
    }
    
    updateTrackWidth()
    window.addEventListener('resize', updateTrackWidth)
    return () => window.removeEventListener('resize', updateTrackWidth)
  }, [photos.length])

  // Handle keyboard navigation in lightbox
  useEffect(() => {
    if (!showPhotoLightbox) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setLightboxPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
      } else if (e.key === 'ArrowRight') {
        setLightboxPhotoIndex((prev) => (prev + 1) % photos.length)
      } else if (e.key === 'Escape') {
        setShowPhotoLightbox(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showPhotoLightbox, photos.length])

  // Fire view tracking event once the listing is loaded
  useEffect(() => {
    if (!home) return
    const startTimeMs = Date.now()
    const sid = (() => {
      if (typeof window === 'undefined') return ''
      let s = sessionStorage.getItem('kaparro_sid')
      if (!s) {
        s = crypto.randomUUID()
        sessionStorage.setItem('kaparro_sid', s)
      }
      return s
    })()
    sessionIdRef.current = sid
    const source = searchParams.get('from') || 'direct'

    fetch(`/api/homes/${params.id}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, sessionId: sid }),
    }).catch(() => {})

    return () => {
      const durationSeconds = Math.floor((Date.now() - startTimeMs) / 1000)
      if (durationSeconds < 1) return
      const payload = JSON.stringify({ sessionId: sid, durationSeconds })
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`/api/homes/${params.id}/view/duration`, payload)
      }
    }
  }, [home?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch areas for translation
  useEffect(() => {
    fetch('/api/areas')
      .then((res) => res.json())
      .then((data) => {
        setAreas(data.areas || [])
      })
      .catch((error) => {
        console.error('Error fetching areas:', error)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <p className="text-[var(--text)]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  if (!home) {
    return (
      <div className="min-h-screen bg-[var(--canvas)] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-[var(--text)] text-xl font-semibold">
          {language === 'el' ? 'Η αγγελία δεν βρέθηκε' : 'Listing not found'}
        </p>
        <Link href="/homes" className="px-4 py-2 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-sm font-semibold hover:bg-[var(--btn-primary-hover-bg)] transition-all">
          {language === 'el' ? '← Πίσω στις αγγελίες' : '← Back to listings'}
        </Link>
      </div>
    )
  }

  const nextPhoto = () => {
    if (photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)
  }
  }

  const prevPhoto = () => {
    if (photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
    }
  }

  const nextLightboxPhoto = () => {
    if (photos.length > 0) {
      setLightboxPhotoIndex((prev) => (prev + 1) % photos.length)
    }
  }

  const prevLightboxPhoto = () => {
    if (photos.length > 0) {
      setLightboxPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
    }
  }

  const openLightbox = (index: number) => {
    setLightboxPhotoIndex(index)
    setShowPhotoLightbox(true)
  }

  const closeLightbox = () => {
    setShowPhotoLightbox(false)
  }

  
  // Determine display text for listing type
  // Owners see "sell" for their own listings, "buy" for others
  // Users always see "buy" for sale listings
  const isOwner = currentUserId !== null && home.owner.id === currentUserId
  // Check if user has owner/broker role (for finalize button visibility)
  const isOwnerOrBroker = displayRole === 'owner' || displayRole === 'broker' || actualRole === 'owner' || actualRole === 'broker' || actualRole === 'both'
  const displayListingType = home.listingType === 'rent' 
    ? 'rent' 
    : (isOwner ? 'sell' : 'buy')

  return (
    <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button and Edit Button */}
        <div className="flex items-center justify-between">
          {fromMap ? (
            <button
              onClick={() => router.back()}
              className="inline-flex items-center px-4 py-2 text-[var(--text)] hover:text-[var(--accent)] transition-colors"
            >
              {getReturnButtonText()}
            </button>
          ) : (
            <Link
              href={getReturnUrl() ?? '/homes'}
              className="inline-flex items-center px-4 py-2 text-[var(--text)] hover:text-[var(--accent)] transition-colors"
            >
              ← {getReturnButtonText()}
            </Link>
          )}
          {fromMyListings && (
            <Link
              href={`/homes/${home.key}/edit`}
              className="px-4 py-2 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] rounded-xl hover:bg-[var(--btn-primary-hover-bg)] transition-all font-semibold text-sm"
            >
              {getTranslation(language, 'edit')}
            </Link>
          )}
        </div>

        {/* Photo Gallery - Full Width */}
        <div>
            {photos.length > 0 ? (
              <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl overflow-hidden shadow-xl border border-[var(--border-subtle)]">
                {/* Main featured photo */}
                <div className="relative aspect-video group cursor-pointer" onClick={() => openLightbox(currentPhotoIndex)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photos[currentPhotoIndex]}
                    alt={`${home.title} - ${currentPhotoIndex + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <svg className="w-16 h-16 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </div>
                  </div>
                  
                  {photos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          prevPhoto()
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-[var(--btn-primary-bg)]/90 hover:bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] rounded-full p-2.5 transition-all shadow-lg hover:shadow-xl z-10"
                        aria-label="Previous photo"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          nextPhoto()
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-[var(--btn-primary-bg)]/90 hover:bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] rounded-full p-2.5 transition-all shadow-lg hover:shadow-xl z-10"
                        aria-label="Next photo"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      
                      {/* Photo indicators */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                        {photos.map((photo, index) => (
                          <button
                            key={photo}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setCurrentPhotoIndex(index)
                            }}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${
                              index === currentPhotoIndex ? 'bg-[var(--btn-primary-bg)] w-8' : 'bg-white/60 hover:bg-white/80'
                            }`}
                            aria-label={`Go to photo ${index + 1}`}
                          />
                        ))}
                      </div>
                      
                      {/* Photo counter */}
                      <div className="absolute top-4 right-4 bg-[var(--surface)] backdrop-blur-sm text-[var(--text)] px-3 py-1.5 rounded-full text-sm font-medium border border-[var(--border-subtle)]">
                        {currentPhotoIndex + 1} / {photos.length}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Thumbnail scrollable row below main photo */}
                {photos.length > 1 && (
                  <div className="relative p-4 bg-[var(--ink-soft)]/50 group">
                    <div 
                      ref={thumbnailScrollRef}
                      className="flex gap-2 overflow-x-auto pb-2 scroll-smooth scrollbar-hide" 
                      id="thumbnail-scroll"
                      onScroll={(e) => {
                        if (isDragging) return // Skip state updates during drag for performance
                        const container = e.currentTarget
                        const maxScroll = container.scrollWidth - container.clientWidth
                        const scrollPercentage = maxScroll > 0 ? (container.scrollLeft / maxScroll) * 100 : 0
                        const ratio = maxScroll > 0 ? container.clientWidth / container.scrollWidth : 1
                        setThumbnailScrollPosition(scrollPercentage)
                        setThumbnailScrollRatio(ratio)
                      }}
                    >
                      {photos.map((photo, index) => (
                        <button
                          key={photo}
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                            index === currentPhotoIndex
                              ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/45 scale-110'
                              : 'border-transparent hover:border-[var(--accent)]/45 opacity-70 hover:opacity-100'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                    {/* Custom slider - fixed size bar, full width track */}
                    <div 
                      className="absolute bottom-2 left-4 right-4 h-2 bg-[var(--ink-soft)]/80 rounded-full cursor-pointer"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const slider = e.currentTarget
                        const scrollContainer = thumbnailScrollRef.current
                        if (!scrollContainer) return
                        
                        setIsDragging(true)
                        const rect = slider.getBoundingClientRect()
                        const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth
                        if (maxScroll <= 0) {
                          setIsDragging(false)
                          return
                        }
                        
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          // Direct update for immediate response without delay
                          const x = moveEvent.clientX - rect.left
                          const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
                          scrollContainer.scrollLeft = (percentage / 100) * maxScroll
                          setThumbnailScrollPosition(percentage)
                        }
                        
                        const handleMouseUp = () => {
                          setIsDragging(false)
                          document.removeEventListener('mousemove', handleMouseMove)
                          document.removeEventListener('mouseup', handleMouseUp)
                        }
                        
                        const initialX = e.clientX - rect.left
                        const initialPercentage = Math.max(0, Math.min(100, (initialX / rect.width) * 100))
                        scrollContainer.scrollLeft = (initialPercentage / 100) * maxScroll
                        
                        document.addEventListener('mousemove', handleMouseMove)
                        document.addEventListener('mouseup', handleMouseUp)
                      }}
                    >
                      <div 
                        className={`h-full bg-[var(--btn-primary-bg)] rounded-full w-16 absolute ${
                          isDragging ? '' : 'transition-all duration-100'
                        }`}
                        style={{ 
                          left: `${(thumbnailScrollPosition / 100) * (sliderTrackWidth - 64)}px`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative bg-[var(--surface)] backdrop-blur-sm rounded-3xl overflow-hidden shadow-xl border border-[var(--border-subtle)]">
                <div className="relative aspect-video flex flex-col items-center justify-center">
                  {/* No Photo Graphic */}
                  <svg
                    className="w-32 h-32 text-[var(--text-muted)] mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-[var(--text-muted)] text-lg">{getTranslation(language, 'noPhotos')}</p>
                </div>
              </div>
            )}
        </div>

        {/* House Details Card - Full width, aligned with photos */}
        <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[var(--border-subtle)]">
          <div className="mb-6">
              <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
              <h1 className="text-4xl font-bold text-[var(--text)]">{getHomeTitle(language, home)}</h1>
                
                {/* Listing Type Badge - Outside owner box, top right */}
              <span className={`px-4 py-2 rounded-xl font-semibold text-sm ${
                  displayListingType === 'rent' 
                  ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]' 
                  : 'bg-[var(--ink-soft)] text-[var(--text)] border border-[var(--accent)]'
              }`}>
                  {displayListingType === 'rent' ? `🏠 ${getTranslation(language, 'rent')}` : `💰 ${getTranslation(language, displayListingType)}`}
              </span>
            </div>
              
              {/* Location and Owner Info in same row */}
              <div className="flex items-start gap-4 mb-4">
                {/* Location Info - Left side */}
                <div className="flex-1 text-[var(--text-muted)] flex flex-col gap-1 text-lg">
              {getHomeStreet(language, home) && (
                <p className="flex items-center gap-1">
                  <span>📍</span>
                  {getHomeStreet(language, home)}
                </p>
              )}
              <p className="flex items-center gap-1">
                {getCityName(home.city, areas, language)}, {getCountryName(home.country, areas, language)}
              </p>
                  {home.area && (() => {
                    const homeAreaNormalized = home.area?.trim().toLowerCase()
                    let areaData = areas.find(a => {
                      const nameMatch = a.name?.trim().toLowerCase() === homeAreaNormalized
                      const nameGreekMatch = a.nameGreek?.trim().toLowerCase() === homeAreaNormalized
                      return nameMatch || nameGreekMatch
                    })
                    if (!areaData) {
                      areaData = areas.find(a => {
                        const nameMatch = a.name?.trim().toLowerCase().includes(homeAreaNormalized) ||
                                         homeAreaNormalized.includes(a.name?.trim().toLowerCase() || '')
                        const nameGreekMatch = a.nameGreek?.trim().toLowerCase().includes(homeAreaNormalized) ||
                                              homeAreaNormalized.includes(a.nameGreek?.trim().toLowerCase() || '')
                        return nameMatch || nameGreekMatch
                      })
                    }
                    return (
                      <div className="mt-2 flex flex-col gap-1">
                        <p className="flex items-center gap-1">
                          <span className="text-[var(--text)]">
                            {getTranslation(language, 'cityArea')}: <strong>{getAreaName(home.area, areas, language)}</strong>
                          </span>
                        </p>
                        {areaData && (areaData.vibe || areaData.safety != null) && (
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            {areaData.vibe && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                                {translateValue(language, areaData.vibe)}
                              </span>
                            )}
                            {areaData.safety != null && (
                              <span className="text-sm text-[var(--text-muted)]">
                                🛡 {areaData.safety.toFixed(1)}/10
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
                
                {/* Rating scores — House + Owner, side by side */}
                <div className="flex gap-3">
                  {/* House score */}
                  <Link
                    href={`/homes/ratings/${home.key}`}
                    className="px-4 py-4 rounded-xl bg-[var(--ink-soft)]/50 border border-[var(--border-subtle)] hover:border-[var(--accent)]/35 hover:bg-[var(--ink-soft)]/70 transition-all w-36 h-40 flex flex-col items-center justify-between"
                  >
                    <h2 className="text-xs font-medium text-[var(--text-muted)] text-center">Property</h2>
                    <div className="flex flex-col items-center justify-center flex-1">
                      <span className="text-2xl font-bold text-[var(--text)]">
                        {home.ratings?.houseScore != null ? home.ratings.houseScore.toFixed(1) : '—'}
                      </span>
                      <StarRating rating={home.ratings?.houseScore ?? 0} size="sm" />
                      <span className="text-xs text-[var(--text-muted)] mt-1">
                        {home.ratings?.totalRatings ? `${home.ratings.totalRatings} ${home.ratings.totalRatings === 1 ? 'rating' : 'ratings'}` : 'No ratings yet'}
                      </span>
                    </div>
                  </Link>
                  {/* Owner score */}
                  <Link
                    href={`/homes/ratings/${home.key}/owner`}
                    className="px-4 py-4 rounded-xl bg-[var(--ink-soft)]/50 border border-[var(--border-subtle)] hover:border-[var(--accent)]/35 hover:bg-[var(--ink-soft)]/70 transition-all w-36 h-40 flex flex-col items-center justify-between"
                  >
                    <h2 className="text-xs font-medium text-[var(--text-muted)] text-center">
                      {home.owner.isBroker ? 'House Owner' : (home.owner.name || 'Owner')}
                    </h2>
                    <div className="flex flex-col items-center justify-center flex-1">
                      <span className="text-2xl font-bold text-[var(--text)]">
                        {home.ratings?.ownerScore != null ? home.ratings.ownerScore.toFixed(1) : '—'}
                      </span>
                      <StarRating rating={home.ratings?.ownerScore ?? 0} size="sm" />
                      <span className="text-xs text-[var(--text-muted)] mt-1">Owner score</span>
                    </div>
                  </Link>
                </div>
          </div>

              {/* Description - Below the row */}
          {translatedDescription && (
                <div className="mb-6 pb-6 border-t border-b border-[var(--border-subtle)] pt-6">
                  <h2 className="text-lg font-semibold text-[var(--text)] mb-4">{getTranslation(language, 'description')}</h2>
                  <div className="text-[var(--text-muted)] leading-relaxed space-y-4">
                    {translatedDescription.split(/\n\n+/).filter(p => p.trim().length > 0).map((paragraph, index) => (
                      <p key={index} className="text-[var(--text-muted)] leading-relaxed">
                        {paragraph.trim()}
                      </p>
                    ))}
                  </div>
            </div>
          )}
            </div>

            {/* Price, Size, Floor Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6 pb-6 border-b border-[var(--border-subtle)]">
            <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">{getTranslation(language, 'price')}</p>
              <p className="text-3xl font-bold text-[var(--text)]">
                €{home.pricePerMonth.toLocaleString()}
              </p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">{getTranslation(language, 'sizeSqMeters')}</p>
                <p className="text-3xl font-bold text-[var(--text)]">
                  {home.sizeSqMeters !== null && home.sizeSqMeters !== undefined ? `${home.sizeSqMeters} m²` : '-'}
              </p>
            </div>
            <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">{getTranslation(language, 'floor')}</p>
                <p className="text-3xl font-bold text-[var(--text)]">
                  {home.floor !== null && home.floor !== undefined ? home.floor : '-'}
                </p>
              </div>
            </div>

            {/* Heating Category, Bedrooms, Year Built Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6 pb-6 border-b border-[var(--border-subtle)]">
            <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">{getTranslation(language, 'heatingCategory')}</p>
                <p className="text-2xl font-bold text-[var(--text)]">
                  {home.heatingCategory ? translateValue(language, home.heatingCategory) : '-'}
                </p>
            </div>
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">{getTranslation(language, 'bedrooms')}</p>
                <p className="text-2xl font-bold text-[var(--text)]">{home.bedrooms}</p>
          </div>
                <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">{getTranslation(language, 'yearBuilt')}</p>
                <p className="text-2xl font-bold text-[var(--text)]">
                  {home.yearBuilt !== null && home.yearBuilt !== undefined ? home.yearBuilt : '-'}
                </p>
                </div>
                </div>

            {/* Heating Agent, Bathrooms, Year Renovated Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6 pb-6 border-b border-[var(--border-subtle)]">
                <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">{getTranslation(language, 'heatingAgent')}</p>
                <p className="text-2xl font-bold text-[var(--text)]">
                  {home.heatingAgent ? translateValue(language, home.heatingAgent) : '-'}
                </p>
                </div>
                <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">{getTranslation(language, 'bathrooms')}</p>
                <p className="text-2xl font-bold text-[var(--text)]">{home.bathrooms}</p>
                </div>
                <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">{getTranslation(language, 'yearRenovated')}</p>
                <p className="text-2xl font-bold text-[var(--text)]">
                  {home.yearRenovated !== null && home.yearRenovated !== undefined ? home.yearRenovated : '-'}
                </p>
                </div>
            </div>

            {/* Energy Class and Parking - Together */}
            {(home.energyClass || (home.parking !== null && home.parking !== undefined)) && (
              <div className="mb-6 pb-6 border-b border-[var(--border-subtle)]">
                {home.energyClass && (
                  <p className="text-sm text-[var(--text-muted)] mb-1">
                    {getTranslation(language, 'energyClass')}: {home.energyClass}
                  </p>
                )}
                {home.parking !== null && home.parking !== undefined && (
                  <p className="text-sm text-[var(--text-muted)]">
                    {getTranslation(language, 'parking')}: {home.parking === true ? getTranslation(language, 'available') : getTranslation(language, 'notAvailable')}
                  </p>
                )}
              </div>
            )}

            {/* Distance Information */}
            {(home.closestMetro != null || home.closestSchool != null ||
              home.closestHospital != null || home.closestPark != null ||
              home.closestUniversity != null) && (
              <div className="mb-6 pb-6 border-b border-[var(--border-subtle)]">
                <h2 className="text-lg font-semibold text-[var(--text)] mb-4">{getTranslation(language, 'distances')}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {home.closestMetro != null && (
                    <div>
                      <p className="text-sm text-[var(--text-muted)] mb-1">🚇 {getTranslation(language, 'closestMetro')}</p>
                      <p className="text-xl font-bold text-[var(--text)]">{home.closestMetro.toFixed(1)} km</p>
                    </div>
                  )}
                  {home.closestPark != null && (
                    <div>
                      <p className="text-sm text-[var(--text-muted)] mb-1">🌳 {getTranslation(language, 'closestPark')}</p>
                      <p className="text-xl font-bold text-[var(--text)]">{home.closestPark.toFixed(1)} km</p>
                    </div>
                  )}
                  {home.closestSchool != null && (
                    <div>
                      <p className="text-sm text-[var(--text-muted)] mb-1">🏫 {getTranslation(language, 'closestSchool')}</p>
                      <p className="text-xl font-bold text-[var(--text)]">{home.closestSchool.toFixed(1)} km</p>
                    </div>
                  )}
                  {home.closestUniversity != null && (
                    <div>
                      <p className="text-sm text-[var(--text-muted)] mb-1">🎓 {getTranslation(language, 'closestUniversity')}</p>
                      <p className="text-xl font-bold text-[var(--text)]">{home.closestUniversity.toFixed(1)} km</p>
                    </div>
                  )}
                  {home.closestHospital != null && (
                    <div>
                      <p className="text-sm text-[var(--text-muted)] mb-1">🏥 {getTranslation(language, 'closestHospital')}</p>
                      <p className="text-xl font-bold text-[var(--text)]">{home.closestHospital.toFixed(1)} km</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Available From */}
          {home.availableFrom && (
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">{getTranslation(language, 'availableFrom')}</p>
                <p className="text-2xl font-bold text-[var(--text)]">
                  {new Date(home.availableFrom).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}

            {/* Finalize Button - Only show for owners/brokers when inquiry is approved */}
            {home && inquiryStatus === 'approved' && !isFinalized && inquiryId && isOwner && isOwnerOrBroker && !pendingFinalization && (
              <div className="mt-8 pt-8 border-t border-[var(--border-subtle)]">
                <div className="mb-4 p-3 bg-[var(--status-success-bg)] border border-[var(--status-success)] rounded-xl text-center">
                  <p className="text-sm font-medium text-[var(--status-success)]">
                    ✅ {getTranslation(language, 'approved')}
                  </p>
                </div>
                {finalizeRequestSent ? (
                  <button
                    disabled
                    className="w-full px-6 py-4 bg-[var(--status-success-bg)] border border-[var(--status-success)] text-[var(--status-success)] rounded-xl font-semibold text-lg transition-all cursor-not-allowed"
                  >
                    {getTranslation(language, 'awaitingFinalizeApproval')}
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmFinalizeOpen(true)}
                    disabled={finalizing}
                    className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-lg transition-all disabled:opacity-50"
                  >
                    {finalizing ? getTranslation(language, 'loading') : getTranslation(language, 'finalize')}
                  </button>
                )}
              </div>
            )}

            {/* Finalize/Reject Buttons for Users - Show when there's a pending finalization request */}
            {home && inquiryStatus === 'approved' && !isFinalized && inquiryId && currentUserId !== null && home.owner.id !== currentUserId && pendingFinalization && (
              <div className="mt-8 pt-8 border-t border-[var(--border-subtle)]">
                <div className="mb-4 p-3 bg-yellow-600/20 border border-yellow-500/50 rounded-xl text-center">
                  <p className="text-sm font-medium text-yellow-400">
                    {getTranslation(language, 'finalizationRequestReceived') || 'Finalization Request Received'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleApproveFinalization}
                    disabled={finalizing}
                    className="flex-1 px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-lg transition-all disabled:opacity-50"
                  >
                    {finalizing ? getTranslation(language, 'loading') : getTranslation(language, 'approveFinalization')}
                  </button>
                  <button
                    onClick={handleRejectFinalization}
                    disabled={dismissingFinalization}
                    className="flex-1 px-6 py-4 bg-[var(--status-error)] hover:opacity-90 text-white rounded-xl font-semibold text-lg transition-all disabled:opacity-50"
                  >
                    {dismissingFinalization ? getTranslation(language, 'loading') : getTranslation(language, 'reject')}
                  </button>
                </div>
              </div>
            )}

            {/* Inquire Button - Only show for users (not owners viewing their own listings) */}
            {home && displayRole === 'user' && currentUserId !== home.owner.id && inquiryStatus !== 'approved' && (
              <div className="mt-8 pt-8 border-t border-[var(--border-subtle)]">
                {/* Inquire/Remove Button - Only show if inquiry is not approved or dismissed */}
                {inquiryStatus !== 'dismissed' && (
                  <button
                    onClick={handleInquiry}
                    disabled={updatingInquiry}
                    className={`w-full px-6 py-4 rounded-xl font-semibold text-lg transition-all ${
                      inquiryStatus === 'inquired'
                        ? 'bg-[var(--status-error)] hover:opacity-90 text-white'
                        : 'bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover-bg)] text-[var(--btn-primary-fg)]'
                    } disabled:opacity-50`}
                  >
                    {updatingInquiry 
                      ? getTranslation(language, 'loading')
                      : inquiryStatus === 'inquired'
                        ? getTranslation(language, 'removeInquiry')
                        : getTranslation(language, 'inquire')
                    }
                  </button>
                )}
              </div>
            )}

            {home &&
              displayRole === 'user' &&
              currentUserId !== null &&
              currentUserId !== home.owner.id &&
              inquiryStatus === 'approved' &&
              inquiryId &&
              (hasScheduledViewingAppointment || hasBookableAvailability) && (
                <div className="mt-8 pt-8 border-t border-[var(--border-subtle)]">
                  {hasScheduledViewingAppointment ? (
                    <button
                      type="button"
                      disabled
                      className="w-full px-6 py-4 rounded-xl font-semibold text-lg bg-[var(--ink-soft)] border border-[var(--border-subtle)] text-[var(--text-muted)] cursor-not-allowed"
                    >
                      {getTranslation(language, 'appointmentScheduled')}
                    </button>
                  ) : (
                    <Link
                      href={`/homes/${home.key}/book?inquiryId=${inquiryId}`}
                      className="block w-full text-center px-6 py-4 rounded-xl font-semibold text-lg transition-all bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover-bg)] text-[var(--btn-primary-fg)]"
                    >
                      {getTranslation(language, 'setAppointment')}
                    </Link>
                  )}
                </div>
              )}
          </div>

        {/* Photo Lightbox Modal */}
        {showPhotoLightbox && photos.length > 0 && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn"
            onClick={closeLightbox}
          >
            <div 
              className="relative max-w-7xl w-full max-h-[90vh] animate-scaleIn"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={closeLightbox}
                className="absolute top-4 right-4 z-20 bg-[var(--surface)] backdrop-blur-sm text-[var(--text)] hover:text-white rounded-full p-3 transition-all shadow-lg hover:shadow-xl border border-[var(--border-subtle)] hover:border-[var(--accent)]"
                aria-label={getTranslation(language, 'close')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Main photo */}
              <div className="relative bg-[var(--ink-soft)]/95 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl border border-[var(--border-subtle)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photos[lightboxPhotoIndex]}
                  alt={`${home.title} - ${lightboxPhotoIndex + 1}`}
                  className="w-full h-auto max-h-[85vh] object-contain"
                />
                
                {/* Navigation buttons */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={prevLightboxPhoto}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-[var(--btn-primary-bg)]/90 hover:bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] rounded-full p-4 transition-all shadow-lg hover:shadow-xl z-10"
                      aria-label="Previous photo"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={nextLightboxPhoto}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-[var(--btn-primary-bg)]/90 hover:bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] rounded-full p-4 transition-all shadow-lg hover:shadow-xl z-10"
                      aria-label="Next photo"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    
                    {/* Photo counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[var(--surface)] backdrop-blur-sm text-[var(--text)] px-4 py-2 rounded-full text-sm font-medium border border-[var(--border-subtle)]">
                      {lightboxPhotoIndex + 1} / {photos.length}
        </div>

                    {/* Thumbnail strip at bottom */}
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4 pb-2">
                      {photos.map((photo, index) => (
                        <button
                          key={photo}
                          onClick={() => setLightboxPhotoIndex(index)}
                          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                            index === lightboxPhotoIndex
                              ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/45'
                              : 'border-transparent hover:border-[var(--accent)]/45 opacity-70 hover:opacity-100'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Owner Profile Modal - Only show for non-broker owners */}
        {showOwnerModal && !home.owner.isBroker && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
            onClick={() => setShowOwnerModal(false)}
          >
            <div 
              className="bg-[var(--ink-soft)]/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-[var(--border-subtle)] max-w-md w-full animate-scaleIn"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[var(--text)]">{getTranslation(language, 'ownerProfile')}</h2>
                <button
                  onClick={() => setShowOwnerModal(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                  aria-label={getTranslation(language, 'close')}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-6">
                <div className="flex flex-col items-center mb-6">
                  <div className="w-32 h-32 rounded-full bg-[var(--btn-primary-bg)] flex items-center justify-center mb-4 border-4 border-[var(--border-subtle)]">
                    <span className="text-5xl font-bold text-[var(--btn-primary-fg)]">
                      {(home.owner.name || 'O')[0].toUpperCase()}
                    </span>
                  </div>
                </div>
            <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">{getTranslation(language, 'name')}</label>
                  <p className="text-lg text-[var(--text)]">{home.owner.name || getTranslation(language, 'notProvided')}</p>
            </div>
            {(isOwner || inquiryStatus === 'approved') && home.owner.email && (
              <div>
                <p className="block text-sm font-medium text-[var(--text-muted)] mb-2">{getTranslation(language, 'email')}</p>
                <p className="text-lg text-[var(--text)]">{home.owner.email}</p>
              </div>
            )}
                {/* Ratings in Modal — house score + owner score side by side */}
                <div className="pt-4 border-t border-[var(--border-subtle)]">
                  <p className="block text-sm font-medium text-[var(--text-muted)] mb-3">Ratings</p>
                  <div className="flex gap-4">
                    <Link href={`/homes/ratings/${home.key}`} className="flex-1 rounded-xl bg-[var(--ink-soft)]/60 border border-[var(--border-subtle)] p-3 hover:border-[var(--accent)]/35 transition-all text-center">
                      <p className="text-xs text-[var(--text-muted)] mb-1">Property</p>
                      <p className="text-xl font-bold text-[var(--text)]">
                        {home.ratings?.houseScore != null ? home.ratings.houseScore.toFixed(1) : '—'}
                      </p>
                      <StarRating rating={home.ratings?.houseScore ?? 0} size="sm" />
                    </Link>
                    <Link href={`/homes/ratings/${home.key}/owner`} className="flex-1 rounded-xl bg-[var(--ink-soft)]/60 border border-[var(--border-subtle)] p-3 hover:border-[var(--accent)]/35 transition-all text-center">
                      <p className="text-xs text-[var(--text-muted)] mb-1">Owner</p>
                      <p className="text-xl font-bold text-[var(--text)]">
                        {home.ratings?.ownerScore != null ? home.ratings.ownerScore.toFixed(1) : '—'}
                      </p>
                      <StarRating rating={home.ratings?.ownerScore ?? 0} size="sm" />
                    </Link>
                  </div>
                  {home.ratings?.totalRatings ? (
                    <p className="text-xs text-[var(--text-muted)] mt-2 text-center">{home.ratings.totalRatings} {home.ratings.totalRatings === 1 ? 'rating' : 'ratings'}</p>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] mt-2 text-center">No ratings yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <NotificationPopup
          type={toast.type}
          message={toast.message}
          language={language}
          onClose={() => setToast(null)}
        />
      )}

      <ConfirmDialog
        open={rejectFinalizationConfirmOpen}
        message={
          getTranslation(language, 'confirmRejectFinalization') ||
          'Are you sure you want to reject this finalization? The property will be removed from your search results.'
        }
        onConfirm={confirmRejectFinalization}
        onCancel={() => setRejectFinalizationConfirmOpen(false)}
        language={language}
        variant="danger"
      />

      <ConfirmDialog
        open={confirmFinalizeOpen}
        title={language === 'el' ? 'Επιβεβαίωση οριστικοποίησης' : 'Confirm finalization'}
        message={
          language === 'el'
            ? 'Είστε σίγουροι ότι θέλετε να οριστικοποιήσετε αυτήν την ενοικίαση; Αυτή η ενέργεια δεν αναιρείται.'
            : 'Are you sure you want to finalize this rental? This action cannot be undone.'
        }
        confirmLabel={language === 'el' ? 'Οριστικοποίηση' : 'Finalize'}
        onConfirm={() => { setConfirmFinalizeOpen(false); handleFinalize() }}
        onCancel={() => setConfirmFinalizeOpen(false)}
        language={language}
      />
    </div>
  )
}

export default function HomeDetailPageWrapper() {
  return (
    <Suspense>
      <HomeDetailPage />
    </Suspense>
  )
}
