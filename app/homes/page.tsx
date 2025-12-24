'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation, translateValue } from '@/lib/translations'

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
  const searchParams = useSearchParams()
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
    minPrice: '',
    maxPrice: '',
    minSize: '',
    maxSize: '',
    heatingCategory: '',
    heatingAgent: '',
    minBedrooms: '',
    maxBedrooms: '',
    yearBuilt: '',
  })
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [availableAreas, setAvailableAreas] = useState<string[]>([])
  const [inquiries, setInquiries] = useState<number[]>([])
  const isInitialized = useRef(false)

  // Initialize state from URL parameters on mount (only once)
  useEffect(() => {
    if (isInitialized.current) return
    
    const urlSearchType = searchParams.get('type') as 'rent' | 'buy' | null
    const urlFilterType = searchParams.get('filter') as 'manual' | 'ai' | null
    
    if (urlSearchType && (urlSearchType === 'rent' || urlSearchType === 'buy')) {
      setSearchType(urlSearchType)
    }
    if (urlFilterType && (urlFilterType === 'manual' || urlFilterType === 'ai')) {
      setFilterType(urlFilterType)
    }
    
    isInitialized.current = true
  }, [searchParams])

  // Update URL when searchType or filterType changes (but not on initial mount)
  useEffect(() => {
    if (!isInitialized.current) return
    
    const params = new URLSearchParams()
    if (searchType) {
      params.set('type', searchType)
    }
    if (filterType) {
      params.set('filter', filterType)
    }
    
    const newSearch = params.toString()
    const currentSearch = window.location.search.replace('?', '')
    
    // Only update URL if it's different to avoid unnecessary navigation
    if (currentSearch !== newSearch) {
      const newUrl = newSearch ? `/homes?${newSearch}` : '/homes'
      router.replace(newUrl, { scroll: false })
    }
  }, [searchType, filterType, router])

  // Check user role and fetch inquiries on mount
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
        
        // Fetch user's inquiries
        fetch('/api/inquiries')
          .then((res) => res.json())
          .then((inqData) => {
            if (inqData.homeIds) {
              setInquiries(inqData.homeIds)
            }
          })
          .catch((err) => console.error('Error fetching inquiries:', err))
      })
      .catch(() => {
        router.push('/login')
      })
  }, [router])


  // Fetch all available areas from existing listings
  useEffect(() => {
    fetch('/api/homes')
      .then((res) => res.json())
      .then((data) => {
        const areas = new Set<string>()
        data.homes?.forEach((home: any) => {
          if (home.area && home.area.trim() !== '') {
            areas.add(home.area)
          }
        })
        setAvailableAreas(Array.from(areas).sort())
      })
      .catch((error) => {
        console.error('Error fetching areas:', error)
      })
  }, [])

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
      if (searchType) params.append('listingType', searchType)
      if (manualFilters.city) params.append('city', manualFilters.city)
      if (manualFilters.country) params.append('country', manualFilters.country)
      if (manualFilters.minPrice) params.append('minPrice', manualFilters.minPrice)
      if (manualFilters.maxPrice) params.append('maxPrice', manualFilters.maxPrice)
      if (manualFilters.minSize) params.append('minSize', manualFilters.minSize)
      if (manualFilters.maxSize) params.append('maxSize', manualFilters.maxSize)
      if (manualFilters.heatingCategory) params.append('heatingCategory', manualFilters.heatingCategory)
      if (manualFilters.heatingAgent) params.append('heatingAgent', manualFilters.heatingAgent)
      if (manualFilters.minBedrooms) params.append('minBedrooms', manualFilters.minBedrooms)
      if (manualFilters.maxBedrooms) params.append('maxBedrooms', manualFilters.maxBedrooms)
      if (manualFilters.yearBuilt) params.append('yearBuilt', manualFilters.yearBuilt)
      if (selectedAreas.length > 0) {
        selectedAreas.forEach(area => params.append('areas', area))
      }

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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#E8D5B7] flex-1 text-center">{getTranslation(language, 'whatAreYouLookingFor')}</h2>
            </div>
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
            <div className="space-y-4 mb-4">
              {/* Row 1: City, Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'city')}</label>
                  <input
                    type="text"
                    value={manualFilters.city}
                    onChange={(e) => setManualFilters({ ...manualFilters, city: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                    placeholder={getTranslation(language, 'anyCity')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'country')}</label>
                  <input
                    type="text"
                    value={manualFilters.country}
                    onChange={(e) => setManualFilters({ ...manualFilters, country: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                    placeholder={getTranslation(language, 'anyCountry')}
                  />
                </div>
              </div>

              {/* Row 2: City Area (alone) */}
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'cityArea')}</label>
                <div className="space-y-3">
                  {/* Selected areas as chips */}
                  {selectedAreas.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedAreas.map((area) => (
                        <div
                          key={area}
                          className="flex items-center gap-2 px-3 py-1.5 bg-[#E8D5B7] text-[#2D3748] rounded-lg"
                        >
                          <span className="text-sm font-medium">{translateValue(language, area)}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedAreas(selectedAreas.filter(a => a !== area))}
                            className="text-[#2D3748] hover:text-red-600 transition-colors"
                            aria-label={getTranslation(language, 'close')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Area dropdown */}
                  <select
                    value=""
                    onChange={(e) => {
                      const area = e.target.value
                      if (area && !selectedAreas.includes(area)) {
                        setSelectedAreas([...selectedAreas, area])
                      }
                      e.target.value = '' // Reset dropdown
                    }}
                    className="w-full px-4 py-2 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7]"
                  >
                    <option value="">{getTranslation(language, 'selectCityArea')}</option>
                    {availableAreas
                      .filter(area => !selectedAreas.includes(area))
                      .map((area) => (
                        <option key={area} value={area}>
                          {translateValue(language, area)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Min Price, Max Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'minPrice')}</label>
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
                  <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'maxPrice')}</label>
                  <input
                    type="number"
                    min="0"
                    value={manualFilters.maxPrice}
                    onChange={(e) => setManualFilters({ ...manualFilters, maxPrice: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                    placeholder={getTranslation(language, 'any')}
                  />
                </div>
              </div>

              {/* Row 4: Min Size, Max Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'minSize')}</label>
                  <input
                    type="number"
                    min="0"
                    value={manualFilters.minSize}
                    onChange={(e) => setManualFilters({ ...manualFilters, minSize: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'maxSize')}</label>
                  <input
                    type="number"
                    min="0"
                    value={manualFilters.maxSize}
                    onChange={(e) => setManualFilters({ ...manualFilters, maxSize: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                    placeholder={getTranslation(language, 'any')}
                  />
                </div>
              </div>

              {/* Row 5: Heating Category, Heating Agent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'heatingCategory')}</label>
                  <select
                    value={manualFilters.heatingCategory}
                    onChange={(e) => setManualFilters({ ...manualFilters, heatingCategory: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7]"
                  >
                    <option value="">{getTranslation(language, 'any')}</option>
                    <option value="central">{translateValue(language, 'central')}</option>
                    <option value="autonomous">{translateValue(language, 'autonomous')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'heatingAgent')}</label>
                  <select
                    value={manualFilters.heatingAgent}
                    onChange={(e) => setManualFilters({ ...manualFilters, heatingAgent: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7]"
                  >
                    <option value="">{getTranslation(language, 'any')}</option>
                    <option value="oil">{translateValue(language, 'oil')}</option>
                    <option value="natural gas">{translateValue(language, 'natural gas')}</option>
                    <option value="electricity">{translateValue(language, 'electricity')}</option>
                    <option value="other">{translateValue(language, 'other')}</option>
                  </select>
                </div>
              </div>

              {/* Row 6: Min Bedrooms, Max Bedrooms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'minBedrooms')}</label>
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
                  <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'maxBedrooms')}</label>
                  <input
                    type="number"
                    min="0"
                    value={manualFilters.maxBedrooms}
                    onChange={(e) => setManualFilters({ ...manualFilters, maxBedrooms: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                    placeholder={getTranslation(language, 'any')}
                  />
                </div>
              </div>

              {/* Row 7: Year Built (alone) */}
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'yearBuilt')}</label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={manualFilters.yearBuilt}
                  onChange={(e) => setManualFilters({ ...manualFilters, yearBuilt: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder={getTranslation(language, 'any')}
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
              <h2 className="text-xl font-bold text-[#E8D5B7]">{getTranslation(language, 'tellUsWhatYouNeed')}</h2>
              <button
                onClick={() => setFilterType(null)}
                className="px-3 py-1.5 text-sm text-[#E8D5B7] hover:text-[#D4C19F] transition-colors"
              >
                ← {getTranslation(language, 'back')}
              </button>
            </div>
            <p className="text-[#E8D5B7]/70 mb-4">
              {getTranslation(language, 'aiSearchDescription')}
            </p>
            <textarea
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7] placeholder:text-[#E8D5B7]/50 mb-4 resize-none"
              rows={6}
              placeholder={language === 'el' ? 'Παράδειγμα: Χρειάζομαι ένα διαμέρισμα 2 υπνοδωματίων στην Αθήνα για την οικογένειά μου. Θέλουμε να είμαστε κοντά σε σχολεία και πάρκα. Ο προϋπολογισμός είναι περίπου 800-1000€ το μήνα...' : 'Example: I need a 2-bedroom apartment in Athens for my family. We want to be close to schools and parks. Budget is around 800-1000€ per month...'}
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
              <p className="text-[#E8D5B7]/70 mt-2">
                {homes.length} {homes.length === 1 ? getTranslation(language, 'listing') : getTranslation(language, 'listings')} {getTranslation(language, 'found')}
              </p>
            </div>
            {(userRole === 'owner' || userRole === 'both') && (
              <Link
                href="/homes/new"
                className="inline-flex items-center px-4 py-2 bg-[#E8D5B7] text-[#2D3748] rounded-2xl hover:bg-[#D4C19F] transition-all font-semibold text-sm shadow-lg shadow-[#E8D5B7]/20 hover:shadow-xl transform hover:-translate-y-0.5"
              >
                + {getTranslation(language, 'newListing')}
              </Link>
            )}
          </div>
        )}

        {/* Homes Grid */}
        {homes.length === 0 && filterType ? (
          <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-12 text-center shadow-xl border border-[#E8D5B7]/20">
            <p className="text-xl text-[#E8D5B7]/70">
              {filterType === 'manual' ? getTranslation(language, 'noPropertiesFound') : getTranslation(language, 'noPropertiesFoundAi')}
            </p>
          </div>
        ) : homes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {homes.map((home) => {
              const hasInquiry = inquiries.includes(home.id)
              return (
                <div
                  key={home.id}
                  className={`relative bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border transition-all transform hover:-translate-y-1 overflow-hidden ${
                    hasInquiry 
                      ? 'border-[#E8D5B7]/10 opacity-60' 
                      : 'border-[#E8D5B7]/20 hover:border-[#E8D5B7]/40'
                  }`}
                >
                  {/* Sticker-style Inquiry Made Banner - Horizontal through center */}
                  {hasInquiry && (
                    <div className="absolute top-1/2 left-1/2 z-10 transform -translate-x-1/2 -translate-y-1/2 origin-center">
                      <div className="relative bg-red-600 text-white px-6 py-3 shadow-lg border-2 border-red-800 whitespace-nowrap"
                        style={{
                          clipPath: 'polygon(2% 0%, 98% 0%, 100% 5%, 98% 10%, 100% 15%, 98% 20%, 100% 25%, 98% 30%, 100% 35%, 98% 40%, 100% 45%, 98% 50%, 100% 55%, 98% 60%, 100% 65%, 98% 70%, 100% 75%, 98% 80%, 100% 85%, 98% 90%, 100% 95%, 98% 100%, 2% 100%, 0% 95%, 2% 90%, 0% 85%, 2% 80%, 0% 75%, 2% 70%, 0% 65%, 2% 60%, 0% 55%, 2% 50%, 0% 45%, 2% 40%, 0% 35%, 2% 30%, 0% 25%, 2% 20%, 0% 15%, 2% 10%, 0% 5%)',
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">🏷️</span>
                          <p className="text-sm font-black uppercase tracking-wide">
                            {getTranslation(language, 'inquiryMade')}
                          </p>
                        </div>
                        {/* Sticker shine effect */}
                        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
                      </div>
                    </div>
                  )}
                  
                  <Link
                    href={`/homes/${home.key}`}
                    className="block"
                  >
                    
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-2">
                        <h2 className={`text-2xl font-bold flex-1 ${
                          hasInquiry ? 'text-[#E8D5B7]/50' : 'text-[#E8D5B7]'
                        }`}>{home.title}</h2>
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ml-2 ${
                          home.listingType === 'rent' 
                            ? 'bg-[#E8D5B7] text-[#2D3748]' 
                            : 'bg-[#2D3748] text-[#E8D5B7] border border-[#E8D5B7]'
                        }`}>
                          {home.listingType === 'rent' ? `🏠 ${getTranslation(language, 'rent')}` : `💰 ${getTranslation(language, 'buy')}`}
                        </span>
                      </div>
                      <p className={`flex items-center gap-1 ${
                        hasInquiry ? 'text-[#E8D5B7]/40' : 'text-[#E8D5B7]/70'
                      }`}>
                        <span>📍</span>
                        {home.city}, {home.country}
                      </p>
                    </div>

                    {home.description && (
                      <p className={`mb-4 line-clamp-2 ${
                        hasInquiry ? 'text-[#E8D5B7]/40' : 'text-[#E8D5B7]/80'
                      }`}>{home.description}</p>
                    )}

                    <div className={`flex items-center justify-between mb-4 pt-4 border-t ${
                      hasInquiry ? 'border-[#E8D5B7]/10' : 'border-[#E8D5B7]/20'
                    }`}>
                      <div>
                        <p className={`text-3xl font-bold ${
                          hasInquiry ? 'text-[#E8D5B7]/50' : 'text-[#E8D5B7]'
                        }`}>
                          €{home.pricePerMonth.toLocaleString()}
                        </p>
                        <p className={`text-sm ${
                          hasInquiry ? 'text-[#E8D5B7]/40' : 'text-[#E8D5B7]/60'
                        }`}>
                          {home.listingType === 'rent' ? getTranslation(language, 'perMonth') : getTranslation(language, 'totalPrice')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${
                          hasInquiry ? 'text-[#E8D5B7]/50' : 'text-[#E8D5B7]'
                        }`}>
                          {home.bedrooms} <span className={`${
                            hasInquiry ? 'text-[#E8D5B7]/40' : 'text-[#E8D5B7]/60'
                          }`}>{getTranslation(language, 'bedroomsShort')}</span>
                        </p>
                        <p className={`text-sm font-semibold ${
                          hasInquiry ? 'text-[#E8D5B7]/50' : 'text-[#E8D5B7]'
                        }`}>
                          {home.bathrooms} <span className={`${
                            hasInquiry ? 'text-[#E8D5B7]/40' : 'text-[#E8D5B7]/60'
                          }`}>{getTranslation(language, 'bathroomsShort')}</span>
                        </p>
                      </div>
                    </div>

                    <div className={`pt-4 border-t ${
                      hasInquiry ? 'border-[#E8D5B7]/10' : 'border-[#E8D5B7]/20'
                    }`}>
                      <p className={`text-xs ${
                        hasInquiry ? 'text-[#E8D5B7]/40' : 'text-[#E8D5B7]/60'
                      }`}>
                        {getTranslation(language, 'publishedBy')} <span className={`font-medium ${
                          hasInquiry ? 'text-[#E8D5B7]/50' : 'text-[#E8D5B7]'
                        }`}>{home.owner.name || home.owner.email}</span>
                      </p>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
