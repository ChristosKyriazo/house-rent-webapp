'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'
import { getCityName, getCountryName, getAreaName } from '@/lib/area-utils'
import TranslatedDescription from '@/app/components/TranslatedDescription'

interface Home {
  id: number
  key: string
  title: string
  description: string | null
  descriptionGreek: string | null
  street: string | null
  city: string
  country: string
  area: string | null
  listingType: string
  pricePerMonth: number
  bedrooms: number
  bathrooms: number
  sizeSqMeters: number | null
  finalized: boolean
  createdAt: string
}

export default function MyListingsPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [userHomes, setUserHomes] = useState<Home[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('user')
  const [areas, setAreas] = useState<Array<{ name: string; nameGreek: string | null; city: string | null; cityGreek: string | null; country: string | null; countryGreek: string | null }>>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check authentication and role
        const profileResponse = await fetch('/api/profile')
        if (!profileResponse.ok) {
          router.push('/login')
          return
        }
        const profileData = await profileResponse.json()
        if (!profileData.user) {
          router.push('/login')
          return
        }

        const role = profileData.user.role || 'user'
        if (role !== 'owner' && role !== 'both' && role !== 'broker') {
          router.push('/profile')
          return
        }

        setUserRole(role)

        // Fetch user's homes using dedicated endpoint
        const homesResponse = await fetch('/api/homes/my-listings')
        if (homesResponse.ok) {
          const homesData = await homesResponse.json()
          setUserHomes(homesData.homes || [])
        } else {
          console.error('Failed to fetch listings:', homesResponse.status)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <p className="text-[var(--text)]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[var(--text)] mb-2">{getTranslation(language, 'myListings')}</h1>
          <p className="text-[var(--text-muted)]">
            {getTranslation(language, 'manageListings')}
          </p>
        </div>

        <div className="mb-6 flex justify-end">
          <Link
            href="/homes/new"
            className="px-6 py-3 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] rounded-2xl hover:bg-[var(--btn-primary-hover-bg)] transition-all font-semibold shadow-lg shadow-[var(--accent)]/15 hover:shadow-xl transform hover:-translate-y-0.5"
          >
            + {getTranslation(language, 'newListing')}
          </Link>
        </div>

        {userHomes.length === 0 ? (
          <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-12 text-center shadow-xl border border-[var(--border-subtle)]">
            <p className="text-xl text-[var(--text-muted)]">{getTranslation(language, 'noListings')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {userHomes.map((home) => (
              <div
                key={home.id}
                className={`block bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-6 shadow-xl border transition-all ${
                  home.finalized 
                    ? 'border-purple-500/50 opacity-60' 
                    : 'border-[var(--border-subtle)] hover:border-[var(--accent)]/35 transform hover:-translate-y-1'
                }`}
              >
                {home.finalized && (
                  <div className="mb-4 p-3 bg-purple-600/20 border border-purple-500/50 rounded-xl text-center">
                    <p className="text-sm font-bold text-purple-400 uppercase">
                      {getTranslation(language, 'dealDone')}
                    </p>
                  </div>
                )}
                <Link
                  href={home.finalized ? '#' : `/homes/${home.key}?from=my-listings`}
                  onClick={(e) => {
                    if (home.finalized) {
                      e.preventDefault()
                    }
                  }}
                  className={home.finalized ? 'pointer-events-none' : ''}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-[var(--text)]">{home.title}</h3>
                        <span className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                          home.listingType === 'rent' 
                            ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]' 
                            : 'bg-[var(--ink-soft)] text-[var(--text)] border border-[var(--accent)]'
                        }`}>
                          {home.listingType === 'rent' ? `🏠 ${getTranslation(language, 'rent')}` : `💰 ${getTranslation(language, 'sell')}`}
                        </span>
                      </div>
                      <p className="text-[var(--text-muted)] flex items-center gap-1 mb-2">
                        <span>📍</span>
                        {home.street && <span>{home.street}, </span>}
                        {home.area && <span>{getAreaName(home.area, areas, language)}, </span>}
                        {getCityName(home.city, areas, language)}, {getCountryName(home.country, areas, language)}
                      </p>
                      {(home.description || home.descriptionGreek) && (
                        <TranslatedDescription 
                          description={home.description}
                          descriptionGreek={home.descriptionGreek}
                          className="text-[var(--text-muted)] line-clamp-2"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
                    <div>
                      <p className="text-3xl font-bold text-[var(--text)]">
                        €{home.pricePerMonth.toLocaleString()}
                      </p>
                      <p className="text-sm text-[var(--text-muted)]">
                        {home.listingType === 'rent' ? getTranslation(language, 'perMonth') : getTranslation(language, 'totalPrice')}
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
                      <span>{home.bedrooms} {getTranslation(language, 'bedrooms')}</span>
                      <span>{home.bathrooms} {getTranslation(language, 'bathrooms')}</span>
                      {home.sizeSqMeters && <span>{home.sizeSqMeters} m²</span>}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                    <p className="text-xs text-[var(--text-muted)]">
                      {getTranslation(language, 'publishedOn')} {new Date(home.createdAt).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
