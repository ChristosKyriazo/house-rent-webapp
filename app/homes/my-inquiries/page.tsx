'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation, translateValue } from '@/lib/translations'
import { getAreaName, getCityName, getCountryName } from '@/lib/area-utils'

interface Home {
  id: number
  key: string
  title: string
  street: string | null
  city: string
  country: string
  area: string | null
  price: number | null
  size: number | null
  bedrooms: number | null
  bathrooms: number | null
  listingType: string
  photos: string[]
  inquiryDate: string
}

export default function UserInquiriesPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [homes, setHomes] = useState<Home[]>([])
  const [totalInquiries, setTotalInquiries] = useState(0)
  const [loading, setLoading] = useState(true)
  const [areas, setAreas] = useState<Array<{ name: string; nameGreek: string | null; city: string | null; cityGreek: string | null; country: string | null; countryGreek: string | null }>>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if user is authenticated
        const profileRes = await fetch('/api/profile')
        const profileData = await profileRes.json()

        if (!profileData.user) {
          router.push('/login')
          return
        }

        // Fetch user inquiries
        const response = await fetch('/api/inquiries/user')
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login')
            return
          }
          const raw = await response.text()
          let message = `Request failed (${response.status})`
          try {
            const parsed = raw ? JSON.parse(raw) : {}
            message =
              (typeof parsed === 'object' && parsed && 'error' in parsed && typeof (parsed as { error?: string }).error === 'string'
                ? (parsed as { error: string }).error
                : null) || raw.slice(0, 200) || message
          } catch {
            message = raw.slice(0, 200) || message
          }
          console.error('Failed to fetch inquiries:', { status: response.status, statusText: response.statusText, message })
          throw new Error(message)
        }

        const data = await response.json()
        setHomes(data.homes || [])
        setTotalInquiries(data.totalInquiries || 0)
      } catch (error) {
        console.error('Error fetching inquiries:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

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
      <div className="min-h-screen bg-[#2D3748] flex items-center justify-center">
        <p className="text-[#E8D5B7]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#2D3748] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#E8D5B7] mb-2">
            {getTranslation(language, 'inquiries')}
          </h1>
          <p className="text-[#E8D5B7]/70">
            {totalInquiries > 0
              ? getTranslation(language, 'totalInquiries').replace('{count}', totalInquiries.toString())
              : getTranslation(language, 'noInquiries')}
          </p>
        </div>

        {homes.length === 0 ? (
          <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-[#E8D5B7]/20 text-center">
            <p className="text-[#E8D5B7]/70 text-lg mb-4">
              {getTranslation(language, 'noInquiries')}
            </p>
            <Link
              href="/homes"
              className="inline-block px-6 py-3 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold"
            >
              {getTranslation(language, 'searchProperties')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {homes.map((home) => (
              <Link
                key={home.id}
                href={`/homes/${home.key}`}
                className="block bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl overflow-hidden shadow-xl border border-[#E8D5B7]/20 hover:border-[#E8D5B7]/40 transition-all group"
              >
                {/* Photo */}
                {home.photos && home.photos.length > 0 ? (
                  <div className="relative h-48 w-full overflow-hidden">
                    <img
                      src={home.photos[0]}
                      alt={home.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="h-48 w-full bg-[#2D3748] flex items-center justify-center">
                    <span className="text-4xl text-[#E8D5B7]/30">🏠</span>
                  </div>
                )}

                {/* Content */}
                <div className="p-6">
                  <h2 className="text-xl font-bold text-[#E8D5B7] mb-2 group-hover:text-[#D4C19F] transition-colors">
                    {home.title}
                  </h2>
                  <p className="text-[#E8D5B7]/70 text-sm mb-3">
                    📍 {home.street && `${home.street}, `}
                    {getCityName(home.city, areas, language)}, {getCountryName(home.country, areas, language)}
                    {home.area && ` • ${getAreaName(home.area, areas, language)}`}
                  </p>

                  {/* Details */}
                  <div className="flex flex-wrap gap-3 text-sm text-[#E8D5B7]/70 mb-3">
                    {home.price && (
                      <span>
                        {home.price.toLocaleString()}€{' '}
                        {home.listingType === 'rent' ? getTranslation(language, 'perMonth') : ''}
                      </span>
                    )}
                    {home.size && <span>{home.size}m²</span>}
                    {home.bedrooms && (
                      <span>
                        {home.bedrooms} {getTranslation(language, 'bedroomsShort')}
                      </span>
                    )}
                    {home.bathrooms && (
                      <span>
                        {home.bathrooms} {getTranslation(language, 'bathroomsShort')}
                      </span>
                    )}
                  </div>

                  {/* Inquiry Date */}
                  <p className="text-[#E8D5B7]/60 text-xs">
                    {getTranslation(language, 'inquiryDate')}:{' '}
                    {new Date(home.inquiryDate).toLocaleDateString(
                      language === 'el' ? 'el-GR' : 'en-US',
                      {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

