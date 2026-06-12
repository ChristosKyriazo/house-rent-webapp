'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { useRole } from '@/app/contexts/RoleContext'
import { getTranslation } from '@/lib/translations'
import { getAreaName, getCityName, getCountryName, getHomeTitle, getHomeStreet } from '@/lib/area-utils'

interface ApprovedInquiry {
  id: number
  home: { key: string; title: string; titleGreek?: string | null; street: string | null; streetGreek?: string | null; city: string; country: string; area: string | null; finalized?: boolean }
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

        // Use displayRole (respects selectedRole for 'both' users) rather than raw DB role
        const ownerView = displayRole === 'owner' || displayRole === 'broker' ||
          (displayRole === 'both' && (profileData.user.role === 'owner' || profileData.user.role === 'broker'))
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
    return <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center text-[var(--text)]">{getTranslation(language, 'loading')}</div>
  }

  return (
    <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-[var(--text)] mb-8">{getTranslation(language, 'approvedInquiries')}</h1>
        {approvedInquiries.length === 0 ? (
          <div className="bg-[var(--surface)] rounded-3xl p-10 border border-[var(--border-subtle)] text-center text-[var(--text-muted)]">
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
                <div key={inq.id} className="bg-[var(--surface)] rounded-3xl p-6 border border-[var(--border-subtle)]">
                  <div className="flex items-start justify-between gap-4">
                    <Link
                      href={`/homes/${inq.home.key}?from=approved`}
                      className="group"
                    >
                      <h2 className="text-2xl font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{getHomeTitle(language, inq.home)}</h2>
                    </Link>
                    <Link
                      href={`/homes/${inq.home.key}?from=approved`}
                      className="shrink-0 px-4 py-1.5 text-sm font-semibold rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-hover-bg)] transition-all"
                    >
                      {getTranslation(language, 'viewProperty') || 'View Property'}
                    </Link>
                  </div>
                  <p className="text-[var(--text-muted)] text-sm mt-1">
                    {getHomeStreet(language, inq.home) ? `${getHomeStreet(language, inq.home)}, ` : ''}
                    {getCityName(inq.home.city, areas, language)}, {getCountryName(inq.home.country, areas, language)}
                    {inq.home.area ? ` • ${getAreaName(inq.home.area, areas, language)}` : ''}
                  </p>
                  <p className="text-[var(--text-muted)] text-sm mt-3">
                    {isOwner ? `${getTranslation(language, 'user')}: ${inq.user?.name || inq.user?.email || '-'}` : `${getTranslation(language, 'owner')}: ${inq.owner?.name || inq.owner?.email || '-'}`}
                  </p>

                  {inq.contactInfo && (
                    <div className="mt-3 p-3 rounded-xl bg-[var(--ink-soft)]/60 border border-[var(--border-subtle)] text-sm text-[var(--text)]/85">
                      {inq.contactInfo.phone && <p>Phone: {inq.contactInfo.phone}</p>}
                      {inq.contactInfo.timeFrame && <p>Time frame: {inq.contactInfo.timeFrame}</p>}
                      {inq.contactInfo.appointmentThresholdMinutes && <p>Appointment duration: {inq.contactInfo.appointmentThresholdMinutes} min</p>}
                    </div>
                  )}

                  {/* Next step banner + action button */}
                  {inq.status === 'awaiting_finalization' ? (
                    <div className="mt-4 flex items-start justify-between gap-4 p-4 rounded-xl bg-yellow-500/15 border border-yellow-500/40">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">⚡</span>
                        <div>
                          <p className="text-sm font-semibold text-yellow-300">{language === 'el' ? 'Οριστικοποίηση σε εξέλιξη' : 'Finalization in progress'}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{language === 'el' ? 'Αίτημα στάλθηκε στον ενοικιαστή — αναμένεται αποδοχή.' : 'Request sent to tenant — awaiting their acceptance.'}</p>
                        </div>
                      </div>
                      <Link
                        href={`/homes/inquiries/${inq.home.key}?from=approved`}
                        className="shrink-0 px-4 py-2 rounded-xl bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 text-sm font-semibold transition-colors border border-yellow-500/30"
                      >
                        {language === 'el' ? 'Προβολή →' : 'View →'}
                      </Link>
                    </div>
                  ) : inq.status === 'pre_finalization' ? (
                    <div className="mt-4 flex items-start justify-between gap-4 p-4 rounded-xl bg-blue-500/15 border border-blue-500/40">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">🤝</span>
                        <div>
                          <p className="text-sm font-semibold text-blue-300">{language === 'el' ? 'Επόμενο βήμα: Αποστολή προσφοράς' : 'Next step: Send finalization offer'}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{language === 'el' ? 'Η επίσκεψη ολοκληρώθηκε. Μπορείτε να οριστικοποιήσετε.' : 'Viewing done. Confirm the tenant to close the deal.'}</p>
                        </div>
                      </div>
                      {inq.home.finalized ? (
                        <span className="shrink-0 px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-300 text-sm font-semibold">
                          {language === 'el' ? 'Ολοκληρώθηκε' : 'Deal closed'}
                        </span>
                      ) : (
                        <Link
                          href={`/homes/inquiries/${inq.home.key}?from=approved`}
                          className="shrink-0 px-4 py-2 rounded-xl bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 text-sm font-semibold transition-colors border border-blue-500/30"
                        >
                          {language === 'el' ? 'Οριστικοποίηση →' : 'Finalize →'}
                        </Link>
                      )}
                    </div>
                  ) : inq.status === 'waiting_for_schedule' ? (
                    <div className="mt-4 flex items-start justify-between gap-4 p-4 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/30">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">📅</span>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text)]">
                            {isOwner
                              ? (language === 'el' ? 'Αναμονή κράτησης από ενοικιαστή' : 'Waiting for tenant to book')
                              : (language === 'el' ? 'Επόμενο βήμα: Κλείστε επίσκεψη' : 'Next step: Book your viewing')}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            {isOwner
                              ? (language === 'el' ? 'Έχετε ορίσει διαθεσιμότητα. Αναμένετε κράτηση.' : 'Slots available — waiting for the tenant to pick one.')
                              : (language === 'el' ? 'Ο ιδιοκτήτης έχει ορίσει θέσεις επίσκεψης.' : 'The owner has set available time slots.')}
                          </p>
                        </div>
                      </div>
                      {!isOwner && (
                        <Link
                          href={`/homes/${inq.home.key}/book?inquiryId=${inq.id}`}
                          className="shrink-0 px-4 py-2 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25 text-sm font-semibold transition-colors border border-[var(--accent)]/30"
                        >
                          {language === 'el' ? 'Κράτηση →' : 'Book →'}
                        </Link>
                      )}
                    </div>
                  ) : showScheduled ? (
                    <div className="mt-4 flex items-start justify-between gap-4 p-4 rounded-xl bg-green-600/15 border border-green-500/40">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">✅</span>
                        <div className="text-sm text-green-300">
                          {appointment ? (
                            <>
                              <p className="font-semibold">
                                {appointment.status === 'completed' || (inq.status as string) === 'pre_finalization'
                                  ? (language === 'el' ? 'Επίσκεψη ολοκληρώθηκε' : 'Viewing completed')
                                  : (language === 'el' ? 'Επίσκεψη προγραμματισμένη' : 'Viewing scheduled')}
                              </p>
                              <p className="text-xs text-green-400/70 mt-0.5">{new Date(appointment.startTime).toLocaleString(language === 'el' ? 'el-GR' : 'en-US')}</p>
                            </>
                          ) : (
                            <p className="font-semibold">
                              {(inq.status as string) === 'pre_finalization'
                                ? (language === 'el' ? 'Επίσκεψη ολοκληρώθηκε' : 'Viewing completed')
                                : (language === 'el' ? 'Επίσκεψη προγραμματισμένη' : 'Viewing scheduled')}
                            </p>
                          )}
                        </div>
                      </div>
                      <Link
                        href="/homes/calendar"
                        className="shrink-0 px-4 py-2 rounded-xl bg-green-600/20 text-green-300 hover:bg-green-600/30 text-sm font-semibold transition-colors border border-green-500/30"
                      >
                        {language === 'el' ? 'Ημερολόγιο →' : 'Calendar →'}
                      </Link>
                    </div>
                  ) : isOwner && inq.status === 'approved' ? (
                    <div className="mt-4 flex items-start justify-between gap-4 p-4 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/30">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">📅</span>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text)]">{language === 'el' ? 'Επόμενο βήμα: Ορίστε διαθεσιμότητα' : 'Next step: Set availability'}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{language === 'el' ? 'Προσθέστε χρόνους επίσκεψης για τον ενδιαφερόμενο.' : 'Add viewing slots so the tenant can schedule.'}</p>
                        </div>
                      </div>
                      <Link
                        href={`/homes/${inq.home.key}/set-availability`}
                        className="shrink-0 px-4 py-2 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25 text-sm font-semibold transition-colors border border-[var(--accent)]/30"
                      >
                        {language === 'el' ? 'Ορισμός →' : 'Set slots →'}
                      </Link>
                    </div>
                  ) : !isOwner && (
                    <div className="mt-4 flex items-start justify-between gap-4 p-4 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/30">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">🏠</span>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text)]">{language === 'el' ? 'Επόμενο βήμα: Κλείστε επίσκεψη' : 'Next step: Schedule a viewing'}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{language === 'el' ? 'Επιλέξτε ώρα από τις διαθέσιμες θέσεις.' : 'Pick an available time slot from the owner.'}</p>
                        </div>
                      </div>
                      <Link
                        href={`/homes/${inq.home.key}/book?inquiryId=${inq.id}`}
                        className="shrink-0 px-4 py-2 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25 text-sm font-semibold transition-colors border border-[var(--accent)]/30"
                      >
                        {language === 'el' ? 'Κράτηση →' : 'Book →'}
                      </Link>
                    </div>
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
