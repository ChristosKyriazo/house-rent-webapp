'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'


export default function EditProfilePage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    title: '',
    occupation: '',
    role: 'user',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setFormData({
            name: data.user.name || '',
            dateOfBirth: data.user.dateOfBirth
              ? new Date(data.user.dateOfBirth).toISOString().split('T')[0]
              : '',
            title: data.user.title || '',
            occupation: data.user.occupation || '',
            role: data.user.role || 'user',
          })
        } else {
          router.push('/login')
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name || null,
          dateOfBirth: formData.dateOfBirth || null,
          title: formData.title || null,
          occupation: formData.occupation || null,
          role: formData.role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || getTranslation(language, 'profileUpdateFailed'))
        return
      }

      // Success - force a full page reload to ensure NavBar gets updated role
      window.location.href = '/profile'
    } catch (err) {
      setError(getTranslation(language, 'somethingWentWrong'))
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
      <div className="max-w-2xl mx-auto">
        <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[#E8D5B7]/20">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-[#E8D5B7]">{getTranslation(language, 'editProfileTitle')}</h1>
            <Link
              href="/profile"
              className="px-4 py-2 text-sm text-[#E8D5B7] hover:text-[#D4C19F] transition-colors"
            >
              ← {getTranslation(language, 'cancel')}
            </Link>
          </div>

          {error && (
            <div className="bg-red-50/80 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#E8D5B7] mb-2">
                {getTranslation(language, 'title')} <span className="text-[#E8D5B7]/50">({getTranslation(language, 'optional')})</span>
              </label>
              <select
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7]"
              >
                <option value="">{getTranslation(language, 'none')}</option>
                <option value="Mr">{language === 'el' ? 'Κος' : 'Mr'}</option>
                <option value="Mrs">{language === 'el' ? 'Κυρία' : 'Mrs'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#E8D5B7] mb-2">
                {getTranslation(language, 'userNameOrName')}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                placeholder={language === 'el' ? 'Το όνομά σας ή όνομα χρήστη' : 'Your name or username'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#E8D5B7] mb-2">
                {getTranslation(language, 'dateOfBirth')}
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                placeholder={getTranslation(language, 'yourDateOfBirth')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#E8D5B7] mb-2">
                {getTranslation(language, 'occupation')} <span className="text-[#E8D5B7]/50">({getTranslation(language, 'optional')})</span>
              </label>
              <select
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7]"
              >
                <option value="">{getTranslation(language, 'selectOccupation')}</option>
                <option value="Worker">{language === 'el' ? 'Εργαζόμενος' : 'Worker'}</option>
                <option value="Student">{language === 'el' ? 'Φοιτητής' : 'Student'}</option>
                <option value="Professional">{language === 'el' ? 'Επαγγελματίας' : 'Professional'}</option>
                <option value="Entrepreneur">{language === 'el' ? 'Επιχειρηματίας' : 'Entrepreneur'}</option>
                <option value="Retired">{language === 'el' ? 'Συνταξιούχος' : 'Retired'}</option>
                <option value="Other">{language === 'el' ? 'Άλλο' : 'Other'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#E8D5B7] mb-2">
                {getTranslation(language, 'role')}
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7]"
              >
                <option value="user">👤 {getTranslation(language, 'userSearchProperties')}</option>
                <option value="owner">🏠 {getTranslation(language, 'ownerPublishProperties')}</option>
                <option value="both">🔄 {getTranslation(language, 'ownerAndUserFull')}</option>
              </select>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 px-4 bg-[#E8D5B7] text-[#2D3748] rounded-2xl hover:bg-[#D4C19F] transition-all font-semibold text-base shadow-lg shadow-[#E8D5B7]/20 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
              >
                {saving ? getTranslation(language, 'saving') : getTranslation(language, 'saveChanges')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
