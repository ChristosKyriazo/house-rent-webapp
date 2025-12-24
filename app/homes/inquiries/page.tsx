'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'

interface HomeWithInquiries {
  home: {
    id: number
    key: string
    title: string
    street: string | null
    city: string
    country: string
  }
  inquiryCount: number
}

export default function OwnerInquiriesPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [homesWithInquiries, setHomesWithInquiries] = useState<HomeWithInquiries[]>([])
  const [totalInquiries, setTotalInquiries] = useState(0)
  const [loading, setLoading] = useState(true)
  const [checkingRole, setCheckingRole] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if user is an owner
        const profileRes = await fetch('/api/profile')
        const profileData = await profileRes.json()

        if (!profileData.user) {
          router.push('/login')
          return
        }

        const userRole = profileData.user.role || 'user'
        if (userRole !== 'owner' && userRole !== 'both') {
          router.push('/profile')
          return
        }

        setCheckingRole(false)

        // Fetch inquiries
        const response = await fetch('/api/inquiries/owner')
        if (!response.ok) {
          if (response.status === 403) {
            router.push('/profile')
            return
          }
          throw new Error('Failed to fetch inquiries')
        }

        const data = await response.json()
        setHomesWithInquiries(data.homesWithInquiries || [])
        setTotalInquiries(data.totalInquiries || 0)
      } catch (error) {
        console.error('Error fetching inquiries:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  if (checkingRole || loading) {
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

        {homesWithInquiries.length === 0 ? (
          <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-[#E8D5B7]/20 text-center">
            <p className="text-[#E8D5B7]/70 text-lg mb-4">
              {getTranslation(language, 'noInquiriesForListings')}
            </p>
            <Link
              href="/homes/my-listings"
              className="inline-block px-6 py-3 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold"
            >
              {getTranslation(language, 'viewMyListings')}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {homesWithInquiries.map(({ home, inquiryCount }) => (
              <Link
                key={home.id}
                href={`/homes/inquiries/${home.key}`}
                className="block bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-[#E8D5B7]/20 hover:border-[#E8D5B7]/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-[#E8D5B7] mb-2">
                      {home.title}
                    </h2>
                    <p className="text-[#E8D5B7]/70">
                      {home.street && `${home.street}, `}
                      {home.city}, {home.country}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="bg-[#E8D5B7] text-[#2D3748] px-4 py-2 rounded-xl font-bold text-lg">
                      {inquiryCount} {inquiryCount === 1 ? getTranslation(language, 'inquiry') : getTranslation(language, 'inquiries')}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

