'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'

interface Home {
  id: number
  key: string
  title: string
  description: string | null
  city: string
  country: string
  listingType: string
  pricePerMonth: number
  bedrooms: number
  bathrooms: number
  availableFrom: string | null
  owner: {
    email: string
    name: string | null
  }
}

export default function HomesPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [searchType, setSearchType] = useState<'rent' | 'buy' | null>(null)
  const [filterType, setFilterType] = useState<'manual' | 'ai' | null>(null)
  const [homes, setHomes] = useState<Home[]>([])
  const [loading, setLoading] = useState(false)
  const [checkingRole, setCheckingRole] = useState(true)
  const [userRole, setUserRole] = useState<string>('user')
  const [aiQuery, setAiQuery] = useState('')
  const [manualFilters, setManualFilters] = useState({
    city: '',
    country: '',
    minBedrooms: '',
    maxBedrooms: '',
    minPrice: '',
    maxPrice: '',
  })

  // Check user role on mount
  useEffect(() => {
    fetch('/api/profile')
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push('/login')
          return
        }
        const role = data.user.role || 'user'
        if (role !== 'user' && role !== 'both') {
          router.push('/profile')
          return
        }
        setUserRole(role)
        setCheckingRole(false)
      })
      .catch(() => {
        router.push('/login')
      })
  }, [router])

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-[#2D3748] flex items-center justify-center">
        <p className="text-[#E8D5B7]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  const fetchHomes = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/homes')
      const data = await response.json()
      setHomes(data.homes || [])
    } catch (error) {
      console.error('Error fetching homes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAISearch = async () => {
    if (!aiQuery.trim()) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/homes/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: aiQuery,
          type: searchType,
        }),
      })
      const data = await response.json()
      setHomes(data.homes || [])
    } catch (error) {
      console.error('Error with AI search:', error)
      // Fallback to showing all homes if AI search fails
      fetchHomes()
    } finally {
      setLoading(false)
    }
  }

  const handleManualFilter = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (manualFilters.city) params.append('city', manualFilters.city)
      if (manualFilters.country) params.append('country', manualFilters.country)
      if (manualFilters.minBedrooms) params.append('minBedrooms', manualFilters.minBedrooms)
      if (manualFilters.maxBedrooms) params.append('maxBedrooms', manualFilters.maxBedrooms)
      if (manualFilters.minPrice) params.append('minPrice', manualFilters.minPrice)
      if (manualFilters.maxPrice) params.append('maxPrice', manualFilters.maxPrice)

      const response = await fetch(`/api/homes?${params.toString()}`)
      const data = await response.json()
      setHomes(data.homes || [])
    } catch (error) {
      console.error('Error filtering homes:', error)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-[#2D3748] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Step 1: Choose Rent or Buy */}
        {!searchType && (
          <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[#E8D5B7]/20 mb-6">
            <h2 className="text-2xl font-bold text-[#E8D5B7] mb-6 text-center">{getTranslation(language, 'whatAreYouLookingFor')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
              <button
                onClick={() => setSearchType('rent')}
                className="px-6 py-4 bg-[#E8D5B7] text-[#2D3748] rounded-2xl hover:bg-[#D4C19F] transition-all font-semibold text-lg shadow-lg shadow-[#E8D5B7]/20 hover:shadow-xl transform hover:-translate-y-1"
              >
                🏠 {getTranslation(language, 'rent')}
              </button>
              <button
                onClick={() => setSearchType('buy')}
                className="px-6 py-4 bg-[#E8D5B7] text-[#2D3748] rounded-2xl hover:bg-[#D4C19F] transition-all font-semibold text-lg shadow-lg shadow-[#E8D5B7]/20 hover:shadow-xl transform hover:-translate-y-1"
              >
                💰 {getTranslation(language, 'buy')}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Choose Filter Type */}
        {searchType && !filterType && (
          <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[#E8D5B7]/20 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#E8D5B7]">{getTranslation(language, 'howDoYouWantToSearch')}</h2>
              <button
                onClick={() => {
                  setSearchType(null)
                  setFilterType(null)
                  setHomes([])
                }}
                className="px-3 py-1.5 text-sm text-[#E8D5B7] hover:text-[#D4C19F] transition-colors"
              >
                ← {getTranslation(language, 'back')}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
              <button
                onClick={() => setFilterType('manual')}
                className="px-6 py-4 bg-[#E8D5B7] text-[#2D3748] rounded-2xl hover:bg-[#D4C19F] transition-all font-semibold text-lg shadow-lg shadow-[#E8D5B7]/20 hover:shadow-xl transform hover:-translate-y-1"
              >
                🔍 {getTranslation(language, 'manualFilter')}
              </button>
              <button
                onClick={() => setFilterType('ai')}
                className="px-6 py-4 bg-[#E8D5B7] text-[#2D3748] rounded-2xl hover:bg-[#D4C19F] transition-all font-semibold text-lg shadow-lg shadow-[#E8D5B7]/20 hover:shadow-xl transform hover:-translate-y-1"
              >
                🤖 {getTranslation(language, 'aiSearch')}
              </button>
            </div>
          </div>
        )}

        {/* Manual Filter Form */}
        {searchType && filterType === 'manual' && (
          <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[#E8D5B7]/20 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#E8D5B7]">{getTranslation(language, 'filterByFeatures')}</h2>
              <button
                onClick={() => setFilterType(null)}
                className="px-3 py-1.5 text-sm text-[#E8D5B7] hover:text-[#D4C19F] transition-colors"
              >
                ← {getTranslation(language, 'back')}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">Πόλη</label>
                <input
                  type="text"
                  value={manualFilters.city}
                  onChange={(e) => setManualFilters({ ...manualFilters, city: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder="Οποιαδήποτε πόλη"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">Χώρα</label>
                <input
                  type="text"
                  value={manualFilters.country}
                  onChange={(e) => setManualFilters({ ...manualFilters, country: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder="Οποιαδήποτε χώρα"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">Ελάχιστα Υπνοδωμάτια</label>
                <input
                  type="number"
                  min="0"
                  value={manualFilters.minBedrooms}
                  onChange={(e) => setManualFilters({ ...manualFilters, minBedrooms: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">Μέγιστα Υπνοδωμάτια</label>
                <input
                  type="number"
                  min="0"
                  value={manualFilters.maxBedrooms}
                  onChange={(e) => setManualFilters({ ...manualFilters, maxBedrooms: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder="Οποιοδήποτε"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">Ελάχιστη Τιμή (€)</label>
                <input
                  type="number"
                  min="0"
                  value={manualFilters.minPrice}
                  onChange={(e) => setManualFilters({ ...manualFilters, minPrice: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">Μέγιστη Τιμή (€)</label>
                <input
                  type="number"
                  min="0"
                  value={manualFilters.maxPrice}
                  onChange={(e) => setManualFilters({ ...manualFilters, maxPrice: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder="Οποιαδήποτε"
                />
              </div>
            </div>
            <button
              onClick={handleManualFilter}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold disabled:opacity-50"
            >
              {loading ? getTranslation(language, 'searching') : getTranslation(language, 'applyFilters')}
            </button>
          </div>
        )}

        {/* AI Search Form */}
        {searchType && filterType === 'ai' && (
          <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[#E8D5B7]/20 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#E8D5B7]">Πείτε μας τι χρειάζεστε</h2>
              <button
                onClick={() => setFilterType(null)}
                className="px-3 py-1.5 text-sm text-[#E8D5B7] hover:text-[#D4C19F] transition-colors"
              >
                ← Πίσω
              </button>
            </div>
            <p className="text-[#E8D5B7]/70 mb-4">
              Περιγράψτε τι αναζητάτε και γιατί. Η AI μας θα βρει τα καλύτερα ακίνητα για εσάς.
            </p>
            <textarea
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7] placeholder:text-[#E8D5B7]/50 mb-4 resize-none"
              rows={6}
              placeholder="Παράδειγμα: Χρειάζομαι ένα διαμέρισμα 2 υπνοδωματίων στην Αθήνα για την οικογένειά μου. Θέλουμε να είμαστε κοντά σε σχολεία και πάρκα. Ο προϋπολογισμός είναι περίπου 800-1000€ το μήνα..."
            />
            <button
              onClick={handleAISearch}
              disabled={loading || !aiQuery.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold disabled:opacity-50"
            >
              {loading ? getTranslation(language, 'searchingWithAi') : getTranslation(language, 'aiSearch')}
            </button>
          </div>
        )}

        {/* Results Header */}
        {(filterType && homes.length > 0) && (
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-[#E8D5B7]">
                {getTranslation(language, 'availableProperties')} {searchType === 'rent' ? `(${getTranslation(language, 'rent')})` : `(${getTranslation(language, 'buy')})`}
              </h1>
              <p className="text-[#E8D5B7]/70 mt-2">Βρέθηκαν {homes.length} {homes.length === 1 ? 'αγγελία' : 'αγγελίες'}</p>
            </div>
            {(userRole === 'owner' || userRole === 'both') && (
              <Link
                href="/homes/new"
                className="inline-flex items-center px-4 py-2 bg-[#E8D5B7] text-[#2D3748] rounded-2xl hover:bg-[#D4C19F] transition-all font-semibold text-sm shadow-lg shadow-[#E8D5B7]/20 hover:shadow-xl transform hover:-translate-y-0.5"
              >
                + Νέα Αγγελία
              </Link>
            )}
          </div>
        )}

        {/* Homes Grid */}
        {homes.length === 0 && filterType ? (
          <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-12 text-center shadow-xl border border-[#E8D5B7]/20">
            <p className="text-xl text-[#E8D5B7]/70">
              {filterType === 'manual' ? 'Δεν βρέθηκαν ακίνητα που να ταιριάζουν με τα φίλτρα σας. Δοκιμάστε να προσαρμόσετε τα κριτήρια αναζήτησης.' : 'Δεν βρέθηκαν ακίνητα. Δοκιμάστε μια διαφορετική αναζήτηση.'}
            </p>
          </div>
        ) : homes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {homes.map((home) => (
              <Link
                key={home.id}
                href={`/homes/${home.key}`}
                className="block bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-[#E8D5B7]/20 hover:border-[#E8D5B7]/40 transition-all transform hover:-translate-y-1 cursor-pointer"
              >
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-2xl font-bold text-[#E8D5B7] flex-1">{home.title}</h2>
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ml-2 ${
                      home.listingType === 'rent' 
                        ? 'bg-[#E8D5B7] text-[#2D3748]' 
                        : 'bg-[#2D3748] text-[#E8D5B7] border border-[#E8D5B7]'
                    }`}>
                      {home.listingType === 'rent' ? `🏠 ${getTranslation(language, 'rent')}` : `💰 ${getTranslation(language, 'buy')}`}
                    </span>
                  </div>
                  <p className="text-[#E8D5B7]/70 flex items-center gap-1">
                    <span>📍</span>
                    {home.city}, {home.country}
                  </p>
                </div>

                {home.description && (
                  <p className="text-[#E8D5B7]/80 mb-4 line-clamp-2">{home.description}</p>
                )}

                <div className="flex items-center justify-between mb-4 pt-4 border-t border-[#E8D5B7]/20">
                  <div>
                    <p className="text-3xl font-bold text-[#E8D5B7]">
                      €{home.pricePerMonth.toLocaleString()}
                    </p>
                    <p className="text-sm text-[#E8D5B7]/60">
                      {home.listingType === 'rent' ? getTranslation(language, 'perMonth') : getTranslation(language, 'totalPrice')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#E8D5B7]">
                      {home.bedrooms} <span className="text-[#E8D5B7]/60">υπνοδ.</span>
                    </p>
                    <p className="text-sm font-semibold text-[#E8D5B7]">
                      {home.bathrooms} <span className="text-[#E8D5B7]/60">μπάνια</span>
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E8D5B7]/20">
                    <p className="text-xs text-[#E8D5B7]/60">
                    {getTranslation(language, 'publishedBy')} <span className="font-medium text-[#E8D5B7]">{home.owner.name || home.owner.email}</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
