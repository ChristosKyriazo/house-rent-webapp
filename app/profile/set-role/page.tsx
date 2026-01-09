'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'

export default function SetRolePage() {
  const router = useRouter()
  const { isLoaded, userId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoaded) return

    if (!userId) {
      router.push('/login')
      return
    }

    // Get role from sessionStorage
    const storedRole = sessionStorage.getItem('signupRole')
    
    if (!storedRole) {
      // No role stored, just redirect to profile
      router.push('/profile')
      return
    }

    // Validate role
    const validRoles = ['user', 'owner', 'both', 'broker']
    if (!validRoles.includes(storedRole)) {
      sessionStorage.removeItem('signupRole')
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
          setError(data.error || 'Failed to set role')
          setTimeout(() => router.push('/profile'), 3000)
          return
        }
        // Success - clear stored role and redirect
        sessionStorage.removeItem('signupRole')
        // Small delay to ensure database update completes, then hard refresh
        setTimeout(() => {
          window.location.href = '/profile'
        }, 300)
      })
      .catch((err) => {
        console.error('Error setting role:', err)
        setError('Failed to set role. Please try again.')
        setTimeout(() => router.push('/profile'), 3000)
      })
      .finally(() => setLoading(false))
  }, [isLoaded, userId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2D3748] flex items-center justify-center">
        <p className="text-[#E8D5B7]">Ρύθμιση ρόλου...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#2D3748] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <p className="text-[#E8D5B7]">Ανακατεύθυνση...</p>
        </div>
      </div>
    )
  }

  return null
}

