'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation, translateValue } from '@/lib/translations'

interface Home {
  id: number
  key: string
  title: string
  description: string | null
  street: string | null
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
  sizeSqMeters: number | null
  yearBuilt: number | null
  yearRenovated: number | null
  availableFrom: string
  photos: string | null
  owner: {
    id: number
    email: string
    name: string | null
    createdAt: string
    ratings?: {
      ownerRating: number | null
      ownerCount: number
      renterRating: number | null
      renterCount: number
    }
  }
}

export default function HomeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const [home, setHome] = useState<Home | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [confirmingArea, setConfirmingArea] = useState(false)
  const [showOwnerModal, setShowOwnerModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false)
  const [lightboxPhotoIndex, setLightboxPhotoIndex] = useState(0)
  const [thumbnailScrollPosition, setThumbnailScrollPosition] = useState(0)
  const [thumbnailScrollRatio, setThumbnailScrollRatio] = useState(1)
  const [sliderTrackWidth, setSliderTrackWidth] = useState(400)
  const [isDragging, setIsDragging] = useState(false)
  const [hasInquiry, setHasInquiry] = useState(false)
  const [updatingInquiry, setUpdatingInquiry] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const thumbnailScrollRef = useRef<HTMLDivElement>(null)

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
  }, [home?.photos])

  const fromMyListings = searchParams.get('from') === 'my-listings'

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current user profile
        const profileResponse = await fetch('/api/profile')
        let profileData = null
        if (profileResponse.ok) {
          profileData = await profileResponse.json()
          if (profileData.user) {
            setCurrentUserId(profileData.user.id)
            setUserRole(profileData.user.role || 'user')
          }
        }
        
        // Fetch home details
        const homeId = params.id as string
        const response = await fetch(`/api/homes/${homeId}`)
        
        if (!response.ok) {
          router.push('/homes')
          return
        }
        
        const data = await response.json()
        if (!data.home) {
          router.push('/homes')
          return
        }
        
        setHome(data.home)
        
        // Check if user has an inquiry for this home
        if (profileData && profileData.user) {
          const inquiriesRes = await fetch('/api/inquiries')
          if (inquiriesRes.ok) {
            const inquiriesData = await inquiriesRes.json()
            if (inquiriesData.homeIds) {
              setHasInquiry(inquiriesData.homeIds.includes(data.home.id))
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

    if (params.id) {
      fetchData()
    }
  }, [params.id, router])

  const handleInquiry = async () => {
    if (!home || updatingInquiry) return
    
    setUpdatingInquiry(true)
    
    try {
      if (hasInquiry) {
        // Remove inquiry
        const response = await fetch(`/api/inquiries?homeId=${home.id}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setHasInquiry(false)
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
      } else {
        // Create inquiry
        const response = await fetch('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ homeId: home.id }),
        })
        if (response.ok) {
          setHasInquiry(true)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2D3748] flex items-center justify-center">
        <p className="text-[#E8D5B7]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  if (!home) {
    return null
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

  const handleConfirmArea = async () => {
    if (!home) return
    setConfirmingArea(true)
    try {
      const response = await fetch(`/api/homes/${home.key}/confirm-area`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (response.ok) {
        const data = await response.json()
        setHome({ ...home, area: data.area })
      }
    } catch (error) {
      console.error('Error confirming area:', error)
    } finally {
      setConfirmingArea(false)
    }
  }

  // Hard-coded area suggestion (stored as 'Nea Smirni' in DB, translated for display)
  const suggestedAreaDisplay = translateValue(language, 'Nea Smirni')
  
  // Determine display text for listing type
  // Owners see "sell" for their own listings, "buy" for others
  // Users always see "buy" for sale listings
  const isOwner = currentUserId !== null && home.owner.id === currentUserId
  const displayListingType = home.listingType === 'rent' 
    ? 'rent' 
    : (isOwner ? 'sell' : 'buy')

  return (
    <div className="min-h-screen bg-[#2D3748] py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button and Edit Button */}
        <div className="flex items-center justify-between">
          <Link
            href={fromMyListings ? '/homes/my-listings' : '/homes'}
            className="inline-flex items-center px-4 py-2 text-[#E8D5B7] hover:text-[#D4C19F] transition-colors"
          >
            ← {getTranslation(language, 'returnToSearch')}
          </Link>
          {fromMyListings && (
            <Link
              href={`/homes/${home.key}/edit`}
              className="px-4 py-2 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold text-sm"
            >
              {getTranslation(language, 'edit')}
            </Link>
          )}
        </div>

        {/* Photo Gallery - Full Width */}
        <div>
            {photos.length > 0 ? (
              <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl overflow-hidden shadow-xl border border-[#E8D5B7]/20">
                {/* Main featured photo */}
                <div className="relative aspect-video group cursor-pointer" onClick={() => openLightbox(currentPhotoIndex)}>
                  <img
                    src={photos[currentPhotoIndex]}
                    alt={`${home.title} - Photo ${currentPhotoIndex + 1}`}
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
                        onClick={(e) => {
                          e.stopPropagation()
                          prevPhoto()
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-[#E8D5B7]/90 hover:bg-[#E8D5B7] text-[#2D3748] rounded-full p-2.5 transition-all shadow-lg hover:shadow-xl z-10"
                        aria-label="Previous photo"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          nextPhoto()
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-[#E8D5B7]/90 hover:bg-[#E8D5B7] text-[#2D3748] rounded-full p-2.5 transition-all shadow-lg hover:shadow-xl z-10"
                        aria-label="Next photo"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      
                      {/* Photo indicators */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                        {photos.map((_, index) => (
                          <button
                            key={index}
                            onClick={(e) => {
                              e.stopPropagation()
                              setCurrentPhotoIndex(index)
                            }}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${
                              index === currentPhotoIndex ? 'bg-[#E8D5B7] w-8' : 'bg-white/60 hover:bg-white/80'
                            }`}
                            aria-label={`Go to photo ${index + 1}`}
                          />
                        ))}
                      </div>
                      
                      {/* Photo counter */}
                      <div className="absolute top-4 right-4 bg-[#1A202C]/90 backdrop-blur-sm text-[#E8D5B7] px-3 py-1.5 rounded-full text-sm font-medium border border-[#E8D5B7]/30">
                        {currentPhotoIndex + 1} / {photos.length}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Thumbnail scrollable row below main photo */}
                {photos.length > 1 && (
                  <div className="relative p-4 bg-[#1A202C]/40 group">
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
                          key={index}
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                            index === currentPhotoIndex
                              ? 'border-[#E8D5B7] ring-2 ring-[#E8D5B7]/50 scale-110'
                              : 'border-transparent hover:border-[#E8D5B7]/50 opacity-70 hover:opacity-100'
                          }`}
                        >
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
                      className="absolute bottom-2 left-4 right-4 h-2 bg-[#2D3748]/80 rounded-full cursor-pointer"
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
                        className={`h-full bg-[#E8D5B7] rounded-full w-16 absolute ${
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
              <div className="relative bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl overflow-hidden shadow-xl border border-[#E8D5B7]/20">
                <div className="relative aspect-video flex flex-col items-center justify-center">
                  {/* No Photo Graphic */}
                  <svg
                    className="w-32 h-32 text-[#E8D5B7]/40 mb-4"
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
                  <p className="text-[#E8D5B7]/70 text-lg">{getTranslation(language, 'noPhotos')}</p>
                </div>
              </div>
            )}
        </div>

        {/* House Details Card - Full width, aligned with photos */}
        <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[#E8D5B7]/20">
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
                <h1 className="text-4xl font-bold text-[#E8D5B7]">{home.title}</h1>
                
                {/* Listing Type Badge - Outside owner box, top right */}
                <span className={`px-4 py-2 rounded-xl font-semibold text-sm ${
                  displayListingType === 'rent' 
                    ? 'bg-[#E8D5B7] text-[#2D3748]' 
                    : 'bg-[#2D3748] text-[#E8D5B7] border border-[#E8D5B7]'
                }`}>
                  {displayListingType === 'rent' ? `🏠 ${getTranslation(language, 'rent')}` : `💰 ${getTranslation(language, displayListingType)}`}
                </span>
              </div>
              
              {/* Location and Owner Info in same row */}
              <div className="flex items-start gap-4 mb-4">
                {/* Location Info - Left side */}
                <div className="flex-1 text-[#E8D5B7]/70 flex flex-col gap-1 text-lg">
                  {home.street && (
                    <p className="flex items-center gap-1">
                      <span>📍</span>
                      {home.street}
                    </p>
                  )}
                  <p className="flex items-center gap-1">
                    {home.city}, {home.country}
                  </p>
                  {fromMyListings && !home.area && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[#E8D5B7]">
                        {getTranslation(language, 'cityArea')}: <strong>{suggestedAreaDisplay}</strong>
                      </span>
                      <button
                        onClick={handleConfirmArea}
                        disabled={confirmingArea}
                        className="px-3 py-1 bg-[#E8D5B7] text-[#2D3748] rounded-lg hover:bg-[#D4C19F] transition-all font-semibold text-sm disabled:opacity-50"
                      >
                        {confirmingArea ? getTranslation(language, 'loading') : getTranslation(language, 'confirm')}
                      </button>
                    </div>
                  )}
                  {home.area && (
                    <p className="flex items-center gap-1 mt-2">
                      <span className="text-[#E8D5B7]">
                        {getTranslation(language, 'cityArea')}: <strong>{translateValue(language, home.area)}</strong>
                      </span>
                    </p>
                  )}
                </div>
                
                {/* Owner Profile - Right side, square */}
                <div 
                  onClick={() => setShowOwnerModal(true)}
                  className="px-4 py-4 rounded-xl bg-[#2D3748]/50 border border-[#E8D5B7]/20 cursor-pointer hover:border-[#E8D5B7]/40 hover:bg-[#2D3748]/70 transition-all w-40 h-40 flex flex-col items-center justify-between"
                >
                  {/* Owner Title - At the top */}
                  <h2 className="text-xs font-medium text-[#E8D5B7]/70 text-center">{getTranslation(language, 'owner')}</h2>
                  
                  {/* Name and Rating - Centered and prominent */}
                  <div className="flex flex-col items-center justify-center flex-1">
                    {/* Name */}
                    <p className="text-base font-semibold text-[#E8D5B7] text-center mb-2">
                      {home.owner.name || home.owner.email.split('@')[0]}
                    </p>
                    
                    {/* Rating */}
                    {home.owner.ratings?.ownerRating !== null && home.owner.ratings?.ownerRating !== undefined ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xl font-bold text-[#E8D5B7]">
                          {home.owner.ratings.ownerRating.toFixed(1)}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={`text-sm ${i < Math.round(home.owner.ratings!.ownerRating!) ? 'text-yellow-400' : 'text-[#E8D5B7]/30'}`}>
                              ⭐
                            </span>
                          ))}
                        </div>
                        {home.owner.ratings.ownerCount > 0 && (
                          <span className="text-xs text-[#E8D5B7]/60">
                            {home.owner.ratings.ownerCount} {home.owner.ratings.ownerCount === 1 ? getTranslation(language, 'rating') : getTranslation(language, 'ratings')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xl font-bold text-[#E8D5B7]">
                          4.7
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={`text-sm ${i < Math.round(4.7) ? 'text-yellow-400' : 'text-[#E8D5B7]/30'}`}>
                              ⭐
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Description - Below the row */}
              {home.description && (
                <div className="mb-6 pb-6 border-t border-b border-[#E8D5B7]/20 pt-6">
                  <h2 className="text-lg font-semibold text-[#E8D5B7] mb-2">{getTranslation(language, 'description')}</h2>
                  <p className="text-[#E8D5B7]/80 leading-relaxed">{home.description}</p>
                </div>
              )}
            </div>

            {/* Price, Size, Floor Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6 pb-6 border-b border-[#E8D5B7]/20">
              <div>
                <p className="text-sm text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'price')}</p>
                <p className="text-3xl font-bold text-[#E8D5B7]">
                  €{home.pricePerMonth.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'sizeSqMeters')}</p>
                <p className="text-3xl font-bold text-[#E8D5B7]">
                  {home.sizeSqMeters !== null && home.sizeSqMeters !== undefined ? `${home.sizeSqMeters} m²` : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'floor')}</p>
                <p className="text-3xl font-bold text-[#E8D5B7]">
                  {home.floor !== null && home.floor !== undefined ? home.floor : '-'}
                </p>
              </div>
            </div>

            {/* Heating Category, Bedrooms, Year Built Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6 pb-6 border-b border-[#E8D5B7]/20">
              <div>
                <p className="text-sm text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'heatingCategory')}</p>
                <p className="text-2xl font-bold text-[#E8D5B7]">
                  {home.heatingCategory ? translateValue(language, home.heatingCategory) : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'bedrooms')}</p>
                <p className="text-2xl font-bold text-[#E8D5B7]">{home.bedrooms}</p>
              </div>
              <div>
                <p className="text-sm text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'yearBuilt')}</p>
                <p className="text-2xl font-bold text-[#E8D5B7]">
                  {home.yearBuilt !== null && home.yearBuilt !== undefined ? home.yearBuilt : '-'}
                </p>
              </div>
            </div>

            {/* Heating Agent, Bathrooms, Year Renovated Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6 pb-6 border-b border-[#E8D5B7]/20">
              <div>
                <p className="text-sm text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'heatingAgent')}</p>
                <p className="text-2xl font-bold text-[#E8D5B7]">
                  {home.heatingAgent ? translateValue(language, home.heatingAgent) : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'bathrooms')}</p>
                <p className="text-2xl font-bold text-[#E8D5B7]">{home.bathrooms}</p>
              </div>
              <div>
                <p className="text-sm text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'yearRenovated')}</p>
                <p className="text-2xl font-bold text-[#E8D5B7]">
                  {home.yearRenovated !== null && home.yearRenovated !== undefined ? home.yearRenovated : '-'}
                </p>
              </div>
            </div>

            {/* Available From */}
            {home.availableFrom && (
              <div>
                <p className="text-sm text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'availableFrom')}</p>
                <p className="text-2xl font-bold text-[#E8D5B7]">
                  {new Date(home.availableFrom).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}

            {/* Inquire Button - Only show for users (not owners viewing their own listings) */}
            {home && userRole && (userRole === 'user' || userRole === 'both') && currentUserId !== home.owner.id && (
              <div className="mt-8 pt-8 border-t border-[#E8D5B7]/20">
                {hasInquiry && (
                  <p className="text-sm font-medium text-[#E8D5B7]/70 mb-4 text-center">
                    {getTranslation(language, 'inquiryMade')}
                  </p>
                )}
                <button
                  onClick={handleInquiry}
                  disabled={updatingInquiry}
                  className={`w-full px-6 py-4 rounded-xl font-semibold text-lg transition-all ${
                    hasInquiry
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-[#E8D5B7] hover:bg-[#D4C19F] text-[#2D3748]'
                  } disabled:opacity-50`}
                >
                  {updatingInquiry 
                    ? getTranslation(language, 'loading')
                    : hasInquiry 
                      ? getTranslation(language, 'removeInquiry')
                      : getTranslation(language, 'inquire')
                  }
                </button>
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
                className="absolute top-4 right-4 z-20 bg-[#1A202C]/90 backdrop-blur-sm text-[#E8D5B7] hover:text-white rounded-full p-3 transition-all shadow-lg hover:shadow-xl border border-[#E8D5B7]/30 hover:border-[#E8D5B7]"
                aria-label={getTranslation(language, 'close')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Main photo */}
              <div className="relative bg-[#1A202C]/95 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl border border-[#E8D5B7]/30">
                <img
                  src={photos[lightboxPhotoIndex]}
                  alt={`${home.title} - Photo ${lightboxPhotoIndex + 1}`}
                  className="w-full h-auto max-h-[85vh] object-contain"
                />
                
                {/* Navigation buttons */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={prevLightboxPhoto}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-[#E8D5B7]/90 hover:bg-[#E8D5B7] text-[#2D3748] rounded-full p-4 transition-all shadow-lg hover:shadow-xl z-10"
                      aria-label="Previous photo"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={nextLightboxPhoto}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-[#E8D5B7]/90 hover:bg-[#E8D5B7] text-[#2D3748] rounded-full p-4 transition-all shadow-lg hover:shadow-xl z-10"
                      aria-label="Next photo"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    
                    {/* Photo counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1A202C]/90 backdrop-blur-sm text-[#E8D5B7] px-4 py-2 rounded-full text-sm font-medium border border-[#E8D5B7]/30">
                      {lightboxPhotoIndex + 1} / {photos.length}
                    </div>
                    
                    {/* Thumbnail strip at bottom */}
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4 pb-2">
                      {photos.map((photo, index) => (
                        <button
                          key={index}
                          onClick={() => setLightboxPhotoIndex(index)}
                          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                            index === lightboxPhotoIndex
                              ? 'border-[#E8D5B7] ring-2 ring-[#E8D5B7]/50'
                              : 'border-transparent hover:border-[#E8D5B7]/50 opacity-70 hover:opacity-100'
                          }`}
                        >
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

        {/* Owner Profile Modal */}
        {showOwnerModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
            onClick={() => setShowOwnerModal(false)}
          >
            <div 
              className="bg-[#1A202C]/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-[#E8D5B7]/30 max-w-md w-full animate-scaleIn"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#E8D5B7]">{getTranslation(language, 'ownerProfile')}</h2>
                <button
                  onClick={() => setShowOwnerModal(false)}
                  className="text-[#E8D5B7]/70 hover:text-[#E8D5B7] transition-colors"
                  aria-label={getTranslation(language, 'close')}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-6">
                <div className="flex flex-col items-center mb-6">
                  <div className="w-32 h-32 rounded-full bg-[#E8D5B7] flex items-center justify-center mb-4 border-4 border-[#E8D5B7]/30">
                    <span className="text-5xl font-bold text-[#2D3748]">
                      {home.owner.name ? home.owner.name[0].toUpperCase() : home.owner.email[0].toUpperCase()}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-2">{getTranslation(language, 'name')}</label>
                  <p className="text-lg text-[#E8D5B7]">{home.owner.name || getTranslation(language, 'notProvided')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-2">{getTranslation(language, 'email')}</label>
                  <p className="text-lg text-[#E8D5B7]">{home.owner.email}</p>
                </div>
                {/* Rating in Modal */}
                {home.owner.ratings?.ownerRating !== null && home.owner.ratings?.ownerRating !== undefined ? (
                  <div className="pt-4 border-t border-[#E8D5B7]/20">
                    <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-2">{getTranslation(language, 'asOwner')}</label>
                    <div>
                      <p className="text-2xl font-bold text-[#E8D5B7] flex items-center gap-2">
                        <span>⭐</span>
                        {home.owner.ratings.ownerRating.toFixed(1)}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={`text-base ${i < Math.round(home.owner.ratings!.ownerRating!) ? 'text-yellow-400' : 'text-[#E8D5B7]/30'}`}>
                            ⭐
                          </span>
                        ))}
                      </div>
                      {home.owner.ratings.ownerCount > 0 && (
                        <p className="text-sm text-[#E8D5B7]/60 mt-1">
                          {home.owner.ratings.ownerCount} {home.owner.ratings.ownerCount === 1 ? getTranslation(language, 'rating') : getTranslation(language, 'ratings')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-[#E8D5B7]/20">
                    <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-2">{getTranslation(language, 'asOwner')}</label>
                    <div>
                      <p className="text-2xl font-bold text-[#E8D5B7] flex items-center gap-2">
                        <span>⭐</span>
                        4.7
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={`text-base ${i < Math.round(4.7) ? 'text-yellow-400' : 'text-[#E8D5B7]/30'}`}>
                            ⭐
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
