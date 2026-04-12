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

  if (!mounted || actualRole !== 'both' || !selectedRole) {
    return null
  }

  const handleRoleChange = (role: 'owner' | 'user') => {
    if (role !== selectedRole) {
      setSelectedRole(role)
      router.push('/profile')
    }
  }

  return (
    <div
      className="pointer-events-auto flex h-[44px] items-center gap-0.5 rounded-xl border border-[var(--btn-secondary-border)] bg-[var(--btn-secondary-bg)] p-0.5"
      style={{ isolation: 'isolate' }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleRoleChange('owner')
        }}
        className={`flex h-full items-center rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
          selectedRole === 'owner'
            ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]'
            : 'text-[var(--text-muted)] hover:bg-[rgba(32,42,58,0.9)] hover:text-[var(--text)]'
        }`}
        aria-label="Switch to owner role"
        style={{ pointerEvents: 'auto' }}
      >
        🏠 {getTranslation(language, 'owner')}
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleRoleChange('user')
        }}
        className={`flex h-full items-center rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
          selectedRole === 'user'
            ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]'
            : 'text-[var(--text-muted)] hover:bg-[rgba(32,42,58,0.9)] hover:text-[var(--text)]'
        }`}
        aria-label="Switch to user role"
        style={{ pointerEvents: 'auto' }}
      >
        👤 {getTranslation(language, 'user')}
      </button>
    </div>
  )
}
