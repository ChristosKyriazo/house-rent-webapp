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
  listingType: string
  pricePerMonth: number
  bedrooms: number
  bathrooms: number
  floor: number | null
  heating: string | null
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

        {/* Photo Gallery */}
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

        {/* Home Details Card */}
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
            </div>
          </div>

          {home.description && (
            <div className="mb-6 pb-6 border-b border-[#E8D5B7]/20">
              <h2 className="text-xl font-semibold text-[#E8D5B7] mb-2">{getTranslation(language, 'description')}</h2>
              <p className="text-[#E8D5B7]/80 leading-relaxed">{home.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6 pb-6 border-b border-[#E8D5B7]/20">
            <div>
              <p className="text-sm text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'price')}</p>
              <p className="text-3xl font-bold text-[#E8D5B7]">
                €{home.pricePerMonth.toLocaleString()}
              </p>
              <p className="text-sm text-[#E8D5B7]/60">
                {home.listingType === 'rent' ? getTranslation(language, 'perMonth') : getTranslation(language, 'totalPrice')}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'bedrooms')}</p>
              <p className="text-2xl font-bold text-[#E8D5B7]">{home.bedrooms}</p>
            </div>
            <div>
              <p className="text-sm text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'bathrooms')}</p>
              <p className="text-2xl font-bold text-[#E8D5B7]">{home.bathrooms}</p>
            </div>
          </div>

          {/* Additional Details */}
          {(home.floor !== null && home.floor !== undefined) ||
          home.heating ||
          (home.sizeSqMeters !== null && home.sizeSqMeters !== undefined) ||
          (home.yearBuilt !== null && home.yearBuilt !== undefined) ||
          (home.yearRenovated !== null && home.yearRenovated !== undefined) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 pb-6 border-b border-[#E8D5B7]/20">
              {home.floor !== null && home.floor !== undefined && (
                <div>
                  <p className="text-sm text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'floor')}</p>
                  <p className="text-lg font-semibold text-[#E8D5B7]">{home.floor}</p>
                </div>
              )}
              {home.heating && (
                <div>
                  <p className="text-sm text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'heating')}</p>
                  <p className="text-lg font-semibold text-[#E8D5B7]">{translateValue(language, home.heating)}</p>
                </div>
              )}
              {home.sizeSqMeters !== null && home.sizeSqMeters !== undefined && (
                <div>
                  <p className="text-sm text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'sizeSqMeters')}</p>
                  <p className="text-lg font-semibold text-[#E8D5B7]">{home.sizeSqMeters} m²</p>
                </div>
              )}
              {home.yearBuilt !== null && home.yearBuilt !== undefined && (
                <div>
                  <p className="text-sm text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'yearBuilt')}</p>
                  <p className="text-lg font-semibold text-[#E8D5B7]">{home.yearBuilt}</p>
                </div>
              )}
              {home.yearRenovated !== null && home.yearRenovated !== undefined && (
                <div>
                  <p className="text-sm text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'yearRenovated')}</p>
                  <p className="text-lg font-semibold text-[#E8D5B7]">{home.yearRenovated}</p>
                </div>
              )}
            </div>
          ) : null}

          {home.availableFrom && (
            <div className="mb-6">
              <p className="text-sm text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'availableFrom')}</p>
              <p className="text-lg text-[#E8D5B7]">
                {new Date(home.availableFrom).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>

        {/* Owner Profile Card */}
        <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[#E8D5B7]/20">
          <h2 className="text-2xl font-bold text-[#E8D5B7] mb-6">{getTranslation(language, 'ownerProfile')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'name')}</label>
              <p className="text-lg text-[#E8D5B7]">{home.owner.name || getTranslation(language, 'notProvided')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'email')}</label>
              <p className="text-lg text-[#E8D5B7]">{home.owner.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'memberSince')}</label>
              <p className="text-lg text-[#E8D5B7]">
                {new Date(home.owner.createdAt).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
