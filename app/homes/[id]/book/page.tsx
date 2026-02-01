'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'
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
  
  const [home, setHome] = useState<{ id: number; key: string; title: string; owner: { id: number } } | null>(null)
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, homeRes, availabilityRes] = await Promise.all([
          fetch('/api/profile'),
          fetch(`/api/homes/${homeKey}`),
          fetch(`/api/homes/${homeKey}/availability`),
        ])

        // Read home data once
        let homeData = null
        if (homeRes.ok) {
          homeData = await homeRes.json()
        }

        // Check user profile to determine if they're an owner
        let profileData = null
        if (profileRes.ok) {
          profileData = await profileRes.json()
          if (profileData.user) {
            const userRole = (profileData.user.role || 'user').toLowerCase()
            const isOwnerRole = userRole === 'owner' || userRole === 'broker' || userRole === 'both'
            
            // Also check if user is the owner of this specific home
            let isHomeOwner = false
            if (homeData && homeData.home && homeData.home.owner) {
              isHomeOwner = profileData.user.id === homeData.home.owner.id
            }
            
            // If user is owner/broker role OR owns this home, redirect them
            if (isOwnerRole || isHomeOwner) {
              setIsOwner(true)
              // Redirect owners away from booking page
              router.push('/homes/approved')
              return
            }
          }
        }

        // If we didn't redirect, set home data
        if (homeData && homeData.home) {
          setHome(homeData.home)
        }

        if (availabilityRes.ok) {
          const availabilityData = await availabilityRes.json()
          const availabilitiesWithBookings = availabilityData.availabilities || []
          
          // Debug: Log bookings data to verify they're being received
          console.log('Availabilities received:', availabilitiesWithBookings.map((av: any) => ({
            id: av.id,
            date: av.date,
            startTime: av.startTime,
            endTime: av.endTime,
            bookingsCount: av.bookings?.length || 0,
            bookings: av.bookings?.map((b: any) => ({
              startTime: b.startTime,
              endTime: b.endTime,
            })),
          })))
          
          setAvailabilities(availabilitiesWithBookings)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [homeKey])

  // Generate half-hour time slots from availability ranges
  const generateTimeSlots = (availability: Availability): TimeSlot[] => {
    const slots: TimeSlot[] = []
    const [startHour, startMin] = availability.startTime.split(':').map(Number)
    const [endHour, endMin] = availability.endTime.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
      
      // Check if this specific time slot is booked
      // Normalize the date string to ensure consistent format
      const dateStr = availability.date.includes('T') ? availability.date.split('T')[0] : availability.date
      const slotStart = new Date(`${dateStr}T${timeString}:00`)
      const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)
      
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
          
          // Debug logging (remove in production)
          if (overlaps) {
            console.log('Found overlapping booking:', {
              slotTime: timeString,
              slotDate: dateStr,
              slotMinutes: `${slotStartMinutes}-${slotEndMinutes}`,
              bookingMinutes: `${bookingStartMinutes}-${bookingEndMinutes}`,
              bookingStart: booking.startTime,
              bookingEnd: booking.endTime,
            })
          }
          
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

  // Remove duplicate time slots (keep only available ones if there are conflicts)
  Object.keys(groupedByDate).forEach(date => {
    const slots = groupedByDate[date]
    const uniqueSlots = new Map<string, TimeSlot>()
    
    slots.forEach(slot => {
      const existing = uniqueSlots.get(slot.time)
      if (!existing || (!slot.isBooked && existing.isBooked)) {
        uniqueSlots.set(slot.time, slot)
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
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)
        
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

      // Create start and end times (30-minute slot)
      const [hour, minute] = selectedTimeSlot.split(':').map(Number)
      const startDateTime = new Date(`${selectedDate}T${selectedTimeSlot}:00`)
      const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000) // Add 30 minutes

      // Validate dates
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error('Invalid date/time')
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: home.owner.id,
          inquiryId: inquiryId ? parseInt(inquiryId) : null,
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
      <div className="min-h-screen bg-[#2D3748] flex items-center justify-center">
        <p className="text-[#E8D5B7]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  // If user is an owner, show error message
  if (isOwner) {
    return (
      <div className="min-h-screen bg-[#2D3748] flex items-center justify-center">
        <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-[#E8D5B7]/20 text-center max-w-md">
          <p className="text-[#E8D5B7] text-lg mb-4">
            {getTranslation(language, 'onlyUsersCanBook') || 'Only users can book viewing appointments. Owners should use the set availability page.'}
          </p>
          <Link
            href="/homes/approved"
            className="inline-block px-6 py-3 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold"
          >
            {getTranslation(language, 'back')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#2D3748] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/homes/approved"
            className="text-[#E8D5B7]/70 hover:text-[#E8D5B7] mb-4 inline-block transition-colors"
          >
            ← {getTranslation(language, 'back')}
          </Link>
          <h1 className="text-4xl font-bold text-[#E8D5B7] mb-2">
            {getTranslation(language, 'bookViewing')}
          </h1>
          {home && (
            <p className="text-[#E8D5B7]/70">
              {home.title}
            </p>
          )}
        </div>

        {availabilities.length === 0 ? (
          <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-[#E8D5B7]/20 text-center">
            <p className="text-[#E8D5B7]/70 text-lg mb-4">
              {getTranslation(language, 'noAvailabilitySlots')}
            </p>
            <p className="text-[#E8D5B7]/60 text-sm">
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
                  className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-[#E8D5B7]/20"
                >
                  <h2 className="text-2xl font-bold text-[#E8D5B7] mb-4">
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
                    <label className="text-[#E8D5B7]/70 font-medium min-w-[120px]">
                      {getTranslation(language, 'selectTime')}:
                    </label>
                    <select
                      value={selectedDate === date ? selectedTimeSlot : ''}
                      onChange={(e) => {
                        setSelectedDate(date)
                        setSelectedTimeSlot(e.target.value)
                      }}
                      className="flex-1 px-4 py-2 bg-[#2D3748] border border-[#E8D5B7]/30 rounded-xl text-[#E8D5B7] focus:outline-none focus:border-[#E8D5B7]"
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
                              const endMinutes = hour * 60 + minute + 30
                              const endHour = Math.floor(endMinutes / 60)
                              const endMin = endMinutes % 60
                              return `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
                            })()}
                          </option>
                        ))}
                    </select>
                  </div>
                  
                  {timeSlots.filter(slot => slot.isBooked).length > 0 && (
                    <p className="text-xs text-[#E8D5B7]/50 mt-2">
                      {getTranslation(language, 'bookedSlots')}: {timeSlots.filter(slot => slot.isBooked).map(slot => slot.time).join(', ')}
                    </p>
                  )}
                </div>
              ))}
            
            {/* Book Button */}
            {selectedDate && selectedTimeSlot && (
              <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-green-500/50">
                <div className="mb-4">
                  <p className="text-[#E8D5B7] mb-2">
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
                  <p className="text-[#E8D5B7]">
                    <strong>{getTranslation(language, 'selectedTime')}:</strong>{' '}
                    {selectedTimeSlot} - {(() => {
                      const [hour, minute] = selectedTimeSlot.split(':').map(Number)
                      const endMinutes = hour * 60 + minute + 30
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

