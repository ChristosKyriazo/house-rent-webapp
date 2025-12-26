'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { useRole } from '@/app/contexts/RoleContext'
import { getTranslation, translateValue } from '@/lib/translations'

interface User {
  id: number
  email: string
  name: string | null
  dateOfBirth: string | null
  occupation: string | null
  role: string
  createdAt: string
}

interface Ratings {
  ownerRating: number | null
  ownerCount: number
  renterRating: number | null
  renterCount: number
}

export default function ProfilePage() {
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const { selectedRole, actualRole } = useRole()
  const [user, setUser] = useState<User | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [ratings, setRatings] = useState<Ratings | null>(null)
  const [loading, setLoading] = useState(true)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  useEffect(() => {
    // Check if banner was dismissed (only for own profile)
    const userIdParam = searchParams.get('userId')
    if (!userIdParam) {
      const dismissed = localStorage.getItem('profileBannerDismissed') === 'true'
      setBannerDismissed(dismissed)
    } else {
      setBannerDismissed(true) // Don't show banner for other users' profiles
    }

    const fetchData = async () => {
      try {
        const userIdParam = searchParams.get('userId')
        const roleParam = searchParams.get('role') // Get role from query parameter
        const profileUrl = userIdParam ? `/api/profile?userId=${userIdParam}` : '/api/profile'
        
        // Always fetch current user's profile to get their ID for comparison
        const currentUserRes = userIdParam ? await fetch('/api/profile').catch(() => null) : null
        
        const [profileRes, ratingsRes] = await Promise.all([
          fetch(profileUrl),
          userIdParam ? null : fetch('/api/ratings').catch(() => null) // Only fetch ratings for own profile
        ])
        
        if (!profileRes.ok) {
          setUser(null)
          return
        }
        
        const profileData = await profileRes.json()
        if (profileData.user) {
          setUser(profileData.user)
          
          // Get current user's ID for comparison
          if (currentUserRes?.ok) {
            const currentUserData = await currentUserRes.json()
            if (currentUserData.user) {
              setCurrentUserId(currentUserData.user.id)
            }
          } else if (!userIdParam) {
            // If no userId param, this is the current user's profile
            setCurrentUserId(profileData.user.id)
          }
          
          // Only fetch ratings for own profile
          if (!userIdParam && ratingsRes?.ok) {
            const ratingsData = await ratingsRes.json()
            setRatings(ratingsData.ratings || ratingsData)
          } else if (userIdParam) {
            // Fetch ratings for the viewed user
            const userRatingsRes = await fetch(`/api/ratings?userId=${userIdParam}`).catch(() => null)
            if (userRatingsRes?.ok) {
              const userRatingsData = await userRatingsRes.json()
              setRatings(userRatingsData.ratings || userRatingsData)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [searchParams])

  const handleDismissBanner = () => {
    localStorage.setItem('profileBannerDismissed', 'true')
    setBannerDismissed(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2D3748] flex items-center justify-center">
        <p className="text-[#E8D5B7]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  // If no user, show a loading/error state but don't redirect
  // This allows Clerk to handle auth and redirect if needed
  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-[#2D3748] flex flex-col items-center justify-center px-4">
        <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[#E8D5B7]/20 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-[#E8D5B7] mb-4">
            {getTranslation(language, 'welcome')}
          </h1>
          <p className="text-[#E8D5B7]/70 mb-6">
            {getTranslation(language, 'or')}{' '}
            <Link
              href="/login"
              className="font-semibold text-[#E8D5B7] hover:text-[#D4C19F] transition-colors underline"
            >
              {getTranslation(language, 'login')}
            </Link>
          </p>
        </div>
      </div>
    )
  }

  // If still loading, show loading state
  if (!user) {
    return (
      <div className="min-h-screen bg-[#2D3748] flex items-center justify-center">
        <p className="text-[#E8D5B7]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  // Calculate username
  const displayName = user.name || user.email.split('@')[0]
  const userRole = user.role || 'user'
  
  // Get query parameters
  const userIdParam = searchParams.get('userId')
  const roleParam = searchParams.get('role')
  
  // Determine display role for ratings:
  // 1. If viewing another user's profile (userId param), use the role from query param if provided
  // 2. If user has "both" role, use selectedRole from context
  // 3. Otherwise use actualRole or userRole
  let displayRole: string
  if (userIdParam && roleParam) {
    // Viewing another user's profile with specific role
    displayRole = roleParam
  } else if (actualRole === 'both' && selectedRole) {
    // Own profile with "both" role, use selected role from context
    displayRole = selectedRole
  } else {
    // Default to actualRole or userRole
    displayRole = actualRole || userRole || 'user'
  }

  const calculateAgeFromDob = (dobString: string | null) => {
    if (dobString) {
      const dob = new Date(dobString)
      if (!isNaN(dob.getTime())) {
        const today = new Date()
        let age = today.getFullYear() - dob.getFullYear()
        const m = today.getMonth() - dob.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--
        }
        return age
      }
    }
    return null
  }

  const computedAge = calculateAgeFromDob(user.dateOfBirth)

  // Check if viewing own profile
  const isOwnProfile = !userIdParam || (currentUserId !== null && user.id === currentUserId)

  // Check if profile is incomplete (only for own profile)
  const isProfileIncomplete = isOwnProfile && (!user.name || !user.dateOfBirth || !user.occupation)
  const missingFields: string[] = []
  if (isOwnProfile) {
    if (!user.name) missingFields.push(getTranslation(language, 'name'))
    if (!user.dateOfBirth) missingFields.push(getTranslation(language, 'dateOfBirth'))
    if (!user.occupation) missingFields.push(getTranslation(language, 'occupation'))
  }

  return (
    <div className="min-h-screen bg-[#2D3748] py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Profile Incomplete Banner */}
        {isProfileIncomplete && !bannerDismissed && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-3xl p-6 shadow-xl relative">
            <button
              onClick={handleDismissBanner}
              className="absolute top-4 right-4 text-[#E8D5B7]/70 hover:text-[#E8D5B7] transition-colors"
              aria-label={getTranslation(language, 'close')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex items-start gap-4">
              <div className="text-3xl">⚠️</div>
              <div className="flex-1 pr-8">
                <h2 className="text-xl font-bold text-[#E8D5B7] mb-2">
                  {getTranslation(language, 'completeYourProfile')}
                </h2>
                <p className="text-[#E8D5B7]/80 mb-3">
                  {getTranslation(language, 'profileIncomplete')}
                </p>
                {missingFields.length > 0 && (
                  <p className="text-sm text-[#E8D5B7]/70">
                    <span className="font-semibold">{getTranslation(language, 'missingInformation')}:</span>{' '}
                    {missingFields.join(', ')}
                  </p>
                )}
                <Link
                  href="/profile/edit"
                  className="inline-block mt-4 px-4 py-2 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold text-sm"
                >
                  {getTranslation(language, 'editProfile')}
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[#E8D5B7]/20">
          {/* Avatar and Basic Info */}
          <div className="flex flex-col items-center mb-8">
            {/* Genderless Avatar */}
            <div className="w-32 h-32 rounded-full bg-[#E8D5B7] flex items-center justify-center mb-4 border-4 border-[#E8D5B7]/30">
              <svg
                className="w-20 h-20 text-[#2D3748]"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>

                    <h1 className="text-3xl font-bold text-[#E8D5B7] mb-6">{displayName}</h1>
          </div>

          {/* Ratings Section - Show based on display role */}
          {ratings && (
            <div className="grid gap-4 mb-6 grid-cols-1">
              {/* Show owner rating only when display role is owner */}
              {displayRole === 'owner' && (
                <div className="bg-[#2D3748]/50 rounded-2xl p-4 border border-[#E8D5B7]/20 flex flex-col items-center justify-center">
                  <h3 className="text-sm font-medium text-[#E8D5B7]/70 mb-3">{getTranslation(language, 'asOwner')}</h3>
                {ratings.ownerRating !== null ? (
                    <Link
                      href={`/profile/ratings/${user?.id}?type=owner`}
                      className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <p className="text-2xl font-bold text-[#E8D5B7]">
                        {ratings.ownerRating.toFixed(1)}
                      </p>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={`text-base ${i < Math.round(ratings.ownerRating!) ? 'text-yellow-400' : 'text-[#E8D5B7]/30'}`}>
                            ⭐
                          </span>
                        ))}
                      </div>
                      {ratings.ownerCount > 0 && (
                        <span className="text-xs text-[#E8D5B7]/60 hover:text-[#E8D5B7] underline transition-colors">
                          {ratings.ownerCount} {ratings.ownerCount === 1 ? getTranslation(language, 'rating') : getTranslation(language, 'ratings')}
                        </span>
                      )}
                    </Link>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-2xl font-bold text-[#E8D5B7]">0.0</p>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="text-base text-[#E8D5B7]/30">
                            ⭐
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-[#E8D5B7]/60">
                        {getTranslation(language, 'notRatedYet')}
                      </p>
                    </div>
                )}
              </div>
            )}
            
              {/* Show user rating only when display role is user */}
              {displayRole === 'user' && (
                <div className="bg-[#2D3748]/50 rounded-2xl p-4 border border-[#E8D5B7]/20 flex flex-col items-center justify-center">
                  <h3 className="text-sm font-medium text-[#E8D5B7]/70 mb-3">{getTranslation(language, 'asUser')}</h3>
                {ratings.renterRating !== null ? (
                    <Link
                      href={`/profile/ratings/${user?.id}?type=renter`}
                      className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <p className="text-2xl font-bold text-[#E8D5B7]">
                        {ratings.renterRating.toFixed(1)}
                      </p>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={`text-base ${i < Math.round(ratings.renterRating!) ? 'text-yellow-400' : 'text-[#E8D5B7]/30'}`}>
                            ⭐
                          </span>
                        ))}
                      </div>
                      {ratings.renterCount > 0 && (
                        <span className="text-xs text-[#E8D5B7]/60 hover:text-[#E8D5B7] underline transition-colors">
                          {ratings.renterCount} {ratings.renterCount === 1 ? getTranslation(language, 'rating') : getTranslation(language, 'ratings')}
                        </span>
                      )}
                    </Link>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-2xl font-bold text-[#E8D5B7]">0.0</p>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="text-base text-[#E8D5B7]/30">
                            ⭐
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-[#E8D5B7]/60">
                        {getTranslation(language, 'notRatedYet')}
                      </p>
                    </div>
                )}
              </div>
            )}
          </div>
          )}

          {/* Profile Information */}
          <div className="space-y-4 mb-6">
            <div className="pb-4 border-b border-[#E8D5B7]/20">
              <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'userName')}</label>
              <p className={`text-lg ${user.name ? 'text-[#E8D5B7]' : 'text-[#E8D5B7]/50 italic'}`}>
                {user.name || getTranslation(language, 'notSet')}
              </p>
            </div>
            <div className="pb-4 border-b border-[#E8D5B7]/20">
              <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'age')}</label>
              <p className={`text-lg ${typeof computedAge === 'number' ? 'text-[#E8D5B7]' : 'text-[#E8D5B7]/50 italic'}`}>
                {typeof computedAge === 'number' ? computedAge : getTranslation(language, 'notSet')}
              </p>
            </div>
              <div className="pb-4 border-b border-[#E8D5B7]/20">
              <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'occupation')}</label>
              <p className={`text-lg ${user.occupation ? 'text-[#E8D5B7]' : 'text-[#E8D5B7]/50 italic'}`}>
                {user.occupation ? translateValue(language, user.occupation) : getTranslation(language, 'notSet')}
              </p>
              </div>
            <div className="pb-4 border-b border-[#E8D5B7]/20">
              <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'email')}</label>
              <p className="text-lg text-[#E8D5B7]">{user.email}</p>
            </div>
            <div className="pb-4 border-b border-[#E8D5B7]/20">
              <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'role')}</label>
              <p className="text-lg text-[#E8D5B7]">
                {user.role === 'owner' && `🏠 ${getTranslation(language, 'owner')}`}
                {user.role === 'user' && `👤 ${getTranslation(language, 'user')}`}
                {user.role === 'both' && `🔄 ${getTranslation(language, 'ownerAndUser')}`}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'memberSince')}</label>
              <p className="text-lg text-[#E8D5B7]">
                {new Date(user.createdAt).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Edit Profile Button - Only show for own profile */}
          {isOwnProfile && (
            <div className="flex justify-center pt-4">
              <Link
                href="/profile/edit"
                className="px-6 py-3 bg-[#E8D5B7] text-[#2D3748] rounded-2xl hover:bg-[#D4C19F] transition-all font-semibold shadow-lg shadow-[#E8D5B7]/20 hover:shadow-xl"
              >
                {getTranslation(language, 'editProfile')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
