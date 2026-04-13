'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'
import {
  parseAppointmentThresholdMinutes,
  parseContactInfo,
  type ParsedOwnerContactInfo,
} from '@/lib/appointment-utils'
import NotificationPopup from '@/app/components/NotificationPopup'

interface Availability {
  id: number
  key: string
  date: string
  startTime: string
  endTime: string
  isAvailable: boolean
  hasBookings?: boolean
  bookings?: Array<{
    id: number
    startTime: string
    endTime: string
  }>
}

interface TimeSlot {
  time: string
  availabilityId: number
  isBooked: boolean
}

export default function BookPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const homeKey = params.id as string
  const inquiryId = searchParams.get('inquiryId')
  
  const [home, setHome] = useState<{
    id: number
    key: string
    title: string
    street?: string | null
    city: string
    country: string
    owner: { id: number }
  } | null>(null)
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [appointmentDurationMinutes, setAppointmentDurationMinutes] = useState(30)
  const [effectiveInquiryId, setEffectiveInquiryId] = useState<number | null>(null)
  const [ownerSharedInfo, setOwnerSharedInfo] = useState<ParsedOwnerContactInfo | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, homeRes, availabilityRes, inquiriesRes] = await Promise.all([
          fetch('/api/profile'),
          fetch(`/api/homes/${homeKey}`),
          fetch(`/api/homes/${homeKey}/availability`),
          fetch('/api/inquiries'),
        ])

        const profileData = profileRes.ok ? await profileRes.json() : null
        const homeData = homeRes.ok ? await homeRes.json() : null
        const inquiriesData = inquiriesRes.ok ? await inquiriesRes.json() : null

        // Check user profile to determine if they're an owner (owners/brokers shouldn't book)
        if (profileData?.user) {
          const userRole = (profileData.user.role || 'user').toLowerCase()
          const isOwnerRole = userRole === 'owner' || userRole === 'broker' || userRole === 'both'

          // Also check if user is the owner of this specific home
          const isHomeOwner =
            !!homeData?.home?.owner && profileData.user.id === homeData.home.owner.id

          // If user is owner/broker role OR owns this home, redirect them
          if (isOwnerRole || isHomeOwner) {
            setIsOwner(true)
            router.push('/homes/approved')
            return
          }
        }

        // If we didn't redirect, set home data
        if (homeData && homeData.home) {
          setHome(homeData.home)
        }

        if (availabilityRes.ok) {
          const availabilityData = await availabilityRes.json()
          const availabilitiesWithBookings = availabilityData.availabilities || []

          setAvailabilities(availabilitiesWithBookings)
        }

        let resolvedInquiryId: number | null = null
        if (inquiryId) {
          const parsed = parseInt(inquiryId, 10)
          if (!Number.isNaN(parsed)) resolvedInquiryId = parsed
        } else if (homeData?.home?.id != null && inquiriesData?.inquiryIds) {
          const fromMap = inquiriesData.inquiryIds[homeData.home.id]
          if (typeof fromMap === 'number') resolvedInquiryId = fromMap
        }

        setEffectiveInquiryId(resolvedInquiryId)

        if (resolvedInquiryId != null) {
          const inquiryRes = await fetch(`/api/inquiries/${homeKey}/${resolvedInquiryId}`)
          if (inquiryRes.ok) {
            const inquiryData = await inquiryRes.json()
            const ci = inquiryData?.inquiry?.contactInfo
            const parsed = parseContactInfo(ci)
            setOwnerSharedInfo(parsed)
            const threshold = parseAppointmentThresholdMinutes(ci)
            if (threshold != null) {
              setAppointmentDurationMinutes(threshold)
            }
          }
        } else {
          setOwnerSharedInfo(null)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [homeKey, router, inquiryId])

  // Generate half-hour time slots from availability ranges
  const generateTimeSlots = (availability: Availability): TimeSlot[] => {
    const slots: TimeSlot[] = []
    const [startHour, startMin] = availability.startTime.split(':').map(Number)
    const [endHour, endMin] = availability.endTime.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    
    for (let minutes = startMinutes; minutes + appointmentDurationMinutes <= endMinutes; minutes += appointmentDurationMinutes) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
      
      // Check if this specific time slot is booked
      // Normalize the date string to ensure consistent format
      const dateStr = availability.date.includes('T') ? availability.date.split('T')[0] : availability.date
      const slotStart = new Date(`${dateStr}T${timeString}:00`)
      const slotEnd = new Date(slotStart.getTime() + appointmentDurationMinutes * 60 * 1000)
      
      let isBooked = !availability.isAvailable
      
      // Check if any booking overlaps with this time slot
      if (availability.bookings && availability.bookings.length > 0) {
        const hasOverlap = availability.bookings.some(booking => {
          if (!booking.startTime || !booking.endTime) return false
          
          const bookingStart = new Date(booking.startTime)
          const bookingEnd = new Date(booking.endTime)
          
          // Normalize dates to compare only date parts (ignore timezone issues)
          const slotDate = new Date(slotStart.getFullYear(), slotStart.getMonth(), slotStart.getDate())
          const bookingDate = new Date(bookingStart.getFullYear(), bookingStart.getMonth(), bookingStart.getDate())
          
          // First check if dates match
          if (slotDate.getTime() !== bookingDate.getTime()) {
            return false
          }
          
          // Then check if times overlap (using minutes from midnight for accurate comparison)
          const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes()
          const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes()
          const bookingStartMinutes = bookingStart.getHours() * 60 + bookingStart.getMinutes()
          const bookingEndMinutes = bookingEnd.getHours() * 60 + bookingEnd.getMinutes()
          
          // Check for overlap: slot starts before booking ends AND slot ends after booking starts
          const overlaps = (slotStartMinutes < bookingEndMinutes && slotEndMinutes > bookingStartMinutes)
          
          return overlaps
        })
        
        if (hasOverlap) {
          isBooked = true
        }
      }
      
      slots.push({
        time: timeString,
        availabilityId: availability.id,
        isBooked,
      })
    }
    
    return slots
  }

  // Group availabilities by date and generate time slots
  const groupedByDate = availabilities.reduce((acc, availability) => {
    // Parse the date - it might be a full ISO string or just a date
    const dateStr = availability.date
    let dateKey: string
    
    if (dateStr.includes('T')) {
      // Full ISO string
      dateKey = dateStr.split('T')[0]
    } else {
      // Just date string
      dateKey = dateStr
    }
    
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    
    // Generate time slots for this availability
    const slots = generateTimeSlots(availability)
    acc[dateKey].push(...slots)
    
    return acc
  }, {} as Record<string, TimeSlot[]>)

  // Same clock time can come from overlapping availability rows; if any row marks it
  // booked (overlap with user/owner/home), the slot must stay hidden to avoid double booking.
  Object.keys(groupedByDate).forEach(date => {
    const slots = groupedByDate[date]
    const uniqueSlots = new Map<string, TimeSlot>()
    
    slots.forEach(slot => {
      const existing = uniqueSlots.get(slot.time)
      if (!existing) {
        uniqueSlots.set(slot.time, slot)
      } else {
        uniqueSlots.set(slot.time, {
          ...existing,
          isBooked: existing.isBooked || slot.isBooked,
        })
      }
    })
    
    groupedByDate[date] = Array.from(uniqueSlots.values()).sort((a, b) => 
      a.time.localeCompare(b.time)
    )
  })

  const handleBookSlot = async () => {
    if (!home || !selectedDate || !selectedTimeSlot) {
      setNotification({
        type: 'error',
        message: getTranslation(language, 'selectDateAndTime'),
      })
      return
    }

    setBooking(true)

    try {
      // Find the availability that contains this time slot
      const dateStr = selectedDate
      const matchingAvailability = availabilities.find(av => {
        const avDateStr = av.date.includes('T') ? av.date.split('T')[0] : av.date
        if (avDateStr !== dateStr) return false
        if (av.startTime > selectedTimeSlot || av.endTime <= selectedTimeSlot) return false
        
        // Check if this specific time slot has any bookings
        const slotStart = new Date(`${dateStr}T${selectedTimeSlot}:00`)
        const slotEnd = new Date(slotStart.getTime() + appointmentDurationMinutes * 60 * 1000)
        
        if (av.bookings && av.bookings.length > 0) {
          const hasOverlappingBooking = av.bookings.some((booking: any) => {
            const bookingStart = new Date(booking.startTime)
            const bookingEnd = new Date(booking.endTime)
            return (slotStart < bookingEnd && slotEnd > bookingStart)
          })
          if (hasOverlappingBooking) return false
        }
        
        return av.isAvailable
      })

      if (!matchingAvailability) {
        throw new Error('Time slot not available')
      }

      // Create start and end times based on owner threshold
      const [hour, minute] = selectedTimeSlot.split(':').map(Number)
      const startDateTime = new Date(`${selectedDate}T${selectedTimeSlot}:00`)
      const endDateTime = new Date(startDateTime.getTime() + appointmentDurationMinutes * 60 * 1000)

      // Validate dates
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error('Invalid date/time')
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: home.owner.id,
          inquiryId: effectiveInquiryId,
          availabilityId: matchingAvailability.id,
          title: 'Property Viewing',
          description: `Viewing for ${home.title}`,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          location: 'Property location',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to book slot')
      }

      // Mark availability as booked (or create a new availability record for the remaining time)
      await fetch(`/api/homes/${homeKey}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availabilityId: matchingAvailability.id,
          isAvailable: false,
        }),
      })

      setNotification({
        type: 'success',
        message: getTranslation(language, 'bookingConfirmed'),
      })
      
      // Redirect after a short delay to show success message
      setTimeout(() => {
        router.push('/homes/calendar')
      }, 1500)
    } catch (error) {
      console.error('Error booking slot:', error)
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : getTranslation(language, 'somethingWentWrong'),
      })
    } finally {
      setBooking(false)
      setSelectedDate('')
      setSelectedTimeSlot('')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <p className="text-[var(--text)]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  // If user is an owner, show error message
  if (isOwner) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-[var(--border-subtle)] text-center max-w-md">
          <p className="text-[var(--text)] text-lg mb-4">
            {getTranslation(language, 'onlyUsersCanBook') || 'Only users can book viewing appointments. Owners should use the set availability page.'}
          </p>
          <Link
            href="/homes/approved"
            className="inline-block px-6 py-3 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] rounded-xl hover:bg-[var(--btn-primary-hover-bg)] transition-all font-semibold"
          >
            {getTranslation(language, 'back')}
          </Link>
        </div>
      </div>
    )
  }

  const addressLine =
    home &&
    [home.street, home.city, home.country].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  router.back()
                } else {
                  router.push('/homes/approved')
                }
              }}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--ink)]/40 px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--ink)]"
            >
              ← {getTranslation(language, 'back')}
            </button>
            <Link
              href="/homes/approved"
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--ink)]/40 px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--ink)]"
            >
              {getTranslation(language, 'returnToApproved')}
            </Link>
            <Link
              href="/homes/calendar"
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--ink)]/40 px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--ink)]"
            >
              {getTranslation(language, 'upcomingAppointments')}
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-[var(--text)] mb-2">
            {getTranslation(language, 'bookViewing')}
          </h1>
          {home && (
            <Link
              href={`/homes/${home.key}`}
              className="mt-4 block rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--ink-soft)]"
            >
              <p className="font-display text-xl font-semibold text-[var(--text)]">{home.title}</p>
              {addressLine ? (
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  <span className="font-medium text-[var(--text)]/90">
                    {getTranslation(language, 'address')}:{' '}
                  </span>
                  {addressLine}
                </p>
              ) : null}
              <p className="mt-3 text-sm font-semibold text-[var(--accent-light)]">
                {getTranslation(language, 'viewFullListing')} →
              </p>
            </Link>
          )}
        </div>

        {ownerSharedInfo &&
          (ownerSharedInfo.name ||
            ownerSharedInfo.email ||
            ownerSharedInfo.phone ||
            ownerSharedInfo.ownerNotesBeforeAppointment) && (
            <div className="mb-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--ink-soft)]/90 p-5 shadow-sm">
              <p className="text-sm font-semibold text-[var(--text)] mb-3">
                {getTranslation(language, 'ownerSharedForYourVisit')}
              </p>
              {(ownerSharedInfo.name || ownerSharedInfo.email || ownerSharedInfo.phone) && (
                <ul className="space-y-2 text-sm text-[var(--text)]">
                  {ownerSharedInfo.name && (
                    <li>
                      <span className="font-medium text-[var(--text-muted)]">
                        {getTranslation(language, 'name')}:{' '}
                      </span>
                      {home?.owner?.id != null ? (
                        <Link
                          href={`/profile/ratings/${home.owner.id}?type=owner`}
                          className="font-medium text-[var(--accent-light)] underline-offset-2 hover:underline"
                        >
                          {ownerSharedInfo.name}
                        </Link>
                      ) : (
                        ownerSharedInfo.name
                      )}
                    </li>
                  )}
                  {ownerSharedInfo.email && (
                    <li>
                      <span className="font-medium text-[var(--text-muted)]">
                        {getTranslation(language, 'email')}:{' '}
                      </span>
                      <a
                        href={`mailto:${ownerSharedInfo.email}`}
                        className="text-[var(--accent-light)] underline-offset-2 hover:underline"
                      >
                        {ownerSharedInfo.email}
                      </a>
                    </li>
                  )}
                  {ownerSharedInfo.phone && (
                    <li>
                      <span className="font-medium text-[var(--text-muted)]">
                        {getTranslation(language, 'phone')}:{' '}
                      </span>
                      <a
                        href={`tel:${ownerSharedInfo.phone.replace(/\s/g, '')}`}
                        className="text-[var(--accent-light)] underline-offset-2 hover:underline"
                      >
                        {ownerSharedInfo.phone}
                      </a>
                    </li>
                  )}
                </ul>
              )}
              {ownerSharedInfo.ownerNotesBeforeAppointment && (
                <div
                  className={
                    ownerSharedInfo.name || ownerSharedInfo.email || ownerSharedInfo.phone
                      ? 'mt-4 border-t border-[var(--border-subtle)] pt-4'
                      : ''
                  }
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                    {getTranslation(language, 'ownerMessageBeforeVisit')}
                  </p>
                  <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">
                    {ownerSharedInfo.ownerNotesBeforeAppointment}
                  </p>
                </div>
              )}
            </div>
          )}

        {availabilities.length === 0 ? (
          <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-[var(--border-subtle)] text-center">
            <p className="text-[var(--text-muted)] text-lg mb-4">
              {getTranslation(language, 'noAvailabilitySlots')}
            </p>
            <p className="text-[var(--text-muted)] text-sm">
              {getTranslation(language, 'waitingForOwnerToSetAvailability')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate)
              .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
              .map(([date, timeSlots]) => (
                <div
                  key={date}
                  className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-[var(--border-subtle)]"
                >
                  <h2 className="text-2xl font-bold text-[var(--text)] mb-4">
                    {new Date(date).toLocaleDateString(
                      language === 'el' ? 'el-GR' : 'en-US',
                      {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }
                    )}
                  </h2>
                  
                  <div className="flex items-center gap-4">
                    <label className="text-[var(--text-muted)] font-medium min-w-[120px]">
                      {getTranslation(language, 'selectTime')}:
                    </label>
                    <select
                      value={selectedDate === date ? selectedTimeSlot : ''}
                      onChange={(e) => {
                        setSelectedDate(date)
                        setSelectedTimeSlot(e.target.value)
                      }}
                      className="flex-1 px-4 py-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                    >
                      <option value="">
                        {getTranslation(language, 'selectTimeSlot')}
                      </option>
                      {timeSlots
                        .filter(slot => !slot.isBooked)
                        .map((slot) => (
                          <option key={`${slot.time}-${slot.availabilityId}`} value={slot.time}>
                            {slot.time} - {(() => {
                              const [hour, minute] = slot.time.split(':').map(Number)
                              const endMinutes = hour * 60 + minute + appointmentDurationMinutes
                              const endHour = Math.floor(endMinutes / 60)
                              const endMin = endMinutes % 60
                              return `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
                            })()}
                          </option>
                        ))}
                    </select>
                  </div>
                  
                  {timeSlots.filter(slot => slot.isBooked).length > 0 && (
                    <p className="text-xs text-[var(--text)]/50 mt-2">
                      {getTranslation(language, 'bookedSlots')}: {timeSlots.filter(slot => slot.isBooked).map(slot => slot.time).join(', ')}
                    </p>
                  )}
                </div>
              ))}
            
            {/* Book Button */}
            {selectedDate && selectedTimeSlot && (
              <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-green-500/50">
                <div className="mb-4">
                  <p className="text-[var(--text)] mb-2">
                    <strong>{getTranslation(language, 'selectedDate')}:</strong>{' '}
                    {new Date(selectedDate).toLocaleDateString(
                      language === 'el' ? 'el-GR' : 'en-US',
                      {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }
                    )}
                  </p>
                  <p className="text-[var(--text)]">
                    <strong>{getTranslation(language, 'selectedTime')}:</strong>{' '}
                    {selectedTimeSlot} - {(() => {
                      const [hour, minute] = selectedTimeSlot.split(':').map(Number)
                      const endMinutes = hour * 60 + minute + appointmentDurationMinutes
                      const endHour = Math.floor(endMinutes / 60)
                      const endMin = endMinutes % 60
                      return `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
                    })()}
                  </p>
                </div>
                <button
                  onClick={handleBookSlot}
                  disabled={booking}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {booking ? getTranslation(language, 'booking') : getTranslation(language, 'confirmBooking')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification Popup */}
      {notification && (
        <NotificationPopup
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
          language={language}
        />
      )}
    </div>
  )
}

