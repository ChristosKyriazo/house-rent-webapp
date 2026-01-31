'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { useRole } from '@/app/contexts/RoleContext'
import { getTranslation } from '@/lib/translations'
import BookingDetailsModal from '@/app/components/BookingDetailsModal'
import NotificationPopup from '@/app/components/NotificationPopup'

interface Booking {
  id: number
  key: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  location: string | null
  status: string
  owner: {
    id: number
    name: string | null
    email: string
  }
  user: {
    id: number
    name: string | null
    email: string
    phone?: string | null
    occupation?: string | null
  }
  owner: {
    id: number
    name: string | null
    email: string
    phone?: string | null
    occupation?: string | null
  }
  home?: {
    key: string
    title: string
    street?: string
    city?: string
    country?: string
  }
}

export default function CalendarPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const { selectedRole, actualRole } = useRole()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'day' | 'week' | 'month'>('month')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null)

  // Determine if current user is owner/broker
  const displayRole = (actualRole === 'both' && selectedRole) 
    ? selectedRole 
    : (actualRole || 'user')
  const isOwner = displayRole === 'owner' || displayRole === 'broker' || displayRole === 'both'

  const handleReschedule = () => {
    if (selectedBooking) {
      setReschedulingBooking(selectedBooking)
      setShowRescheduleModal(true)
    }
  }

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await fetch('/api/bookings')
        if (!response.ok) {
          throw new Error('Failed to fetch bookings')
        }
        const data = await response.json()
        setBookings(data.bookings || [])
      } catch (error) {
        console.error('Error fetching bookings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [])

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.startTime)
      return (
        bookingDate.getFullYear() === date.getFullYear() &&
        bookingDate.getMonth() === date.getMonth() &&
        bookingDate.getDate() === date.getDate()
      )
    })
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString(language === 'el' ? 'el-GR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const getWeekDays = (date: Date): Date[] => {
    const weekDays: Date[] = []
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day // Get Monday (or Sunday if week starts on Sunday)
    
    for (let i = 0; i < 7; i++) {
      const weekDay = new Date(startOfWeek)
      weekDay.setDate(diff + i)
      weekDays.push(weekDay)
    }
    
    return weekDays
  }

  const getWeekRange = (date: Date): string => {
    const weekDays = getWeekDays(date)
    const start = weekDays[0]
    const end = weekDays[6]
    
    return `${start.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
      month: 'short',
      day: 'numeric',
    })} - ${end.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2D3748] flex items-center justify-center">
        <p className="text-[#E8D5B7]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  const days = getDaysInMonth(selectedDate)
  const monthName = selectedDate.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', { month: 'long', year: 'numeric' })
  const weekDays = language === 'el' 
    ? ['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="min-h-screen bg-[#2D3748] py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#E8D5B7] mb-4">
            {getTranslation(language, 'calendar')}
          </h1>
          
          {/* View Toggle */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex gap-2 bg-[#1A202C]/80 rounded-xl p-1">
              <button
                onClick={() => setView('day')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  view === 'day'
                    ? 'bg-[#E8D5B7] text-[#2D3748] font-semibold'
                    : 'text-[#E8D5B7]/70 hover:text-[#E8D5B7]'
                }`}
              >
                {getTranslation(language, 'day')}
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  view === 'week'
                    ? 'bg-[#E8D5B7] text-[#2D3748] font-semibold'
                    : 'text-[#E8D5B7]/70 hover:text-[#E8D5B7]'
                }`}
              >
                {getTranslation(language, 'week')}
              </button>
              <button
                onClick={() => setView('month')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  view === 'month'
                    ? 'bg-[#E8D5B7] text-[#2D3748] font-semibold'
                    : 'text-[#E8D5B7]/70 hover:text-[#E8D5B7]'
                }`}
              >
                {getTranslation(language, 'month')}
              </button>
            </div>
            
            {/* Today Button */}
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-4 py-2 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold"
            >
              {getTranslation(language, 'today')}
            </button>
          </div>
        </div>

        {/* Day View */}
        {view === 'day' && (
          <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-[#E8D5B7]/20">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => {
                  const newDate = new Date(selectedDate)
                  newDate.setDate(selectedDate.getDate() - 1)
                  setSelectedDate(newDate)
                }}
                className="px-4 py-2 text-[#E8D5B7] hover:bg-[#2D3748] rounded-xl transition-all"
              >
                ←
              </button>
              <h2 className="text-2xl font-bold text-[#E8D5B7]">
                {selectedDate.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h2>
              <button
                onClick={() => {
                  const newDate = new Date(selectedDate)
                  newDate.setDate(selectedDate.getDate() + 1)
                  setSelectedDate(newDate)
                }}
                className="px-4 py-2 text-[#E8D5B7] hover:bg-[#2D3748] rounded-xl transition-all"
              >
                →
              </button>
            </div>

            <div className="space-y-4">
              {getBookingsForDate(selectedDate).length === 0 ? (
                <p className="text-[#E8D5B7]/70 text-center py-8">
                  {getTranslation(language, 'noBookings')}
                </p>
              ) : (
                getBookingsForDate(selectedDate)
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map(booking => (
                    <div
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className="bg-[#2D3748]/50 rounded-2xl p-4 border border-[#E8D5B7]/20 cursor-pointer hover:bg-[#2D3748] hover:border-[#E8D5B7]/40 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-[#E8D5B7] mb-2">
                            {booking.title}
                          </h3>
                          {booking.description && (
                            <p className="text-[#E8D5B7]/70 text-sm mb-2">{booking.description}</p>
                          )}
                          <div className="space-y-1 text-sm text-[#E8D5B7]/70">
                            <p>🕐 {formatTime(booking.startTime)} - {formatTime(booking.endTime)}</p>
                            {booking.location && <p>📍 {booking.location}</p>}
                            <p>👤 {getTranslation(language, 'with')}: {booking.owner.name || booking.owner.email}</p>
                            {booking.home && (
                              <Link
                                href={`/homes/${booking.home.key}`}
                                className="text-[#E8D5B7] hover:text-[#D4C19F] underline"
                              >
                                🏠 {booking.home.title}
                              </Link>
                            )}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          booking.status === 'scheduled'
                            ? 'bg-blue-500/20 text-blue-400'
                            : booking.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* Week View */}
        {view === 'week' && (
          <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-[#E8D5B7]/20">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => {
                  const newDate = new Date(selectedDate)
                  newDate.setDate(selectedDate.getDate() - 7)
                  setSelectedDate(newDate)
                }}
                className="px-4 py-2 text-[#E8D5B7] hover:bg-[#2D3748] rounded-xl transition-all"
              >
                ←
              </button>
              <h2 className="text-2xl font-bold text-[#E8D5B7]">
                {getWeekRange(selectedDate)}
              </h2>
              <button
                onClick={() => {
                  const newDate = new Date(selectedDate)
                  newDate.setDate(selectedDate.getDate() + 7)
                  setSelectedDate(newDate)
                }}
                className="px-4 py-2 text-[#E8D5B7] hover:bg-[#2D3748] rounded-xl transition-all"
              >
                →
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {getWeekDays(selectedDate).map((day, index) => {
                const dayBookings = getBookingsForDate(day)
                const isToday = day.toDateString() === new Date().toDateString()

                return (
                  <div
                    key={day.toISOString()}
                    className={`border border-[#E8D5B7]/20 rounded-xl p-3 min-h-[200px] ${
                      isToday ? 'bg-[#E8D5B7]/10 border-[#E8D5B7]/40' : 'bg-[#2D3748]/50'
                    }`}
                  >
                    <div className={`text-sm font-semibold mb-2 ${isToday ? 'text-[#E8D5B7]' : 'text-[#E8D5B7]/70'}`}>
                      {weekDays[index]}
                    </div>
                    <div className={`text-lg font-bold mb-2 ${isToday ? 'text-[#E8D5B7]' : 'text-[#E8D5B7]/70'}`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayBookings.map(booking => (
                        <div
                          key={booking.id}
                          onClick={() => setSelectedBooking(booking)}
                          className="text-xs bg-blue-500/30 text-blue-200 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-blue-500/50 transition-all"
                          title={booking.title}
                        >
                          {formatTime(booking.startTime)} {booking.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Month View */}
        {view === 'month' && (
          <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-[#E8D5B7]/20">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigateMonth('prev')}
                className="px-4 py-2 text-[#E8D5B7] hover:bg-[#2D3748] rounded-xl transition-all"
              >
                ←
              </button>
              <h2 className="text-2xl font-bold text-[#E8D5B7]">{monthName}</h2>
              <button
                onClick={() => navigateMonth('next')}
                className="px-4 py-2 text-[#E8D5B7] hover:bg-[#2D3748] rounded-xl transition-all"
              >
                →
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Week Day Headers */}
              {weekDays.map(day => (
                <div key={day} className="text-center text-sm font-semibold text-[#E8D5B7]/70 py-2">
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {days.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="aspect-square" />
                }

                const dayBookings = getBookingsForDate(day)
                const isToday = day.toDateString() === new Date().toDateString()

                return (
                  <div
                    key={day.toISOString()}
                    className={`aspect-square border border-[#E8D5B7]/20 rounded-xl p-2 ${
                      isToday ? 'bg-[#E8D5B7]/10 border-[#E8D5B7]/40' : 'bg-[#2D3748]/50'
                    }`}
                  >
                    <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-[#E8D5B7]' : 'text-[#E8D5B7]/70'}`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayBookings.slice(0, 3).map(booking => (
                        <div
                          key={booking.id}
                          onClick={() => setSelectedBooking(booking)}
                          className="text-xs bg-blue-500/30 text-blue-200 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-blue-500/50 transition-all"
                          title={booking.title}
                        >
                          {formatTime(booking.startTime)} {booking.title}
                        </div>
                      ))}
                      {dayBookings.length > 3 && (
                        <div className="text-xs text-[#E8D5B7]/60">
                          +{dayBookings.length - 3} {getTranslation(language, 'more')}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Booking Details Modal */}
        {selectedBooking && (
          <BookingDetailsModal
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
            isOwner={isOwner}
            onReschedule={handleReschedule}
            onCancel={() => {
              setSelectedBooking(null)
              // Refresh bookings
              fetch('/api/bookings')
                .then(res => res.json())
                .then(data => setBookings(data.bookings || []))
                .catch(err => console.error('Error refreshing bookings:', err))
            }}
            currentUserId={selectedBooking.user?.id}
          />
        )}

        {/* Reschedule Modal */}
        {showRescheduleModal && reschedulingBooking && reschedulingBooking.home && (
          <RescheduleModal
            booking={reschedulingBooking}
            homeKey={reschedulingBooking.home.key}
            onClose={() => {
              setShowRescheduleModal(false)
              setReschedulingBooking(null)
            }}
            onSuccess={() => {
              setShowRescheduleModal(false)
              setReschedulingBooking(null)
              setSelectedBooking(null)
              // Refresh bookings
              fetch('/api/bookings')
                .then(res => res.json())
                .then(data => setBookings(data.bookings || []))
                .catch(err => console.error('Error refreshing bookings:', err))
            }}
            language={language}
          />
        )}
      </div>
    </div>
  )
}

// Reschedule Modal Component
function RescheduleModal({ 
  booking, 
  homeKey, 
  onClose, 
  onSuccess,
  language 
}: { 
  booking: Booking
  homeKey: string
  onClose: () => void
  onSuccess: () => void
  language: 'el' | 'en'
}) {
  const [availabilities, setAvailabilities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [rescheduling, setRescheduling] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  useEffect(() => {
    const fetchAvailabilities = async () => {
      try {
        const response = await fetch(`/api/homes/${homeKey}/availability`)
        if (response.ok) {
          const data = await response.json()
          setAvailabilities(data.availabilities || [])
        }
      } catch (error) {
        console.error('Error fetching availabilities:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAvailabilities()
  }, [homeKey])

  // Generate half-hour time slots
  const generateTimeSlots = (availability: any) => {
    const slots: Array<{ time: string; availabilityId: number; isBooked: boolean }> = []
    const [startHour, startMin] = availability.startTime.split(':').map(Number)
    const [endHour, endMin] = availability.endTime.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
      
      // Check if this specific time slot is booked
      const dateStr = availability.date.includes('T') ? availability.date.split('T')[0] : availability.date
      const slotStart = new Date(`${dateStr}T${timeString}:00`)
      const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)
      
      let isBooked = false
      
      // Check if any booking overlaps with this time slot (excluding the current booking being rescheduled)
      // First check bookings for this specific home
      if (availability.bookings && availability.bookings.length > 0) {
        isBooked = availability.bookings.some((b: any) => {
          // Exclude the current booking being rescheduled
          if (b.id === booking.id) return false
          
          const bStart = new Date(b.startTime)
          const bEnd = new Date(b.endTime)
          
          // Normalize dates to compare only date parts
          const slotDate = new Date(slotStart.getFullYear(), slotStart.getMonth(), slotStart.getDate())
          const bDate = new Date(bStart.getFullYear(), bStart.getMonth(), bStart.getDate())
          
          if (slotDate.getTime() !== bDate.getTime()) {
            return false
          }
          
          // Check time overlap using minutes from midnight
          const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes()
          const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes()
          const bStartMinutes = bStart.getHours() * 60 + bStart.getMinutes()
          const bEndMinutes = bEnd.getHours() * 60 + bEnd.getMinutes()
          
          return (slotStartMinutes < bEndMinutes && slotEndMinutes > bStartMinutes)
        })
      }
      
      // Also check all user/owner bookings across all properties (if available)
      if (!isBooked && availability.allUserAndOwnerBookings && availability.allUserAndOwnerBookings.length > 0) {
        isBooked = availability.allUserAndOwnerBookings.some((b: any) => {
          // Exclude the current booking being rescheduled
          if (b.id === booking.id) return false
          
          const bStart = new Date(b.startTime)
          const bEnd = new Date(b.endTime)
          
          // Normalize dates to compare only date parts
          const slotDate = new Date(slotStart.getFullYear(), slotStart.getMonth(), slotStart.getDate())
          const bDate = new Date(bStart.getFullYear(), bStart.getMonth(), bStart.getDate())
          
          if (slotDate.getTime() !== bDate.getTime()) {
            return false
          }
          
          // Check time overlap using minutes from midnight
          const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes()
          const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes()
          const bStartMinutes = bStart.getHours() * 60 + bStart.getMinutes()
          const bEndMinutes = bEnd.getHours() * 60 + bEnd.getMinutes()
          
          return (slotStartMinutes < bEndMinutes && slotEndMinutes > bStartMinutes)
        })
      }
      
      // Also check all user/owner bookings across all properties (if available)
      if (!isBooked && availability.allUserAndOwnerBookings && availability.allUserAndOwnerBookings.length > 0) {
        isBooked = availability.allUserAndOwnerBookings.some((b: any) => {
          // Exclude the current booking being rescheduled
          if (b.id === booking.id) return false
          
          const bStart = new Date(b.startTime)
          const bEnd = new Date(b.endTime)
          
          // Normalize dates to compare only date parts
          const slotDate = new Date(slotStart.getFullYear(), slotStart.getMonth(), slotStart.getDate())
          const bDate = new Date(bStart.getFullYear(), bStart.getMonth(), bStart.getDate())
          
          if (slotDate.getTime() !== bDate.getTime()) {
            return false
          }
          
          // Check time overlap using minutes from midnight
          const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes()
          const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes()
          const bStartMinutes = bStart.getHours() * 60 + bStart.getMinutes()
          const bEndMinutes = bEnd.getHours() * 60 + bEnd.getMinutes()
          
          return (slotStartMinutes < bEndMinutes && slotEndMinutes > bStartMinutes)
        })
      }
      
      slots.push({
        time: timeString,
        availabilityId: availability.id,
        isBooked,
      })
    }
    
    return slots
  }

  // Group availabilities by date
  const groupedByDate = availabilities.reduce((acc, availability) => {
    const dateStr = availability.date
    let dateKey: string
    
    if (dateStr.includes('T')) {
      dateKey = dateStr.split('T')[0]
    } else {
      dateKey = dateStr
    }
    
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    
    const slots = generateTimeSlots(availability)
    acc[dateKey].push(...slots)
    
    return acc
  }, {} as Record<string, Array<{ time: string; availabilityId: number; isBooked: boolean }>>)

  // Debug: Log grouped dates and slot counts
  useEffect(() => {
    if (availabilities.length > 0) {
      console.log('Reschedule Modal - Availabilities:', availabilities.length)
      console.log('Reschedule Modal - Grouped dates:', Object.keys(groupedByDate))
      Object.entries(groupedByDate).forEach(([date, slots]) => {
        const availableSlots = slots.filter(s => !s.isBooked)
        console.log(`Date ${date}: ${slots.length} total slots, ${availableSlots.length} available`)
      })
    }
  }, [availabilities, groupedByDate])

  // Remove duplicates
  Object.keys(groupedByDate).forEach(date => {
    const slots = groupedByDate[date]
    const uniqueSlots = new Map<string, { time: string; availabilityId: number; isBooked: boolean }>()
    
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

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTimeSlot) {
      setNotification({
        type: 'error',
        message: getTranslation(language, 'selectDateAndTime'),
      })
      return
    }

    setRescheduling(true)

    try {
      const dateStr = selectedDate
      const currentBookingId = booking.id
      const matchingAvailability = availabilities.find((av: any) => {
        const avDateStr = av.date.includes('T') ? av.date.split('T')[0] : av.date
        if (avDateStr !== dateStr) return false
        
        // Check if the selected time slot is within the availability time range
        const [availStartHour, availStartMin] = av.startTime.split(':').map(Number)
        const [availEndHour, availEndMin] = av.endTime.split(':').map(Number)
        const [selectedHour, selectedMin] = selectedTimeSlot.split(':').map(Number)
        
        const availStartMinutes = availStartHour * 60 + availStartMin
        const availEndMinutes = availEndHour * 60 + availEndMin
        const selectedMinutes = selectedHour * 60 + selectedMin
        
        // Check if selected time is within availability range
        if (selectedMinutes < availStartMinutes || selectedMinutes >= availEndMinutes) {
          return false
        }
        
        // Check if this specific time slot has any bookings (excluding the current booking being rescheduled)
        const slotStart = new Date(`${dateStr}T${selectedTimeSlot}:00`)
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)
        
        if (av.bookings && av.bookings.length > 0) {
          const hasOverlappingBooking = av.bookings.some((b: any) => {
            // Exclude the current booking being rescheduled
            if (b.id === currentBookingId) return false
            
            const bStart = new Date(b.startTime)
            const bEnd = new Date(b.endTime)
            
            // Normalize dates to compare only date parts
            const slotDate = new Date(slotStart.getFullYear(), slotStart.getMonth(), slotStart.getDate())
            const bDate = new Date(bStart.getFullYear(), bStart.getMonth(), bStart.getDate())
            
            if (slotDate.getTime() !== bDate.getTime()) {
              return false
            }
            
            // Check time overlap using minutes from midnight
            const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes()
            const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes()
            const bStartMinutes = bStart.getHours() * 60 + bStart.getMinutes()
            const bEndMinutes = bEnd.getHours() * 60 + bEnd.getMinutes()
            
            return (slotStartMinutes < bEndMinutes && slotEndMinutes > bStartMinutes)
          })
          if (hasOverlappingBooking) return false
        }
        
        // Don't check isAvailable flag - we check actual bookings instead
        return true
      })
      
      console.log('Reschedule - Finding availability:', {
        selectedDate: dateStr,
        selectedTimeSlot,
        availabilitiesCount: availabilities.length,
        matchingAvailability: matchingAvailability ? {
          id: matchingAvailability.id,
          date: matchingAvailability.date,
          startTime: matchingAvailability.startTime,
          endTime: matchingAvailability.endTime,
          bookingsCount: matchingAvailability.bookings?.length || 0,
        } : null,
      })

      if (!matchingAvailability) {
        throw new Error('Time slot not available')
      }

      const startDateTime = new Date(`${selectedDate}T${selectedTimeSlot}:00`)
      const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000)

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error('Invalid date/time')
      }

      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availabilityId: matchingAvailability.id,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reschedule booking')
      }

      setNotification({
        type: 'success',
        message: getTranslation(language, 'bookingRescheduled'),
      })

      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (error) {
      console.error('Error rescheduling booking:', error)
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : getTranslation(language, 'somethingWentWrong'),
      })
    } finally {
      setRescheduling(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#1A202C] rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#E8D5B7]/20 shadow-2xl animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-[#E8D5B7]">
            {getTranslation(language, 'rescheduleBooking')}
          </h2>
          <button
            onClick={onClose}
            className="text-[#E8D5B7]/70 hover:text-[#E8D5B7] text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <p className="text-[#E8D5B7]/70 mb-2">
            <strong>{getTranslation(language, 'currentBooking')}:</strong>
          </p>
          <p className="text-[#E8D5B7]">
            {new Date(booking.startTime).toLocaleDateString(
              language === 'el' ? 'el-GR' : 'en-US',
              {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }
            )} at {new Date(booking.startTime).toLocaleTimeString(
              language === 'el' ? 'el-GR' : 'en-US',
              { hour: '2-digit', minute: '2-digit' }
            )}
          </p>
        </div>

        {loading ? (
          <p className="text-[#E8D5B7]">{getTranslation(language, 'loading')}</p>
        ) : Object.keys(groupedByDate).length === 0 ? (
          <p className="text-[#E8D5B7]/70">{getTranslation(language, 'noAvailabilitySlots')}</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate)
              .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
              .map(([date, timeSlots]) => (
                <div
                  key={date}
                  className="bg-[#2D3748]/50 rounded-2xl p-4 border border-[#E8D5B7]/20"
                >
                  <h3 className="text-lg font-semibold text-[#E8D5B7] mb-3">
                    {new Date(date).toLocaleDateString(
                      language === 'el' ? 'el-GR' : 'en-US',
                      {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }
                    )}
                  </h3>
                  
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
                      {timeSlots.length > 0 ? (
                        timeSlots
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
                          ))
                      ) : (
                        <option value="" disabled>
                          {getTranslation(language, 'noAvailableSlotsForThisDay')}
                        </option>
                      )}
                    </select>
                  </div>
                </div>
              ))}
          </div>
        )}

        {selectedDate && selectedTimeSlot && (
          <div className="mt-6 bg-[#2D3748]/50 rounded-2xl p-4 border border-green-500/50">
            <p className="text-[#E8D5B7] mb-2">
              <strong>{getTranslation(language, 'newBookingTime')}:</strong>
            </p>
            <p className="text-[#E8D5B7]">
              {new Date(selectedDate).toLocaleDateString(
                language === 'el' ? 'el-GR' : 'en-US',
                {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }
              )} at {selectedTimeSlot} - {(() => {
                const [hour, minute] = selectedTimeSlot.split(':').map(Number)
                const endMinutes = hour * 60 + minute + 30
                const endHour = Math.floor(endMinutes / 60)
                const endMin = endMinutes % 60
                return `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
              })()}
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-[#2D3748] text-[#E8D5B7] rounded-xl hover:bg-[#1A202C] transition-all font-semibold"
          >
            {getTranslation(language, 'cancel')}
          </button>
          <button
            onClick={handleReschedule}
            disabled={rescheduling || !selectedDate || !selectedTimeSlot}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {rescheduling ? getTranslation(language, 'rescheduling') : getTranslation(language, 'confirmReschedule')}
          </button>
        </div>

        {notification && (
          <NotificationPopup
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
            language={language}
          />
        )}
      </div>
    </div>
  )
}

