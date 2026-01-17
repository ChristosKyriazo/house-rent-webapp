'use client'

import { useState, useEffect } from 'react'
import { SignUp } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation, translateRole } from '@/lib/translations'

export default function SignupPage() {
  const { language } = useLanguage()
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [showRoleSelection, setShowRoleSelection] = useState(true)
  const searchParams = useSearchParams()

  // Always show role selection when visiting signup page
  useEffect(() => {
    // Clear any existing role to ensure fresh selection
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('signupRole')
    }
    setShowRoleSelection(true)
    setSelectedRole('')
  }, [])

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('signupRole', role)
    }
    setShowRoleSelection(false)
    }

  if (showRoleSelection) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2D3748] px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-10 shadow-xl border border-[#E8D5B7]/20">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#E8D5B7] mb-2">
                {language === 'el' ? 'Επιλέξτε Ρόλο' : 'Select Role'}
            </h2>
            <p className="text-[#E8D5B7]/70">
                {language === 'el' ? 'Επιλέξτε τον ρόλο που θέλετε να έχετε στον λογαριασμό σας' : 'Select the role you want to have in your account'}
            </p>
          </div>

            <div className="space-y-4">
              <button
                onClick={() => handleRoleSelect('user')}
                className="w-full px-6 py-4 bg-[#2D3748] border-2 border-[#E8D5B7]/30 rounded-2xl hover:border-[#E8D5B7] hover:bg-[#2D3748]/80 transition-all text-left"
                >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">👤</span>
              <div>
                    <div className="text-lg font-semibold text-[#E8D5B7]">{translateRole(language, 'user')}</div>
                    <div className="text-sm text-[#E8D5B7]/70">{getTranslation(language, 'searchProperties')}</div>
              </div>
              </div>
              </button>

              <button
                onClick={() => handleRoleSelect('owner')}
                className="w-full px-6 py-4 bg-[#2D3748] border-2 border-[#E8D5B7]/30 rounded-2xl hover:border-[#E8D5B7] hover:bg-[#2D3748]/80 transition-all text-left"
                >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🏠</span>
              <div>
                    <div className="text-lg font-semibold text-[#E8D5B7]">{translateRole(language, 'owner')}</div>
                    <div className="text-sm text-[#E8D5B7]/70">{getTranslation(language, 'publishProperty')}</div>
              </div>
              </div>
              </button>

              <button
                onClick={() => handleRoleSelect('both')}
                className="w-full px-6 py-4 bg-[#2D3748] border-2 border-[#E8D5B7]/30 rounded-2xl hover:border-[#E8D5B7] hover:bg-[#2D3748]/80 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🔄</span>
              <div>
                    <div className="text-lg font-semibold text-[#E8D5B7]">{language === 'el' ? 'Και τα δύο' : 'Both'}</div>
                    <div className="text-sm text-[#E8D5B7]/70">{translateRole(language, 'both')}</div>
              </div>
            </div>
              </button>

            <button
                onClick={() => handleRoleSelect('broker')}
                className="w-full px-6 py-4 bg-[#2D3748] border-2 border-[#E8D5B7]/30 rounded-2xl hover:border-[#E8D5B7] hover:bg-[#2D3748]/80 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🏢</span>
                  <div>
                    <div className="text-lg font-semibold text-[#E8D5B7]">{translateRole(language, 'broker')}</div>
                    <div className="text-sm text-[#E8D5B7]/70">{getTranslation(language, 'publishProperty')}</div>
                  </div>
                </div>
            </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center signup-page">
      <SignUp 
        routing="hash" 
        signInUrl="/login" 
        afterSignUpUrl="/subscription"
        forceRedirectUrl="/subscription"
      />
    </div>
  )
}
