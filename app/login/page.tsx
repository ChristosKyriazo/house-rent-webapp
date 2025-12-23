'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const msg = searchParams.get('message')
    if (msg) setMessage(msg)
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || getTranslation(language, 'loginFailed'))
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
              {getTranslation(language, 'welcome')}
            </h2>
            <p className="text-[#E8D5B7]/70">
              {getTranslation(language, 'or')}{' '}
              <Link href="/signup" className="font-semibold text-[#E8D5B7] hover:text-[#D4C19F] transition-colors underline">
                {getTranslation(language, 'createNewAccount')}
              </Link>
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {message && (
              <div className="bg-emerald-50/80 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-sm">
                {message}
              </div>
            )}
            {error && (
              <div className="bg-red-50/80 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
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
              {loading ? getTranslation(language, 'loggingIn') : getTranslation(language, 'login')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
