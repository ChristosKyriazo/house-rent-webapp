'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { useRole } from '@/app/contexts/RoleContext'
import { getTranslation, translateValue, translateRole } from '@/lib/translations'
import StarRating from '@/app/components/StarRating'
import { GraphicProfile } from '@/app/components/visual/PageGraphics'
import { localeFor } from '@/lib/format'

interface User {
  id: number
  // Absent when viewing someone else's profile — GET /api/profile?userId=…
  // deliberately withholds email and date of birth.
  email?: string
  name: string | null
  dateOfBirth: string | null
  occupation: string | null
  role: string
  subscriptionTier?: 'free' | 'plus' | 'pro'
  brokerCategory?: string
  parentBrokerId?: number | null
  verified?: boolean
  createdAt: string
}

interface Ratings {
  ownerRating: number | null
  ownerCount: number
  renterRating: number | null
  renterCount: number
}

function ProfilePageInner() {
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const { selectedRole, actualRole } = useRole()
  const [user, setUser] = useState<User | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [ratings, setRatings] = useState<Ratings | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailure, setLoadFailure] = useState<'unauthenticated' | 'error' | null>(null)
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
        const profileUrl = userIdParam ? `/api/profile?userId=${userIdParam}` : '/api/profile'
        
        // Always fetch current user's profile to get their ID for comparison
        const currentUserRes = userIdParam ? await fetch('/api/profile').catch(() => null) : null
        
        const [profileRes, ratingsRes] = await Promise.all([
          fetch(profileUrl),
          userIdParam ? null : fetch('/api/ratings').catch(() => null) // Only fetch ratings for own profile
        ])
        
        if (!profileRes.ok) {
          // 401 is the only status that means "sign in". Showing the sign-in
          // card for 404/500 too made a failed profile load look like a
          // logged-out session.
          setLoadFailure(profileRes.status === 401 ? 'unauthenticated' : 'error')
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
        setLoadFailure('error')
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
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <p className="text-[var(--text)]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  // If no user, show a loading/error state but don't redirect
  // This allows Clerk to handle auth and redirect if needed
  if (!user && !loading) {
    const isAuthFailure = loadFailure === 'unauthenticated'
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] flex flex-col items-center justify-center px-4">
        <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[var(--border-subtle)] max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-[var(--text)] mb-4">
            {isAuthFailure
              ? getTranslation(language, 'welcome')
              : getTranslation(language, 'somethingWentWrong')}
          </h1>
          {isAuthFailure ? (
            <p className="text-[var(--text-muted)] mb-6">
              {getTranslation(language, 'or')}{' '}
              <Link
                href="/login"
                className="font-semibold text-[var(--text)] hover:text-[var(--accent)] transition-colors underline"
              >
                {getTranslation(language, 'login')}
              </Link>
            </p>
          ) : (
            <p className="text-[var(--text-muted)] mb-6">
              {getTranslation(language, 'profileUnavailable')}
            </p>
          )}
        </div>
      </div>
    )
  }

  // If still loading, show loading state
  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <p className="text-[var(--text)]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  // Calculate username
  // email is undefined on other users' profiles, so it can't be the fallback there
  const displayName = user.name || user.email?.split('@')[0] || getTranslation(language, 'user')
  const userRole = user.role || 'user'
  const isOwnerOrBroker = userRole === 'owner' || userRole === 'broker' || userRole === 'both'
  
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
  // Brokers don't need date of birth, and occupation is auto-set to "Broker"
  const isBroker = user.role === 'broker'
  const isProfileIncomplete = isOwnProfile && (
    !user.name || 
    (!isBroker && !user.dateOfBirth) || 
    (!isBroker && !user.occupation)
  )
  const missingFields: string[] = []
  if (isOwnProfile) {
    if (!user.name) missingFields.push(getTranslation(language, 'name'))
    if (!isBroker && !user.dateOfBirth) missingFields.push(getTranslation(language, 'dateOfBirth'))
    if (!isBroker && !user.occupation) missingFields.push(getTranslation(language, 'occupation'))
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--ink-soft)]/50">
          <GraphicProfile className="h-12 w-full sm:h-14" />
        </div>
        {/* Profile Incomplete Banner */}
        {isProfileIncomplete && !bannerDismissed && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-3xl p-6 shadow-xl relative">
            <button
              onClick={handleDismissBanner}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              aria-label={getTranslation(language, 'close')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex items-start gap-4">
              <div className="text-3xl">⚠️</div>
              <div className="flex-1 pr-8">
                <h2 className="text-xl font-bold text-[var(--text)] mb-2">
                  {getTranslation(language, 'completeYourProfile')}
                </h2>
                <p className="text-[var(--text-muted)] mb-3">
                  {getTranslation(language, 'profileIncomplete')}
                </p>
                {missingFields.length > 0 && (
                  <p className="text-sm text-[var(--text-muted)]">
                    <span className="font-semibold">{getTranslation(language, 'missingInformation')}:</span>{' '}
                    {missingFields.join(', ')}
                  </p>
                )}
                <Link href="/profile/edit" className="btn-primary mt-4 inline-flex text-sm">
                  {getTranslation(language, 'editProfile')}
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-8 shadow-xl backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg hover:shadow-[var(--accent)]/8">
          {/* Avatar and Basic Info */}
          <div className="mb-8 flex flex-col items-center">
            {/* Genderless Avatar */}
            <div className="mb-4 flex h-32 w-32 items-center justify-center rounded-full border-4 border-[var(--border-subtle)] bg-gradient-to-br from-[var(--accent-light)] to-[var(--accent-deep)] shadow-lg transition-transform duration-300 hover:scale-[1.02]">
              <svg
                className="w-20 h-20 text-[var(--btn-primary-fg)]"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>

                    <div className="flex flex-col items-center gap-3">
                      <h1 className="text-3xl font-bold text-[var(--text)]">{displayName}</h1>

                      {/* Broker team membership chip */}
                      {isOwnProfile && isBroker && user.brokerCategory === 'child' && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-muted)]">
                            🏢 {language === 'el' ? 'Μέλος ομάδας μεσιτών' : 'Part of a broker team'}
                          </span>
                          <button
                            onClick={async () => {
                              if (!confirm(language === 'el' ? 'Αποχώρηση από την ομάδα; Οι αγγελίες σας θα μεταφερθούν στον επικεφαλής.' : 'Leave the team? Your listings will transfer to your team lead.')) return
                              await fetch('/api/team/leave', { method: 'POST' })
                              window.location.reload()
                            }}
                            className="text-xs px-3 py-1.5 rounded-full border border-[var(--status-error)]/30 text-[var(--status-error)] hover:bg-[var(--status-error-bg)] transition-colors"
                          >
                            {language === 'el' ? 'Αποχώρηση' : 'Leave team'}
                          </button>
                        </div>
                      )}
                      {isOwnProfile && isBroker && user.brokerCategory === 'parent' && (
                        <Link href="/homes/agency" className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                          🏢 {language === 'el' ? 'Επικεφαλής ομάδας' : 'Team lead'} →
                        </Link>
                      )}

                      {/* Tier badge + CTA — owners/brokers only */}
                      {isOwnerOrBroker && (
                        <>
                          {(user.subscriptionTier ?? 'free') === 'free' && isOwnProfile && (
                            <Link
                              href="/upgrade"
                              className="group relative flex items-center gap-2 px-4 py-2 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
                              style={{
                                background: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(217,119,6,0.12) 100%)',
                                border: '1px solid rgba(245,158,11,0.35)',
                                boxShadow: '0 0 16px rgba(245,158,11,0.12)',
                              }}
                            >
                              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent" />
                              <span className="text-sm">✨</span>
                              <span className="text-sm font-semibold text-amber-300">
                                {language === 'el' ? 'Αναβάθμιση σε Plus' : 'Upgrade to Plus'}
                              </span>
                              <span className="text-amber-500 text-sm group-hover:translate-x-0.5 transition-transform">→</span>
                            </Link>
                          )}

                          {(user.subscriptionTier ?? 'free') === 'plus' && (
                            <div className="flex flex-col items-center gap-1.5">
                              <span
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.15))',
                                  border: '1px solid rgba(245,158,11,0.4)',
                                  color: '#fbbf24',
                                  boxShadow: '0 0 12px rgba(245,158,11,0.15)',
                                }}
                              >
                                ✦ Plus
                              </span>
                              {isOwnProfile && (
                                <Link href="/upgrade" className="text-xs text-amber-400/70 hover:text-amber-300 transition-colors">
                                  {language === 'el' ? 'Αναβάθμιση σε Pro' : 'Upgrade to Pro'} →
                                </Link>
                              )}
                            </div>
                          )}

                          {(user.subscriptionTier ?? 'free') === 'pro' && (
                            <span
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold"
                              style={{
                                background: 'linear-gradient(135deg, rgba(120,113,108,0.3), rgba(87,83,78,0.2))',
                                border: '1px solid rgba(161,155,150,0.3)',
                                color: '#d6d3d1',
                                boxShadow: '0 0 12px rgba(0,0,0,0.2)',
                              }}
                            >
                              ◆ Pro
                            </span>
                          )}
                        </>
                      )}
                    </div>
          </div>

          {/* Ratings Section - Show based on display role */}
          {ratings && (
            <div className="grid gap-4 mb-6 grid-cols-1">
              {/* Show owner rating only when display role is owner (NOT broker) */}
              {displayRole === 'owner' && user && user.role !== 'broker' && (
                <div className="bg-[var(--ink-soft)]/50 rounded-2xl p-4 border border-[var(--border-subtle)] flex flex-col items-center justify-center">
                  <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3">{getTranslation(language, 'asOwner')}</h3>
                {ratings.ownerRating !== null ? (
                    <Link
                      href={`/profile/ratings/${user?.id}?type=owner`}
                      className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <p className="text-2xl font-bold text-[var(--text)]">
                        {ratings.ownerRating.toFixed(1)}
                      </p>
                      <StarRating rating={ratings.ownerRating!} size="base" />
                      {ratings.ownerCount > 0 && (
                        <span className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] underline transition-colors">
                          {ratings.ownerCount} {ratings.ownerCount === 1 ? getTranslation(language, 'rating') : getTranslation(language, 'ratings')}
                        </span>
                      )}
                    </Link>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-2xl font-bold text-[var(--text)]">0.0</p>
                      <StarRating rating={0} size="base" />
                      <p className="text-xs text-[var(--text-muted)]">
                        {getTranslation(language, 'notRatedYet')}
                      </p>
                    </div>
                )}
              </div>
            )}
            
              {/* Show user rating only when display role is user */}
              {displayRole === 'user' && (
                <div className="bg-[var(--ink-soft)]/50 rounded-2xl p-4 border border-[var(--border-subtle)] flex flex-col items-center justify-center">
                  <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3">{getTranslation(language, 'asUser')}</h3>
                {ratings.renterRating !== null ? (
                    <Link
                      href={`/profile/ratings/${user?.id}?type=renter`}
                      className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <p className="text-2xl font-bold text-[var(--text)]">
                        {ratings.renterRating.toFixed(1)}
                      </p>
                      <StarRating rating={ratings.renterRating!} size="base" />
                      {ratings.renterCount > 0 && (
                        <span className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] underline transition-colors">
                          {ratings.renterCount} {ratings.renterCount === 1 ? getTranslation(language, 'rating') : getTranslation(language, 'ratings')}
                        </span>
                      )}
                    </Link>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-2xl font-bold text-[var(--text)]">0.0</p>
                      <StarRating rating={0} size="base" />
                      <p className="text-xs text-[var(--text-muted)]">
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
            <div className="pb-4 border-b border-[var(--border-subtle)]">
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">{getTranslation(language, 'userName')}</label>
              <p className={`flex items-center gap-2 text-lg ${user.name ? 'text-[var(--text)]' : 'text-[var(--text)]/50 italic'}`}>
                {user.name || getTranslation(language, 'notSet')}
                {user.verified && (
                  <span title={language === 'el' ? 'Επαληθευμένος ιδιοκτήτης' : 'Verified owner'} className="inline-flex items-center gap-1 rounded-full bg-[var(--status-info-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--status-info)]">
                    ✓ {language === 'el' ? 'Επαληθ.' : 'Verified'}
                  </span>
                )}
              </p>
            </div>
            {/* Don't show age/date of birth for brokers */}
            {user.role !== 'broker' && (
              <div className="pb-4 border-b border-[var(--border-subtle)]">
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">{getTranslation(language, 'age')}</label>
                <p className={`text-lg ${typeof computedAge === 'number' ? 'text-[var(--text)]' : 'text-[var(--text)]/50 italic'}`}>
                  {typeof computedAge === 'number' ? computedAge : getTranslation(language, 'notSet')}
                </p>
              </div>
            )}
            {/* Occupation - show for brokers as "Broker", editable for others */}
            <div className="pb-4 border-b border-[var(--border-subtle)]">
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">{getTranslation(language, 'occupation')}</label>
              <p className={`text-lg ${user.occupation ? 'text-[var(--text)]' : 'text-[var(--text)]/50 italic'}`}>
                {user.occupation ? translateValue(language, user.occupation) : getTranslation(language, 'notSet')}
              </p>
            </div>
            {isOwnProfile && (
              <div className="pb-4 border-b border-[var(--border-subtle)]">
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">{getTranslation(language, 'email')}</label>
                <p className="text-lg text-[var(--text)]">{user.email}</p>
              </div>
            )}
            <div className="pb-4 border-b border-[var(--border-subtle)]">
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">{getTranslation(language, 'role')}</label>
              <p className="text-lg text-[var(--text)]">
                {user.role === 'owner' && `🏠 ${translateRole(language, 'owner')}`}
                {user.role === 'user' && `👤 ${translateRole(language, 'user')}`}
                {user.role === 'both' && `🔄 ${translateRole(language, 'both')}`}
                {user.role === 'broker' && `🏢 ${translateRole(language, 'broker')}`}
              </p>
            </div>

            {/* Plan row — owners/brokers on own profile only */}
            {isOwnProfile && isOwnerOrBroker && (
              <div className="pb-4 border-b border-[var(--border-subtle)]">
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  {language === 'el' ? 'Πλάνο' : 'Plan'}
                </label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(user.subscriptionTier ?? 'free') === 'free' && (
                      <span className="text-sm text-[var(--text-muted)]">
                        {language === 'el' ? 'Δωρεάν' : 'Free'} · {language === 'el' ? '1 αγγελία' : '1 listing'}
                      </span>
                    )}
                    {(user.subscriptionTier ?? 'free') === 'plus' && (
                      <span className="text-sm text-amber-300">
                        ✦ Plus · {language === 'el' ? 'Απεριόριστες αγγελίες, analytics, Viber' : 'Unlimited listings, analytics, Viber'}
                      </span>
                    )}
                    {(user.subscriptionTier ?? 'free') === 'pro' && (
                      <span className="text-sm text-stone-300">
                        ◆ Pro
                      </span>
                    )}
                  </div>
                  {(user.subscriptionTier ?? 'free') === 'free' ? (
                    <Link
                      href="/upgrade"
                      className="text-xs px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors shrink-0"
                    >
                      {language === 'el' ? 'Αναβάθμιση σε Plus' : 'Upgrade to Plus'}
                    </Link>
                  ) : (
                    <Link
                      href="/upgrade"
                      className="text-xs px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)]/40 transition-colors shrink-0"
                    >
                      {language === 'el' ? 'Διαχείριση πλάνου' : 'Manage plan'}
                    </Link>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">{getTranslation(language, 'memberSince')}</label>
              <p className="text-lg text-[var(--text)]">
                {new Date(user.createdAt).toLocaleDateString(localeFor(language), {
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
            <Link href="/profile/edit" className="btn-primary px-8 py-3">
              {getTranslation(language, 'editProfile')}
            </Link>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center px-4">
          <p className="text-[var(--text)]">Loading...</p>
        </div>
      }
    >
      <ProfilePageInner />
    </Suspense>
  )
}
