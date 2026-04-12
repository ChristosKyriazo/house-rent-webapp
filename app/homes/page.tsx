'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { useRole } from '@/app/contexts/RoleContext'
import { getTranslation, translateValue } from '@/lib/translations'
import { getCityName, getCountryName, getAreaName } from '@/lib/area-utils'
import TranslatedDescription from '@/app/components/TranslatedDescription'

interface Home {
  id: number
  key: string
  title: string
  description: string | null
  descriptionGreek: string | null
  city: string
  country: string
  area: string | null
  listingType: string
  pricePerMonth: number
  bedrooms: number
  bathrooms: number
  sizeSqMeters: number | null
  availableFrom: string | null
  createdAt: string
  energyClass: string | null
  closestUniversity: number | null
  matchPercentage?: number // AI match percentage
  owner: {
    email: string
    name: string | null
  }
}

function HomesPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { language } = useLanguage()
  const { selectedRole, actualRole } = useRole()
  const [searchType, setSearchType] = useState<'rent' | 'buy' | null>(null)
  const [filterType, setFilterType] = useState<'manual' | 'ai' | null>(null)
  const [homes, setHomes] = useState<Home[]>([])
  const [loading, setLoading] = useState(false)
  const [checkingRole, setCheckingRole] = useState(true)
  const [userRole, setUserRole] = useState<string>('user')
  
  // Determine display role for UI: if user has "both" role, use selectedRole, otherwise use actualRole or userRole
  const displayRole = (actualRole === 'both' && selectedRole) 
    ? selectedRole 
    : (actualRole || userRole || 'user')
  const [aiQuery, setAiQuery] = useState('')
  const [isAISearchActive, setIsAISearchActive] = useState(false) // Track if AI search has been performed
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
  const [excludeInquired, setExcludeInquired] = useState(false)
  const [excludeApproved, setExcludeApproved] = useState(false)
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [areaSearchQuery, setAreaSearchQuery] = useState('')
  const [areaSuggestions, setAreaSuggestions] = useState<Array<{ id: number; name: string; nameGreek: string | null; city: string | null; cityGreek: string | null; country: string | null; countryGreek: string | null }>>([])
  const [showAreaDropdown, setShowAreaDropdown] = useState(false)
  const [allAreas, setAllAreas] = useState<Array<{ id: number; name: string; nameGreek: string | null }>>([])
  const [areas, setAreas] = useState<Array<{ city: string | null; cityGreek: string | null; country: string | null; countryGreek: string | null }>>([])
  
  // City autocomplete state
  const [citySearchQuery, setCitySearchQuery] = useState('')
  const [citySuggestions, setCitySuggestions] = useState<Array<{ city: string; cityGreek: string | null; country: string; countryGreek: string | null }>>([])
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  
  // Country autocomplete state
  const [countrySearchQuery, setCountrySearchQuery] = useState('')
  const [countrySuggestions, setCountrySuggestions] = useState<Array<{ country: string; countryGreek: string | null }>>([])
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [showFilters, setShowFilters] = useState(true)
  const [showOrderDropdown, setShowOrderDropdown] = useState(false)
  const [sortOrder, setSortOrder] = useState<string>('')
  const [inquiryStatus, setInquiryStatus] = useState<Record<number, 'inquired' | 'approved' | 'dismissed'>>({})
  const isInitialized = useRef(false)
  const homesRef = useRef(homes)
  
  // Keep homes ref in sync
  useEffect(() => {
    homesRef.current = homes
  }, [homes])

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

  // Restore search results and filters from sessionStorage
  const restoreSearchState = () => {
    try {
      const storedResults = sessionStorage.getItem('homesSearchResults')
      const storedFilterType = sessionStorage.getItem('homesFilterType')
      
      // Only restore if we have stored data and no current results
      if (!storedResults || !storedFilterType) return
      
      // Check current homes length to avoid overwriting existing results
      if (homesRef.current.length > 0) return
      
      const storedFilters = sessionStorage.getItem('homesSearchFilters')
      const storedSearchType = sessionStorage.getItem('homesSearchType')
      const storedAiQuery = sessionStorage.getItem('homesAiQuery')
      
      if (storedResults) {
        const parsedResults = JSON.parse(storedResults)
        if (parsedResults.length > 0) {
          setHomes(parsedResults)
          setShowFilters(false) // Hide filters when results are restored
        }
      }
      
      if (storedFilters) {
        const parsedFilters = JSON.parse(storedFilters)
        setManualFilters(parsedFilters.manualFilters || manualFilters)
        setSelectedAreas(parsedFilters.selectedAreas || [])
        setExcludeInquired(parsedFilters.excludeInquired || false)
        setExcludeApproved(parsedFilters.excludeApproved || false)
      }
      
      if (storedSearchType && (storedSearchType === 'rent' || storedSearchType === 'buy')) {
        setSearchType(storedSearchType)
      }
      
      if (storedFilterType && (storedFilterType === 'manual' || storedFilterType === 'ai')) {
        setFilterType(storedFilterType)
        if (storedFilterType === 'ai') {
          setIsAISearchActive(true)
          if (storedAiQuery) {
            setAiQuery(storedAiQuery)
          }
        }
      }
    } catch (error) {
      console.error('Error restoring search state:', error)
    }
  }

  // Restore on mount - MUST run before clearing effects
  useEffect(() => {
    restoreSearchState()
  }, [])

  // Restore when navigating back to /homes page (e.g., from house detail page)
  // This should run BEFORE the clearing effect
  useEffect(() => {
    if (pathname === '/homes' && homesRef.current.length === 0) {
      // Small delay to ensure this runs before clearing effect
      const timer = setTimeout(() => {
        restoreSearchState()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  // Restore when window gets focus (user navigates back)
  useEffect(() => {
    const handleFocus = () => {
      if (pathname === '/homes' && homesRef.current.length === 0) {
        restoreSearchState()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [pathname])
  
  // Clear AI search results when filterType changes or is removed from URL
  // BUT: Don't clear if we have stored state in sessionStorage (user is returning from detail page)
  // This effect should run AFTER restoration effects
  useEffect(() => {
    if (!isInitialized.current) return
    
    // Check if we have stored AI search state (user might be returning from detail page)
    const hasStoredAIState = sessionStorage.getItem('homesSearchResults') && 
                             sessionStorage.getItem('homesFilterType') === 'ai'
    
    // If we have stored state and no current results, don't clear - let restoration handle it
    if (hasStoredAIState && homesRef.current.length === 0) {
      return
    }
    
    const urlFilterType = searchParams.get('filter') as 'manual' | 'ai' | null
    
    // If filterType is removed from URL or changed, clear AI search
    // BUT: Don't clear if we have stored state (user is navigating back)
    if (isAISearchActive && (urlFilterType !== 'ai' || filterType !== 'ai')) {
      // Only clear if we don't have stored state OR if filterType actually changed (not just missing from URL)
      if (!hasStoredAIState || (filterType !== 'ai' && urlFilterType !== 'ai')) {
        setIsAISearchActive(false)
        setAiQuery('')
        setHomes([])
        setShowFilters(true)
      }
    }
  }, [searchParams, filterType, isAISearchActive])

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
        
        // Fetch user's inquiry status
        fetch('/api/inquiries')
          .then((res) => res.json())
          .then((inqData) => {
            if (inqData.inquiryStatus) {
              setInquiryStatus(inqData.inquiryStatus)
            }
          })
          .catch((err) => console.error('Error fetching inquiries:', err))
      })
      .catch(() => {
        router.push('/login')
      })
  }, [router])



  // Fetch areas for city/country translation
  useEffect(() => {
    fetch('/api/areas')
      .then((res) => res.json())
      .then((data) => {
        setAreas(data.areas || [])
      })
      .catch((error) => {
        console.error('Error fetching areas for translation:', error)
      })
  }, [])


  // Close order dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showOrderDropdown && !target.closest('.order-dropdown-container')) {
        setShowOrderDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showOrderDropdown])

  // Search areas function
  const searchAreas = async (query: string) => {
    if (query.length < 1) {
      setAreaSuggestions([])
      return
    }

    try {
      const params = new URLSearchParams({
        q: query,
        limit: '10',
      })
      
      if (manualFilters.city) params.append('city', manualFilters.city)
      if (manualFilters.country) params.append('country', manualFilters.country)

      const response = await fetch(`/api/areas/search?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        // Filter out already selected areas
        const filtered = (data.areas || []).filter((area: { name: string }) => !selectedAreas.includes(area.name))
        setAreaSuggestions(filtered)
      }
    } catch (error) {
      console.error('Error searching areas:', error)
    }
  }

  // Search cities function
  const searchCities = async (query: string) => {
    if (query.length < 1) {
      setCitySuggestions([])
      return
    }

    try {
      const params = new URLSearchParams({
        q: query,
        limit: '10',
      })
      
      if (manualFilters.country) params.append('country', manualFilters.country)

      const response = await fetch(`/api/cities/search?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setCitySuggestions(data.cities || [])
      }
    } catch (error) {
      console.error('Error searching cities:', error)
    }
  }

  // Search countries function
  const searchCountries = async (query: string) => {
    if (query.length < 1) {
      setCountrySuggestions([])
      return
    }

    try {
      const params = new URLSearchParams({
        q: query,
        limit: '10',
      })

      const response = await fetch(`/api/countries/search?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setCountrySuggestions(data.countries || [])
      }
    } catch (error) {
      console.error('Error searching countries:', error)
    }
  }

  // Handle city selection - filter country and area dropdowns
  const handleCitySelect = (city: { city: string; cityGreek: string | null; country: string; countryGreek: string | null }) => {
    setManualFilters({ ...manualFilters, city: city.city })
    setCitySearchQuery(language === 'el' && city.cityGreek ? city.cityGreek : city.city)
    setShowCityDropdown(false)
    setCitySuggestions([])
    
    // Auto-set country if not already set
    if (!manualFilters.country) {
      setManualFilters(prev => ({ ...prev, country: city.country }))
      setCountrySearchQuery(language === 'el' && city.countryGreek ? city.countryGreek : city.country)
    }
    
    // Clear area selection if it doesn't match the new city
    if (selectedAreas.length > 0) {
      // We'll let the area search filter by city automatically
      setSelectedAreas([])
    }
  }

  // Handle country selection - filter city and area dropdowns
  const handleCountrySelect = (country: { country: string; countryGreek: string | null }) => {
    setManualFilters({ ...manualFilters, country: country.country })
    setCountrySearchQuery(language === 'el' && country.countryGreek ? country.countryGreek : country.country)
    setShowCountryDropdown(false)
    setCountrySuggestions([])
    
    // Clear city if it doesn't match the new country
    if (manualFilters.city) {
      // We'll let the city search filter by country automatically
      // For now, just clear it - user can re-select
      setManualFilters(prev => ({ ...prev, city: '' }))
      setCitySearchQuery('')
    }
    
    // Clear area selection
    setSelectedAreas([])
  }

  // Handle area selection - filter city and country dropdowns
  const handleAreaSelect = (area: { id: number; name: string; nameGreek: string | null; city: string | null; cityGreek: string | null; country: string | null; countryGreek: string | null }) => {
    if (!selectedAreas.includes(area.name)) {
      setSelectedAreas([...selectedAreas, area.name])
    }
    setAreaSearchQuery('')
    setShowAreaDropdown(false)
    setAreaSuggestions([])
    
    // Auto-set city and country if not already set
    if (area.city && !manualFilters.city) {
      setManualFilters(prev => ({ ...prev, city: area.city! }))
      setCitySearchQuery(language === 'el' && area.cityGreek ? area.cityGreek : area.city)
    }
    if (area.country && !manualFilters.country) {
      setManualFilters(prev => ({ ...prev, country: area.country! }))
      setCountrySearchQuery(language === 'el' && area.countryGreek ? area.countryGreek : area.country)
    }
  }

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
          excludeInquired,
          excludeApproved,
        }),
      })
      const data = await response.json()
      const homesResults = data.homes || []
      setHomes(homesResults)
      setIsAISearchActive(true) // Mark AI search as active
      setShowFilters(false) // Hide filters section
      
      // Store results and state in sessionStorage
      sessionStorage.setItem('homesSearchResults', JSON.stringify(homesResults))
      sessionStorage.setItem('homesSearchType', searchType || '')
      sessionStorage.setItem('homesFilterType', 'ai')
      sessionStorage.setItem('homesAiQuery', aiQuery)
      sessionStorage.setItem('homesSearchFilters', JSON.stringify({
        excludeInquired,
        excludeApproved,
      }))
    } catch (error) {
      console.error('Error with AI search:', error)
      // Fallback to showing all homes if AI search fails
      fetchHomes()
    } finally {
      setLoading(false)
    }
  }

  const handleNewAISearch = () => {
    setIsAISearchActive(false) // Reset AI search state
    // Don't clear the query - keep the previous one so user can see/edit it
    // setAiQuery('') // Clear the query
    // Don't clear results - keep them visible
    // setHomes([]) // Clear results
    setShowFilters(true) // Show filters section again
    // State will be saved automatically by useEffect
  }

  const handleManualFilter = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchType) params.append('listingType', searchType)
      const cityForApi = (manualFilters.city || citySearchQuery || '').trim()
      const countryForApi = (manualFilters.country || countrySearchQuery || '').trim()
      if (cityForApi) params.append('city', cityForApi)
      if (countryForApi) params.append('country', countryForApi)
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
      if (excludeInquired) params.append('excludeInquired', 'true')
      if (excludeApproved) params.append('excludeApproved', 'true')

      const response = await fetch(`/api/homes?${params.toString()}`)
      const data = await response.json()
      const homesResults = data.homes || []
      setHomes(homesResults)
      // Collapse filters after search
      setShowFilters(false)
      
      // Store results and state in sessionStorage
      sessionStorage.setItem('homesSearchResults', JSON.stringify(homesResults))
      sessionStorage.setItem('homesSearchType', searchType || '')
      sessionStorage.setItem('homesFilterType', 'manual')
      sessionStorage.setItem('homesSearchFilters', JSON.stringify({
        manualFilters,
        selectedAreas,
        excludeInquired,
        excludeApproved,
      }))
    } catch (error) {
      console.error('Error filtering homes:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#2D3748] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Step 1: Choose Rent or Buy - Only show if no search type selected */}
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
                className="px-6 py-4 bg-[#E8D5B7] text-[#2D3748] rounded-2xl hover:bg-[#D4C19F] shadow-[#E8D5B7]/20 hover:shadow-xl transform hover:-translate-y-1 font-semibold text-lg shadow-lg transition-all"
              >
                🤖 {getTranslation(language, 'aiSearch')}
              </button>
            </div>
          </div>
        )}

        {/* Manual Filter Form */}
        {searchType && filterType === 'manual' && showFilters && (
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
              <div className="relative">
                  <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'city')}</label>
                <input
                  type="text"
                  value={citySearchQuery || (manualFilters.city ? (language === 'el' ? (areas.find(a => a.city === manualFilters.city)?.cityGreek || manualFilters.city) : manualFilters.city) : '')}
                  onChange={(e) => {
                    const query = e.target.value
                    setCitySearchQuery(query)
                    if (query.length > 0) {
                      setShowCityDropdown(true)
                      searchCities(query)
                    } else {
                      setShowCityDropdown(false)
                      setCitySuggestions([])
                      setManualFilters({ ...manualFilters, city: '' })
                    }
                  }}
                  onFocus={() => {
                    if (citySearchQuery.length > 0 || manualFilters.city) {
                      setShowCityDropdown(true)
                      if (citySearchQuery.length > 0) {
                        searchCities(citySearchQuery)
                      }
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowCityDropdown(false), 200)
                  }}
                  className="w-full px-4 py-2 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                    placeholder={getTranslation(language, 'anyCity')}
                />
                {showCityDropdown && citySuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-[#2D3748] border border-[#E8D5B7]/30 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {citySuggestions.map((city, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleCitySelect(city)}
                        className="w-full px-4 py-3 text-left text-[#E8D5B7] hover:bg-[#1A202C] transition-colors border-b border-[#E8D5B7]/10 last:border-b-0"
                      >
                        <div className="font-medium">{language === 'el' && city.cityGreek ? city.cityGreek : city.city}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                  <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'country')}</label>
                <input
                  type="text"
                  value={countrySearchQuery || (manualFilters.country ? (language === 'el' ? (areas.find(a => a.country === manualFilters.country)?.countryGreek || manualFilters.country) : manualFilters.country) : '')}
                  onChange={(e) => {
                    const query = e.target.value
                    setCountrySearchQuery(query)
                    if (query.length > 0) {
                      setShowCountryDropdown(true)
                      searchCountries(query)
                    } else {
                      setShowCountryDropdown(false)
                      setCountrySuggestions([])
                      setManualFilters({ ...manualFilters, country: '' })
                    }
                  }}
                  onFocus={() => {
                    if (countrySearchQuery.length > 0 || manualFilters.country) {
                      setShowCountryDropdown(true)
                      if (countrySearchQuery.length > 0) {
                        searchCountries(countrySearchQuery)
                      }
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowCountryDropdown(false), 200)
                  }}
                  className="w-full px-4 py-2 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                    placeholder={getTranslation(language, 'anyCountry')}
                />
                {showCountryDropdown && countrySuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-[#2D3748] border border-[#E8D5B7]/30 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {countrySuggestions.map((country, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleCountrySelect(country)}
                        className="w-full px-4 py-3 text-left text-[#E8D5B7] hover:bg-[#1A202C] transition-colors border-b border-[#E8D5B7]/10 last:border-b-0"
                      >
                        <div className="font-medium">{language === 'el' && country.countryGreek ? country.countryGreek : country.country}</div>
                      </button>
                    ))}
                  </div>
                )}
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
                          <span className="text-sm font-medium">{getAreaName(area, allAreas, language)}</span>
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
                  {/* Area autocomplete with multi-select */}
                  <div className="relative">
                    <input
                      type="text"
                      value={areaSearchQuery}
                      onChange={(e) => {
                        const query = e.target.value
                        setAreaSearchQuery(query)
                        if (query.length > 0) {
                          setShowAreaDropdown(true)
                          searchAreas(query)
                        } else {
                          setShowAreaDropdown(false)
                          setAreaSuggestions([])
                        }
                      }}
                      onFocus={() => {
                        if (areaSearchQuery.length > 0) {
                          setShowAreaDropdown(true)
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowAreaDropdown(false), 200)
                      }}
                      className="w-full px-4 py-2 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                      placeholder={getTranslation(language, 'selectCityArea')}
                    />
                    {showAreaDropdown && areaSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-2 bg-[#2D3748] border border-[#E8D5B7]/30 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                        {areaSuggestions.map((area) => (
                          <button
                            key={area.id}
                            type="button"
                            onClick={() => handleAreaSelect(area)}
                            className="w-full px-4 py-3 text-left text-[#E8D5B7] hover:bg-[#1A202C] transition-colors border-b border-[#E8D5B7]/10 last:border-b-0"
                          >
                            <div className="font-medium">{language === 'el' && area.nameGreek ? area.nameGreek : area.name}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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

              {/* Row 8: Exclude Filters (checkboxes) */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeInquired}
                    onChange={(e) => setExcludeInquired(e.target.checked)}
                    className="w-5 h-5 rounded border-[#E8D5B7]/30 bg-[#2D3748] text-[#E8D5B7] focus:ring-2 focus:ring-[#E8D5B7] focus:ring-offset-0 focus:ring-offset-[#2D3748] cursor-pointer"
                  />
                  <span className="text-sm font-medium text-[#E8D5B7]">
                    {getTranslation(language, 'excludeInquired') || 'Exclude Inquired Listings'}
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeApproved}
                    onChange={(e) => setExcludeApproved(e.target.checked)}
                    className="w-5 h-5 rounded border-[#E8D5B7]/30 bg-[#2D3748] text-[#E8D5B7] focus:ring-2 focus:ring-[#E8D5B7] focus:ring-offset-0 focus:ring-offset-[#2D3748] cursor-pointer"
                  />
                  <span className="text-sm font-medium text-[#E8D5B7]">
                    {getTranslation(language, 'excludeApproved') || 'Exclude Approved Listings'}
                  </span>
                </label>
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
        {/* AI Search Input - Show when not active OR when "Use AI for another search" is clicked */}
        {searchType && filterType === 'ai' && (showFilters || (!isAISearchActive && homes.length > 0)) && (
          <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[#E8D5B7]/20 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#E8D5B7]">{getTranslation(language, 'tellUsWhatYouNeed')}</h2>
              <button
                onClick={() => {
                  setFilterType(null)
                  setIsAISearchActive(false)
                  setAiQuery('')
                  setHomes([])
                  setShowFilters(true)
                  // Clear sessionStorage when going back to start
                  sessionStorage.removeItem('homesSearchResults')
                  sessionStorage.removeItem('homesSearchFilters')
                  sessionStorage.removeItem('homesSearchType')
                  sessionStorage.removeItem('homesFilterType')
                  sessionStorage.removeItem('homesAiQuery')
                }}
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
              placeholder={
                searchType === 'buy'
                  ? language === 'el'
                    ? 'Παράδειγμα: Ψάχνω διαμέρισμα 2 υπνοδωματίων στην Αθήνα, κοντά σε σχολεία. Ο προϋπολογισμός αγοράς είναι περίπου 150000–180000€...'
                    : 'Example: I want a 2-bedroom apartment in Athens near schools and parks. My purchase budget is around €150,000–180,000...'
                  : language === 'el'
                    ? 'Παράδειγμα: Χρειάζομαι ένα διαμέρισμα 2 υπνοδωματίων στην Αθήνα για την οικογένειά μου. Θέλουμε να είμαστε κοντά σε σχολεία και πάρκα. Ο προϋπολογισμός είναι περίπου 800-1000€ το μήνα...'
                    : 'Example: I need a 2-bedroom apartment in Athens for my family. We want to be close to schools and parks. Budget is around 800-1000€ per month...'
              }
            />
            
            {/* Exclude Filters (checkboxes) */}
            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeInquired}
                  onChange={(e) => setExcludeInquired(e.target.checked)}
                  className="w-5 h-5 rounded border-[#E8D5B7]/30 bg-[#2D3748] text-[#E8D5B7] focus:ring-2 focus:ring-[#E8D5B7] focus:ring-offset-0 focus:ring-offset-[#2D3748] cursor-pointer"
                />
                <span className="text-sm font-medium text-[#E8D5B7]">
                  {getTranslation(language, 'excludeInquired') || 'Exclude Inquired Listings'}
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeApproved}
                  onChange={(e) => setExcludeApproved(e.target.checked)}
                  className="w-5 h-5 rounded border-[#E8D5B7]/30 bg-[#2D3748] text-[#E8D5B7] focus:ring-2 focus:ring-[#E8D5B7] focus:ring-offset-0 focus:ring-offset-[#2D3748] cursor-pointer"
                />
                <span className="text-sm font-medium text-[#E8D5B7]">
                  {getTranslation(language, 'excludeApproved') || 'Exclude Approved Listings'}
                </span>
              </label>
            </div>
            
            <button
              onClick={handleAISearch}
              disabled={loading || !aiQuery.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold disabled:opacity-50"
            >
              {loading ? getTranslation(language, 'searchingWithAi') : getTranslation(language, 'aiSearch')}
            </button>
          </div>
        )}

        {/* Back Button and "Use AI for another search" Button - Show when AI search is active */}
        {searchType && filterType === 'ai' && isAISearchActive && (
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => {
                setFilterType(null)
                setIsAISearchActive(false)
                setAiQuery('')
                setHomes([])
                setShowFilters(true)
              }}
              className="px-6 py-3 bg-[#2D3748] border border-[#E8D5B7]/30 text-[#E8D5B7] rounded-xl hover:bg-[#1A202C] hover:border-[#E8D5B7] transition-all font-semibold"
            >
              ← {getTranslation(language, 'back')}
            </button>
            <button
              onClick={handleNewAISearch}
              className="px-6 py-3 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold"
            >
              {getTranslation(language, 'useAIForAnotherSearch')}
            </button>
          </div>
        )}

        {/* Filters (manual only) + Order: same ordering for manual and AI once there are results */}
        {filterType && (filterType === 'manual' || homes.length > 0) && (
          <div className="flex gap-4 mb-6">
            {filterType === 'manual' && (
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-6 py-3 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold"
              >
                {getTranslation(language, 'filters') || 'Filters'}
              </button>
            </div>
            )}
            <div className="relative order-dropdown-container">
              <button
                onClick={() => setShowOrderDropdown(!showOrderDropdown)}
                className="px-6 py-3 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold"
              >
                {getTranslation(language, 'order') || 'Order'}
              </button>
              {showOrderDropdown && (
                <div className="absolute z-10 mt-2 w-64 bg-[#2D3748] border border-[#E8D5B7]/30 rounded-xl shadow-xl overflow-hidden">
                  <button
                    onClick={() => {
                      setSortOrder('price-asc')
                      setShowOrderDropdown(false)
                    }}
                    className="w-full px-4 py-3 text-left text-[#E8D5B7] hover:bg-[#1A202C] transition-colors border-b border-[#E8D5B7]/10 flex items-center justify-between"
                  >
                    <span>{getTranslation(language, 'priceAscending') || 'Price Ascending'}</span>
                    {sortOrder === 'price-asc' && (
                      <span className="text-[#E8D5B7]">✓</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSortOrder('price-desc')
                      setShowOrderDropdown(false)
                    }}
                    className="w-full px-4 py-3 text-left text-[#E8D5B7] hover:bg-[#1A202C] transition-colors border-b border-[#E8D5B7]/10 flex items-center justify-between"
                  >
                    <span>{getTranslation(language, 'priceDescending') || 'Price Descending'}</span>
                    {sortOrder === 'price-desc' && (
                      <span className="text-[#E8D5B7]">✓</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSortOrder('size-asc')
                      setShowOrderDropdown(false)
                    }}
                    className="w-full px-4 py-3 text-left text-[#E8D5B7] hover:bg-[#1A202C] transition-colors border-b border-[#E8D5B7]/10 flex items-center justify-between"
                  >
                    <span>{getTranslation(language, 'sizeAscending') || 'Size Ascending'}</span>
                    {sortOrder === 'size-asc' && (
                      <span className="text-[#E8D5B7]">✓</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSortOrder('size-desc')
                      setShowOrderDropdown(false)
                    }}
                    className="w-full px-4 py-3 text-left text-[#E8D5B7] hover:bg-[#1A202C] transition-colors border-b border-[#E8D5B7]/10 flex items-center justify-between"
                  >
                    <span>{getTranslation(language, 'sizeDescending') || 'Size Descending'}</span>
                    {sortOrder === 'size-desc' && (
                      <span className="text-[#E8D5B7]">✓</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSortOrder('date-asc')
                      setShowOrderDropdown(false)
                    }}
                    className="w-full px-4 py-3 text-left text-[#E8D5B7] hover:bg-[#1A202C] transition-colors border-b border-[#E8D5B7]/10 flex items-center justify-between"
                  >
                    <span>{getTranslation(language, 'dateAscending') || 'Date of Publish Ascending'}</span>
                    {sortOrder === 'date-asc' && (
                      <span className="text-[#E8D5B7]">✓</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSortOrder('date-desc')
                      setShowOrderDropdown(false)
                    }}
                    className="w-full px-4 py-3 text-left text-[#E8D5B7] hover:bg-[#1A202C] transition-colors flex items-center justify-between"
                  >
                    <span>{getTranslation(language, 'dateDescending') || 'Date of Publish Descending'}</span>
                    {sortOrder === 'date-desc' && (
                      <span className="text-[#E8D5B7]">✓</span>
                    )}
                  </button>
                </div>
              )}
            </div>
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
            {displayRole === 'owner' && (
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
            {[...homes].sort((a, b) => {
              if (!sortOrder) return 0
              if (sortOrder === 'price-asc') {
                return a.pricePerMonth - b.pricePerMonth
              } else if (sortOrder === 'price-desc') {
                return b.pricePerMonth - a.pricePerMonth
              } else if (sortOrder === 'size-asc') {
                const aSize = a.sizeSqMeters || 0
                const bSize = b.sizeSqMeters || 0
                return aSize - bSize
              } else if (sortOrder === 'size-desc') {
                const aSize = a.sizeSqMeters || 0
                const bSize = b.sizeSqMeters || 0
                return bSize - aSize
              } else if (sortOrder === 'date-asc') {
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              } else if (sortOrder === 'date-desc') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              }
              return 0
            }).map((home) => {
              const status = inquiryStatus[home.id]
              const hasInquiry = status === 'inquired'
              const isApproved = status === 'approved'
              const isDismissed = status === 'dismissed'
              
              // Determine banner color and text
              let bannerColor = ''
              let bannerText = ''
              if (hasInquiry) {
                bannerColor = 'bg-orange-600 border-orange-800'
                bannerText = getTranslation(language, 'inquiryMadeBanner')
              } else if (isApproved) {
                bannerColor = 'bg-green-600 border-green-800'
                bannerText = getTranslation(language, 'approvedBanner')
              } else if (isDismissed) {
                bannerColor = 'bg-red-600 border-red-800'
                bannerText = getTranslation(language, 'dismissedBanner')
              }
              
              return (
              <div
                key={home.id}
                  className={`relative bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border transition-all transform hover:-translate-y-1 overflow-hidden ${
                    status 
                      ? 'border-[#E8D5B7]/10 opacity-60' 
                      : 'border-[#E8D5B7]/20 hover:border-[#E8D5B7]/40'
                  }`}
                >
                  {/* AI Match Percentage Badge - Top Right */}
                  {home.matchPercentage !== undefined && (
                    <div className="absolute top-4 right-4 z-20">
                      <div className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg border-2 ${
                        home.matchPercentage >= 80 
                          ? 'bg-green-500/90 text-white border-green-600' 
                          : home.matchPercentage >= 60
                          ? 'bg-yellow-500/90 text-white border-yellow-600'
                          : 'bg-orange-500/90 text-white border-orange-600'
                      }`}>
                        {home.matchPercentage.toFixed(1)}% Match
                      </div>
                    </div>
                  )}
                  
                  {/* Sticker-style Status Banner - Horizontal through center */}
                  {status && (
                    <div className="absolute top-1/2 left-1/2 z-10 transform -translate-x-1/2 -translate-y-1/2 origin-center">
                      <div 
                        className={`relative ${bannerColor} text-white px-6 py-3 shadow-lg border-2 whitespace-nowrap`}
                        style={{
                          clipPath: 'polygon(2% 0%, 98% 0%, 100% 5%, 98% 10%, 100% 15%, 98% 20%, 100% 25%, 98% 30%, 100% 35%, 98% 40%, 100% 45%, 98% 50%, 100% 55%, 98% 60%, 100% 65%, 98% 70%, 100% 75%, 98% 80%, 100% 85%, 98% 90%, 100% 95%, 98% 100%, 2% 100%, 0% 95%, 2% 90%, 0% 85%, 2% 80%, 0% 75%, 2% 70%, 0% 65%, 2% 60%, 0% 55%, 2% 50%, 0% 45%, 2% 40%, 0% 35%, 2% 30%, 0% 25%, 2% 20%, 0% 15%, 2% 10%, 0% 5%)',
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">
                            {hasInquiry ? '🏷️' : isApproved ? '✅' : '❌'}
                          </span>
                          <p className="text-sm font-black uppercase tracking-wide">
                            {bannerText}
                          </p>
                        </div>
                        {/* Sticker shine effect */}
                        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
                      </div>
                    </div>
                  )}
                  
                  {isDismissed ? (
                    <div className="block cursor-not-allowed pointer-events-none">
                      <div className="mb-4">
                        <div className="flex items-start justify-between mb-2">
                          <h2 className={`text-2xl font-bold flex-1 ${
                            status ? 'text-[#E8D5B7]/50' : 'text-[#E8D5B7]'
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
                          status ? 'text-[#E8D5B7]/40' : 'text-[#E8D5B7]/70'
                        }`}>
                          <span>📍</span>
                          {home.area && (
                            <>
                              {getAreaName(home.area, allAreas, language)}, 
                            </>
                          )}
                          {getCityName(home.city, areas, language)}, {getCountryName(home.country, areas, language)}
                        </p>
                      </div>

                      {(home.description || home.descriptionGreek) && (
                        <TranslatedDescription 
                          description={home.description}
                          descriptionGreek={home.descriptionGreek}
                          className={`mb-4 line-clamp-2 ${
                            status ? 'text-[#E8D5B7]/40' : 'text-[#E8D5B7]/80'
                          }`}
                        />
                      )}

                      <div className={`flex items-center justify-between mb-4 pt-4 border-t ${
                        status ? 'border-[#E8D5B7]/10' : 'border-[#E8D5B7]/20'
                      }`}>
                        <div>
                          <p className={`text-3xl font-bold ${
                            status ? 'text-[#E8D5B7]/50' : 'text-[#E8D5B7]'
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
                            status ? 'text-[#E8D5B7]/50' : 'text-[#E8D5B7]'
                          }`}>
                            {home.bedrooms} <span className={`${
                              hasInquiry ? 'text-[#E8D5B7]/40' : 'text-[#E8D5B7]/60'
                            }`}>{getTranslation(language, 'bedroomsShort')}</span>
                          </p>
                          <p className={`text-sm font-semibold ${
                            status ? 'text-[#E8D5B7]/50' : 'text-[#E8D5B7]'
                          }`}>
                            {home.bathrooms} <span className={`${
                              hasInquiry ? 'text-[#E8D5B7]/40' : 'text-[#E8D5B7]/60'
                            }`}>{getTranslation(language, 'bathroomsShort')}</span>
                          </p>
                        </div>
                      </div>

                      <div className={`pt-4 border-t ${
                        status ? 'border-[#E8D5B7]/10' : 'border-[#E8D5B7]/20'
                      }`}>
                        <p className={`text-xs ${
                          hasInquiry ? 'text-[#E8D5B7]/40' : 'text-[#E8D5B7]/60'
                        }`}>
                          {getTranslation(language, 'publishedBy')} <span className={`font-medium ${
                            status ? 'text-[#E8D5B7]/50' : 'text-[#E8D5B7]'
                          }`}>{home.owner.name || home.owner.email}</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={`/homes/${home.key}`}
                      className="block"
                    >
                      <div className="mb-4">
                        <div className="flex items-start justify-between mb-2">
                          <h2 className={`text-2xl font-bold flex-1 ${
                            status ? 'text-[#E8D5B7]/50' : 'text-[#E8D5B7]'
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
                          status ? 'text-[#E8D5B7]/40' : 'text-[#E8D5B7]/70'
                        }`}>
                          <span>📍</span>
                          {home.area && (
                            <>
                              {getAreaName(home.area, allAreas, language)}, 
                            </>
                          )}
                          {getCityName(home.city, areas, language)}, {getCountryName(home.country, areas, language)}
                        </p>
                      </div>

                      {(home.description || home.descriptionGreek) && (
                        <TranslatedDescription 
                          description={home.description}
                          descriptionGreek={home.descriptionGreek}
                          className={`mb-4 line-clamp-2 ${
                            status ? 'text-[#E8D5B7]/40' : 'text-[#E8D5B7]/80'
                          }`}
                        />
                      )}

                      <div className={`flex items-center justify-between mb-4 pt-4 border-t ${
                        status ? 'border-[#E8D5B7]/10' : 'border-[#E8D5B7]/20'
                      }`}>
                        <div>
                          <p className={`text-3xl font-bold ${
                            status ? 'text-[#E8D5B7]/50' : 'text-[#E8D5B7]'
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
                            status ? 'text-[#E8D5B7]/50' : 'text-[#E8D5B7]'
                          }`}>
                            {home.bedrooms} <span className={`${
                              hasInquiry ? 'text-[#E8D5B7]/40' : 'text-[#E8D5B7]/60'
                            }`}>{getTranslation(language, 'bedroomsShort')}</span>
                          </p>
                          <p className={`text-sm font-semibold ${
                            status ? 'text-[#E8D5B7]/50' : 'text-[#E8D5B7]'
                          }`}>
                            {home.bathrooms} <span className={`${
                              hasInquiry ? 'text-[#E8D5B7]/40' : 'text-[#E8D5B7]/60'
                            }`}>{getTranslation(language, 'bathroomsShort')}</span>
                          </p>
                        </div>
                      </div>

                      {/* Energy Class - Only if provided, styled like parking */}
                      {home.energyClass && (
                        <div className={`mb-4 pt-4 border-t ${
                          status ? 'border-[#E8D5B7]/10' : 'border-[#E8D5B7]/20'
                        }`}>
                          <p className={`text-xs ${
                            hasInquiry ? 'text-[#E8D5B7]/40' : 'text-[#E8D5B7]/60'
                          }`}>
                            {getTranslation(language, 'energyClass')}: <span className={`font-medium ${
                              status ? 'text-[#E8D5B7]/50' : 'text-[#E8D5B7]'
                            }`}>{home.energyClass}</span>
                          </p>
                        </div>
                      )}

                      <div className={`pt-4 border-t ${
                        status ? 'border-[#E8D5B7]/10' : 'border-[#E8D5B7]/20'
                      }`}>
                        <p className={`text-xs ${
                          hasInquiry ? 'text-[#E8D5B7]/40' : 'text-[#E8D5B7]/60'
                        }`}>
                          {getTranslation(language, 'publishedBy')} <span className={`font-medium ${
                            status ? 'text-[#E8D5B7]/50' : 'text-[#E8D5B7]'
                          }`}>{home.owner.name || home.owner.email}</span>
                        </p>
                      </div>
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function HomesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#2D3748] flex items-center justify-center px-4">
          <p className="text-[#E8D5B7]">Loading...</p>
        </div>
      }
    >
      <HomesPageInner />
    </Suspense>
  )
}
