'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation, translateValue, reverseTranslateValue, translateRole } from '@/lib/translations'
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
    subscription: 1,
  })
  const [currentRole, setCurrentRole] = useState<string>('')
  const [error, setError] = useState('')
  const [updatingSubscription, setUpdatingSubscription] = useState(false)

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
          const userRole = data.user.role || 'user'
          setCurrentRole(userRole)
          setFormData({
            name: data.user.name || '',
            dateOfBirth: data.user.dateOfBirth
              ? new Date(data.user.dateOfBirth).toISOString().split('T')[0]
              : '',
            occupation: data.user.occupation ? reverseTranslateValue(data.user.occupation) : '',
            role: userRole === 'broker' ? 'owner' : userRole, // Show 'owner' in form if broker, but track actual role
            subscription: data.user.subscription || 1,
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
      // Update subscription separately if it changed
      if (formData.subscription) {
        setUpdatingSubscription(true)
        try {
          const subResponse = await fetch('/api/profile/subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: formData.subscription }),
          })
          if (!subResponse.ok) {
            const subData = await subResponse.json()
            setError(subData.error || 'Failed to update subscription')
            setUpdatingSubscription(false)
            return
          }
        } catch (subErr) {
          setError('Failed to update subscription')
          setUpdatingSubscription(false)
          return
        } finally {
          setUpdatingSubscription(false)
        }
      }

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

            {/* Don't show date of birth for brokers */}
            {currentRole !== 'broker' && (
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
            )}

            {/* Don't show occupation for brokers (it's auto-set to "Broker") */}
            {currentRole !== 'broker' && (
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
            )}
            
            {/* Show occupation as read-only for brokers */}
            {currentRole === 'broker' && (
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">
                  {getTranslation(language, 'occupation')}
                </label>
                <p className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748]/50 rounded-2xl text-[#E8D5B7]">
                  {translateValue(language, 'Broker')}
                </p>
                <p className="text-xs text-[#E8D5B7]/50 mt-1">
                  {getTranslation(language, 'brokerOccupationLocked') || 'Occupation is automatically set for brokers'}
                </p>
              </div>
            )}

            {/* Only show role field if user is not a broker */}
            {currentRole !== 'broker' && (
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
            )}

            {/* Show read-only broker role info if user is a broker */}
            {currentRole === 'broker' && (
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">
                  {getTranslation(language, 'role')}
                </label>
                <div className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748]/50 rounded-2xl text-[#E8D5B7]/70">
                  🏢 {translateRole(language, 'broker')} ({getTranslation(language, 'cannotBeChanged')})
                </div>
              </div>
            )}

            {/* Subscription Selection */}
            <div>
              <label className="block text-sm font-medium text-[#E8D5B7] mb-2">
                {getTranslation(language, 'subscription')}
              </label>
              <select
                value={formData.subscription}
                onChange={(e) => setFormData({ ...formData, subscription: Number(e.target.value) })}
                className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7]"
              >
                <option value={1}>🆓 {getTranslation(language, 'freePlan')}</option>
                <option value={2}>⭐ {getTranslation(language, 'plusPlan')}</option>
                {(currentRole === 'owner' || currentRole === 'broker' || currentRole === 'both') && (
                  <option value={3}>🚀 {getTranslation(language, 'unlimitedPlan')}</option>
                )}
              </select>
            </div>


            <div className="pt-4">
              <button
                type="submit"
                disabled={saving || updatingSubscription}
                className="w-full py-3 px-4 bg-[#E8D5B7] text-[#2D3748] rounded-2xl hover:bg-[#D4C19F] transition-all font-semibold text-base shadow-lg shadow-[#E8D5B7]/20 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
              >
                {(saving || updatingSubscription) ? getTranslation(language, 'saving') : getTranslation(language, 'saveChanges')}
              </button>
            </div>
          </form>

          {/* Delete Account Section */}
          <div className="mt-8 pt-8 border-t border-red-500/30">
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="px-6 py-3 bg-red-600/20 text-red-400 rounded-xl hover:bg-red-600/30 transition-all font-semibold text-sm border border-red-500/30 disabled:opacity-50"
            >
              {getTranslation(language, 'deleteAccount')}
            </button>
          </div>

          {/* Delete Account Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <div className="bg-[#1A202C] border-4 border-red-500 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl">
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">⚠️</div>
                  <h2 className="text-2xl font-bold text-red-400 mb-4">
                    {getTranslation(language, 'deleteAccount')}
                  </h2>
                  <p className="text-red-300 font-semibold text-lg mb-2">
                    {getTranslation(language, 'deleteAccountConfirm')}
                  </p>
                  <p className="text-[#E8D5B7]/70 text-sm">
                    {getTranslation(language, 'deleteAccountDescription')}
                  </p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="flex-1 px-6 py-3 bg-[#2D3748] text-[#E8D5B7] rounded-xl hover:bg-[#1A202C] transition-all font-semibold text-sm disabled:opacity-50"
                  >
                    {getTranslation(language, 'cancel')}
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-semibold text-sm disabled:opacity-50 shadow-lg shadow-red-600/50"
                  >
                    {deleting ? getTranslation(language, 'deleting') : getTranslation(language, 'confirmDeleteAccount')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
