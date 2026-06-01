'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { useRole } from '@/app/contexts/RoleContext'
import { getTranslation, translateValue } from '@/lib/translations'
import { greekUppercaseNoAnnotations } from '@/lib/utils'
import { getCityName, getCountryName, getAreaName, getHomeTitle } from '@/lib/area-utils'
import TranslatedDescription from '@/app/components/TranslatedDescription'
import { GraphicSearchBanner } from '@/app/components/visual/PageGraphics'
import AIChatPanel from '@/app/components/AIChatPanel'
import { SaveButton } from '@/app/components/SaveButton'
import { HomeCard } from '@/app/components/HomeCard'

const isGreekInput = (text: string) => /[Ͱ-Ͽἀ-῿]/.test(text)

interface Home {
  id: number
  key: string
  title: string
  titleGreek?: string | null
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
  /** Set when AI detects listing rules vs your query/profile conflict */
  incompatibilityReason?: string
  owner: {
    email: string
    name: string | null
    createdAt?: string
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
  const [compareKeys, setCompareKeys] = useState<string[]>([])
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
    setCitySearchQuery(isGreekInput(citySearchQuery) && city.cityGreek ? city.cityGreek : city.city)
    setShowCityDropdown(false)
    setCitySuggestions([])

    // Auto-set country if not already set
    if (!manualFilters.country) {
      setManualFilters(prev => ({ ...prev, country: city.country }))
      setCountrySearchQuery(isGreekInput(citySearchQuery) && city.countryGreek ? city.countryGreek : city.country)
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
    setCountrySearchQuery(isGreekInput(countrySearchQuery) && country.countryGreek ? country.countryGreek : country.country)
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
      setCitySearchQuery(isGreekInput(areaSearchQuery) && area.cityGreek ? area.cityGreek : area.city)
    }
    if (area.country && !manualFilters.country) {
      setManualFilters(prev => ({ ...prev, country: area.country! }))
      setCountrySearchQuery(isGreekInput(areaSearchQuery) && area.countryGreek ? area.countryGreek : area.country)
    }
  }

  if (checkingRole) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <div className="h-14 w-14 rounded-full border-2 border-[var(--accent)]/25 border-t-[var(--accent)] motion-safe:animate-spin" />
        <p className="animate-fade-in-slow text-lg text-[var(--text)]">{getTranslation(language, 'loading')}</p>
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
      // Record to search history (fire-and-forget, non-blocking)
      if (aiQuery) {
        fetch('/api/homes/search-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: aiQuery, type: searchType }),
        }).catch(() => { /* ignore */ })
      }
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
    <>
    <div className="min-h-screen py-12 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--ink-soft)]/50 shadow-inner motion-safe:animate-fade-in-slow">
          <GraphicSearchBanner className="h-14 w-full sm:h-[4.5rem]" />
        </div>
        {/* Step 1: Choose Rent or Buy - Only show if no search type selected */}
        {!searchType && (
          <div className="mb-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-8 shadow-xl backdrop-blur-sm transition-shadow duration-500 hover:shadow-[var(--accent)]/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[var(--text)] flex-1 text-center">{getTranslation(language, 'whatAreYouLookingFor')}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
              <button
                onClick={() => setSearchType('rent')}
                className="btn-primary px-8 py-4 text-lg"
              >
                🏠 {getTranslation(language, 'rent')}
              </button>
              <button
                onClick={() => setSearchType('buy')}
                className="btn-primary px-8 py-4 text-lg"
              >
                💰 {getTranslation(language, 'buy')}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Choose Filter Type */}
        {searchType && !filterType && (
          <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[var(--border-subtle)] mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[var(--text)]">{getTranslation(language, 'howDoYouWantToSearch')}</h2>
              <button
                onClick={() => {
                  setSearchType(null)
                  setFilterType(null)
                  setHomes([])
                }}
                className="px-3 py-1.5 text-sm text-[var(--text)] hover:text-[var(--accent)] transition-colors"
              >
                ← {getTranslation(language, 'back')}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
              <button
                onClick={() => setFilterType('manual')}
                className="btn-primary px-8 py-4 text-lg"
              >
                🔍 {getTranslation(language, 'manualFilter')}
              </button>
              <button
                onClick={() => setFilterType('ai')}
                className="btn-primary px-8 py-4 text-lg"
              >
                🤖 {getTranslation(language, 'aiSearch')}
              </button>
            </div>
          </div>
        )}

        {/* Manual Filter Form */}
        {searchType && filterType === 'manual' && showFilters && (
          <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[var(--border-subtle)] mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--text)]">{getTranslation(language, 'filterByFeatures')}</h2>
              <button
                onClick={() => setFilterType(null)}
                className="px-3 py-1.5 text-sm text-[var(--text)] hover:text-[var(--accent)] transition-colors"
              >
                ← {getTranslation(language, 'back')}
              </button>
            </div>
            <div className="space-y-4 mb-4">
              {/* Row 1: City, Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'city')}</label>
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
                  className="w-full px-4 py-2 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text)] placeholder:text-[var(--text)]/50"
                    placeholder={getTranslation(language, 'anyCity')}
                />
                {showCityDropdown && citySuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {citySuggestions.map((city, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleCitySelect(city)}
                        className="w-full px-4 py-3 text-left text-[var(--text)] hover:bg-[var(--ink-soft)] transition-colors border-b border-[var(--border-subtle)] last:border-b-0"
                      >
                        <div className="font-medium">{isGreekInput(citySearchQuery) && city.cityGreek ? city.cityGreek : city.city}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'country')}</label>
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
                  className="w-full px-4 py-2 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text)] placeholder:text-[var(--text)]/50"
                    placeholder={getTranslation(language, 'anyCountry')}
                />
                {showCountryDropdown && countrySuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {countrySuggestions.map((country, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleCountrySelect(country)}
                        className="w-full px-4 py-3 text-left text-[var(--text)] hover:bg-[var(--ink-soft)] transition-colors border-b border-[var(--border-subtle)] last:border-b-0"
                      >
                        <div className="font-medium">{isGreekInput(countrySearchQuery) && country.countryGreek ? country.countryGreek : country.country}</div>
                      </button>
                    ))}
                  </div>
                )}
                </div>
              </div>

              {/* Row 2: City Area (alone) */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'cityArea')}</label>
                <div className="space-y-3">
                  {/* Selected areas as chips */}
                  {selectedAreas.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedAreas.map((area) => (
                        <div
                          key={area}
                          className="btn-primary inline-flex items-center gap-2 px-3 py-1.5 text-sm"
                        >
                          <span className="text-sm font-medium">{getAreaName(area, allAreas, language)}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedAreas(selectedAreas.filter(a => a !== area))}
                            className="text-[var(--btn-primary-fg)] hover:text-red-600 transition-colors"
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
                      className="w-full px-4 py-2 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text)] placeholder:text-[var(--text)]/50"
                      placeholder={getTranslation(language, 'selectCityArea')}
                    />
                    {showAreaDropdown && areaSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-xl shadow-xl max-h-60 overflow-y-auto">
                        {areaSuggestions.map((area) => (
                          <button
                            key={area.id}
                            type="button"
                            onClick={() => handleAreaSelect(area)}
                            className="w-full px-4 py-3 text-left text-[var(--text)] hover:bg-[var(--ink-soft)] transition-colors border-b border-[var(--border-subtle)] last:border-b-0"
                          >
                            <div className="font-medium">{isGreekInput(areaSearchQuery) && area.nameGreek ? area.nameGreek : area.name}</div>
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
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'minPrice')}</label>
                  <input
                    type="number"
                    min="0"
                    value={manualFilters.minPrice}
                    onChange={(e) => setManualFilters({ ...manualFilters, minPrice: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text)] placeholder:text-[var(--text)]/50"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'maxPrice')}</label>
                  <input
                    type="number"
                    min="0"
                    value={manualFilters.maxPrice}
                    onChange={(e) => setManualFilters({ ...manualFilters, maxPrice: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text)] placeholder:text-[var(--text)]/50"
                    placeholder={getTranslation(language, 'any')}
                  />
                </div>
              </div>

              {/* Row 4: Min Size, Max Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'minSize')}</label>
                  <input
                    type="number"
                    min="0"
                    value={manualFilters.minSize}
                    onChange={(e) => setManualFilters({ ...manualFilters, minSize: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text)] placeholder:text-[var(--text)]/50"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'maxSize')}</label>
                  <input
                    type="number"
                    min="0"
                    value={manualFilters.maxSize}
                    onChange={(e) => setManualFilters({ ...manualFilters, maxSize: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text)] placeholder:text-[var(--text)]/50"
                    placeholder={getTranslation(language, 'any')}
                  />
                </div>
              </div>

              {/* Row 5: Heating Category, Heating Agent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'heatingCategory')}</label>
                  <select
                    value={manualFilters.heatingCategory}
                    onChange={(e) => setManualFilters({ ...manualFilters, heatingCategory: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text)]"
                  >
                    <option value="">{getTranslation(language, 'any')}</option>
                    <option value="central">{translateValue(language, 'central')}</option>
                    <option value="autonomous">{translateValue(language, 'autonomous')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'heatingAgent')}</label>
                  <select
                    value={manualFilters.heatingAgent}
                    onChange={(e) => setManualFilters({ ...manualFilters, heatingAgent: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text)]"
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
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'minBedrooms')}</label>
                <input
                  type="number"
                  min="0"
                  value={manualFilters.minBedrooms}
                  onChange={(e) => setManualFilters({ ...manualFilters, minBedrooms: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text)] placeholder:text-[var(--text)]/50"
                  placeholder="0"
                />
              </div>
              <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'maxBedrooms')}</label>
                <input
                  type="number"
                  min="0"
                  value={manualFilters.maxBedrooms}
                  onChange={(e) => setManualFilters({ ...manualFilters, maxBedrooms: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text)] placeholder:text-[var(--text)]/50"
                    placeholder={getTranslation(language, 'any')}
                />
              </div>
              </div>

              {/* Row 7: Year Built (alone) */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'yearBuilt')}</label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={manualFilters.yearBuilt}
                  onChange={(e) => setManualFilters({ ...manualFilters, yearBuilt: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text)] placeholder:text-[var(--text)]/50"
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
                    className="w-5 h-5 rounded border-[var(--border-subtle)] bg-[var(--ink-soft)] text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0 focus:ring-offset-[var(--ink-soft)] cursor-pointer"
                  />
                  <span className="text-sm font-medium text-[var(--text)]">
                    {getTranslation(language, 'excludeInquired') || 'Exclude Inquired Listings'}
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeApproved}
                    onChange={(e) => setExcludeApproved(e.target.checked)}
                    className="w-5 h-5 rounded border-[var(--border-subtle)] bg-[var(--ink-soft)] text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0 focus:ring-offset-[var(--ink-soft)] cursor-pointer"
                  />
                  <span className="text-sm font-medium text-[var(--text)]">
                    {getTranslation(language, 'excludeApproved') || 'Exclude Approved Listings'}
                  </span>
                </label>
              </div>
            </div>
            <button
              onClick={handleManualFilter}
              disabled={loading}
              className="btn-primary w-full px-6 py-3 sm:w-auto disabled:opacity-50"
            >
              {loading ? getTranslation(language, 'searching') : getTranslation(language, 'applyFilters')}
            </button>
          </div>
        )}

        {/* AI Chat Search */}
        {searchType && filterType === 'ai' && (
          <AIChatPanel
            searchType={searchType}
            excludeInquired={excludeInquired}
            excludeApproved={excludeApproved}
            language={language}
            onResultsFound={(results) => {
              setHomes(results)
              setIsAISearchActive(true)
              setShowFilters(false)
              sessionStorage.setItem('homesSearchResults', JSON.stringify(results))
              sessionStorage.setItem('homesSearchType', searchType)
              sessionStorage.setItem('homesFilterType', 'ai')
            }}
            onBack={() => {
              setFilterType(null)
              setIsAISearchActive(false)
              setAiQuery('')
              setHomes([])
              setShowFilters(true)
              sessionStorage.removeItem('homesSearchResults')
              sessionStorage.removeItem('homesSearchFilters')
              sessionStorage.removeItem('homesSearchType')
              sessionStorage.removeItem('homesFilterType')
              sessionStorage.removeItem('homesAiQuery')
            }}
          />
        )}

        {/* Filters (manual only) + Order: same ordering for manual and AI once there are results */}
        {filterType && (filterType === 'manual' || homes.length > 0) && (
          <div className="flex gap-4 mb-6">
            {filterType === 'manual' && (
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-primary px-6 py-3"
              >
                {getTranslation(language, 'filters') || 'Filters'}
              </button>
            </div>
            )}
            <div className="relative order-dropdown-container">
              <button
                onClick={() => setShowOrderDropdown(!showOrderDropdown)}
                className="btn-primary px-6 py-3"
              >
                {getTranslation(language, 'order') || 'Order'}
              </button>
              {showOrderDropdown && (
                <div className="absolute z-10 mt-2 w-64 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden">
                  <button
                    onClick={() => {
                      setSortOrder('price-asc')
                      setShowOrderDropdown(false)
                    }}
                    className="w-full px-4 py-3 text-left text-[var(--text)] hover:bg-[var(--ink-soft)] transition-colors border-b border-[var(--border-subtle)] flex items-center justify-between"
                  >
                    <span>{getTranslation(language, 'priceAscending') || 'Price Ascending'}</span>
                    {sortOrder === 'price-asc' && (
                      <span className="text-[var(--text)]">✓</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSortOrder('price-desc')
                      setShowOrderDropdown(false)
                    }}
                    className="w-full px-4 py-3 text-left text-[var(--text)] hover:bg-[var(--ink-soft)] transition-colors border-b border-[var(--border-subtle)] flex items-center justify-between"
                  >
                    <span>{getTranslation(language, 'priceDescending') || 'Price Descending'}</span>
                    {sortOrder === 'price-desc' && (
                      <span className="text-[var(--text)]">✓</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSortOrder('size-asc')
                      setShowOrderDropdown(false)
                    }}
                    className="w-full px-4 py-3 text-left text-[var(--text)] hover:bg-[var(--ink-soft)] transition-colors border-b border-[var(--border-subtle)] flex items-center justify-between"
                  >
                    <span>{getTranslation(language, 'sizeAscending') || 'Size Ascending'}</span>
                    {sortOrder === 'size-asc' && (
                      <span className="text-[var(--text)]">✓</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSortOrder('size-desc')
                      setShowOrderDropdown(false)
                    }}
                    className="w-full px-4 py-3 text-left text-[var(--text)] hover:bg-[var(--ink-soft)] transition-colors border-b border-[var(--border-subtle)] flex items-center justify-between"
                  >
                    <span>{getTranslation(language, 'sizeDescending') || 'Size Descending'}</span>
                    {sortOrder === 'size-desc' && (
                      <span className="text-[var(--text)]">✓</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSortOrder('date-asc')
                      setShowOrderDropdown(false)
                    }}
                    className="w-full px-4 py-3 text-left text-[var(--text)] hover:bg-[var(--ink-soft)] transition-colors border-b border-[var(--border-subtle)] flex items-center justify-between"
                  >
                    <span>{getTranslation(language, 'dateAscending') || 'Date of Publish Ascending'}</span>
                    {sortOrder === 'date-asc' && (
                      <span className="text-[var(--text)]">✓</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSortOrder('date-desc')
                      setShowOrderDropdown(false)
                    }}
                    className="w-full px-4 py-3 text-left text-[var(--text)] hover:bg-[var(--ink-soft)] transition-colors flex items-center justify-between"
                  >
                    <span>{getTranslation(language, 'dateDescending') || 'Date of Publish Descending'}</span>
                    {sortOrder === 'date-desc' && (
                      <span className="text-[var(--text)]">✓</span>
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
              <h1 className="text-4xl font-bold text-[var(--text)]">
                {getTranslation(language, 'availableProperties')} {searchType === 'rent' ? `(${getTranslation(language, 'rent')})` : `(${getTranslation(language, 'buy')})`}
              </h1>
              <p className="text-[var(--text-muted)] mt-2">
                {homes.length} {homes.length === 1 ? getTranslation(language, 'listing') : getTranslation(language, 'listings')} {getTranslation(language, 'found')}
              </p>
            </div>
            {displayRole === 'owner' && (
              <Link
                href="/homes/new"
                className="btn-primary inline-flex items-center px-5 py-2 text-sm"
              >
                + {getTranslation(language, 'newListing')}
              </Link>
            )}
          </div>
        )}

        {/* Homes Grid */}
        {loading && filterType ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[var(--surface)] rounded-3xl overflow-hidden border border-[var(--border-subtle)] animate-pulse">
                <div className="h-48 bg-[var(--ink-soft)]" />
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-[var(--ink-soft)] rounded-xl w-3/4" />
                  <div className="h-4 bg-[var(--ink-soft)] rounded-xl w-1/2" />
                  <div className="h-4 bg-[var(--ink-soft)] rounded-xl w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : homes.length === 0 && filterType ? (
          <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-12 text-center shadow-xl border border-[var(--border-subtle)]">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-xl font-semibold text-[var(--text)] mb-2">
              {filterType === 'manual' ? getTranslation(language, 'noPropertiesFound') : getTranslation(language, 'noPropertiesFoundAi')}
            </p>
            <p className="text-[var(--text-muted)] mb-6 max-w-sm mx-auto">
              {filterType === 'manual'
                ? language === 'el' ? 'Δοκιμάστε να διευρύνετε την αναζήτηση, να αλλάξετε πόλη ή να καταργήσετε κάποια φίλτρα.' : 'Try broadening your search, changing the city, or removing some filters.'
                : language === 'el' ? 'Δοκιμάστε να περιγράψετε αυτό που ψάχνετε με διαφορετικό τρόπο.' : 'Try describing what you\'re looking for differently.'}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {excludeInquired && (
                <button
                  onClick={() => { setExcludeInquired(false) }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--border-subtle)] text-[var(--text)] hover:bg-[var(--ink-soft)] transition-all"
                >
                  {language === 'el' ? '✕ Εμφάνιση αιτήσεων μου' : '✕ Show my inquiries'}
                </button>
              )}
              <button
                onClick={() => { setSearchType(null); setFilterType(null); setHomes([]) }}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-hover-bg)] transition-all"
              >
                {language === 'el' ? 'Νέα αναζήτηση' : 'Start new search'}
              </button>
            </div>
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
            }).map((home) => (
              <HomeCard
                key={home.id}
                home={home}
                status={inquiryStatus[home.id]}
                language={language}
                allAreas={allAreas}
                areas={areas}
                compareKeys={compareKeys}
                onCompareToggle={key => setCompareKeys(prev =>
                  prev.includes(key)
                    ? prev.filter(k => k !== key)
                    : prev.length < 3 ? [...prev, key] : prev
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>

    {/* Compare bar — appears when 2+ homes are selected */}

    {compareKeys.length >= 2 && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[var(--z-fixed)] flex items-center gap-3 rounded-2xl border border-[var(--accent)]/40 bg-[var(--ink-soft)] px-5 py-3 shadow-2xl backdrop-blur-xl">
        <span className="text-sm font-semibold text-[var(--text)]">
          ⚖ {compareKeys.length} {language === 'el' ? 'επιλεγμένα' : 'selected'}
        </span>
        <button
          onClick={() => router.push(`/homes/compare?keys=${compareKeys.join(',')}`)}
          className="btn-primary rounded-xl px-4 py-2 text-sm"
        >
          {language === 'el' ? 'Σύγκριση' : 'Compare'}
        </button>
        <button
          onClick={() => setCompareKeys([])}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          {language === 'el' ? 'Ακύρωση' : 'Clear'}
        </button>
      </div>
    )}
    </>
  )
}

export default function HomesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center px-4">
          <p className="text-[var(--text)]">Loading...</p>
        </div>
      }
    >
      <HomesPageInner />
    </Suspense>
  )
}
