'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'

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

  useEffect(() => {
    const fetchHome = async () => {
      try {
        const response = await fetch(`/api/homes/${homeKey}`)
        if (response.ok) {
          const data = await response.json()
          setHome(data.home)
        }
      } catch (error) {
        console.error('Error fetching home:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHome()
  }, [homeKey])

  const addSlot = () => {
    if (!selectedDate || !startTime || !endTime) {
      alert(getTranslation(language, 'fillAllFields'))
      return
    }

    if (startTime >= endTime) {
      alert(getTranslation(language, 'startTimeMustBeBeforeEndTime'))
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
      alert(getTranslation(language, 'addAtLeastOneSlot'))
      return
    }

    setSaving(true)
    try {
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

      alert(getTranslation(language, 'availabilitySaved'))
      router.push(`/homes/inquiries/${homeKey}`)
    } catch (error) {
      console.error('Error saving availability:', error)
      alert(getTranslation(language, 'somethingWentWrong'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2D3748] flex items-center justify-center">
        <p className="text-[#E8D5B7]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#2D3748] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href={`/homes/inquiries/${homeKey}`}
            className="text-[#E8D5B7]/70 hover:text-[#E8D5B7] mb-4 inline-block transition-colors"
          >
            ← {getTranslation(language, 'back')}
          </Link>
          <h1 className="text-4xl font-bold text-[#E8D5B7] mb-2">
            {getTranslation(language, 'setAvailability')}
          </h1>
          {home && (
            <p className="text-[#E8D5B7]/70">
              {home.title}
            </p>
          )}
          <p className="text-sm text-[#E8D5B7]/60 mt-2">
            {getTranslation(language, 'setAvailabilityDescription')}
          </p>
        </div>

        <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-[#E8D5B7]/20">
          {/* Add New Slot Form */}
          <div className="mb-6 p-4 bg-[#2D3748]/50 rounded-2xl border border-[#E8D5B7]/20">
            <h2 className="text-xl font-semibold text-[#E8D5B7] mb-4">
              {getTranslation(language, 'addAvailabilitySlot')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-2">
                  {getTranslation(language, 'date')}
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 bg-[#2D3748] border border-[#E8D5B7]/30 rounded-xl text-[#E8D5B7] focus:outline-none focus:border-[#E8D5B7]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-2">
                  {getTranslation(language, 'startTime')}
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2 bg-[#2D3748] border border-[#E8D5B7]/30 rounded-xl text-[#E8D5B7] focus:outline-none focus:border-[#E8D5B7]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-2">
                  {getTranslation(language, 'endTime')}
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2 bg-[#2D3748] border border-[#E8D5B7]/30 rounded-xl text-[#E8D5B7] focus:outline-none focus:border-[#E8D5B7]"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={addSlot}
                  className="w-full px-4 py-2 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold"
                >
                  {getTranslation(language, 'add')}
                </button>
              </div>
            </div>
          </div>

          {/* List of Added Slots */}
          {slots.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[#E8D5B7] mb-4">
                {getTranslation(language, 'availabilitySlots')}
              </h2>
              <div className="space-y-2">
                {slots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-[#2D3748]/50 rounded-xl border border-[#E8D5B7]/20"
                  >
                    <div className="flex items-center gap-4 text-[#E8D5B7]">
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
              className="px-6 py-3 bg-[#2D3748] text-[#E8D5B7] rounded-xl hover:bg-[#1A202C] transition-all font-semibold"
            >
              {getTranslation(language, 'cancel')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

