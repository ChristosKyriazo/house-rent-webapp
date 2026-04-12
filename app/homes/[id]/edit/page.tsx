'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation, translateValue, reverseTranslateValue } from '@/lib/translations'
import { findMostSimilarArea, getAreaName } from '@/lib/area-utils'

interface Home {
  id: number
  key: string
  title: string
  description: string | null
  street: string | null
  city: string
  country: string
  area: string | null
  listingType: string
  pricePerMonth: number
  bedrooms: number
  bathrooms: number
  floor: number | null
  heatingCategory: string | null
  heatingAgent: string | null
  parking: boolean | null
  sizeSqMeters: number | null
  yearBuilt: number | null
  yearRenovated: number | null
  availableFrom: string
  energyClass: string | null
  photos: string | null
  owner: {
    id: number
    email: string
    name: string | null
  }
}

export default function EditHomePage() {
  const params = useParams()
  const router = useRouter()
  const { language } = useLanguage()
  const [home, setHome] = useState<Home | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState('')
  const [checkingRole, setCheckingRole] = useState(true)
  
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
  const [useAIDescription, setUseAIDescription] = useState(false)
  const [areaSuggestions, setAreaSuggestions] = useState<Array<{ id: number; key: string; name: string; nameGreek: string | null; city: string | null; country: string | null }>>([])
  const [showAreaDropdown, setShowAreaDropdown] = useState(false)
  const [areaSearchQuery, setAreaSearchQuery] = useState('')
  const [allAreas, setAllAreas] = useState<Array<{ id: number; name: string; nameGreek: string | null }>>([])

  // Check user role and ownership on mount
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const profileRes = await fetch('/api/profile')
        const profileData = await profileRes.json()
        
        if (!profileData.user) {
          router.push('/login')
          return
        }
        
        const userRole = profileData.user.role || 'user'
        if (userRole !== 'owner' && userRole !== 'both' && userRole !== 'broker') {
          router.push('/profile')
          return
        }
        
        setCheckingRole(false)
        
        // Fetch the home listing
        const homeId = params.id as string
        const homeRes = await fetch(`/api/homes/${homeId}`)
        
        if (!homeRes.ok) {
          router.push('/homes/my-listings')
          return
        }
        
        const homeData = await homeRes.json()
        const fetchedHome = homeData.home
        
        // Check if user owns this listing
        if (fetchedHome.owner.id !== profileData.user.id) {
          router.push('/homes/my-listings')
          return
        }
        
        setHome(fetchedHome)
        
        // Pre-fill form with existing data
        setFormData({
          title: fetchedHome.title || '',
          description: fetchedHome.description || '',
          street: fetchedHome.street || '',
          city: fetchedHome.city || '',
          country: fetchedHome.country || '',
          area: fetchedHome.area || '',
          listingType: fetchedHome.listingType || 'rent',
          pricePerMonth: fetchedHome.pricePerMonth?.toString() || '',
          bedrooms: fetchedHome.bedrooms?.toString() || '1',
          bathrooms: fetchedHome.bathrooms?.toString() || '1',
          floor: fetchedHome.floor?.toString() || '',
          heatingCategory: fetchedHome.heatingCategory ? reverseTranslateValue(fetchedHome.heatingCategory) : '',
          heatingAgent: fetchedHome.heatingAgent ? reverseTranslateValue(fetchedHome.heatingAgent) : '',
          parking: fetchedHome.parking === true ? 'yes' : fetchedHome.parking === false ? 'no' : '',
          sizeSqMeters: fetchedHome.sizeSqMeters?.toString() || '',
          yearBuilt: fetchedHome.yearBuilt?.toString() || '',
          yearRenovated: fetchedHome.yearRenovated?.toString() || '',
          availableFrom: fetchedHome.availableFrom 
            ? new Date(fetchedHome.availableFrom).toISOString().split('T')[0]
            : '',
          energyClass: fetchedHome.energyClass || '',
        })
        
        // Set area search query with translated name if area exists
        // This will be set after areas are fetched in the other useEffect
        
        // Parse and set photos
        if (fetchedHome.photos) {
          try {
            const parsedPhotos = JSON.parse(fetchedHome.photos)
            if (Array.isArray(parsedPhotos)) {
              setPhotos(parsedPhotos)
            }
          } catch (e) {
            console.error('Error parsing photos:', e)
          }
        }
      } catch (err) {
        console.error('Error checking access:', err)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    
    checkAccess()
  }, [params.id, router, language])

  // Fetch all areas on mount for similarity matching and set area display
  useEffect(() => {
    fetch('/api/areas')
      .then((res) => res.json())
      .then((data) => {
        setAllAreas(data.areas || [])
        // If home has an area, set the translated display name
        if (home && home.area) {
          const areas = data.areas || []
          const translatedName = getAreaName(home.area, areas, language)
          setAreaSearchQuery(translatedName)
        }
      })
      .catch((error) => {
        console.error('Error fetching all areas:', error)
      })
  }, [home, language])

  // Search areas function
  const searchAreas = async (query: string) => {
    if (query.length < 1) {
      setAreaSuggestions([])
      setShowAreaDropdown(false)
      return
    }

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

      const response = await fetch(`/api/areas/search?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        const areas = data.areas || []
        setAreaSuggestions(areas)
        // Show dropdown if there are suggestions
        setShowAreaDropdown(areas.length > 0)
      } else {
        // If API call fails, hide dropdown and clear suggestions
        setAreaSuggestions([])
        setShowAreaDropdown(false)
        console.error('Failed to search areas:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error searching areas:', error)
      setAreaSuggestions([])
      setShowAreaDropdown(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Check total photo limit (20 photos max)
    const totalPhotos = photos.length + files.length
    if (totalPhotos > 20) {
      setError(`Maximum 20 photos allowed. You already have ${photos.length} photos. Please select ${20 - photos.length} or fewer.`)
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
      setError(`File(s) too large (max 5MB each): ${oversizedFiles.join(', ')}`)
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
      setError(err instanceof Error ? err.message : 'Photo upload failed')
    } finally {
      setUploadingPhotos(false)
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    // Always ensure we have a valid area name from the database
    let finalArea: string | null = null
    
    // First, check if formData.area is already a valid area name from the database
    if (formData.area && formData.area.trim().length > 0) {
      const isValidArea = allAreas.some(a => a.name === formData.area.trim())
      if (isValidArea) {
        // formData.area is already a valid area name, use it
        finalArea = formData.area.trim()
      } else {
        // formData.area exists but is not a valid area name, try to find closest match
        const mostSimilar = findMostSimilarArea(formData.area, allAreas)
        if (mostSimilar) {
          finalArea = mostSimilar.name
        }
      }
    }
    
    // If we still don't have a valid area, try matching from areaSearchQuery
    if (!finalArea && areaSearchQuery && areaSearchQuery.trim().length > 0) {
      const mostSimilar = findMostSimilarArea(areaSearchQuery, allAreas)
      if (mostSimilar) {
        finalArea = mostSimilar.name
      }
    }
    
    // Only use what they typed if no match was found and we have something
    // But prefer to leave it null if no valid match
    if (!finalArea && areaSearchQuery && areaSearchQuery.trim().length > 0) {
      // Last resort: use what they typed (but this shouldn't happen if they clicked a suggestion)
      finalArea = areaSearchQuery.trim()
    }

    try {
      const homeId = params.id as string
      const response = await fetch(`/api/homes/${homeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          area: finalArea || null,
          heatingCategory: formData.heatingCategory || null,
          heatingAgent: formData.heatingAgent || null,
          parking: formData.parking === 'yes' ? true : formData.parking === 'no' ? false : null,
          energyClass: formData.energyClass || null,
          photos: photos.length > 0 ? JSON.stringify(photos) : null,
          useAIDescription,
        }),
      })

      // Read response body as text first (can only be read once)
      const responseText = await response.text()
      let data: any = {}
      
      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch (parseError) {
        console.error('Failed to parse JSON response:', responseText)
        setError(getTranslation(language, 'updateListingFailed'))
        return
      }

      if (!response.ok) {
        const errorMsg = data.details 
          ? `${data.error || getTranslation(language, 'updateListingFailed')}: ${data.details}`
          : data.error || getTranslation(language, 'updateListingFailed')
        setError(errorMsg)
        console.error('Update listing error:', { 
          status: response.status, 
          statusText: response.statusText,
          data,
          responseText 
        })
        return
      }

      router.push(`/homes/${home?.key || homeId}?from=my-listings`)
    } catch (err) {
      setError(getTranslation(language, 'somethingWentWrong'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!home) return
    
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!home) return
    
    setDeleting(true)
    setError('')
    
    try {
      const response = await fetch(`/api/homes/${home.key}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const text = await response.text()
        let data: unknown = {}
        try {
          data = text ? JSON.parse(text) : {}
        } catch {
          data = { error: text || getTranslation(language, 'deleteFailed') }
        }
        const errorFromBody =
          typeof data === 'object' && data !== null && 'error' in data
            ? String((data as { error?: unknown }).error || '')
            : ''
        setError(errorFromBody || getTranslation(language, 'deleteFailed'))
        setDeleting(false)
        setShowDeleteConfirm(false)
        return
      }
      
      // Redirect to my listings page
      router.push('/homes/my-listings')
    } catch (error) {
      console.error('Error deleting listing:', error)
      setError(getTranslation(language, 'deleteFailed'))
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (checkingRole || loading) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <p className="text-[var(--text)]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  if (!home) {
    return null
  }

  return (
    <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[var(--border-subtle)]">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-[var(--text)]">
                {getTranslation(language, 'editListing')}
              </h1>
              <Link
                href={`/homes/${home.key}?from=my-listings`}
                className="px-4 py-2 text-[var(--text)] hover:text-[var(--accent)] transition-colors"
              >
                {getTranslation(language, 'cancel')}
              </Link>
            </div>
            <p className="text-[var(--text-muted)]">
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
              <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'title')}</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)] placeholder:text-[var(--text)]/50"
                placeholder={getTranslation(language, 'placeholderTitle')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'description')}</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all resize-none text-[var(--text)] placeholder:text-[var(--text)]/50"
                rows={4}
                placeholder={
                  useAIDescription
                    ? getTranslation(language, 'aiDescriptionHintsPlaceholder') ||
                      'Optional: tenant rules or preferences (e.g. students only, no pets). Leave blank for a standard description.'
                    : getTranslation(language, 'placeholderDescription')
                }
              />
              <label className="flex items-center gap-3 mt-4 p-3 bg-[var(--ink-soft)]/50 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--accent)]/35 transition-all cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAIDescription}
                  onChange={(e) => setUseAIDescription(e.target.checked)}
                  className="w-5 h-5 rounded border-2 border-[var(--accent)]/40 bg-[var(--ink-soft)] text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)] cursor-pointer accent-[var(--accent)]"
                />
                <span className="text-base font-medium text-[var(--text)]">
                  {getTranslation(language, 'useAIDescription') || 'Use AI to generate description'}
                </span>
              </label>
              {useAIDescription && (
                <p className="text-sm text-[var(--text-muted)] mt-2">
                  {getTranslation(language, 'aiDescriptionHintsHelper') ||
                    'The AI writes the full listing text. Anything you type above is merged into that text as landlord notes or rules.'}
                </p>
              )}
            </div>

            {/* Photo Upload Section */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                {getTranslation(language, 'uploadPhotos')} <span className="text-[var(--text)]/50">({getTranslation(language, 'optional')})</span>
              </label>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="px-6 py-3 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] rounded-2xl hover:bg-[var(--btn-primary-hover-bg)] transition-all font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
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
                    <span className="text-[var(--text-muted)] text-sm">{getTranslation(language, 'loading')}</span>
                  )}
                </div>
                
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-xl border border-[var(--border-subtle)]"
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
              <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'listingType')}</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, listingType: 'rent' })}
                  className={`px-6 py-4 rounded-2xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                    formData.listingType === 'rent'
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] shadow-lg'
                      : 'bg-[var(--ink-soft)] text-[var(--text)] border border-[var(--border-subtle)] hover:border-[var(--accent)]'
                  }`}
                >
                  🏠 {getTranslation(language, 'rent')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, listingType: 'sell' })}
                  className={`px-6 py-4 rounded-2xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                    formData.listingType === 'sell'
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] shadow-lg'
                      : 'bg-[var(--ink-soft)] text-[var(--text)] border border-[var(--border-subtle)] hover:border-[var(--accent)]'
                  }`}
                >
                  💰 {getTranslation(language, 'sell')}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'street')}</label>
              <input
                type="text"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)] placeholder:text-[var(--text)]/50"
                placeholder={getTranslation(language, 'placeholderStreet')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'city')}</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)] placeholder:text-[var(--text)]/50"
                  placeholder={getTranslation(language, 'placeholderCity')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'country')}</label>
                <input
                  type="text"
                  required
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)] placeholder:text-[var(--text)]/50"
                  placeholder={getTranslation(language, 'placeholderCountry')}
                />
              </div>
            </div>

            {/* Area Autocomplete */}
            <div className="relative">
              <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'cityArea')} <span className="text-[var(--text)]/50">({getTranslation(language, 'optional')})</span></label>
              <div className="relative">
                <input
                  type="text"
                  value={areaSearchQuery}
                  onChange={(e) => {
                    const query = e.target.value
                    setAreaSearchQuery(query)
                    // Don't update formData.area immediately - wait for selection or auto-match
                    if (query.length > 0) {
                      setShowAreaDropdown(true)
                      searchAreas(query)
                    } else {
                      setShowAreaDropdown(false)
                      setAreaSuggestions([])
                      setFormData({ ...formData, area: '' })
                    }
                  }}
                  onFocus={() => {
                    if (areaSearchQuery.length > 0) {
                      setShowAreaDropdown(true)
                    }
                  }}
                  onBlur={() => {
                    // Delay to allow click on dropdown items
                    setTimeout(() => {
                      setShowAreaDropdown(false)
                      // Only process if dropdown was not clicked (i.e., user actually blurred)
                      // Check if formData.area is already set to a valid area name
                      const hasValidArea = formData.area && allAreas.some(a => a.name === formData.area)
                      
                      if (!hasValidArea && areaSearchQuery && areaSearchQuery.trim().length > 0) {
                        // If user typed but didn't select, try to find most similar
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
                            setFormData(prev => ({ ...prev, area: mostSimilar.name }))
                            const displayName = language === 'el' && mostSimilar.nameGreek ? mostSimilar.nameGreek : mostSimilar.name
                            setAreaSearchQuery(displayName)
                          } else {
                            // No match found, use what they typed
                            setFormData(prev => ({ ...prev, area: areaSearchQuery }))
                          }
                        }
                      }
                    }, 200)
                  }}
                  className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)] placeholder:text-[var(--text)]/50"
                  placeholder={getTranslation(language, 'selectCityArea')}
                />
                {showAreaDropdown && areaSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-2xl shadow-xl max-h-60 overflow-y-auto">
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
                        className="w-full px-4 py-3 text-left text-[var(--text)] hover:bg-[var(--ink-soft)] transition-colors border-b border-[var(--border-subtle)] last:border-b-0"
                      >
                        <div className="font-medium">{language === 'el' && area.nameGreek ? area.nameGreek : area.name}</div>
                        {(area.city || area.country) && (
                          <div className="text-sm text-[var(--text-muted)]">
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
                <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'price')}</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.pricePerMonth}
                  onChange={(e) => setFormData({ ...formData, pricePerMonth: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)] placeholder:text-[var(--text)]/50"
                  placeholder="900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'sizeSqMeters')}</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.sizeSqMeters}
                  onChange={(e) => setFormData({ ...formData, sizeSqMeters: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)] placeholder:text-[var(--text)]/50"
                  placeholder={getTranslation(language, 'placeholderSize')}
                />
              </div>
            </div>

            {/* Heating Category and Agent Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'heatingCategory')} <span className="text-[var(--text)]/50">({getTranslation(language, 'optional')})</span></label>
                <select
                  value={formData.heatingCategory}
                  onChange={(e) => setFormData({ ...formData, heatingCategory: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)]"
                >
                  <option value="">{getTranslation(language, 'any')}</option>
                  <option value="central">{translateValue(language, 'central')}</option>
                  <option value="autonomous">{translateValue(language, 'autonomous')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'heatingAgent')} <span className="text-[var(--text)]/50">({getTranslation(language, 'optional')})</span></label>
                <select
                  value={formData.heatingAgent}
                  onChange={(e) => setFormData({ ...formData, heatingAgent: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)]"
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
              <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'energyClass')} <span className="text-[var(--text)]/50">({getTranslation(language, 'optional')})</span></label>
              <select
                value={formData.energyClass}
                onChange={(e) => setFormData({ ...formData, energyClass: e.target.value })}
                className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)]"
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
                <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'floor')} <span className="text-[var(--text)]/50">({getTranslation(language, 'optional')})</span></label>
                <input
                  type="number"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)] placeholder:text-[var(--text)]/50"
                  placeholder={getTranslation(language, 'placeholderBedrooms')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'bedrooms')}</label>
                <input
                  type="number"
                  min="0"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)] placeholder:text-[var(--text)]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'bathrooms')}</label>
                <input
                  type="number"
                  min="0"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)] placeholder:text-[var(--text)]/50"
                />
              </div>
            </div>

            {/* Parking */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'parking')} <span className="text-[var(--text)]/50">({getTranslation(language, 'optional')})</span></label>
              <select
                value={formData.parking}
                onChange={(e) => setFormData({ ...formData, parking: e.target.value })}
                className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)]"
              >
                <option value="">{getTranslation(language, 'any')}</option>
                <option value="yes">{getTranslation(language, 'yes')}</option>
                <option value="no">{getTranslation(language, 'no')}</option>
              </select>
            </div>

            {/* Year Built and Year Renovated Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'yearBuilt')} <span className="text-[var(--text)]/50">({getTranslation(language, 'optional')})</span></label>
                <input
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={formData.yearBuilt}
                  onChange={(e) => setFormData({ ...formData, yearBuilt: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)] placeholder:text-[var(--text)]/50"
                  placeholder={getTranslation(language, 'placeholderYearBuilt')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'yearRenovated')} <span className="text-[var(--text)]/50">({getTranslation(language, 'optional')})</span></label>
                <input
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={formData.yearRenovated}
                  onChange={(e) => setFormData({ ...formData, yearRenovated: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)] placeholder:text-[var(--text)]/50"
                  placeholder={getTranslation(language, 'placeholderYearRenovated')}
                />
              </div>
            </div>

            {/* Available From */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'availableFrom')}</label>
              <input
                type="date"
                value={formData.availableFrom}
                onChange={(e) => setFormData({ ...formData, availableFrom: e.target.value })}
                className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)]"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 px-4 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] rounded-2xl hover:bg-[var(--btn-primary-hover-bg)] transition-all font-semibold text-base shadow-lg shadow-[var(--accent)]/15 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
              >
                {saving ? getTranslation(language, 'updatingListing') : getTranslation(language, 'updateListing')}
              </button>
            </div>
          </form>
          
          {/* Delete Button */}
          <div className="mt-8 pt-8 border-t border-red-600/30">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all font-semibold disabled:opacity-50"
            >
              {deleting ? getTranslation(language, 'loading') : getTranslation(language, 'delete')}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Listing Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[var(--ink-soft)] border-4 border-red-500 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-red-400 mb-4">
                {getTranslation(language, 'delete')}
              </h2>
              <p className="text-red-300 font-semibold text-lg mb-2">
                {getTranslation(language, 'confirmDelete')}
              </p>
              {home && (
                <p className="text-[var(--text-muted)] text-sm">
                  {getTranslation(language, 'listingDetails')}: <strong>{home.title}</strong>
                </p>
              )}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-6 py-3 bg-[var(--ink-soft)] text-[var(--text)] rounded-xl hover:bg-[var(--ink-soft)] transition-all font-semibold text-sm disabled:opacity-50"
              >
                {getTranslation(language, 'cancel')}
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-semibold text-sm disabled:opacity-50 shadow-lg shadow-red-600/50"
              >
                {deleting ? getTranslation(language, 'loading') : getTranslation(language, 'delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



