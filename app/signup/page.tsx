'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'

export default function SignupPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    dateOfBirth: '',
    title: '',
    occupation: '',
    role: 'user', // 'owner', 'user', or 'both'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          // Send dateOfBirth as ISO date string (YYYY-MM-DD); backend will convert
          dateOfBirth: formData.dateOfBirth || null,
          title: formData.title || null,
          occupation: formData.occupation || null,
          role: formData.role, // Explicitly include role
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || getTranslation(language, 'signupFailed'))
        return
      }

      // Refresh router to update server components (like NavBar)
      router.refresh()
      router.push('/profile')
    } catch (err) {
      setError(getTranslation(language, 'somethingWentWrong'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2D3748] px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[#E8D5B7]/20">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#E8D5B7] mb-2">
              {getTranslation(language, 'createAccount')}
            </h2>
            <p className="text-[#E8D5B7]/70">
              {getTranslation(language, 'or')}{' '}
              <Link href="/login" className="font-semibold text-[#E8D5B7] hover:text-[#D4C19F] transition-colors underline">
                {getTranslation(language, 'signInToExisting')}
              </Link>
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50/80 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-[#E8D5B7] mb-2">
                  {getTranslation(language, 'title')} <span className="text-[#E8D5B7]/50">({getTranslation(language, 'optional')})</span>
                </label>
                <select
                  id="title"
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
                <label htmlFor="name" className="block text-sm font-medium text-[#E8D5B7] mb-2">
                  {getTranslation(language, 'name')} <span className="text-[#E8D5B7]/50">({getTranslation(language, 'optional')})</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder={getTranslation(language, 'yourName')}
                />
              </div>

              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-[#E8D5B7] mb-2">
                  {getTranslation(language, 'dateOfBirth')} <span className="text-[#E8D5B7]/50">({getTranslation(language, 'optional')})</span>
                </label>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder={getTranslation(language, 'yourDateOfBirth')}
                />
              </div>

              <div>
                <label htmlFor="occupation" className="block text-sm font-medium text-[#E8D5B7] mb-2">
                  {getTranslation(language, 'occupation')} <span className="text-[#E8D5B7]/50">({getTranslation(language, 'optional')})</span>
                </label>
                <select
                  id="occupation"
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
                <label htmlFor="role" className="block text-sm font-medium text-[#E8D5B7] mb-2">
                  {getTranslation(language, 'role')} <span className="text-[#E8D5B7]/50">({getTranslation(language, 'required')})</span>
                </label>
                <select
                  id="role"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7]"
                >
                  <option value="user">👤 {getTranslation(language, 'userSearchProperties')}</option>
                  <option value="owner">🏠 {getTranslation(language, 'ownerPublishProperties')}</option>
                  <option value="both">🔄 {getTranslation(language, 'both')}</option>
                </select>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#E8D5B7] mb-2">
                  {getTranslation(language, 'emailAddress')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#E8D5B7] mb-2">
                  {getTranslation(language, 'password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#E8D5B7] text-[#2D3748] rounded-2xl hover:bg-[#D4C19F] transition-all font-semibold text-base shadow-lg shadow-[#E8D5B7]/20 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
            >
              {loading ? getTranslation(language, 'creatingAccount') : getTranslation(language, 'signup')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
