'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'
import NotificationPopup from '@/app/components/NotificationPopup'

interface AvailabilitySlot {
  date: string
  startTime: string
  endTime: string
}

export default function SetAvailabilityPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const homeKey = params.id as string
  const inquiryId = searchParams.get('inquiryId')
  
  const [home, setHome] = useState<{ id: number; key: string; title: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [ownerDetails, setOwnerDetails] = useState({
    name: '',
    email: '',
    phone: '',
    appointmentThresholdMinutes: 30,
  })
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  useEffect(() => {
    const fetchHome = async () => {
      try {
        const [homeRes, profileRes] = await Promise.all([
          fetch(`/api/homes/${homeKey}`),
          fetch('/api/profile'),
        ])

        if (homeRes.ok) {
          const data = await homeRes.json()
          setHome(data.home)
        }

        if (profileRes.ok) {
          const profileData = await profileRes.json()
          const u = profileData?.user
          if (u) {
            setOwnerDetails((prev) => ({
              ...prev,
              name: u.name || '',
              email: u.email || '',
            }))
          }
        }
      } catch (error) {
        console.error('Error fetching home:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHome()
  }, [homeKey, router])

  const addSlot = () => {
    if (!selectedDate || !startTime || !endTime) {
      setNotification({ type: 'error', message: getTranslation(language, 'fillAllFields') })
      return
    }

    if (startTime >= endTime) {
      setNotification({ type: 'error', message: getTranslation(language, 'startTimeMustBeBeforeEndTime') })
      return
    }

    const newSlot: AvailabilitySlot = {
      date: selectedDate,
      startTime,
      endTime,
    }

    setSlots([...slots, newSlot])
    setSelectedDate('')
    setStartTime('09:00')
    setEndTime('17:00')
  }

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (slots.length === 0) {
      setNotification({ type: 'error', message: getTranslation(language, 'addAtLeastOneSlot') })
      return
    }

    setSaving(true)
    try {
      if (inquiryId) {
        const approveRes = await fetch(`/api/inquiries/${homeKey}/${inquiryId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'approve',
            contactInfo: {
              name: ownerDetails.name,
              email: ownerDetails.email,
              phone: ownerDetails.phone,
              appointmentThresholdMinutes: ownerDetails.appointmentThresholdMinutes,
            },
          }),
        })

        if (!approveRes.ok) {
          throw new Error('Failed to approve inquiry')
        }
      }

      const response = await fetch(`/api/homes/${homeKey}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryId: inquiryId ? parseInt(inquiryId) : null,
          slots,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save availability')
      }

      setNotification({
        type: 'success',
        message: inquiryId
          ? getTranslation(language, 'approveAndAvailabilitySaved')
          : getTranslation(language, 'availabilitySaved'),
      })
      setTimeout(() => {
        router.push(`/homes/inquiries/${homeKey}`)
      }, 1200)
    } catch (error) {
      console.error('Error saving availability:', error)
      setNotification({ type: 'error', message: getTranslation(language, 'somethingWentWrong') })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <p className="text-[var(--text)]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href={`/homes/inquiries/${homeKey}`}
            className="text-[var(--text-muted)] hover:text-[var(--text)] mb-4 inline-block transition-colors"
          >
            ← {getTranslation(language, 'back')}
          </Link>
          <h1 className="text-4xl font-bold text-[var(--text)] mb-2">
            {getTranslation(language, 'setAvailability')}
          </h1>
          {home && (
            <p className="text-[var(--text-muted)]">
              {home.title}
            </p>
          )}
          <p className="text-sm text-[var(--text-muted)] mt-2">
            {getTranslation(language, 'setAvailabilityDescription')}
          </p>
        </div>

        <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-[var(--border-subtle)]">
          {inquiryId && (
            <div className="mb-6 p-4 bg-[var(--ink-soft)]/50 rounded-2xl border border-[var(--border-subtle)]">
              <h2 className="text-xl font-semibold text-[var(--text)] mb-4">Contact and Scheduling Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Name</label>
                  <input
                    type="text"
                    value={ownerDetails.name}
                    onChange={(e) => setOwnerDetails({ ...ownerDetails, name: e.target.value })}
                    className="w-full px-4 py-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Email</label>
                  <input
                    type="email"
                    value={ownerDetails.email}
                    onChange={(e) => setOwnerDetails({ ...ownerDetails, email: e.target.value })}
                    className="w-full px-4 py-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Phone</label>
                  <input
                    type="text"
                    value={ownerDetails.phone}
                    onChange={(e) => setOwnerDetails({ ...ownerDetails, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Appointment Duration</label>
                  <select
                    value={ownerDetails.appointmentThresholdMinutes}
                    onChange={(e) => setOwnerDetails({ ...ownerDetails, appointmentThresholdMinutes: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Add New Slot Form */}
          <div className="mb-6 p-4 bg-[var(--ink-soft)]/50 rounded-2xl border border-[var(--border-subtle)]">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">
              {getTranslation(language, 'addAvailabilitySlot')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  {getTranslation(language, 'date')}
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  {getTranslation(language, 'startTime')}
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  {getTranslation(language, 'endTime')}
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={addSlot}
                  className="w-full px-4 py-2 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] rounded-xl hover:bg-[var(--btn-primary-hover-bg)] transition-all font-semibold"
                >
                  {getTranslation(language, 'add')}
                </button>
              </div>
            </div>
          </div>

          {/* List of Added Slots */}
          {slots.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[var(--text)] mb-4">
                {getTranslation(language, 'availabilitySlots')}
              </h2>
              <div className="space-y-2">
                {slots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-[var(--ink-soft)]/50 rounded-xl border border-[var(--border-subtle)]"
                  >
                    <div className="flex items-center gap-4 text-[var(--text)]">
                      <span className="font-semibold">
                        {new Date(slot.date).toLocaleDateString(
                          language === 'el' ? 'el-GR' : 'en-US',
                          {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          }
                        )}
                      </span>
                      <span>
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>
                    <button
                      onClick={() => removeSlot(index)}
                      className="px-3 py-1 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-all text-sm"
                    >
                      {getTranslation(language, 'remove')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving || slots.length === 0}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? getTranslation(language, 'saving') : getTranslation(language, 'saveAvailability')}
            </button>
            <Link
              href={`/homes/inquiries/${homeKey}`}
              className="px-6 py-3 bg-[var(--ink-soft)] text-[var(--text)] rounded-xl hover:bg-[var(--ink-soft)] transition-all font-semibold"
            >
              {getTranslation(language, 'cancel')}
            </Link>
          </div>
        </div>
      </div>

      {notification && (
        <NotificationPopup
          type={notification.type}
          message={notification.message}
          language={language}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  )
}

