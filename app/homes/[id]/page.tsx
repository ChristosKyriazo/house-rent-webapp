'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    const fetchHome = async () => {
      try {
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
      } catch (error) {
        console.error('Error fetching home:', error)
        router.push('/homes')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchHome()
    }
  }, [params.id, router])

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

  // Parse photos safely
  let photos: string[] = []
  try {
    if (home.photos && home.photos.trim() !== '') {
      photos = JSON.parse(home.photos)
      if (!Array.isArray(photos)) {
        photos = []
      }
    }
  } catch (error) {
    console.error('Error parsing photos:', error)
    photos = []
  }
  const fromMyListings = searchParams.get('from') === 'my-listings'

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

        {/* Photo Gallery and Owner Profile Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Photo Gallery - Takes 3 columns */}
          <div className="lg:col-span-3">
            {photos.length > 0 ? (
              <div className="relative bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl overflow-hidden shadow-xl border border-[#E8D5B7]/20">
                <div className="relative aspect-video">
                  <img
                    src={photos[currentPhotoIndex]}
                    alt={`${home.title} - Photo ${currentPhotoIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={prevPhoto}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all"
                        aria-label="Previous photo"
                      >
                        ←
                      </button>
                      <button
                        onClick={nextPhoto}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all"
                        aria-label="Next photo"
                      >
                        →
                      </button>
                      
                      {/* Photo indicators */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {photos.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentPhotoIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              index === currentPhotoIndex ? 'bg-[#E8D5B7]' : 'bg-white/50'
                            }`}
                            aria-label={`Go to photo ${index + 1}`}
                          />
                        ))}
                      </div>
                      
                      {/* Photo counter */}
                      <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                        {currentPhotoIndex + 1} / {photos.length}
                      </div>
                    </>
                  )}
                </div>
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

          {/* Owner Profile Banner - Takes 1 column, smaller */}
          <div className="lg:col-span-1">
            <div 
              onClick={() => setShowOwnerModal(true)}
              className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-4 shadow-xl border border-[#E8D5B7]/20 cursor-pointer hover:border-[#E8D5B7]/40 transition-all h-full flex flex-col"
            >
              <h2 className="text-lg font-bold text-[#E8D5B7] mb-3 text-center">{getTranslation(language, 'homeowner')}</h2>
              <div className="flex flex-col items-center space-y-3 flex-1">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-[#E8D5B7] flex items-center justify-center border-2 border-[#E8D5B7]/30">
                  <span className="text-2xl font-bold text-[#2D3748]">
                    {home.owner.name ? home.owner.name[0].toUpperCase() : home.owner.email[0].toUpperCase()}
                  </span>
                </div>
                {/* Name */}
                <p className="text-sm font-semibold text-[#E8D5B7] text-center line-clamp-2">
                  {home.owner.name || home.owner.email.split('@')[0]}
                </p>
                {/* Rating */}
                {home.owner.ratings?.ownerRating !== null && home.owner.ratings?.ownerRating !== undefined ? (
                  <div className="text-center mt-auto">
                    <p className="text-lg font-bold text-[#E8D5B7] flex items-center justify-center gap-1">
                      <span>⭐</span>
                      {home.owner.ratings.ownerRating} / 5.0
                    </p>
                    <p className="text-xs text-[#E8D5B7]/60 mt-1">
                      {home.owner.ratings.ownerCount} {home.owner.ratings.ownerCount === 1 ? getTranslation(language, 'rating') : getTranslation(language, 'ratings')}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-[#E8D5B7]/60 text-center mt-auto">{getTranslation(language, 'noRatingsYet')}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* House Details Card - Full width, aligned with photos */}
        <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[#E8D5B7]/20">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-4xl font-bold text-[#E8D5B7]">{home.title}</h1>
                <span className={`px-4 py-2 rounded-xl font-semibold text-sm ${
                  home.listingType === 'rent' 
                    ? 'bg-[#E8D5B7] text-[#2D3748]' 
                    : 'bg-[#2D3748] text-[#E8D5B7] border border-[#E8D5B7]'
                }`}>
                  {home.listingType === 'rent' ? `🏠 ${getTranslation(language, 'rent')}` : `💰 ${getTranslation(language, 'buy')}`}
                </span>
              </div>
              <div className="text-[#E8D5B7]/70 flex flex-col gap-1 text-lg">
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
            </div>

            {home.description && (
              <div className="mb-6 pb-6 border-b border-[#E8D5B7]/20">
                <h2 className="text-xl font-semibold text-[#E8D5B7] mb-2">{getTranslation(language, 'description')}</h2>
                <p className="text-[#E8D5B7]/80 leading-relaxed">{home.description}</p>
              </div>
            )}

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
          </div>

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
                        {home.owner.ratings.ownerRating} / 5.0
                      </p>
                      <p className="text-sm text-[#E8D5B7]/60 mt-1">
                        {home.owner.ratings.ownerCount} {home.owner.ratings.ownerCount === 1 ? getTranslation(language, 'rating') : getTranslation(language, 'ratings')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-[#E8D5B7]/20">
                    <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-2">{getTranslation(language, 'asOwner')}</label>
                    <p className="text-lg text-[#E8D5B7]/60">{getTranslation(language, 'noRatingsYet')}</p>
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
