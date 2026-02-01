'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { useRole } from '@/app/contexts/RoleContext'
import { getTranslation, translateValue } from '@/lib/translations'
import { getAreaName, getCityName, getCountryName } from '@/lib/area-utils'
import RateUserModal from '@/app/components/RateUserModal'

interface ApprovedInquiry {
  id: number
  key: string
  finalized: boolean
  waitingForFinalization?: boolean
  status?: 'approved' | 'waiting_for_schedule' | 'scheduled' | 'pre_finalization' | 'awaiting_finalization'
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
  owner?: {
    id: number
    name: string | null
    email: string
    occupation: string | null
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

interface ScheduledBooking {
  id: number
  title: string
  description: string | null
  startTime: string
  endTime: string
  location: string | null
  status: string
  user: {
    id: number
    name: string | null
    email: string
    occupation: string | null
  }
  date: string
  availabilityStartTime: string
  availabilityEndTime: string
}

export default function ApprovedInquiriesPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const { selectedRole, actualRole } = useRole()
  const [approvedInquiries, setApprovedInquiries] = useState<ApprovedInquiry[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedInquiry, setExpandedInquiry] = useState<number | null>(null)
  const [areas, setAreas] = useState<Array<{ name: string; nameGreek: string | null; city: string | null; cityGreek: string | null; country: string | null; countryGreek: string | null }>>([])
  const [homeBookings, setHomeBookings] = useState<Record<string, ScheduledBooking[]>>({})
  const [inquiryBookingsMap, setInquiryBookingsMap] = useState<Record<number, boolean>>({})
  // Initialize isOwner based on context role to prevent flash
  const initialIsOwner = actualRole === 'owner' || actualRole === 'broker' || actualRole === 'both'
  const [isOwner, setIsOwner] = useState(initialIsOwner)
  const [ratingModal, setRatingModal] = useState<{ userId: number; userName: string; userEmail: string; inquiryId: number } | null>(null)
  const [statusFilters, setStatusFilters] = useState<string[]>(['approved', 'waiting_for_schedule', 'scheduled', 'pre_finalization', 'awaiting_finalization'])

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

        // Determine if user is owner/broker based on actual role
        const userRole = (profileData.user.role || 'user').toLowerCase()
        // Also check context role as fallback
        const contextRole = (actualRole || 'user').toLowerCase()
        const userIsOwnerOrBroker = 
          userRole === 'owner' || 
          userRole === 'broker' || 
          userRole === 'both' ||
          contextRole === 'owner' ||
          contextRole === 'broker' ||
          contextRole === 'both'
        setIsOwner(userIsOwnerOrBroker)

        // Determine role for API call - treat brokers as owners
        const roleForAPI = userIsOwnerOrBroker ? 'owner' : 'user'
        
        // Fetch approved inquiries with the selected role
        const roleParam = roleForAPI
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

        // Fetch bookings for each inquiry (for both users and owners)
        const bookingsMap: Record<string, ScheduledBooking[]> = {}
        const inquiryBookingsMap: Record<number, boolean> = {} // Track if inquiry has scheduled booking
        
        await Promise.all(
          (data.approvedInquiries || []).map(async (inquiry: ApprovedInquiry) => {
            try {
              // For owners, fetch all bookings for the home
              if (userIsOwnerOrBroker) {
                const bookingsRes = await fetch(`/api/homes/${inquiry.home.key}/bookings`)
                if (bookingsRes.ok) {
                  const bookingsData = await bookingsRes.json()
                  bookingsMap[inquiry.home.key] = bookingsData.bookings || []
                }
              } else {
                // For users, check if this specific inquiry has a scheduled booking
                const bookingsRes = await fetch(`/api/bookings?inquiryId=${inquiry.id}`)
                if (bookingsRes.ok) {
                  const bookingsData = await bookingsRes.json()
                  const inquiryBookings = (bookingsData.bookings || []).filter(
                    (b: any) => b.inquiryId === inquiry.id && b.status === 'scheduled'
                  )
                  inquiryBookingsMap[inquiry.id] = inquiryBookings.length > 0
                }
              }
            } catch (error) {
              console.error(`Error fetching bookings for inquiry ${inquiry.id}:`, error)
              if (userIsOwnerOrBroker) {
                bookingsMap[inquiry.home.key] = []
              } else {
                inquiryBookingsMap[inquiry.id] = false
              }
            }
          })
        )
        
        if (userIsOwnerOrBroker) {
          setHomeBookings(bookingsMap)
        } else {
          // Store inquiry bookings map for users
          setInquiryBookingsMap(inquiryBookingsMap)
        }
      } catch (error) {
        console.error('Error fetching approved inquiries:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router, displayRole])

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

  // isOwner is set in useEffect based on actual user role

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

        {/* Filter for all users (owners/brokers and regular users) */}
        {approvedInquiries.length > 0 && (
          <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-[#E8D5B7]/20 mb-6">
            <h3 className="text-lg font-semibold text-[#E8D5B7] mb-4">
              {getTranslation(language, 'filterByStatus') || 'Filter by Status'}
            </h3>
            <div className="flex flex-wrap gap-3">
              {[
                { value: 'approved', label: getTranslation(language, 'statusApproved') || 'Approved' },
                { value: 'waiting_for_schedule', label: getTranslation(language, 'statusWaitingForSchedule') || 'Waiting for Schedule' },
                { value: 'scheduled', label: getTranslation(language, 'statusScheduled') || 'Scheduled' },
                { value: 'pre_finalization', label: getTranslation(language, 'statusPreFinalization') || 'Pre-Finalization' },
                { value: 'awaiting_finalization', label: getTranslation(language, 'statusAwaitingFinalization') || 'Awaiting Finalization' },
              ].map((status) => (
                <label
                  key={status.value}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={statusFilters.includes(status.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setStatusFilters([...statusFilters, status.value])
                      } else {
                        setStatusFilters(statusFilters.filter(s => s !== status.value))
                      }
                    }}
                    className="w-4 h-4 text-[#E8D5B7] bg-[#2D3748] border-[#E8D5B7]/30 rounded focus:ring-[#E8D5B7] focus:ring-2"
                  />
                  <span className="text-[#E8D5B7] text-sm">{status.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {approvedInquiries.filter(inquiry => {
          // For owners, filter by status. For users, show all if status is not available, otherwise filter by status
          if (isOwner) {
            return inquiry.status && statusFilters.includes(inquiry.status)
          } else {
            // For users, if status is available, filter by it. Otherwise show all (for backward compatibility)
            if (inquiry.status) {
              return statusFilters.includes(inquiry.status)
            }
            // If no status field, check waitingForFinalization for awaiting_finalization filter
            if (statusFilters.includes('awaiting_finalization') && inquiry.waitingForFinalization) {
              return true
            }
            // If awaiting_finalization is not in filters and inquiry is waiting, exclude it
            if (inquiry.waitingForFinalization && !statusFilters.includes('awaiting_finalization')) {
              return false
            }
            // For other cases without status, show if approved is in filters
            return statusFilters.includes('approved')
          }
        }).length === 0 ? (
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
            {approvedInquiries.filter(inquiry => {
              // For owners, filter by status. For users, filter by status if available
              if (isOwner) {
                return inquiry.status && statusFilters.includes(inquiry.status)
              } else {
                // For users, if status is available, filter by it
                if (inquiry.status) {
                  return statusFilters.includes(inquiry.status)
                }
                // If no status field, check waitingForFinalization for awaiting_finalization filter
                if (statusFilters.includes('awaiting_finalization') && inquiry.waitingForFinalization) {
                  return true
                }
                // If awaiting_finalization is not in filters and inquiry is waiting, exclude it
                if (inquiry.waitingForFinalization && !statusFilters.includes('awaiting_finalization')) {
                  return false
                }
                // For other cases without status, show if approved is in filters
                return statusFilters.includes('approved')
              }
            }).map((inquiry) => (
              <div
                key={inquiry.id}
                className={`bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl overflow-hidden shadow-xl border ${
                  inquiry.finalized 
                    ? 'border-purple-500/50' 
                    : inquiry.waitingForFinalization 
                    ? 'border-yellow-500/50' 
                    : 'border-green-500/50'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <Link
                        href={`/homes/${inquiry.home.key}?from=approved${isOwner ? `&inquiryId=${inquiry.id}` : ''}`}
                        className="block group"
                      >
                        <h2 className="text-2xl font-bold text-[#E8D5B7] mb-2 group-hover:text-[#D4C19F] transition-colors">
                          {inquiry.home.title}
                        </h2>
                        <p className="text-[#E8D5B7]/70 text-sm mb-3">
                          📍 {inquiry.home.street && `${inquiry.home.street}, `}
                          {getCityName(inquiry.home.city, areas, language)}, {getCountryName(inquiry.home.country, areas, language)}
                          {inquiry.home.area && ` • ${getAreaName(inquiry.home.area, areas, language)}`}
                        </p>
                      </Link>
                      
                      {/* Status Badge */}
                      <div className="mt-2 mb-3">
                        {(() => {
                          // If finalized, always show finalized status
                          if (inquiry.finalized) {
                            return (
                              <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-xs font-semibold">
                                {getTranslation(language, 'finalized')}
                              </span>
                            )
                          }
                          
                          // Use status field if available, otherwise fall back to old logic
                          const status = inquiry.status || (inquiry.waitingForFinalization ? 'awaiting_finalization' : 'approved')
                          
                          switch (status) {
                            case 'awaiting_finalization':
                              return (
                                <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-semibold">
                                  {getTranslation(language, 'waitingForFinalization')}
                                </span>
                              )
                            case 'pre_finalization':
                              return (
                                <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-semibold">
                                  {getTranslation(language, 'statusPreFinalization') || 'Pre-Finalization'}
                                </span>
                              )
                            case 'scheduled':
                              return (
                                <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
                                  {getTranslation(language, 'statusScheduled') || 'Scheduled'}
                                </span>
                              )
                            case 'waiting_for_schedule':
                              return (
                                <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-semibold">
                                  {getTranslation(language, 'statusWaitingForSchedule') || 'Waiting for Schedule'}
                                </span>
                              )
                            default:
                              return (
                                <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
                                  {getTranslation(language, 'statusApproved') || getTranslation(language, 'approved')}
                                </span>
                              )
                          }
                        })()}
                      </div>
                      
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
                    {(() => {
                      // If finalized, always show finalized status
                      if (inquiry.finalized) {
                        return (
                          <span className="bg-purple-500/20 text-purple-400 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ml-4">
                            ✓ {getTranslation(language, 'finalized')}
                          </span>
                        )
                      }
                      
                      // Use status field if available, otherwise fall back to old logic
                      const status = inquiry.status || (inquiry.waitingForFinalization ? 'awaiting_finalization' : 'approved')
                      
                      switch (status) {
                        case 'awaiting_finalization':
                          return (
                            <span className="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ml-4">
                              ⏳ {getTranslation(language, 'waitingForFinalization')}
                            </span>
                          )
                        case 'pre_finalization':
                          return (
                            <span className="bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ml-4">
                              ✓ {getTranslation(language, 'statusPreFinalization') || 'Pre-Finalization'}
                            </span>
                          )
                        case 'scheduled':
                          return (
                            <span className="bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ml-4">
                              📅 {getTranslation(language, 'statusScheduled') || 'Scheduled'}
                            </span>
                          )
                        case 'waiting_for_schedule':
                          return (
                            <span className="bg-orange-500/20 text-orange-400 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ml-4">
                              ⏰ {getTranslation(language, 'statusWaitingForSchedule') || 'Waiting for Schedule'}
                            </span>
                          )
                        default:
                          return (
                            <span className="bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ml-4">
                              ✓ {getTranslation(language, 'statusApproved') || getTranslation(language, 'approved')}
                            </span>
                          )
                      }
                    })()}
                  </div>

                  {/* Owner view: Show user info and contact info */}
                  {isOwner && inquiry.user && (
                    <>
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
                      
                      {/* User's Contact Information */}
                      {inquiry.contactInfo && (
                        <div className="bg-[#2D3748]/50 rounded-2xl p-4 mb-4 border border-[#E8D5B7]/20">
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
                    </>
                  )}

                  {/* User view: Show owner info */}
                  {!isOwner && inquiry.owner && (
                    <div className="bg-[#2D3748]/50 rounded-2xl p-4 mb-4 border border-[#E8D5B7]/20">
                      <h3 className="text-lg font-semibold text-[#E8D5B7] mb-2">
                        {getTranslation(language, 'owner')}:{' '}
                        <Link
                          href={`/profile?userId=${inquiry.owner.id}&role=owner`}
                          className="hover:text-[#D4C19F] underline transition-colors cursor-pointer"
                        >
                          {inquiry.owner.name || inquiry.owner.email.split('@')[0]}
                        </Link>
                      </h3>
                      <p className="text-[#E8D5B7]/70 text-sm">{inquiry.owner.email}</p>
                      {inquiry.owner.occupation && (
                        <p className="text-[#E8D5B7]/60 text-xs mt-1">
                          {inquiry.owner.occupation}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Finalize/Reject Buttons for Users - Show when there's a pending finalization request */}
                  {!isOwner && inquiry.waitingForFinalization && !inquiry.finalized && (
                    <div className="bg-[#2D3748]/50 rounded-2xl p-4 mt-4 border border-[#E8D5B7]/20">
                      <div className="mb-4 p-3 bg-yellow-600/20 border border-yellow-500/50 rounded-xl text-center">
                        <p className="text-sm font-medium text-yellow-400">
                          {getTranslation(language, 'finalizationRequestReceived') || 'Finalization Request Received'}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/inquiries/${inquiry.home.key}/${inquiry.id}/finalize`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'approve' }),
                              })
                              
                              if (response.ok) {
                                window.location.reload()
                              } else {
                                const data = await response.json()
                                alert(data.error || getTranslation(language, 'finalizeFailed'))
                              }
                            } catch (error) {
                              console.error('Error approving finalization:', error)
                              alert(getTranslation(language, 'finalizeFailed'))
                            }
                          }}
                          className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all"
                        >
                          {getTranslation(language, 'approveFinalization')}
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(getTranslation(language, 'confirmRejectFinalization') || 'Are you sure you want to reject this finalization? The property will be removed from your search results.')) {
                              return
                            }
                            
                            try {
                              const response = await fetch(`/api/inquiries/${inquiry.home.key}/${inquiry.id}/finalize`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'dismiss' }),
                              })
                              
                              if (response.ok) {
                                router.push('/homes')
                              } else {
                                const data = await response.json()
                                alert(data.error || getTranslation(language, 'somethingWentWrong'))
                              }
                            } catch (error) {
                              console.error('Error rejecting finalization:', error)
                              alert(getTranslation(language, 'somethingWentWrong'))
                            }
                          }}
                          className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all"
                        >
                          {getTranslation(language, 'reject')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Book Viewing Button - Only for users and only if no scheduled booking and no pending finalization */}
                  {!isOwner && !inquiryBookingsMap[inquiry.id] && !inquiry.waitingForFinalization && (
                    <div className="bg-[#2D3748]/50 rounded-2xl p-4 mt-4 border border-[#E8D5B7]/20">
                      <h3 className="text-lg font-semibold text-[#E8D5B7] mb-3">
                        {getTranslation(language, 'bookViewing')}
                      </h3>
                      <p className="text-sm text-[#E8D5B7]/70 mb-4">
                        {getTranslation(language, 'selectAvailableSlot')}
                      </p>
                      <Link
                        href={`/homes/${inquiry.home.key}/book?inquiryId=${inquiry.id}`}
                        className="inline-block px-6 py-3 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold"
                      >
                        {getTranslation(language, 'viewAvailableSlots')}
                      </Link>
                    </div>
                  )}
                  
                  {/* Scheduled Bookings - Only for owners/brokers */}
                  {isOwner && (
                    <div className="bg-[#2D3748]/50 rounded-2xl p-4 mt-4 border border-[#E8D5B7]/20">
                      <h3 className="text-lg font-semibold text-[#E8D5B7] mb-3">
                        {getTranslation(language, 'scheduledBookings')}
                      </h3>
                      {homeBookings[inquiry.home.key] && homeBookings[inquiry.home.key].length > 0 ? (
                        <div className="space-y-3">
                          {homeBookings[inquiry.home.key].map((booking) => {
                            // Check if meeting time has passed
                            const meetingEndTime = new Date(booking.endTime)
                            const now = new Date()
                            const meetingHasPassed = now > meetingEndTime
                            
                            return (
                              <div
                                key={booking.id}
                                className="bg-[#1A202C]/80 rounded-xl p-4 border border-green-500/30"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-[#E8D5B7] font-semibold">
                                        {booking.user.name || booking.user.email.split('@')[0]}
                                      </p>
                                      {/* Rate Button - Only show after meeting time has passed AND not waiting for finalization/rejection */}
                                      {meetingHasPassed && !inquiry.waitingForFinalization && !inquiry.finalized && (
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            setRatingModal({
                                              userId: booking.user.id,
                                              userName: booking.user.name || booking.user.email.split('@')[0],
                                              userEmail: booking.user.email,
                                              inquiryId: inquiry.id,
                                            })
                                          }}
                                          className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-xs font-semibold transition-all"
                                        >
                                          {getTranslation(language, 'rate')}
                                        </button>
                                      )}
                                    </div>
                                    <p className="text-[#E8D5B7]/70 text-sm">{booking.user.email}</p>
                                    {booking.user.occupation && (
                                      <p className="text-[#E8D5B7]/60 text-xs mt-1">
                                        {booking.user.occupation}
                                      </p>
                                    )}
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-4 ${
                                    meetingHasPassed 
                                      ? 'bg-blue-500/20 text-blue-400' 
                                      : 'bg-green-500/20 text-green-400'
                                  }`}>
                                    {meetingHasPassed 
                                      ? getTranslation(language, 'completed') || 'Completed'
                                      : getTranslation(language, 'scheduled')
                                    }
                                  </span>
                                </div>
                                <div className="mt-3 pt-3 border-t border-[#E8D5B7]/20">
                                  <p className="text-[#E8D5B7] text-sm">
                                    <span className="font-medium">{getTranslation(language, 'date')}:</span>{' '}
                                    {new Date(booking.startTime).toLocaleDateString(
                                      language === 'el' ? 'el-GR' : 'en-US',
                                      {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                      }
                                    )}
                                  </p>
                                  <p className="text-[#E8D5B7] text-sm">
                                    <span className="font-medium">{getTranslation(language, 'time')}:</span>{' '}
                                    {new Date(booking.startTime).toLocaleTimeString(
                                      language === 'el' ? 'el-GR' : 'en-US',
                                      {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      }
                                    )}{' '}
                                    -{' '}
                                    {new Date(booking.endTime).toLocaleTimeString(
                                      language === 'el' ? 'el-GR' : 'en-US',
                                      {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      }
                                    )}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-[#E8D5B7]/70 text-sm">
                          {getTranslation(language, 'noScheduledBookings')}
                        </p>
                      )}
                      
                      {/* Finalize/Reject Buttons - Only show if there's a scheduled booking AND meeting time has passed AND not waiting for finalization */}
                      {homeBookings[inquiry.home.key] && homeBookings[inquiry.home.key].length > 0 && !inquiry.finalized && !inquiry.waitingForFinalization && (() => {
                        // Find the latest booking for this inquiry
                        const latestBooking = homeBookings[inquiry.home.key]
                          .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())[0]
                        
                        if (!latestBooking) return false
                        
                        // Check if meeting time has passed
                        const meetingEndTime = new Date(latestBooking.endTime)
                        const now = new Date()
                        return now > meetingEndTime
                      })() && (
                        <div className="mt-4 pt-4 border-t border-[#E8D5B7]/20 flex gap-3">
                          <button
                            onClick={async () => {
                              if (!confirm(getTranslation(language, 'confirmFinalize'))) return
                              try {
                                const response = await fetch(`/api/inquiries/${inquiry.home.key}/${inquiry.id}/finalize`, {
                                  method: 'POST',
                                })
                                if (response.ok) {
                                  alert(getTranslation(language, 'finalizeRequestSent'))
                                  window.location.reload()
                                } else {
                                  const data = await response.json()
                                  alert(data.error || getTranslation(language, 'finalizeFailed'))
                                }
                              } catch (error) {
                                console.error('Error finalizing:', error)
                                alert(getTranslation(language, 'finalizeFailed'))
                              }
                            }}
                            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all"
                          >
                            {getTranslation(language, 'finalize')}
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(getTranslation(language, 'confirmReject'))) return
                              try {
                                const response = await fetch(`/api/inquiries/${inquiry.home.key}/${inquiry.id}/reject`, {
                                  method: 'POST',
                                })
                                if (response.ok) {
                                  alert(getTranslation(language, 'rejectSent'))
                                  window.location.reload()
                                } else {
                                  const data = await response.json()
                                  alert(data.error || getTranslation(language, 'somethingWentWrong'))
                                }
                              } catch (error) {
                                console.error('Error rejecting:', error)
                                alert(getTranslation(language, 'somethingWentWrong'))
                              }
                            }}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all"
                          >
                            {getTranslation(language, 'reject')}
                          </button>
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

      {/* Rating Modal */}
      {ratingModal && (
        <RateUserModal
          userId={ratingModal.userId}
          userName={ratingModal.userName}
          userEmail={ratingModal.userEmail}
          inquiryId={ratingModal.inquiryId}
          onClose={() => setRatingModal(null)}
          onSuccess={() => {
            // Refresh the page to update ratings
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}

