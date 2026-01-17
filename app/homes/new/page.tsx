'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation, translateValue } from '@/lib/translations'
import { findMostSimilarArea } from '@/lib/area-utils'
import * as XLSX from 'xlsx'

export default function NewHomePage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    street: '',
    city: '',
    country: '',
    area: '',
    listingType: 'rent',
    pricePerMonth: '',
    bedrooms: '1',
    bathrooms: '1',
    floor: '',
    heatingCategory: '',
    heatingAgent: '',
    parking: '',
    sizeSqMeters: '',
    yearBuilt: '',
    yearRenovated: '',
    availableFrom: '',
    energyClass: '',
  })
  const [photos, setPhotos] = useState<string[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingRole, setCheckingRole] = useState(true)
  const [areaSuggestions, setAreaSuggestions] = useState<Array<{ id: number; key: string; name: string; nameGreek: string | null; city: string | null; country: string | null }>>([])
  const [showAreaDropdown, setShowAreaDropdown] = useState(false)
  const [areaSearchQuery, setAreaSearchQuery] = useState('')
  const [allAreas, setAllAreas] = useState<Array<{ id: number; name: string; nameGreek: string | null }>>([])
  const [searchingAreas, setSearchingAreas] = useState(false)
  const [areaSelectedFromDropdown, setAreaSelectedFromDropdown] = useState(false)
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false)
  const [bulkUploadError, setBulkUploadError] = useState('')
  const [bulkUploadSuccess, setBulkUploadSuccess] = useState('')
  const [parsedHouses, setParsedHouses] = useState<Array<{ title: string; city: string; country: string; rowIndex: number }>>([])
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [housePhotos, setHousePhotos] = useState<{ [key: number]: File[] }>({})
  const [excelInputKey, setExcelInputKey] = useState(0)
  const [subscription, setSubscription] = useState<number | null>(null)
  const [homeCount, setHomeCount] = useState<number>(0)
  const [useAIDescription, setUseAIDescription] = useState(false)
  const [useAIDescriptionBulk, setUseAIDescriptionBulk] = useState(false)

  // Check user role and subscription on mount
  useEffect(() => {
    fetch('/api/profile')
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push('/login')
          return
        }
        const userRole = data.user.role || 'user'
        if (userRole !== 'owner' && userRole !== 'both' && userRole !== 'broker') {
          router.push('/profile')
          return
        }
        setSubscription(data.user.subscription || 1)
        
        // Fetch home count
        fetch('/api/homes/my-listings')
          .then((res) => res.json())
          .then((homesData) => {
            if (homesData.homes) {
              setHomeCount(homesData.homes.length)
            }
          })
          .catch((err) => console.error('Error fetching home count:', err))
        
        setCheckingRole(false)
      })
      .catch(() => {
        router.push('/login')
      })
  }, [router])

  // Fetch all areas on mount for similarity matching
  useEffect(() => {
    fetch('/api/areas')
      .then((res) => res.json())
      .then((data) => {
        setAllAreas(data.areas || [])
      })
      .catch((error) => {
        console.error('Error fetching all areas:', error)
      })
  }, [])

  // Search areas function
  const searchAreas = async (query: string) => {
    if (query.length < 1) {
      setAreaSuggestions([])
      setShowAreaDropdown(false)
      setSearchingAreas(false)
      return
    }

    setSearchingAreas(true)
    try {
      // Build query params with city and country filters if provided
      const params = new URLSearchParams({
        q: query,
        limit: '10',
      })
      
      if (formData.city && formData.city.trim().length > 0) {
        params.append('city', formData.city.trim())
      }
      
      if (formData.country && formData.country.trim().length > 0) {
        params.append('country', formData.country.trim())
      }

      const url = `/api/areas/search?${params.toString()}`
      
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        const areas = data.areas || []
        setAreaSuggestions(areas)
        // Update dropdown visibility based on results
        // Only show if there are actual suggestions
        const shouldShow = areas.length > 0
        setShowAreaDropdown(shouldShow)
      } else {
        // If API call fails, hide dropdown and clear suggestions
        setAreaSuggestions([])
        setShowAreaDropdown(false)
      }
    } catch (error) {
      console.error('Error searching areas:', error)
      setAreaSuggestions([])
      setShowAreaDropdown(false)
    } finally {
      setSearchingAreas(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Check total photo limit (20 photos max)
    const totalPhotos = photos.length + files.length
    if (totalPhotos > 20) {
      setError(language === 'el' 
        ? `Επιτρέπονται μέχρι 20 φωτογραφίες. Έχετε ήδη ${photos.length} φωτογραφίες. Παρακαλώ επιλέξτε ${20 - photos.length} ή λιγότερες.`
        : `Maximum 20 photos allowed. You already have ${photos.length} photos. Please select ${20 - photos.length} or fewer.`)
      e.target.value = '' // Reset input
      return
    }

    // Validate file sizes before uploading (max 5MB per file)
    const maxSize = 5 * 1024 * 1024 // 5MB
    const oversizedFiles: string[] = []
    Array.from(files).forEach((file) => {
      if (file.size > maxSize) {
        oversizedFiles.push(file.name)
      }
    })

    if (oversizedFiles.length > 0) {
      setError(language === 'el'
        ? `Το αρχείο/τα αρχεία είναι πολύ μεγάλα (μέγιστο 5MB το καθένα): ${oversizedFiles.join(', ')}`
        : `File(s) too large (max 5MB each): ${oversizedFiles.join(', ')}`)
      e.target.value = '' // Reset input
      return
    }

    setUploadingPhotos(true)
    setError('')

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/homes/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Upload failed')
        }

        const data = await response.json()
        return data.url
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      setPhotos([...photos, ...uploadedUrls])
      e.target.value = '' // Reset input after successful upload
    } catch (err) {
      setError(err instanceof Error ? err.message : (language === 'el' ? 'Αποτυχία ανέβασματος φωτογραφίας' : 'Photo upload failed'))
    } finally {
      setUploadingPhotos(false)
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-[#2D3748] flex items-center justify-center">
        <p className="text-[#E8D5B7]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Check home count limits based on subscription
    if (subscription === 1 && homeCount >= 2) {
      setError(getTranslation(language, 'freePlanLimitReached') || 'Free plan allows up to 2 homes. Please upgrade to Plus or Unlimited.')
      setLoading(false)
      return
    }
    if (subscription === 2 && homeCount >= 10) {
      setError(getTranslation(language, 'plusPlanLimitReached') || 'Plus plan allows up to 10 homes. Please upgrade to Unlimited.')
      setLoading(false)
      return
    }

    // If AI description is requested, clear the description field
    const descriptionToSend = useAIDescription ? '' : formData.description

    // Always ensure we have a valid area name from the database
    let finalArea: string | null = null
    
    // First, check if formData.area is already a valid area name from the database
    // This should be the case if user clicked on a suggestion from the dropdown
    if (formData.area && formData.area.trim().length > 0) {
      const isValidArea = allAreas.some(a => a.name === formData.area.trim())
      if (isValidArea) {
        // formData.area is already a valid area name, use it directly (user selected from dropdown)
        finalArea = formData.area.trim()
      } else {
        // formData.area exists but is not a valid area name, try to find closest match
        // But only if user didn't explicitly select from dropdown (shouldn't happen, but safety check)
        const mostSimilar = findMostSimilarArea(formData.area, allAreas)
        if (mostSimilar) {
          finalArea = mostSimilar.name
        }
      }
    }
    
    // If we still don't have a valid area, try matching from areaSearchQuery
    // This is a fallback for when user typed but didn't select
    if (!finalArea && areaSearchQuery && areaSearchQuery.trim().length > 0) {
      // First try exact match by display name (Greek or English)
      const matchedArea = allAreas.find(a => 
        a.name === areaSearchQuery.trim() || 
        (a.nameGreek && a.nameGreek === areaSearchQuery.trim())
      )
      if (matchedArea) {
        finalArea = matchedArea.name
      } else {
        // Last resort: try similarity matching
        const mostSimilar = findMostSimilarArea(areaSearchQuery, allAreas)
        if (mostSimilar) {
          finalArea = mostSimilar.name
        }
      }
    }
    
    // Only use what they typed if no match was found and we have something
    // But prefer to leave it null if no valid match
    if (!finalArea && areaSearchQuery && areaSearchQuery.trim().length > 0) {
      // Last resort: use what they typed (but this shouldn't happen if they clicked a suggestion)
      finalArea = areaSearchQuery.trim()
    }

    try {
      const response = await fetch('/api/homes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          description: descriptionToSend,
          area: finalArea || null,
          heatingCategory: formData.heatingCategory || null,
          heatingAgent: formData.heatingAgent || null,
          parking: formData.parking === 'yes' ? true : formData.parking === 'no' ? false : null,
          energyClass: formData.energyClass || null,
          photos: photos.length > 0 ? JSON.stringify(photos) : null,
          useAIDescription: useAIDescription,
        }),
      })

      let data: any = {}
      const contentType = response.headers.get('content-type')
      const hasJsonContent = contentType && contentType.includes('application/json')
      
      try {
        const text = await response.text()
        
        if (hasJsonContent) {
          if (text && text.trim().length > 0) {
            try {
              data = JSON.parse(text)
            } catch (parseError) {
              console.error('Failed to parse JSON response:', parseError)
              console.error('Response text:', text)
              setError(getTranslation(language, 'createListingFailed'))
              return
            }
          } else {
            console.warn('Empty JSON response body')
            data = {}
          }
        } else {
          // Not JSON, log the text
          console.error('Non-JSON response:', text)
          setError(text || getTranslation(language, 'createListingFailed'))
          return
        }
      } catch (readError) {
        console.error('Could not read response:', readError)
        setError(getTranslation(language, 'createListingFailed'))
        return
      }

      if (!response.ok) {
        // Show detailed error message if available
        const errorMsg = data.details 
          ? `${data.error || getTranslation(language, 'createListingFailed')}: ${data.details}`
          : data.error || getTranslation(language, 'createListingFailed')
        setError(errorMsg)
        console.error('Create listing error:', { 
          status: response.status, 
          statusText: response.statusText,
          data,
          contentType: response.headers.get('content-type'),
          body: JSON.stringify(data)
        })
        return
      }

      // Redirect to the newly created home's detail page
      router.push(`/homes/${data.home.key}?from=my-listings`)
    } catch (err) {
      console.error('Error creating listing:', err)
      setError(err instanceof Error ? err.message : getTranslation(language, 'somethingWentWrong'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#2D3748] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[#E8D5B7]/20">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-[#E8D5B7]">
                {getTranslation(language, 'createListing')}
              </h1>
              {subscription !== null && subscription !== 1 && (
                <button
                  type="button"
                  onClick={() => setShowBulkUploadModal(true)}
                  className="px-4 py-2 bg-[#2D3748] text-[#E8D5B7] border border-[#E8D5B7]/30 rounded-xl hover:bg-[#1a1f2e] hover:border-[#E8D5B7]/50 transition-all text-sm font-semibold"
                >
                  {language === 'el' ? '📄 Δημοσίευση από Αρχείο' : '📄 Publish by File'}
                </button>
              )}
            </div>
            <p className="text-[#E8D5B7]/70">
              {getTranslation(language, 'listingDetails')}
            </p>
          </div>

          {error && (
            <div className="bg-red-50/80 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'title')}</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                placeholder={getTranslation(language, 'placeholderTitle')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'description')}</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={useAIDescription}
                className={`w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all resize-none text-[#E8D5B7] placeholder:text-[#E8D5B7]/50 ${useAIDescription ? 'opacity-50 cursor-not-allowed' : ''}`}
                rows={4}
                placeholder={useAIDescription ? (getTranslation(language, 'aiDescriptionWillGenerate') || 'AI will generate description') : getTranslation(language, 'placeholderDescription')}
              />
              {subscription !== null && subscription !== 1 && (
                <label className="flex items-center gap-3 mt-4 p-3 bg-[#2D3748]/50 rounded-xl border border-[#E8D5B7]/20 hover:border-[#E8D5B7]/40 transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAIDescription}
                    onChange={(e) => setUseAIDescription(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-[#E8D5B7]/50 bg-[#2D3748] text-[#E8D5B7] focus:ring-2 focus:ring-[#E8D5B7] cursor-pointer accent-[#E8D5B7]"
                  />
                  <span className="text-base font-medium text-[#E8D5B7]">
                    {getTranslation(language, 'useAIDescription') || 'Use AI to generate description'}
                  </span>
                </label>
              )}
            </div>

            {/* Photo Upload Section */}
            <div>
              <label className="block text-sm font-medium text-[#E8D5B7] mb-2">
                {getTranslation(language, 'uploadPhotos')} <span className="text-[#E8D5B7]/50">({getTranslation(language, 'optional')})</span>
              </label>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="px-6 py-3 bg-[#E8D5B7] text-[#2D3748] rounded-2xl hover:bg-[#D4C19F] transition-all font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    {uploadingPhotos ? getTranslation(language, 'loading') : getTranslation(language, 'upload')}
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhotos}
                      className="hidden"
                    />
                  </label>
                  {uploadingPhotos && (
                    <span className="text-[#E8D5B7]/70 text-sm">{getTranslation(language, 'loading')}</span>
                  )}
                </div>
                
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-xl border border-[#E8D5B7]/30"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'listingType')}</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, listingType: 'rent' })}
                  className={`px-6 py-4 rounded-2xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                    formData.listingType === 'rent'
                      ? 'bg-[#E8D5B7] text-[#2D3748] shadow-lg'
                      : 'bg-[#2D3748] text-[#E8D5B7] border border-[#E8D5B7]/30 hover:border-[#E8D5B7]'
                  }`}
                >
                  🏠 {getTranslation(language, 'rent')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, listingType: 'sell' })}
                  className={`px-6 py-4 rounded-2xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                    formData.listingType === 'sell'
                      ? 'bg-[#E8D5B7] text-[#2D3748] shadow-lg'
                      : 'bg-[#2D3748] text-[#E8D5B7] border border-[#E8D5B7]/30 hover:border-[#E8D5B7]'
                  }`}
                >
                  💰 {getTranslation(language, 'sell')}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'street')}</label>
              <input
                type="text"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder={getTranslation(language, 'placeholderStreet')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'city')}</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder={getTranslation(language, 'placeholderCity')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'country')}</label>
                <input
                  type="text"
                  required
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder={getTranslation(language, 'placeholderCountry')}
                />
              </div>
            </div>

            {/* Area Autocomplete */}
            <div className="relative">
              <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'cityArea')} <span className="text-[#E8D5B7]/50">({getTranslation(language, 'optional')})</span></label>
              <div className="relative">
                <input
                  type="text"
                  value={areaSearchQuery}
                  onChange={(e) => {
                    const query = e.target.value
                    setAreaSearchQuery(query)
                    // Don't update formData.area immediately - wait for selection or auto-match
                    if (query.length > 0) {
                      // Show dropdown immediately while searching (optimistic UI)
                      // searchAreas will update it based on actual results
                      setShowAreaDropdown(true)
                      searchAreas(query)
                    } else {
                      setShowAreaDropdown(false)
                      setAreaSuggestions([])
                      setFormData({ ...formData, area: '' })
                      setAreaSelectedFromDropdown(false) // Reset flag when clearing
                    }
                  }}
                  onFocus={() => {
                    if (areaSearchQuery.length > 0) {
                      // If there are already suggestions, show dropdown
                      // Otherwise trigger a new search
                      if (areaSuggestions.length > 0) {
                        setShowAreaDropdown(true)
                      } else {
                        searchAreas(areaSearchQuery)
                      }
                    }
                  }}
                  onBlur={() => {
                    // Delay to allow click on dropdown items
                    setTimeout(() => {
                      setShowAreaDropdown(false)
                      // If user explicitly selected from dropdown, don't override their choice
                      if (areaSelectedFromDropdown) {
                        setAreaSelectedFromDropdown(false) // Reset flag
                        return
                      }
                      // If user typed but didn't select, try to find most similar
                      if (areaSearchQuery && areaSearchQuery.trim().length > 0) {
                        // Check if the current formData.area matches what's displayed
                        const currentAreaName = formData.area ? 
                          (allAreas.find(a => a.name === formData.area)?.name || formData.area) : null
                        const currentDisplayName = currentAreaName ? 
                          (language === 'el' && allAreas.find(a => a.name === currentAreaName)?.nameGreek 
                            ? allAreas.find(a => a.name === currentAreaName)!.nameGreek 
                            : currentAreaName) : null
                        
                        // Only run similarity matching if the query is different from what's stored
                        if (areaSearchQuery !== currentDisplayName) {
                          const mostSimilar = findMostSimilarArea(areaSearchQuery, allAreas)
                          if (mostSimilar) {
                            setFormData({ ...formData, area: mostSimilar.name })
                            const displayName = language === 'el' && mostSimilar.nameGreek ? mostSimilar.nameGreek : mostSimilar.name
                            setAreaSearchQuery(displayName)
                          } else {
                            // No match found, use what they typed
                            setFormData({ ...formData, area: areaSearchQuery })
                          }
                        }
                      }
                    }, 200)
                  }}
                  className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder={getTranslation(language, 'selectCityArea')}
                />
                {showAreaDropdown && areaSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-[#2D3748] border border-[#E8D5B7]/30 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                    {areaSuggestions.map((area) => (
                      <button
                        key={area.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          // Store English name in formData, but display translated name
                          const displayName = language === 'el' && area.nameGreek ? area.nameGreek : area.name
                          setFormData(prev => ({ ...prev, area: area.name }))
                          setAreaSearchQuery(displayName)
                          setShowAreaDropdown(false)
                          setAreaSelectedFromDropdown(true) // Mark that user explicitly selected from dropdown
                          // Ensure the area is set correctly
                          setTimeout(() => {
                            setFormData(prev => {
                              if (prev.area !== area.name) {
                                return { ...prev, area: area.name }
                              }
                              return prev
                            })
                          }, 0)
                        }}
                        className="w-full px-4 py-3 text-left text-[#E8D5B7] hover:bg-[#1A202C] transition-colors border-b border-[#E8D5B7]/10 last:border-b-0"
                      >
                        <div className="font-medium">{language === 'el' && area.nameGreek ? area.nameGreek : area.name}</div>
                        {(area.city || area.country) && (
                          <div className="text-sm text-[#E8D5B7]/60">
                            {[area.city, area.country].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Price and Size Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'price')}</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.pricePerMonth}
                  onChange={(e) => setFormData({ ...formData, pricePerMonth: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder="900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'sizeSqMeters')}</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.sizeSqMeters}
                  onChange={(e) => setFormData({ ...formData, sizeSqMeters: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder={getTranslation(language, 'placeholderSize')}
                />
              </div>
            </div>

            {/* Heating Category and Agent Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'heatingCategory')} <span className="text-[#E8D5B7]/50">({getTranslation(language, 'optional')})</span></label>
                <select
                  value={formData.heatingCategory}
                  onChange={(e) => setFormData({ ...formData, heatingCategory: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7]"
                >
                  <option value="">{getTranslation(language, 'any')}</option>
                  <option value="central">{translateValue(language, 'central')}</option>
                  <option value="autonomous">{translateValue(language, 'autonomous')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'heatingAgent')} <span className="text-[#E8D5B7]/50">({getTranslation(language, 'optional')})</span></label>
                <select
                  value={formData.heatingAgent}
                  onChange={(e) => setFormData({ ...formData, heatingAgent: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7]"
                >
                  <option value="">{getTranslation(language, 'any')}</option>
                  <option value="oil">{translateValue(language, 'oil')}</option>
                  <option value="natural gas">{translateValue(language, 'natural gas')}</option>
                  <option value="electricity">{translateValue(language, 'electricity')}</option>
                  <option value="other">{translateValue(language, 'other')}</option>
                </select>
              </div>
            </div>

            {/* Energy Class */}
            <div>
              <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'energyClass')} <span className="text-[#E8D5B7]/50">({getTranslation(language, 'optional')})</span></label>
              <select
                value={formData.energyClass}
                onChange={(e) => setFormData({ ...formData, energyClass: e.target.value })}
                className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7]"
              >
                <option value="">{getTranslation(language, 'any')}</option>
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="F">F</option>
                <option value="G">G</option>
              </select>
            </div>

            {/* Floor, Bedrooms, Bathrooms Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'floor')} <span className="text-[#E8D5B7]/50">({getTranslation(language, 'optional')})</span></label>
                <input
                  type="number"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder={getTranslation(language, 'placeholderBedrooms')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'bedrooms')}</label>
                <input
                  type="number"
                  min="0"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'bathrooms')}</label>
                <input
                  type="number"
                  min="0"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                />
              </div>
            </div>

            {/* Parking */}
            <div>
              <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'parking')} <span className="text-[#E8D5B7]/50">({getTranslation(language, 'optional')})</span></label>
              <select
                value={formData.parking}
                onChange={(e) => setFormData({ ...formData, parking: e.target.value })}
                className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7]"
              >
                <option value="">{getTranslation(language, 'any')}</option>
                <option value="yes">{getTranslation(language, 'yes')}</option>
                <option value="no">{getTranslation(language, 'no')}</option>
              </select>
            </div>

            {/* Year Built and Year Renovated Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'yearBuilt')} <span className="text-[#E8D5B7]/50">({getTranslation(language, 'optional')})</span></label>
                <input
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={formData.yearBuilt}
                  onChange={(e) => setFormData({ ...formData, yearBuilt: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder={getTranslation(language, 'placeholderYearBuilt')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'yearRenovated')} <span className="text-[#E8D5B7]/50">({getTranslation(language, 'optional')})</span></label>
                <input
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={formData.yearRenovated}
                  onChange={(e) => setFormData({ ...formData, yearRenovated: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] placeholder:text-[#E8D5B7]/50"
                  placeholder={getTranslation(language, 'placeholderYearRenovated')}
                />
              </div>
            </div>

            {/* Available From */}
            <div>
              <label className="block text-sm font-medium text-[#E8D5B7] mb-2">{getTranslation(language, 'availableFrom')}</label>
              <input
                type="date"
                value={formData.availableFrom}
                onChange={(e) => setFormData({ ...formData, availableFrom: e.target.value })}
                className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7]"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#E8D5B7] text-[#2D3748] rounded-2xl hover:bg-[#D4C19F] transition-all font-semibold text-base shadow-lg shadow-[#E8D5B7]/20 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
              >
                {loading ? getTranslation(language, 'loading') : getTranslation(language, 'createListing')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A202C] border-4 border-[#E8D5B7]/30 rounded-3xl p-8 max-w-4xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#E8D5B7]">
                {language === 'el' ? 'Δημοσίευση από Αρχείο Excel' : 'Publish from Excel File'}
              </h2>
              <button
                onClick={() => {
                  setShowBulkUploadModal(false)
                  setBulkUploadError('')
                  setBulkUploadSuccess('')
                  setParsedHouses([])
                  setExcelFile(null)
                  setHousePhotos({})
                  setExcelInputKey(prev => prev + 1)
                }}
                className="text-[#E8D5B7]/70 hover:text-[#E8D5B7] text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-[#E8D5B7]/70 mb-4">
                  {language === 'el' 
                    ? 'Κατεβάστε το πρότυπο Excel, συμπληρώστε τα στοιχεία των ακινήτων και ανεβάστε το αρχείο. Στη συνέχεια, ανεβάστε φωτογραφίες για κάθε ακίνητο.'
                    : 'Download the Excel template, fill in the property details, and upload the file. Then upload photos for each property.'}
                </p>
                <a
                  href="/api/homes/template"
                  download
                  className="inline-block px-4 py-2 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold text-sm mb-4"
                >
                  {language === 'el' ? '📥 Κατέβασμα Προτύπου' : '📥 Download Template'}
                </a>
              </div>

              {bulkUploadError && (
                <div className="bg-red-50/80 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
                  {bulkUploadError}
                </div>
              )}

              {bulkUploadSuccess && (
                <div className="bg-green-50/80 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm">
                  {bulkUploadSuccess}
                </div>
              )}

              {parsedHouses.length === 0 ? (
                // Step 1: Upload and parse Excel file
                <div>
                  <label className="block text-sm font-medium text-[#E8D5B7] mb-2">
                    {language === 'el' ? 'Αρχείο Excel' : 'Excel File'} *
                  </label>
                  <input
                    key={excelInputKey}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return

                      setBulkUploadError('')
                      setExcelFile(file)

                      try {
                        const arrayBuffer = await file.arrayBuffer()
                        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
                        const sheetName = workbook.SheetNames[0]
                        const worksheet = workbook.Sheets[sheetName]
                        const data = XLSX.utils.sheet_to_json(worksheet) as any[]

                        if (data.length === 0) {
                          setBulkUploadError(language === 'el' ? 'Το αρχείο Excel είναι άδειο' : 'Excel file is empty')
                          setExcelFile(null)
                          return
                        }

                        // Parse houses from Excel
                        const houses = data.map((row, index) => ({
                          title: row['Title'] ? String(row['Title']).trim() : `House ${index + 1}`,
                          city: row['City'] ? String(row['City']).trim() : '',
                          country: row['Country'] ? String(row['Country']).trim() : '',
                          rowIndex: index,
                        }))

                        setParsedHouses(houses)
                      } catch (err) {
                        setBulkUploadError(language === 'el' ? 'Σφάλμα ανάγνωσης αρχείου Excel' : 'Error reading Excel file')
                        setExcelFile(null)
                      }
                    }}
                    className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#E8D5B7] file:text-[#2D3748] hover:file:bg-[#D4C19F]"
                  />
                </div>
              ) : (
                // Step 2: Show photo upload sections for each house
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    setBulkUploadError('')
                    setBulkUploadSuccess('')
                    setBulkUploadLoading(true)

                    if (!excelFile) {
                      setBulkUploadError(language === 'el' ? 'Παρακαλώ επιλέξτε αρχείο Excel' : 'Please select an Excel file')
                      setBulkUploadLoading(false)
                      return
                    }

                    // Check home count limits
                    const currentCount = homeCount
                    const newCount = currentCount + parsedHouses.length
                    if (subscription === 1 && newCount > 2) {
                      setBulkUploadError(getTranslation(language, 'freePlanLimitReached') || 'Free plan allows up to 2 homes total.')
                      setBulkUploadLoading(false)
                      return
                    }
                    if (subscription === 2 && newCount > 10) {
                      setBulkUploadError(getTranslation(language, 'plusPlanLimitReached') || 'Plus plan allows up to 10 homes total.')
                      setBulkUploadLoading(false)
                      return
                    }

                    try {
                      const uploadFormData = new FormData()
                      uploadFormData.append('excelFile', excelFile)
                      uploadFormData.append('useAIDescription', useAIDescriptionBulk ? 'true' : 'false')
                      
                      // Append photos for each house with index prefix
                      Object.keys(housePhotos).forEach((rowIndexStr) => {
                        const rowIndex = parseInt(rowIndexStr)
                        const photos = housePhotos[rowIndex] || []
                        photos.forEach((photo) => {
                          uploadFormData.append(`photos_${rowIndex}`, photo)
                        })
                      })

                      const response = await fetch('/api/homes/bulk-upload', {
                        method: 'POST',
                        body: uploadFormData,
                      })

                      const data = await response.json()

                      if (!response.ok) {
                        setBulkUploadError(data.error || (language === 'el' ? 'Σφάλμα κατά την ανέβασμα' : 'Upload error'))
                        setBulkUploadLoading(false)
                        return
                      }

                      if (data.errors && data.errors.length > 0) {
                        setBulkUploadError(
                          language === 'el'
                            ? `Δημιουργήθηκαν ${data.created} ακίνητα. Σφάλματα: ${data.errors.join(', ')}`
                            : `Created ${data.created} homes. Errors: ${data.errors.join(', ')}`
                        )
                      } else {
                        setBulkUploadSuccess(
                          language === 'el'
                            ? `Επιτυχής δημιουργία ${data.created} ακινήτων!`
                            : `Successfully created ${data.created} homes!`
                        )
                      }

                      // Redirect to my listings after 2 seconds
                      setTimeout(() => {
                        router.push('/homes/my-listings')
                      }, 2000)
                    } catch (err) {
                      setBulkUploadError(
                        language === 'el' ? 'Σφάλμα κατά την ανέβασμα' : 'Upload error'
                      )
                    } finally {
                      setBulkUploadLoading(false)
                    }
                  }}
                  className="space-y-4"
                >
                  {subscription !== null && subscription !== 1 && (
                    <div className="bg-[#2D3748]/50 rounded-2xl p-4 mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useAIDescriptionBulk}
                          onChange={(e) => setUseAIDescriptionBulk(e.target.checked)}
                          className="w-4 h-4 rounded border-[#E8D5B7]/30 bg-[#2D3748] text-[#E8D5B7] focus:ring-2 focus:ring-[#E8D5B7] cursor-pointer"
                        />
                        <span className="text-sm text-[#E8D5B7]/80">
                          {getTranslation(language, 'useAIDescriptionForAll') || 'Use AI to generate descriptions for all homes'}
                        </span>
                      </label>
                    </div>
                  )}
                  <div className="bg-[#2D3748]/50 rounded-2xl p-4 mb-4">
                    <p className="text-[#E8D5B7] font-semibold mb-2">
                      {language === 'el' 
                        ? `Βρέθηκαν ${parsedHouses.length} ακίνητα στο αρχείο Excel`
                        : `Found ${parsedHouses.length} properties in Excel file`}
                    </p>
                    <p className="text-[#E8D5B7]/70 text-sm">
                      {language === 'el' 
                        ? 'Ανεβάστε φωτογραφίες για κάθε ακίνητο (προαιρετικό)'
                        : 'Upload photos for each property (optional)'}
                    </p>
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {parsedHouses.map((house, index) => (
                      <div key={index} className="bg-[#2D3748]/50 rounded-2xl p-4 border border-[#E8D5B7]/20">
                        <div className="mb-3">
                          <h3 className="text-[#E8D5B7] font-semibold">
                            {house.title || `House ${index + 1}`}
                          </h3>
                          <p className="text-[#E8D5B7]/70 text-sm">
                            {house.city && house.country ? `${house.city}, ${house.country}` : ''}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#E8D5B7] mb-2">
                            {language === 'el' ? 'Φωτογραφίες' : 'Photos'} ({language === 'el' ? 'Προαιρετικό' : 'Optional'})
                          </label>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || [])
                              setHousePhotos((prev) => ({
                                ...prev,
                                [house.rowIndex]: files,
                              }))
                            }}
                            className="w-full px-4 py-3 border border-[#E8D5B7]/30 bg-[#2D3748] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8D5B7] focus:border-[#E8D5B7] transition-all text-[#E8D5B7] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#E8D5B7] file:text-[#2D3748] hover:file:bg-[#D4C19F]"
                          />
                          {housePhotos[house.rowIndex] && housePhotos[house.rowIndex].length > 0 && (
                            <p className="text-[#E8D5B7]/50 text-xs mt-1">
                              {housePhotos[house.rowIndex].length} {language === 'el' ? 'φωτογραφία(ες) επιλέχθηκε(αν)' : 'photo(s) selected'}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setParsedHouses([])
                        setExcelFile(null)
                        setHousePhotos({})
                        setBulkUploadError('')
                        setExcelInputKey(prev => prev + 1)
                      }}
                      className="flex-1 px-6 py-3 bg-[#2D3748] text-[#E8D5B7] rounded-xl hover:bg-[#1A202C] transition-all font-semibold text-sm"
                    >
                      {language === 'el' ? 'Επιστροφή' : 'Back'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBulkUploadModal(false)
                        setBulkUploadError('')
                        setBulkUploadSuccess('')
                        setParsedHouses([])
                        setExcelFile(null)
                        setHousePhotos({})
                        setExcelInputKey(prev => prev + 1)
                      }}
                      className="flex-1 px-6 py-3 bg-[#2D3748] text-[#E8D5B7] rounded-xl hover:bg-[#1A202C] transition-all font-semibold text-sm"
                    >
                      {getTranslation(language, 'cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={bulkUploadLoading}
                      className="flex-1 px-6 py-3 bg-[#E8D5B7] text-[#2D3748] rounded-xl hover:bg-[#D4C19F] transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bulkUploadLoading 
                        ? (language === 'el' ? 'Ανέβασμα...' : 'Uploading...')
                        : (language === 'el' ? 'Ανέβασμα' : 'Upload')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
