'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'
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
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [selectedInquiryId, setSelectedInquiryId] = useState<number | null>(null)
  const [ownerProfile, setOwnerProfile] = useState<{ name: string | null; email: string } | null>(null)
  const [contactInfo, setContactInfo] = useState({
    phone: '',
    timeSchedule: '',
  })
  const [useContactPerson, setUseContactPerson] = useState(false)
  const [areas, setAreas] = useState<Array<{ city: string | null; cityGreek: string | null; country: string | null; countryGreek: string | null }>>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const homeKey = params.homeKey as string
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

        // Fetch owner profile
        const profileRes = await fetch('/api/profile')
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          if (profileData.user) {
            setOwnerProfile({
              name: profileData.user.name,
              email: profileData.user.email,
            })
          }
        }
      } catch (error) {
        console.error('Error fetching inquiries:', error)
        router.push('/homes/inquiries')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.homeKey, router])

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

  const handleApproveClick = (inquiryId: number) => {
    setSelectedInquiryId(inquiryId)
    setShowApproveModal(true)
    setContactInfo({ phone: '', timeSchedule: '' })
    setUseContactPerson(false)
  }

  const handleApproveConfirm = async () => {
    if (!home || !selectedInquiryId) return

    setProcessingId(selectedInquiryId)
    try {
      // Prepare contact info
      const contactInfoData = useContactPerson
        ? {
            useContactPerson: true,
            contactPerson: {
              name: 'John Doe',
              email: 'john.doe@example.com',
              phone: '+30 210 1234567',
            },
          }
        : {
            useContactPerson: false,
            name: ownerProfile?.name || '',
            email: ownerProfile?.email || '',
            phone: contactInfo.phone,
            timeSchedule: contactInfo.timeSchedule,
          }

      const response = await fetch(`/api/inquiries/${home.key}/${selectedInquiryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'approve',
          contactInfo: contactInfoData,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to process inquiry')
      }

      // Refresh inquiries to get updated data
      const inquiriesRes = await fetch(`/api/inquiries/${home.key}`)
      if (inquiriesRes.ok) {
        const data = await inquiriesRes.json()
        setInquiries(data.inquiries || [])
      }

      setShowApproveModal(false)
      setSelectedInquiryId(null)
      setContactInfo({ phone: '', timeSchedule: '' })
      setUseContactPerson(false)
    } catch (error) {
      console.error('Error processing inquiry:', error)
      alert(getTranslation(language, 'somethingWentWrong'))
    } finally {
      setProcessingId(null)
    }
  }

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
      alert(getTranslation(language, 'somethingWentWrong'))
    } finally {
      setProcessingId(null)
    }
  }

  const handleHireContactPerson = () => {
    setUseContactPerson(true)
    // When hiring contact person, auto-approve with contact person info
    handleApproveConfirm()
  }

  // Find the first unapproved and not dismissed inquiry (oldest)
  const unapprovedInquiries = inquiries.filter(inq => !inq.approved && !inq.dismissed)
  const currentInquiry = unapprovedInquiries.length > 0 ? unapprovedInquiries[0] : null
  const currentIndex = currentInquiry ? inquiries.findIndex(inq => inq.id === currentInquiry.id) : -1

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

  return (
    <div className="min-h-screen bg-[#2D3748] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/homes/inquiries"
            className="text-[#E8D5B7]/70 hover:text-[#E8D5B7] mb-4 inline-block transition-colors"
          >
            ← {getTranslation(language, 'back')}
          </Link>
          <h1 className="text-4xl font-bold text-[#E8D5B7] mb-2">
            {home.title}
          </h1>
          <p className="text-[#E8D5B7]/70">
            {home.street && `${home.street}, `}
            {getCityName(home.city, areas, language)}, {getCountryName(home.country, areas, language)}
          </p>
        </div>

        {inquiries.length === 0 ? (
          <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-[#E8D5B7]/20 text-center">
            <p className="text-[#E8D5B7]/70 text-lg">
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

              return (
                <div
                  key={inquiry.id}
                  className={`bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border transition-all ${
                    isGrayedOut
                      ? 'border-[#E8D5B7]/10 opacity-50'
                      : isApproved
                      ? 'border-green-500/50'
                      : 'border-[#E8D5B7]/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Link
                          href={`/profile?userId=${inquiry.user.id}&role=${inquiry.user.role || 'user'}`}
                          className="text-xl font-bold text-[#E8D5B7] hover:text-[#D4C19F] underline transition-colors cursor-pointer"
                        >
                          {inquiry.user.name || inquiry.user.email.split('@')[0]}
                        </Link>
                        {isApproved && (
                          <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-semibold">
                            {getTranslation(language, 'approved')}
                          </span>
                        )}
                      </div>
                      <p className="text-[#E8D5B7]/70 mb-2">{inquiry.user.email}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[#E8D5B7]/70 text-sm">
                          {getTranslation(language, 'rating')}:
                        </span>
                        {inquiry.user.rating !== null && inquiry.user.rating !== 0 ? (
                          <Link
                            href={`/profile?userId=${inquiry.user.id}&role=${inquiry.user.role || 'user'}`}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <span className="text-[#E8D5B7] font-semibold">
                              {inquiry.user.rating.toFixed(1)}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <span
                                  key={i}
                                  className={`text-sm ${
                                    i < Math.round(inquiry.user.rating)
                                      ? 'text-yellow-400'
                                      : 'text-[#E8D5B7]/30'
                                  }`}
                                >
                                  ⭐
                                </span>
                              ))}
                            </div>
                          </Link>
                        ) : (
                          <>
                            <span className="text-[#E8D5B7] font-semibold">0.0</span>
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} className="text-sm text-[#E8D5B7]/30">
                                  ⭐
                                </span>
                              ))}
                            </div>
                            <span className="text-xs text-[#E8D5B7]/60">
                              ({getTranslation(language, 'notRatedYet')})
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-[#E8D5B7]/60 text-xs mt-2">
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
                              onClick={() => handleApproveClick(inquiry.id)}
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
                          <p className="text-[#E8D5B7]/50 text-sm italic">
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

      {/* Approve Modal */}
      {showApproveModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => {
            setShowApproveModal(false)
            setSelectedInquiryId(null)
            setContactInfo({ phone: '', timeSchedule: '' })
          }}
        >
          <div
            className="bg-[#1A202C] rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-[#E8D5B7]/20 shadow-2xl animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-[#E8D5B7]">
                {getTranslation(language, 'approve')} {getTranslation(language, 'inquiry')}
              </h2>
              <button
                onClick={() => {
                  setShowApproveModal(false)
                  setSelectedInquiryId(null)
                  setContactInfo({ phone: '', timeSchedule: '' })
                  setUseContactPerson(false)
                }}
                className="text-[#E8D5B7]/70 hover:text-[#E8D5B7] text-2xl transition-colors"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Side - Contact Information Form */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-[#E8D5B7] mb-4">
                  {getTranslation(language, 'sendContactInfo')}
                </h3>

                {/* Owner Name */}
                <div>
                  <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-2">
                    {getTranslation(language, 'name')}
                  </label>
                  <input
                    type="text"
                    value={ownerProfile?.name || ''}
                    disabled
                    className="w-full px-4 py-2 bg-[#2D3748] border border-[#E8D5B7]/30 rounded-xl text-[#E8D5B7] disabled:opacity-50"
                  />
                </div>

                {/* Owner Email */}
                <div>
                  <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-2">
                    {getTranslation(language, 'email')}
                  </label>
                  <input
                    type="email"
                    value={ownerProfile?.email || ''}
                    disabled
                    className="w-full px-4 py-2 bg-[#2D3748] border border-[#E8D5B7]/30 rounded-xl text-[#E8D5B7] disabled:opacity-50"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-2">
                    {getTranslation(language, 'phone')}
                  </label>
                  <input
                    type="tel"
                    value={contactInfo.phone}
                    onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                    placeholder={getTranslation(language, 'enterPhone')}
                    className="w-full px-4 py-2 bg-[#2D3748] border border-[#E8D5B7]/30 rounded-xl text-[#E8D5B7] focus:border-[#E8D5B7] focus:outline-none"
                  />
                </div>

                {/* Time Schedule */}
                <div>
                  <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-2">
                    {getTranslation(language, 'timeSchedule')}
                  </label>
                  <textarea
                    value={contactInfo.timeSchedule}
                    onChange={(e) => setContactInfo({ ...contactInfo, timeSchedule: e.target.value })}
                    placeholder={getTranslation(language, 'enterTimeSchedule')}
                    rows={4}
                    className="w-full px-4 py-2 bg-[#2D3748] border border-[#E8D5B7]/30 rounded-xl text-[#E8D5B7] focus:border-[#E8D5B7] focus:outline-none resize-none"
                  />
                </div>

                {/* Send Button */}
                <button
                  onClick={handleApproveConfirm}
                  disabled={processingId !== null}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {processingId !== null
                    ? getTranslation(language, 'loading')
                    : getTranslation(language, 'sendAndApprove')}
                </button>
              </div>

              {/* Right Side - Hire Contact Person */}
              <div className="flex flex-col items-center justify-center border-l border-[#E8D5B7]/20 pl-6">
                <div className="text-center space-y-4">
                  <div className="text-6xl mb-4">👤</div>
                  <h3 className="text-xl font-semibold text-[#E8D5B7] mb-2">
                    {getTranslation(language, 'hireContactPerson')}
                  </h3>
                  <p className="text-[#E8D5B7]/70 text-sm mb-6">
                    {getTranslation(language, 'hireContactPersonDescription')}
                  </p>
                  <button
                    onClick={() => {
                      setUseContactPerson(true)
                      handleApproveConfirm()
                    }}
                    className="px-8 py-4 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold text-lg"
                  >
                    {getTranslation(language, 'hireContactPerson')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

