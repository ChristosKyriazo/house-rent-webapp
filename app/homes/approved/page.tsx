'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { useRole } from '@/app/contexts/RoleContext'
import { getTranslation, translateValue } from '@/lib/translations'

interface ApprovedInquiry {
  id: number
  key: string
  home: {
    id: number
    key: string
    title: string
    street: string | null
    city: string
    country: string
    area: string | null
    price: number
    size: number | null
    bedrooms: number
    bathrooms: number
    listingType: string
    photos: string[]
  }
  user?: {
    id: number
    name: string | null
    email: string
    role: string
  }
  contactInfo: {
    useContactPerson?: boolean
    contactPerson?: {
      name: string
      email: string
      phone: string
    }
    name?: string
    email?: string
    phone?: string
    timeSchedule?: string
  } | null
  approvedAt: string
  createdAt: string
}

export default function ApprovedInquiriesPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const { selectedRole, actualRole } = useRole()
  const [approvedInquiries, setApprovedInquiries] = useState<ApprovedInquiry[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedInquiry, setExpandedInquiry] = useState<number | null>(null)

  // Determine display role
  const displayRole = (actualRole === 'both' && selectedRole) 
    ? selectedRole 
    : (actualRole || 'user')

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

        // Fetch approved inquiries with the selected role
        const roleParam = displayRole === 'owner' ? 'owner' : 'user'
        const response = await fetch(`/api/inquiries/approved?role=${roleParam}`)
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login')
            return
          }
          throw new Error('Failed to fetch approved inquiries')
        }

        const data = await response.json()
        setApprovedInquiries(data.approvedInquiries || [])
        setTotalCount(data.totalCount || 0)
      } catch (error) {
        console.error('Error fetching approved inquiries:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2D3748] flex items-center justify-center">
        <p className="text-[#E8D5B7]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  const isOwner = displayRole === 'owner'

  return (
    <div className="min-h-screen bg-[#2D3748] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#E8D5B7] mb-2">
            {getTranslation(language, 'approvedInquiries')}
          </h1>
          <p className="text-[#E8D5B7]/70">
            {totalCount > 0
              ? `${totalCount} ${totalCount === 1 ? getTranslation(language, 'approvedInquiry') : getTranslation(language, 'approvedInquiries')}`
              : getTranslation(language, 'noApprovedInquiries')}
          </p>
        </div>

        {approvedInquiries.length === 0 ? (
          <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-[#E8D5B7]/20 text-center">
            <p className="text-[#E8D5B7]/70 text-lg mb-4">
              {getTranslation(language, 'noApprovedInquiries')}
            </p>
            <Link
              href={isOwner ? '/homes/inquiries' : '/homes'}
              className="inline-block px-6 py-3 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold"
            >
              {isOwner ? getTranslation(language, 'viewInquiries') : getTranslation(language, 'searchProperties')}
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {approvedInquiries.map((inquiry) => (
              <div
                key={inquiry.id}
                className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl overflow-hidden shadow-xl border border-green-500/50"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <Link
                        href={`/homes/${inquiry.home.key}`}
                        className="block group"
                      >
                        <h2 className="text-2xl font-bold text-[#E8D5B7] mb-2 group-hover:text-[#D4C19F] transition-colors">
                          {inquiry.home.title}
                        </h2>
                        <p className="text-[#E8D5B7]/70 text-sm mb-3">
                          📍 {inquiry.home.street && `${inquiry.home.street}, `}
                          {inquiry.home.city}, {inquiry.home.country}
                          {inquiry.home.area && ` • ${translateValue(language, inquiry.home.area)}`}
                        </p>
                      </Link>
                      
                      <div className="flex flex-wrap gap-3 text-sm text-[#E8D5B7]/70 mb-3">
                        <span>
                          {inquiry.home.price.toLocaleString()}€{' '}
                          {inquiry.home.listingType === 'rent' ? getTranslation(language, 'perMonth') : ''}
                        </span>
                        {inquiry.home.size && <span>{inquiry.home.size}m²</span>}
                        <span>
                          {inquiry.home.bedrooms} {getTranslation(language, 'bedroomsShort')}
                        </span>
                        <span>
                          {inquiry.home.bathrooms} {getTranslation(language, 'bathroomsShort')}
                        </span>
                      </div>
                    </div>
                    <span className="bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ml-4">
                      ✓ {getTranslation(language, 'approved')}
                    </span>
                  </div>

                  {/* Owner view: Show user info */}
                  {isOwner && inquiry.user && (
                    <div className="bg-[#2D3748]/50 rounded-2xl p-4 mb-4 border border-[#E8D5B7]/20">
                      <h3 className="text-lg font-semibold text-[#E8D5B7] mb-2">
                        {getTranslation(language, 'user')}:{' '}
                        <Link
                          href={`/profile?userId=${inquiry.user.id}&role=${inquiry.user.role || 'user'}`}
                          className="hover:text-[#D4C19F] underline transition-colors cursor-pointer"
                        >
                          {inquiry.user.name || inquiry.user.email.split('@')[0]}
                        </Link>
                      </h3>
                      <p className="text-[#E8D5B7]/70 text-sm">{inquiry.user.email}</p>
                    </div>
                  )}

                  {/* Contact Information */}
                  {inquiry.contactInfo && (
                    <div className="bg-[#2D3748]/50 rounded-2xl p-4 border border-[#E8D5B7]/20">
                      <h3 className="text-lg font-semibold text-[#E8D5B7] mb-3">
                        {getTranslation(language, 'contactInformation')}
                      </h3>
                      {inquiry.contactInfo.useContactPerson && inquiry.contactInfo.contactPerson ? (
                        <div className="space-y-2">
                          <p className="text-[#E8D5B7]">
                            <span className="font-medium">{getTranslation(language, 'name')}:</span>{' '}
                            {inquiry.contactInfo.contactPerson.name}
                          </p>
                          <p className="text-[#E8D5B7]">
                            <span className="font-medium">{getTranslation(language, 'email')}:</span>{' '}
                            {inquiry.contactInfo.contactPerson.email}
                          </p>
                          <p className="text-[#E8D5B7]">
                            <span className="font-medium">{getTranslation(language, 'phone')}:</span>{' '}
                            {inquiry.contactInfo.contactPerson.phone}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {inquiry.contactInfo.name && (
                            <p className="text-[#E8D5B7]">
                              <span className="font-medium">{getTranslation(language, 'name')}:</span>{' '}
                              {inquiry.contactInfo.name}
                            </p>
                          )}
                          {inquiry.contactInfo.email && (
                            <p className="text-[#E8D5B7]">
                              <span className="font-medium">{getTranslation(language, 'email')}:</span>{' '}
                              {inquiry.contactInfo.email}
                            </p>
                          )}
                          {inquiry.contactInfo.phone && (
                            <p className="text-[#E8D5B7]">
                              <span className="font-medium">{getTranslation(language, 'phone')}:</span>{' '}
                              {inquiry.contactInfo.phone}
                            </p>
                          )}
                          {inquiry.contactInfo.timeSchedule && (
                            <div className="mt-3">
                              <p className="text-[#E8D5B7] font-medium mb-1">
                                {getTranslation(language, 'timeSchedule')}:
                              </p>
                              <p className="text-[#E8D5B7]/80 text-sm whitespace-pre-line">
                                {inquiry.contactInfo.timeSchedule}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[#E8D5B7]/60 text-xs mt-4">
                    {getTranslation(language, 'approvedOn')}:{' '}
                    {new Date(inquiry.approvedAt).toLocaleDateString(
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

