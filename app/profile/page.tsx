'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation, translateValue } from '@/lib/translations'

interface User {
  id: number
  email: string
  name: string | null
  title: string | null
  age: number | null
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
  const router = useRouter()
  const { language } = useLanguage()
  const [user, setUser] = useState<User | null>(null)
  const [ratings, setRatings] = useState<Ratings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/profile')
        if (!response.ok) {
          router.push('/login')
          return
        }
        const data = await response.json()
        if (!data.user) {
          router.push('/login')
          return
        }
        setUser(data.user)

        // Fetch ratings
        const ratingsResponse = await fetch(`/api/ratings?userId=${data.user.id}`)
        if (ratingsResponse.ok) {
          const ratingsData = await ratingsResponse.json()
          setRatings(ratingsData)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2D3748] flex items-center justify-center">
        <p className="text-[#E8D5B7]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Calculate username with title
  const displayName = user.name || user.email.split('@')[0]
  const translatedTitle = user.title ? translateValue(language, user.title) : null
  const fullName = translatedTitle ? `${translatedTitle} ${displayName}` : displayName
  const userRole = user.role || 'user'

  const calculateAgeFromDob = (dobString: string | null, fallbackAge: number | null) => {
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
    return fallbackAge
  }

  const computedAge = calculateAgeFromDob(user.dateOfBirth, user.age)

  return (
    <div className="min-h-screen bg-[#2D3748] py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
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

            <h1 className="text-3xl font-bold text-[#E8D5B7] mb-6">{fullName}</h1>
          </div>

          {/* Ratings Section - Show based on user role */}
          {ratings && (
            <div className={`grid gap-4 mb-6 ${userRole === 'both' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              {/* Show owner rating only for owners or both */}
              {(userRole === 'owner' || userRole === 'both') && (
                <div className="bg-[#2D3748]/50 rounded-2xl p-4 border border-[#E8D5B7]/20">
                  <h3 className="text-sm font-medium text-[#E8D5B7]/70 mb-2">{getTranslation(language, 'asOwner')}</h3>
                  {ratings.ownerRating !== null ? (
                    <div>
                      <p className="text-2xl font-bold text-[#E8D5B7] flex items-center gap-2">
                        <span>⭐</span>
                        {ratings.ownerRating} / 5.0
                      </p>
                      <p className="text-xs text-[#E8D5B7]/60 mt-1">
                        {ratings.ownerCount} {ratings.ownerCount === 1 ? getTranslation(language, 'rating') : getTranslation(language, 'ratings')}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[#E8D5B7]/60">{getTranslation(language, 'noRatingsYet')}</p>
                  )}
                </div>
              )}
              
              {/* Show user rating only for users or both */}
              {(userRole === 'user' || userRole === 'both') && (
                <div className="bg-[#2D3748]/50 rounded-2xl p-4 border border-[#E8D5B7]/20">
                  <h3 className="text-sm font-medium text-[#E8D5B7]/70 mb-2">{getTranslation(language, 'asUser')}</h3>
                  {ratings.renterRating !== null ? (
                    <div>
                      <p className="text-2xl font-bold text-[#E8D5B7] flex items-center gap-2">
                        <span>⭐</span>
                        {ratings.renterRating} / 5.0
                      </p>
                      <p className="text-xs text-[#E8D5B7]/60 mt-1">
                        {ratings.renterCount} {ratings.renterCount === 1 ? getTranslation(language, 'rating') : getTranslation(language, 'ratings')}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[#E8D5B7]/60">{getTranslation(language, 'noRatingsYet')}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Profile Information */}
          <div className="space-y-4 mb-6">
            <div className="pb-4 border-b border-[#E8D5B7]/20">
              <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'userName')}</label>
              <p className="text-lg text-[#E8D5B7]">{displayName}</p>
            </div>
            {user.title && (
              <div className="pb-4 border-b border-[#E8D5B7]/20">
                <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'title')}</label>
                <p className="text-lg text-[#E8D5B7]">{translateValue(language, user.title)}</p>
              </div>
            )}
            <div className="pb-4 border-b border-[#E8D5B7]/20">
              <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'age')}</label>
              <p className="text-lg text-[#E8D5B7]">
                {typeof computedAge === 'number' ? computedAge : getTranslation(language, 'notSet')}
              </p>
            </div>
            {user.occupation && (
              <div className="pb-4 border-b border-[#E8D5B7]/20">
                <label className="block text-sm font-medium text-[#E8D5B7]/70 mb-1">{getTranslation(language, 'occupation')}</label>
                <p className="text-lg text-[#E8D5B7]">{translateValue(language, user.occupation)}</p>
              </div>
            )}
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

          {/* Edit Profile Button */}
          <div className="flex justify-center pt-4">
            <Link
              href="/profile/edit"
              className="px-6 py-3 bg-[#E8D5B7] text-[#2D3748] rounded-2xl hover:bg-[#D4C19F] transition-all font-semibold shadow-lg shadow-[#E8D5B7]/20 hover:shadow-xl"
            >
              {getTranslation(language, 'editProfile')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
