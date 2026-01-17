'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { getTranslation } from '@/lib/translations'
import { useLanguage } from '@/app/contexts/LanguageContext'

export default function SubscriptionPage() {
  const router = useRouter()
  const { isLoaded, userId } = useAuth()
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null)

  useEffect(() => {
    if (!isLoaded) return

    if (!userId) {
      router.push('/login')
      return
    }

    // Get role from sessionStorage (set during signup)
    const storedRole = sessionStorage.getItem('signupRole')
    
    if (!storedRole) {
      // No role stored, redirect to profile
      router.push('/profile')
      return
    }

    setUserRole(storedRole)
    setLoading(false)
  }, [isLoaded, userId, router])

  const handleSubscriptionSelect = async (subscription: number) => {
    setSelecting(true)
    
    try {
      const response = await fetch('/api/profile/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('Set subscription error:', data)
        alert(data.error || 'Failed to set subscription')
        setSelecting(false)
        return
      }

      // Success - redirect to set role page
      router.push('/profile/set-role')
    } catch (error) {
      console.error('Error setting subscription:', error)
      alert('Failed to set subscription. Please try again.')
      setSelecting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#2D3748]">
        <div className="text-[#E8D5B7] text-xl">{getTranslation(language, 'loading')}...</div>
      </div>
    )
  }

  const isOwnerOrBroker = userRole === 'owner' || userRole === 'broker' || userRole === 'both'

  return (
    <div className="min-h-screen bg-[#2D3748] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#E8D5B7] mb-4">
            {getTranslation(language, 'chooseSubscription')}
          </h1>
          <p className="text-xl text-[#E8D5B7]/70">
            {getTranslation(language, 'selectSubscriptionPlan')}
          </p>
        </div>

        <div className={`grid gap-6 ${isOwnerOrBroker ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'} max-w-5xl mx-auto`}>
          {/* Free Plan */}
          <div 
            className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border-2 border-[#E8D5B7]/30 hover:border-[#E8D5B7] transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 animate-fade-in"
            style={{ animationDelay: '0ms' }}
            onMouseEnter={() => setHoveredPlan(1)}
            onMouseLeave={() => setHoveredPlan(null)}
          >
            <div className="text-center mb-6">
              <div className={`text-5xl mb-4 transition-transform duration-300 ${hoveredPlan === 1 ? 'scale-125 rotate-12' : ''}`}>🆓</div>
              <h2 className="text-2xl font-bold text-[#E8D5B7] mb-2">
                {getTranslation(language, 'freePlan')}
              </h2>
              <p className="text-3xl font-bold text-[#E8D5B7] mb-1">€0</p>
              <p className="text-sm text-[#E8D5B7]/70">{getTranslation(language, 'forever')}</p>
            </div>

            <ul className="space-y-3 mb-8 min-h-[200px]">
              {isOwnerOrBroker ? (
                <>
                  <li className="flex items-start gap-2 text-[#E8D5B7]/80">
                    <span>✓</span>
                    <span>{getTranslation(language, 'upTo2Homes')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-[#E8D5B7]/80">
                    <span>✗</span>
                    <span className="line-through text-[#E8D5B7]/50">{getTranslation(language, 'aiDescription')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-[#E8D5B7]/80">
                    <span>✗</span>
                    <span className="line-through text-[#E8D5B7]/50">{getTranslation(language, 'fileUpload')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-[#E8D5B7]/80">
                    <span>✗</span>
                    <span className="line-through text-[#E8D5B7]/50">{getTranslation(language, 'promoteButton')}</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-2 text-[#E8D5B7]/80">
                    <span>✓</span>
                    <span>{getTranslation(language, 'basicSearch')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-[#E8D5B7]/80">
                    <span>✗</span>
                    <span className="line-through text-[#E8D5B7]/50">{getTranslation(language, 'aiSearch')}</span>
                  </li>
                </>
              )}
            </ul>

            <button
              onClick={() => handleSubscriptionSelect(1)}
              disabled={selecting}
              className="w-full py-3 px-6 bg-[#2D3748] border-2 border-[#E8D5B7]/50 rounded-xl text-[#E8D5B7] font-semibold hover:bg-[#2D3748]/80 hover:border-[#E8D5B7] transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selecting ? getTranslation(language, 'loading') : getTranslation(language, 'select')}
            </button>
          </div>

          {/* Plus Plan */}
          <div 
            className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border-2 border-[#E8D5B7] hover:border-[#E8D5B7] hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 relative animate-fade-in"
            style={{ animationDelay: '150ms' }}
            onMouseEnter={() => setHoveredPlan(2)}
            onMouseLeave={() => setHoveredPlan(null)}
          >
            {!isOwnerOrBroker && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-[#E8D5B7] text-[#2D3748] px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                {getTranslation(language, 'popular')}
              </div>
            )}
            <div className="text-center mb-6">
              <div className={`text-5xl mb-4 transition-transform duration-300 ${hoveredPlan === 2 ? 'scale-125 rotate-12 animate-spin-slow' : ''}`}>⭐</div>
              <h2 className="text-2xl font-bold text-[#E8D5B7] mb-2">
                {getTranslation(language, 'plusPlan')}
              </h2>
              <p className="text-3xl font-bold text-[#E8D5B7] mb-1">€9.99</p>
              <p className="text-sm text-[#E8D5B7]/70">{getTranslation(language, 'perMonth')}</p>
            </div>

            <ul className="space-y-3 mb-8 min-h-[200px]">
              {isOwnerOrBroker ? (
                <>
                  <li className="flex items-start gap-2 text-[#E8D5B7]/80">
                    <span>✓</span>
                    <span>{getTranslation(language, 'upTo10Homes')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-[#E8D5B7]/80">
                    <span>✓</span>
                    <span>{getTranslation(language, 'aiDescription')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-[#E8D5B7]/80">
                    <span>✓</span>
                    <span>{getTranslation(language, 'fileUpload')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-[#E8D5B7]/80">
                    <span>✓</span>
                    <span>{getTranslation(language, 'promoteButton')}</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-2 text-[#E8D5B7]/80">
                    <span>✓</span>
                    <span>{getTranslation(language, 'basicSearch')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-[#E8D5B7]/80">
                    <span>✓</span>
                    <span>{getTranslation(language, 'aiSearch')}</span>
                  </li>
                </>
              )}
            </ul>

            <button
              onClick={() => handleSubscriptionSelect(2)}
              disabled={selecting}
              className="w-full py-3 px-6 bg-[#E8D5B7] text-[#2D3748] rounded-xl font-semibold hover:bg-[#D4C19F] transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selecting ? getTranslation(language, 'loading') : getTranslation(language, 'select')}
            </button>
          </div>

          {/* Unlimited Plan (only for owners/brokers) */}
          {isOwnerOrBroker && (
            <div 
              className="bg-gradient-to-br from-[#E8D5B7]/20 to-[#D4C19F]/20 backdrop-blur-sm rounded-3xl p-8 shadow-xl border-2 border-[#E8D5B7] hover:border-[#E8D5B7] hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 relative animate-fade-in"
              style={{ animationDelay: '300ms' }}
              onMouseEnter={() => setHoveredPlan(3)}
              onMouseLeave={() => setHoveredPlan(null)}
            >
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#E8D5B7] to-[#D4C19F] text-[#2D3748] px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                {getTranslation(language, 'premium')}
              </div>
              <div className="text-center mb-6">
                <div className={`text-5xl mb-4 transition-transform duration-300 ${hoveredPlan === 3 ? 'scale-125 rotate-12 animate-bounce' : ''}`}>🚀</div>
                <h2 className="text-2xl font-bold text-[#E8D5B7] mb-2">
                  {getTranslation(language, 'unlimitedPlan')}
                </h2>
                <p className="text-3xl font-bold text-[#E8D5B7] mb-1">€19.99</p>
                <p className="text-sm text-[#E8D5B7]/70">{getTranslation(language, 'perMonth')}</p>
              </div>

              <ul className="space-y-3 mb-8 min-h-[200px]">
                <li className="flex items-start gap-2 text-[#E8D5B7]/80">
                  <span>✓</span>
                  <span>{getTranslation(language, 'unlimitedHomes')}</span>
                </li>
                <li className="flex items-start gap-2 text-[#E8D5B7]/80">
                  <span>✓</span>
                  <span>{getTranslation(language, 'aiDescription')}</span>
                </li>
                <li className="flex items-start gap-2 text-[#E8D5B7]/80">
                  <span>✓</span>
                  <span>{getTranslation(language, 'fileUpload')}</span>
                </li>
                <li className="flex items-start gap-2 text-[#E8D5B7]/80">
                  <span>✓</span>
                  <span>{getTranslation(language, 'premiumPromote')}</span>
                </li>
              </ul>

              <button
                onClick={() => handleSubscriptionSelect(3)}
                disabled={selecting}
                className="w-full py-3 px-6 bg-gradient-to-r from-[#E8D5B7] to-[#D4C19F] text-[#2D3748] rounded-xl font-semibold hover:from-[#D4C19F] hover:to-[#E8D5B7] transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selecting ? getTranslation(language, 'loading') : getTranslation(language, 'select')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

