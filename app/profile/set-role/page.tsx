'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useLanguage } from '@/app/contexts/LanguageContext'

export default function SetRolePage() {
  const router = useRouter()
  const { isLoaded, userId } = useAuth()
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoaded) return

    if (!userId) {
      router.push('/login')
      return
    }

    // Get role from localStorage
    const storedRole = localStorage.getItem('signupRole')

    if (!storedRole) {
      router.push('/profile')
      return
    }

    // Validate role
    const validRoles = ['user', 'owner', 'both', 'broker']
    if (!validRoles.includes(storedRole)) {
      localStorage.removeItem('signupRole')
      router.push('/profile')
      return
    }

    // Set the role via API
    fetch('/api/auth/set-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: storedRole }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          console.error('Set role API error:', data)
          setError(data.error || (language === 'el' ? 'Αποτυχία ορισμού ρόλου' : 'Failed to set role'))
          setTimeout(() => router.push('/profile'), 3000)
          return
        }
        localStorage.removeItem('signupRole')
        setTimeout(() => {
          window.location.href = '/profile'
        }, 300)
      })
      .catch((err) => {
        console.error('Error setting role:', err)
        setError(language === 'el' ? 'Αποτυχία ορισμού ρόλου. Δοκιμάστε ξανά.' : 'Failed to set role. Please try again.')
        setTimeout(() => router.push('/profile'), 3000)
      })
      .finally(() => setLoading(false))
  }, [isLoaded, userId, router, language])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <p className="text-[var(--text)]">{language === 'el' ? 'Ρύθμιση ρόλου...' : 'Setting role...'}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <p className="text-[var(--text)]">{language === 'el' ? 'Ανακατεύθυνση...' : 'Redirecting...'}</p>
        </div>
      </div>
    )
  }

  return null
}
