'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '../contexts/RoleContext'
import { useLanguage } from '../contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'

export default function RoleSwitch() {
  const { selectedRole, setSelectedRole, actualRole } = useRole()
  const { language } = useLanguage()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Only show if user has "both" role
  if (!mounted || actualRole !== 'both' || !selectedRole) {
    return null
  }

  const handleRoleChange = (role: 'owner' | 'user') => {
    if (role !== selectedRole) {
      setSelectedRole(role)
      // Redirect to profile page when role changes
      router.push('/profile')
    }
  }

  return (
    <div className="flex items-center gap-0.5 bg-[#2D3748]/50 rounded-xl p-0.5 shadow-md border border-[#E8D5B7]/20 pointer-events-auto h-[40px]" style={{ isolation: 'isolate' }}>
      {/* Owner Option */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleRoleChange('owner')
        }}
        className={`px-2.5 py-2 rounded-lg font-medium text-xs transition-all duration-300 ease-in-out transform h-full flex items-center ${
          selectedRole === 'owner'
            ? 'bg-[#E8D5B7] text-[#2D3748] shadow-sm scale-105'
            : 'bg-transparent text-[#E8D5B7]/40 hover:text-[#E8D5B7]/60 hover:bg-[#2D3748]/30'
        }`}
        aria-label="Switch to owner role"
        style={{ pointerEvents: 'auto' }}
      >
        🏠 {getTranslation(language, 'owner')}
      </button>
      
      {/* User Option */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleRoleChange('user')
        }}
        className={`px-2.5 py-2 rounded-lg font-medium text-xs transition-all duration-300 ease-in-out transform h-full flex items-center ${
          selectedRole === 'user'
            ? 'bg-[#E8D5B7] text-[#2D3748] shadow-sm scale-105'
            : 'bg-transparent text-[#E8D5B7]/40 hover:text-[#E8D5B7]/60 hover:bg-[#2D3748]/30'
        }`}
        aria-label="Switch to user role"
        style={{ pointerEvents: 'auto' }}
      >
        👤 {getTranslation(language, 'user')}
      </button>
    </div>
  )
}

