'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation, translateValue, reverseTranslateValue } from '@/lib/translations'
import { useClerk } from '@clerk/nextjs'


export default function EditProfilePage() {
  const router = useRouter()
  const { language } = useLanguage()
  const { signOut } = useClerk()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    occupation: '',
    role: 'user',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/profile')
      .then((res) => {
        if (!res.ok) {
          router.push('/login')
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (data && data.user) {
          setFormData({
            name: data.user.name || '',
            dateOfBirth: data.user.dateOfBirth
              ? new Date(data.user.dateOfBirth).toISOString().split('T')[0]
              : '',
            occupation: data.user.occupation ? reverseTranslateValue(data.user.occupation) : '',
            role: data.user.role || 'user',
          })
        } else {
          router.push('/profile')
        }
      })
      .catch(() => router.push('/profile'))
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

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setDeleting(true)
    setError('')

    try {
      const response = await fetch('/api/profile', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || getTranslation(language, 'accountDeletionFailed'))
        setDeleting(false)
        setShowDeleteConfirm(false)
        return
      }

      // Account deleted successfully, sign out and redirect
      await signOut({ redirectUrl: '/login' })
    } catch (err) {
      console.error('Error deleting account:', err)
      setError(getTranslation(language, 'somethingWentWrong'))
      setDeleting(false)
      setShowDeleteConfirm(false)
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
                {getTranslation(language, 'userNameOrName')}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                placeholder={getTranslation(language, 'placeholderName')}
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
                <option value="Employed">{translateValue(language, 'Employed')}</option>
                <option value="Student">{translateValue(language, 'Student')}</option>
                <option value="Retired">{translateValue(language, 'Retired')}</option>
                <option value="Unemployed">{translateValue(language, 'Unemployed')}</option>
                <option value="Other">{translateValue(language, 'Other')}</option>
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

          {/* Delete Account Section */}
          <div className="mt-8 pt-8 border-t border-red-500/30">
            <h2 className="text-xl font-bold text-red-400 mb-4">{getTranslation(language, 'dangerZone')}</h2>
            <p className="text-[#E8D5B7]/70 text-sm mb-4">{getTranslation(language, 'deleteAccountDescription')}</p>
            {!showDeleteConfirm ? (
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-6 py-3 bg-red-600/20 text-red-400 rounded-xl hover:bg-red-600/30 transition-all font-semibold text-sm border border-red-500/30 disabled:opacity-50"
              >
                {getTranslation(language, 'deleteAccount')}
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-red-400 font-semibold">{getTranslation(language, 'deleteAccountConfirm')}</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="px-6 py-3 bg-[#2D3748] text-[#E8D5B7] rounded-xl hover:bg-[#1A202C] transition-all font-semibold text-sm disabled:opacity-50"
                  >
                    {getTranslation(language, 'cancel')}
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-semibold text-sm disabled:opacity-50"
                  >
                    {deleting ? getTranslation(language, 'deleting') : getTranslation(language, 'confirmDeleteAccount')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
