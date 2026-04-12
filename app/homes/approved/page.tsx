'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { useRole } from '@/app/contexts/RoleContext'
import { getTranslation } from '@/lib/translations'
import { getAreaName, getCityName, getCountryName } from '@/lib/area-utils'

interface ApprovedInquiry {
  id: number
  home: { key: string; title: string; street: string | null; city: string; country: string; area: string | null }
  user?: { name: string | null; email: string }
  owner?: { name: string | null; email: string }
  contactInfo: { phone?: string; timeFrame?: string; appointmentThresholdMinutes?: number } | null
  status?: 'approved' | 'waiting_for_schedule' | 'scheduled' | 'pre_finalization' | 'awaiting_finalization'
}

interface BookingSummary {
  status: string
  startTime: string
}

function activeAppointment(bookings: BookingSummary[] | undefined): BookingSummary | null {
  if (!bookings?.length) return null
  const active = bookings.find((b) => (b.status || '').toLowerCase() !== 'cancelled')
  return active ?? null
}

export default function ApprovedInquiriesPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const { selectedRole, actualRole } = useRole()
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [approvedInquiries, setApprovedInquiries] = useState<ApprovedInquiry[]>([])
  const [bookingByInquiry, setBookingByInquiry] = useState<Record<number, BookingSummary | null>>({})
  const [areas, setAreas] = useState<Array<{ name: string; nameGreek: string | null; city: string | null; cityGreek: string | null; country: string | null; countryGreek: string | null }>>([])

  const displayRole = actualRole === 'both' && selectedRole ? selectedRole : (actualRole || 'user')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await fetch('/api/profile', { cache: 'no-store' })
        const profileData = await profileRes.json()
        if (!profileData.user) {
          router.push('/login')
          return
        }

        const role = (profileData.user.role || 'user').toLowerCase()
        const ownerView = role === 'owner' || role === 'broker' || role === 'both'
        setIsOwner(ownerView)

        const approvedRes = await fetch(`/api/inquiries/approved?role=${ownerView ? 'owner' : 'user'}`, {
          cache: 'no-store',
        })
        const approvedData = await approvedRes.json()
        const inquiries = approvedData.approvedInquiries || []
        setApprovedInquiries(inquiries)

        const bookingMap: Record<number, BookingSummary | null> = {}
        await Promise.all(
          inquiries.map(async (inq: ApprovedInquiry) => {
            const res = await fetch(`/api/bookings?inquiryId=${inq.id}`, { cache: 'no-store' })
            if (!res.ok) {
              bookingMap[inq.id] = null
              return
            }
            const data = await res.json()
            bookingMap[inq.id] = activeAppointment(data.bookings as BookingSummary[])
          })
        )
        setBookingByInquiry(bookingMap)
      } catch (error) {
        console.error('Error fetching approved inquiries:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router, displayRole])

  useEffect(() => {
    fetch('/api/areas')
      .then((res) => res.json())
      .then((data) => setAreas(data.areas || []))
      .catch(() => {})
  }, [])

  if (loading) {
    return <div className="min-h-screen bg-[#2D3748] flex items-center justify-center text-[#E8D5B7]">{getTranslation(language, 'loading')}</div>
  }

  return (
    <div className="min-h-screen bg-[#2D3748] py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-[#E8D5B7] mb-8">{getTranslation(language, 'approvedInquiries')}</h1>
        {approvedInquiries.length === 0 ? (
          <div className="bg-[#1A202C]/80 rounded-3xl p-10 border border-[#E8D5B7]/20 text-center text-[#E8D5B7]/70">
            {getTranslation(language, 'noApprovedInquiries')}
          </div>
        ) : (
          <div className="space-y-5">
            {approvedInquiries.map((inq) => {
              const appointment = bookingByInquiry[inq.id]
              const serverSaysScheduled =
                inq.status === 'scheduled' ||
                inq.status === 'pre_finalization' ||
                inq.status === 'awaiting_finalization'
              const showScheduled = appointment !== null || serverSaysScheduled
              return (
                <div key={inq.id} className="bg-[#1A202C]/80 rounded-3xl p-6 border border-[#E8D5B7]/20">
                  <h2 className="text-2xl font-bold text-[#E8D5B7]">{inq.home.title}</h2>
                  <p className="text-[#E8D5B7]/70 text-sm mt-1">
                    {inq.home.street ? `${inq.home.street}, ` : ''}
                    {getCityName(inq.home.city, areas, language)}, {getCountryName(inq.home.country, areas, language)}
                    {inq.home.area ? ` • ${getAreaName(inq.home.area, areas, language)}` : ''}
                  </p>
                  <p className="text-[#E8D5B7]/80 text-sm mt-3">
                    {isOwner ? `${getTranslation(language, 'user')}: ${inq.user?.name || inq.user?.email || '-'}` : `${getTranslation(language, 'owner')}: ${inq.owner?.name || inq.owner?.email || '-'}`}
                  </p>

                  {inq.contactInfo && (
                    <div className="mt-3 p-3 rounded-xl bg-[#2D3748]/60 border border-[#E8D5B7]/20 text-sm text-[#E8D5B7]/85">
                      {inq.contactInfo.phone && <p>Phone: {inq.contactInfo.phone}</p>}
                      {inq.contactInfo.timeFrame && <p>Time frame: {inq.contactInfo.timeFrame}</p>}
                      {inq.contactInfo.appointmentThresholdMinutes && <p>Appointment duration: {inq.contactInfo.appointmentThresholdMinutes} min</p>}
                    </div>
                  )}

                  {showScheduled ? (
                    <div className="mt-4 text-green-300 text-sm bg-green-600/20 border border-green-500/50 rounded-xl p-3 space-y-1">
                      {appointment ? (
                        <>
                          {appointment.status === 'completed' || inq.status === 'pre_finalization'
                            ? `${getTranslation(language, 'completed')}: `
                            : `${getTranslation(language, 'scheduled')}: `}
                          {new Date(appointment.startTime).toLocaleString(language === 'el' ? 'el-GR' : 'en-US')}
                        </>
                      ) : (
                        <>
                          <p>
                            {inq.status === 'pre_finalization'
                              ? getTranslation(language, 'completed')
                              : getTranslation(language, 'scheduled')}
                          </p>
                          <Link
                            href="/homes/calendar"
                            className="inline-block text-[#E8D5B7] underline font-medium hover:text-white"
                          >
                            {getTranslation(language, 'scheduledBookings')}
                          </Link>
                        </>
                      )}
                    </div>
                  ) : (
                    !isOwner && (
                      <div className="mt-4">
                        <Link href={`/homes/${inq.home.key}/book?inquiryId=${inq.id}`} className="inline-block px-5 py-2.5 bg-[#E8D5B7] text-[#2D3748] rounded-xl font-semibold hover:bg-[#D4C19F] transition-all">
                          {getTranslation(language, 'viewAvailableSlots')}
                        </Link>
                      </div>
                    )
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
