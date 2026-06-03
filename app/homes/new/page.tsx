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
  const [addingArea, setAddingArea] = useState(false)
  const [showAddAreaOption, setShowAddAreaOption] = useState(false)
  const [newAreaMode, setNewAreaMode] = useState(false)
  const [newAreaNameEl, setNewAreaNameEl] = useState('')
  const [newAreaNameEn, setNewAreaNameEn] = useState('')
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false)
  const [bulkUploadError, setBulkUploadError] = useState('')
  const [bulkUploadSuccess, setBulkUploadSuccess] = useState('')
  const [parsedHouses, setParsedHouses] = useState<Array<{ title: string; city: string; country: string; area: string | null; rowIndex: number }>>([])
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [housePhotos, setHousePhotos] = useState<{ [key: number]: File[] }>({})
  const [excelInputKey, setExcelInputKey] = useState(0)
  const [areaValidating, setAreaValidating] = useState(false)
  const [unknownAreas, setUnknownAreas] = useState<Array<{ rowIndex: number; rowNumber: number; areaInput: string; suggestion: string | null }>>([])
  const [areaDecisions, setAreaDecisions] = useState<Record<number, 'confirmed' | 'new' | 'rejected'>>({})
  const [areaCustomNames, setAreaCustomNames] = useState<Record<number, string>>({})
  const [areaEditingNew, setAreaEditingNew] = useState<Record<number, boolean>>({})
  const [homeCount, setHomeCount] = useState<number>(0)
  const [citySuggestions, setCitySuggestions] = useState<Array<{ city: string; cityGreek: string | null; country: string; countryGreek: string | null }>>([])
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [countrySuggestions, setCountrySuggestions] = useState<Array<{ country: string; countryGreek: string | null }>>([])
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [useAIDescription, setUseAIDescription] = useState(false)
  const [useAIDescriptionBulk, setUseAIDescriptionBulk] = useState(false)
  const [bulkJobId, setBulkJobId] = useState<string | null>(null)
  const [bulkJobProgress, setBulkJobProgress] = useState(0)
  const [bulkJobTotal, setBulkJobTotal] = useState(0)

  // Check user role on mount
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

  // Poll job status while a bulk upload is processing
  useEffect(() => {
    if (!bulkJobId) return

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${bulkJobId}/status`)
        if (!res.ok) return
        const status = await res.json()

        setBulkJobProgress(status.progress)
        setBulkJobTotal(status.total)

        if (status.status === 'completed') {
          clearInterval(poll)
          setBulkJobId(null)
          setBulkUploadLoading(false)
          const created = (status.results as any[])?.length || 0
          if (status.errors?.length > 0) {
            setBulkUploadError(
              language === 'el'
                ? `Δημιουργήθηκαν ${created} ακίνητα. Σφάλματα: ${(status.errors as string[]).join(', ')}`
                : `Created ${created} homes. Errors: ${(status.errors as string[]).join(', ')}`
            )
          } else {
            setBulkUploadSuccess(
              language === 'el'
                ? `Επιτυχής δημιουργία ${created} ακινήτων!`
                : `Successfully created ${created} homes!`
            )
          }
          setTimeout(() => router.push('/homes/my-listings'), 2000)
        } else if (status.status === 'failed') {
          clearInterval(poll)
          setBulkJobId(null)
          setBulkUploadLoading(false)
          setBulkUploadError(
            language === 'el' ? 'Σφάλμα κατά την επεξεργασία' : 'Processing failed. Please try again.'
          )
        }
      } catch { /* ignore transient network errors during polling */ }
    }, 2000)

    return () => clearInterval(poll)
  }, [bulkJobId, language, router])

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
        const hasResults = areas.length > 0
        const canAdd = !hasResults && query.trim().length >= 2
        setShowAddAreaOption(canAdd)
        setShowAreaDropdown(hasResults || canAdd)
      } else {
        setAreaSuggestions([])
        setShowAddAreaOption(false)
        setShowAreaDropdown(false)
      }
    } catch (error) {
      console.error('Error searching areas:', error)
      setAreaSuggestions([])
      setShowAddAreaOption(false)
      setShowAreaDropdown(false)
    } finally {
      setSearchingAreas(false)
    }
  }

  const openNewAreaForm = () => {
    const typed = areaSearchQuery.trim()
    if (isGreekInput(typed)) {
      setNewAreaNameEl(typed)
      setNewAreaNameEn('')
    } else {
      setNewAreaNameEn(typed)
      setNewAreaNameEl('')
    }
    setShowAreaDropdown(false)
    setShowAddAreaOption(false)
    setNewAreaMode(true)
  }

  const handleAddArea = async () => {
    const nameEl = newAreaNameEl.trim()
    const nameEn = newAreaNameEn.trim()
    if (!nameEl && !nameEn) return
    setAddingArea(true)
    try {
      const res = await fetch('/api/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameEn || undefined,
          nameGreek: nameEl || undefined,
          city: formData.city || undefined,
          country: formData.country || undefined,
        }),
      })
      if (res.ok) {
        const { area } = await res.json()
        setAllAreas(prev => [...prev, { id: area.id, name: area.name, nameGreek: area.nameGreek }])
        setFormData(prev => ({ ...prev, area: area.name }))
        setAreaSearchQuery(nameEl || nameEn)
        setNewAreaMode(false)
        setNewAreaNameEl('')
        setNewAreaNameEn('')
        setAreaSelectedFromDropdown(true)
      }
    } catch { /* ignore */ }
    finally { setAddingArea(false) }
  }

  const isGreekInput = (text: string) => /[Ͱ-Ͽἀ-῿]/.test(text)

  const searchCities = async (query: string) => {
    if (query.length < 1) { setCitySuggestions([]); return }
    try {
      const params = new URLSearchParams({ q: query, limit: '10' })
      if (formData.country) params.append('country', formData.country)
      const res = await fetch(`/api/cities/search?${params.toString()}`)
      if (res.ok) setCitySuggestions((await res.json()).cities || [])
    } catch { /* ignore */ }
  }

  const searchCountries = async (query: string) => {
    if (query.length < 1) { setCountrySuggestions([]); return }
    try {
      const res = await fetch(`/api/countries/search?q=${encodeURIComponent(query)}&limit=10`)
      if (res.ok) setCountrySuggestions((await res.json()).countries || [])
    } catch { /* ignore */ }
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
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <p className="text-[var(--text)]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // formData.area is always set to the canonical DB name when user selects from dropdown
    // or via fuzzy match on blur. Trust it directly; stale allAreas cache is not used here.
    let finalArea: string | null = null
    if (formData.area && formData.area.trim().length > 0) {
      finalArea = formData.area.trim()
    } else if (areaSearchQuery && areaSearchQuery.trim().length > 0) {
      // User typed but never triggered a selection — try fuzzy match against cached list
      const matchedArea = allAreas.find(a =>
        a.name === areaSearchQuery.trim() ||
        (a.nameGreek && a.nameGreek === areaSearchQuery.trim())
      )
      if (matchedArea) {
        finalArea = matchedArea.name
      } else {
        const mostSimilar = findMostSimilarArea(areaSearchQuery, allAreas)
        finalArea = mostSimilar ? mostSimilar.name : areaSearchQuery.trim()
      }
    }

    try {
      const response = await fetch('/api/homes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          description: formData.description,
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
        if (response.status === 402) {
          setError(
            language === 'el'
              ? 'Έχετε φτάσει το όριο του δωρεάν πλάνου (3 ακίνητα). Αναβαθμίστε σε Plus για απεριόριστες καταχωρήσεις.'
              : "You've reached the free plan limit (3 listings). Upgrade to Plus to add unlimited listings."
          )
          return
        }
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
    <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[var(--border-subtle)]">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-[var(--text)]">
                {getTranslation(language, 'createListing')}
              </h1>
              <button
                type="button"
                onClick={() => setShowBulkUploadModal(true)}
                className="px-4 py-2 bg-[var(--ink-soft)] text-[var(--text)] border border-[var(--border-subtle)] rounded-xl hover:bg-[var(--canvas-mid)] hover:border-[var(--accent)]/45 transition-all text-sm font-semibold"
              >
                {language === 'el' ? '📄 Δημοσίευση από Αρχείο' : '📄 Publish by File'}
              </button>
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
              {/* City autocomplete */}
              <div className="relative">
                <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'city')}</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => {
                    const q = e.target.value
                    setFormData({ ...formData, city: q })
                    if (q.length > 0) { setShowCityDropdown(true); searchCities(q) }
                    else { setShowCityDropdown(false); setCitySuggestions([]) }
                  }}
                  onFocus={() => { if (formData.city.length > 0) { setShowCityDropdown(true); searchCities(formData.city) } }}
                  onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                  className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)] placeholder:text-[var(--text)]/50"
                  placeholder={getTranslation(language, 'placeholderCity')}
                />
                {showCityDropdown && citySuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                    {citySuggestions.map((city, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const displayCity = (isGreekInput(formData.city) || language === 'el') && city.cityGreek ? city.cityGreek : city.city
                          const displayCountry = (isGreekInput(formData.city) || language === 'el') && city.countryGreek ? city.countryGreek : city.country
                          setFormData(prev => ({
                            ...prev,
                            city: displayCity,
                            country: prev.country || displayCountry,
                          }))
                          setShowCityDropdown(false)
                          setCitySuggestions([])
                        }}
                        className="w-full px-4 py-3 text-left text-[var(--text)] hover:bg-[var(--canvas-mid)] transition-colors border-b border-[var(--border-subtle)] last:border-b-0"
                      >
                        <div className="font-medium">{(isGreekInput(formData.city) || language === 'el') && city.cityGreek ? city.cityGreek : city.city}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Country autocomplete */}
              <div className="relative">
                <label className="block text-sm font-medium text-[var(--text)] mb-2">{getTranslation(language, 'country')}</label>
                <input
                  type="text"
                  required
                  value={formData.country}
                  onChange={(e) => {
                    const q = e.target.value
                    setFormData({ ...formData, country: q })
                    if (q.length > 0) { setShowCountryDropdown(true); searchCountries(q) }
                    else { setShowCountryDropdown(false); setCountrySuggestions([]) }
                  }}
                  onFocus={() => { if (formData.country.length > 0) { setShowCountryDropdown(true); searchCountries(formData.country) } }}
                  onBlur={() => setTimeout(() => setShowCountryDropdown(false), 200)}
                  className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)] placeholder:text-[var(--text)]/50"
                  placeholder={getTranslation(language, 'placeholderCountry')}
                />
                {showCountryDropdown && countrySuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                    {countrySuggestions.map((country, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const display = (isGreekInput(formData.country) || language === 'el') && country.countryGreek ? country.countryGreek : country.country
                          setFormData(prev => ({ ...prev, country: display }))
                          setShowCountryDropdown(false)
                          setCountrySuggestions([])
                        }}
                        className="w-full px-4 py-3 text-left text-[var(--text)] hover:bg-[var(--canvas-mid)] transition-colors border-b border-[var(--border-subtle)] last:border-b-0"
                      >
                        <div className="font-medium">{(isGreekInput(formData.country) || language === 'el') && country.countryGreek ? country.countryGreek : country.country}</div>
                      </button>
                    ))}
                  </div>
                )}
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
                      // Show dropdown immediately while searching (optimistic UI)
                      // searchAreas will update it based on actual results
                      setShowAreaDropdown(true)
                      searchAreas(query)
                    } else {
                      setShowAreaDropdown(false)
                      setShowAddAreaOption(false)
                      setAreaSuggestions([])
                      setFormData({ ...formData, area: '' })
                      setAreaSelectedFromDropdown(false)
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
                      setShowAddAreaOption(false)
                      if (areaSelectedFromDropdown) {
                        setAreaSelectedFromDropdown(false)
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
                  className="w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all text-[var(--text)] placeholder:text-[var(--text)]/50"
                  placeholder={getTranslation(language, 'selectCityArea')}
                />
                {showAreaDropdown && (areaSuggestions.length > 0 || showAddAreaOption) && (
                  <div className="absolute z-50 w-full mt-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                    {areaSuggestions.map((area) => (
                      <button
                        key={area.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          const displayName = isGreekInput(areaSearchQuery) && area.nameGreek ? area.nameGreek : area.name
                          setFormData(prev => ({ ...prev, area: area.name }))
                          setAreaSearchQuery(displayName)
                          setShowAreaDropdown(false)
                          setShowAddAreaOption(false)
                          setAreaSelectedFromDropdown(true)
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
                        <div className="font-medium">{isGreekInput(areaSearchQuery) && area.nameGreek ? area.nameGreek : area.name}</div>
                        {(area.city || area.country) && (
                          <div className="text-sm text-[var(--text-muted)]">
                            {[area.city, area.country].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </button>
                    ))}
                    {showAddAreaOption && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          openNewAreaForm()
                        }}
                        className="w-full px-4 py-3 text-left text-[var(--accent)] hover:bg-[var(--canvas-mid)] transition-colors flex items-center gap-2"
                      >
                        <span className="text-lg leading-none">+</span>
                        <span className="font-medium">
                          {language === 'el'
                            ? `Προσθήκη "${areaSearchQuery}" ως νέα περιοχή`
                            : `Add "${areaSearchQuery}" as a new area`}
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* Two-column new-area form */}
                {newAreaMode && (
                  <div className="absolute z-50 w-full mt-2 bg-[var(--ink-soft)] border border-[var(--border-default)] rounded-2xl shadow-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-[var(--text)]">
                      {language === 'el' ? 'Καταχώρηση νέας περιοχής' : 'Register new area'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase tracking-wide">
                          {language === 'el' ? 'Ελληνικό όνομα' : 'Greek name'}
                        </label>
                        <input
                          type="text"
                          value={newAreaNameEl}
                          onChange={e => setNewAreaNameEl(e.target.value)}
                          placeholder="π.χ. Νέα Σμύρνη"
                          className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase tracking-wide">
                          {language === 'el' ? 'Αγγλικό όνομα' : 'English name'}
                        </label>
                        <input
                          type="text"
                          value={newAreaNameEn}
                          onChange={e => setNewAreaNameEn(e.target.value)}
                          placeholder="e.g. Nea Smyrni"
                          className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={addingArea || (!newAreaNameEl.trim() && !newAreaNameEn.trim())}
                        onClick={handleAddArea}
                        className="btn-primary px-4 py-2 text-sm disabled:opacity-40"
                      >
                        {addingArea
                          ? (language === 'el' ? 'Προσθήκη...' : 'Adding...')
                          : (language === 'el' ? 'Καταχώρηση' : 'Register')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setNewAreaMode(false); setNewAreaNameEl(''); setNewAreaNameEn('') }}
                        className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors border border-[var(--border-subtle)] rounded-xl"
                      >
                        {language === 'el' ? 'Ακύρωση' : 'Cancel'}
                      </button>
                    </div>
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
                disabled={loading}
                className="w-full py-3 px-4 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] rounded-2xl hover:bg-[var(--btn-primary-hover-bg)] transition-all font-semibold text-base shadow-lg shadow-[var(--accent)]/15 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
              >
                {loading ? getTranslation(language, 'loading') : getTranslation(language, 'createListing')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => { setShowBulkUploadModal(false); setBulkUploadError(''); setBulkUploadSuccess(''); setParsedHouses([]); setExcelFile(null); setHousePhotos({}); setExcelInputKey(prev => prev + 1); setUnknownAreas([]); setAreaDecisions({}) }}>
          <div className="bg-[var(--ink-soft)] border-4 border-[var(--border-subtle)] rounded-3xl p-8 max-w-4xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[var(--text)]">
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
                  setUnknownAreas([])
                  setAreaDecisions({})
                }}
                className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-[var(--text-muted)] mb-4">
                  {language === 'el' 
                    ? 'Κατεβάστε το πρότυπο Excel, συμπληρώστε τα στοιχεία των ακινήτων και ανεβάστε το αρχείο. Στη συνέχεια, ανεβάστε φωτογραφίες για κάθε ακίνητο.'
                    : 'Download the Excel template, fill in the property details, and upload the file. Then upload photos for each property.'}
                </p>
                <a
                  href="/api/homes/template"
                  download
                  className="inline-block px-4 py-2 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] rounded-xl hover:bg-[var(--btn-primary-hover-bg)] transition-all font-semibold text-sm mb-4"
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
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">
                    {language === 'el' ? 'Αρχείο Excel' : 'Excel File'} *
                  </label>
                  <label className="flex items-center gap-3 w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl cursor-pointer hover:border-[var(--accent)] transition-colors">
                    <span className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-hover-bg)]">
                      {language === 'el' ? 'Επιλογή Αρχείου' : 'Choose File'}
                    </span>
                    <span className="text-sm text-[var(--text-muted)] truncate">
                      {excelFile ? excelFile.name : (language === 'el' ? 'Δεν έχει επιλεχθεί αρχείο' : 'No file chosen')}
                    </span>
                    <input
                      key={excelInputKey}
                      type="file"
                      accept=".xlsx,.xls,.numbers"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return

                        setBulkUploadError('')

                        if (file.name.toLowerCase().endsWith('.numbers')) {
                          setBulkUploadError(
                            language === 'el'
                              ? 'Τα αρχεία Apple Numbers δεν υποστηρίζονται άμεσα. Στο Numbers επιλέξτε Αρχείο → Εξαγωγή ως → Excel (.xlsx) και ανεβάστε το αρχείο Excel.'
                              : 'Apple Numbers files cannot be uploaded directly. In Numbers, choose File → Export To → Excel (.xlsx), then upload the exported file.'
                          )
                          return
                        }

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
                            area: row['Area'] ? String(row['Area']).trim() : null,
                            rowIndex: index,
                          }))

                          setParsedHouses(houses)
                          setUnknownAreas([])
                          setAreaDecisions({})

                          // Validate areas against DB
                          setAreaValidating(true)
                          try {
                            const validateFormData = new FormData()
                            validateFormData.append('excelFile', file)
                            const validateRes = await fetch('/api/homes/bulk-validate', {
                              method: 'POST',
                              body: validateFormData,
                            })
                            if (validateRes.ok) {
                              const validateData = await validateRes.json()
                              if (validateData.unknownAreas?.length > 0) {
                                setUnknownAreas(validateData.unknownAreas)
                              }
                            }
                          } catch {
                            // Validation call failed — proceed anyway; backend will store as-is
                          } finally {
                            setAreaValidating(false)
                          }
                        } catch (err) {
                          setBulkUploadError(language === 'el' ? 'Σφάλμα ανάγνωσης αρχείου Excel' : 'Error reading Excel file')
                          setExcelFile(null)
                        }
                      }}
                    />
                  </label>
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

                    // Block upload if any area was rejected
                    const rejectedAreas = unknownAreas.filter(ua => areaDecisions[ua.rowIndex] === 'rejected')
                    if (rejectedAreas.length > 0) {
                      setBulkUploadError(
                        language === 'el'
                          ? `Παρακαλώ διορθώστε τις περιοχές στο Excel και ανεβάστε ξανά: ${rejectedAreas.map(ua => `"${ua.areaInput}" (γραμμή ${ua.rowNumber})`).join(', ')}`
                          : `Please fix the area names in your Excel and re-upload: ${rejectedAreas.map(ua => `"${ua.areaInput}" (row ${ua.rowNumber})`).join(', ')}`
                      )
                      setBulkUploadLoading(false)
                      return
                    }

                    // Block upload if any unknown area still unresolved
                    const unresolvedAreas = unknownAreas.filter(ua => !areaDecisions[ua.rowIndex])
                    if (unresolvedAreas.length > 0) {
                      setBulkUploadError(
                        language === 'el'
                          ? `Παρακαλώ επιβεβαιώστε τις άγνωστες περιοχές πριν ανεβάσετε`
                          : `Please confirm or reject all unknown areas before uploading`
                      )
                      setBulkUploadLoading(false)
                      return
                    }

                    try {
                      const uploadFormData = new FormData()
                      uploadFormData.append('excelFile', excelFile)
                      uploadFormData.append('useAIDescription', useAIDescriptionBulk ? 'true' : 'false')

                      // Include areas confirmed by owner.
                      // 'confirmed' → use the matched suggestion (maps to existing DB area).
                      // 'new' → use the owner-supplied custom name (processor will create it).
                      const confirmedNewAreas = unknownAreas
                        .filter(ua => areaDecisions[ua.rowIndex] === 'confirmed' || areaDecisions[ua.rowIndex] === 'new')
                        .map(ua => {
                          const house = parsedHouses.find(h => h.rowIndex === ua.rowIndex)
                          const area = areaDecisions[ua.rowIndex] === 'new'
                            ? (areaCustomNames[ua.rowIndex] || ua.areaInput)
                            : (ua.suggestion ?? ua.areaInput)
                          return {
                            rowIndex: ua.rowIndex,
                            area,
                            city: house?.city || undefined,
                            country: house?.country || undefined,
                          }
                        })
                      if (confirmedNewAreas.length > 0) {
                        uploadFormData.append('confirmedNewAreas', JSON.stringify(confirmedNewAreas))
                      }

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

                      // Job created — polling useEffect takes over from here
                      setBulkJobId(data.jobId)
                      setBulkJobProgress(0)
                      setBulkJobTotal(parsedHouses.length)
                    } catch (err) {
                      setBulkUploadError(
                        language === 'el' ? 'Σφάλμα κατά την ανέβασμα' : 'Upload error'
                      )
                      setBulkUploadLoading(false)
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="bg-[var(--ink-soft)]/50 rounded-2xl p-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useAIDescriptionBulk}
                        onChange={(e) => setUseAIDescriptionBulk(e.target.checked)}
                        className="w-4 h-4 rounded border-[var(--border-subtle)] bg-[var(--ink-soft)] text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)] cursor-pointer"
                      />
                      <span className="text-sm text-[var(--text-muted)]">
                        {getTranslation(language, 'useAIDescriptionForAll') || 'Use AI to generate descriptions for all homes'}
                      </span>
                    </label>
                    {useAIDescriptionBulk && (
                      <p className="text-sm text-[var(--text-muted)] mt-3 pl-6">
                        {getTranslation(language, 'bulkAiDescriptionExcelHint')}
                      </p>
                    )}
                  </div>
                  <div className="bg-[var(--ink-soft)]/50 rounded-2xl p-4 mb-4">
                    <p className="text-[var(--text)] font-semibold mb-2">
                      {language === 'el'
                        ? `Βρέθηκαν ${parsedHouses.length} ακίνητα στο αρχείο Excel`
                        : `Found ${parsedHouses.length} properties in Excel file`}
                    </p>
                    {areaValidating ? (
                      <p className="text-[var(--text-muted)] text-sm">
                        {language === 'el' ? 'Έλεγχος περιοχών...' : 'Checking areas...'}
                      </p>
                    ) : (
                      <p className="text-[var(--text-muted)] text-sm">
                        {language === 'el'
                          ? 'Ανεβάστε φωτογραφίες για κάθε ακίνητο (προαιρετικό)'
                          : 'Upload photos for each property (optional)'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {parsedHouses.map((house, index) => (
                      <div key={index} className="bg-[var(--ink-soft)]/50 rounded-2xl p-4 border border-[var(--border-subtle)]">
                        <div className="mb-3">
                          <h3 className="text-[var(--text)] font-semibold">
                            {house.title || `House ${index + 1}`}
                          </h3>
                          <p className="text-[var(--text-muted)] text-sm">
                            {[house.city, house.area, house.country].filter(Boolean).join(', ')}
                          </p>
                        </div>

                        {/* Area validation warning */}
                        {(() => {
                          const ua = unknownAreas.find(u => u.rowIndex === house.rowIndex)
                          if (!ua) return null
                          const decision = areaDecisions[house.rowIndex]
                          const isEditingNew = areaEditingNew[house.rowIndex]
                          const customName = areaCustomNames[house.rowIndex] ?? ua.areaInput

                          const undoButton = (
                            <button
                              type="button"
                              onClick={() => {
                                setAreaDecisions(prev => { const n = { ...prev }; delete n[house.rowIndex]; return n })
                                setAreaEditingNew(prev => ({ ...prev, [house.rowIndex]: false }))
                              }}
                              className="text-xs underline underline-offset-2 opacity-60 hover:opacity-100 transition-opacity ml-2"
                            >
                              {language === 'el' ? 'Αναίρεση' : 'Undo'}
                            </button>
                          )

                          if (decision === 'confirmed') {
                            return (
                              <div className="mb-3 px-4 py-3 bg-[var(--status-success-bg)] border border-[var(--status-success)]/30 rounded-xl text-sm flex items-center justify-between">
                                <span className="text-[var(--status-success)] font-medium">
                                  {language === 'el'
                                    ? `✓ Αντιστοιχίστηκε στην υπάρχουσα περιοχή "${ua.suggestion}"`
                                    : `✓ Mapped to existing area "${ua.suggestion}"`}
                                </span>
                                {undoButton}
                              </div>
                            )
                          }

                          if (decision === 'new') {
                            return (
                              <div className="mb-3 px-4 py-3 bg-[var(--status-success-bg)] border border-[var(--status-success)]/30 rounded-xl text-sm flex items-center justify-between">
                                <span className="text-[var(--status-success)] font-medium">
                                  {language === 'el'
                                    ? `✓ Νέα περιοχή "${areaCustomNames[house.rowIndex]}" θα καταχωρηθεί στη βάση`
                                    : `✓ New area "${areaCustomNames[house.rowIndex]}" will be registered`}
                                </span>
                                {undoButton}
                              </div>
                            )
                          }

                          if (decision === 'rejected') {
                            return (
                              <div className="mb-3 px-4 py-3 bg-[var(--status-error-bg)] border border-[var(--status-error)]/30 rounded-xl text-sm flex items-center justify-between">
                                <span className="text-[var(--status-error)]">
                                  {language === 'el'
                                    ? `✗ Διορθώστε "${ua.areaInput}" στο Excel και ανεβάστε ξανά`
                                    : `✗ Please correct "${ua.areaInput}" in your Excel and re-upload`}
                                </span>
                                {undoButton}
                              </div>
                            )
                          }

                          // Pending — no decision yet
                          return (
                            <div className="mb-3 px-4 py-3 bg-[var(--status-warning-bg)] border border-[var(--status-warning)]/30 rounded-xl text-sm space-y-3">
                              <div>
                                <p className="font-semibold text-[var(--text)]">
                                  {language === 'el' ? '⚠ Περιοχή δεν αναγνωρίστηκε' : '⚠ Area not recognised'}
                                </p>
                                <p className="text-[var(--text-muted)] mt-0.5">
                                  {ua.suggestion
                                    ? (language === 'el'
                                      ? `Πληκτρολογήσατε "${ua.areaInput}" — η πλησιέστερη αντιστοιχία είναι "${ua.suggestion}"`
                                      : `You entered "${ua.areaInput}" — closest match is "${ua.suggestion}"`)
                                    : (language === 'el'
                                      ? `Η περιοχή "${ua.areaInput}" δεν βρέθηκε στη βάση δεδομένων`
                                      : `"${ua.areaInput}" was not found in the database`)}
                                </p>
                              </div>

                              {isEditingNew || !ua.suggestion ? (
                                // New area name input (shown when no suggestion, or user chose to register new)
                                <div className="space-y-2">
                                  <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                                    {language === 'el' ? 'Όνομα νέας περιοχής' : 'New area name'}
                                  </label>
                                  <input
                                    type="text"
                                    value={customName}
                                    onChange={e => setAreaCustomNames(prev => ({ ...prev, [house.rowIndex]: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                                    placeholder={ua.areaInput}
                                  />
                                  <div className="flex gap-2 flex-wrap">
                                    <button
                                      type="button"
                                      disabled={!customName.trim()}
                                      onClick={() => {
                                        if (!areaCustomNames[house.rowIndex]) {
                                          setAreaCustomNames(prev => ({ ...prev, [house.rowIndex]: customName }))
                                        }
                                        setAreaDecisions(prev => ({ ...prev, [house.rowIndex]: 'new' }))
                                        setAreaEditingNew(prev => ({ ...prev, [house.rowIndex]: false }))
                                      }}
                                      className="px-4 py-1.5 bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 text-[var(--ink)] rounded-lg text-xs font-semibold transition-opacity"
                                    >
                                      {language === 'el' ? 'Καταχώρηση νέας περιοχής' : 'Register new area'}
                                    </button>
                                    {isEditingNew && (
                                      <button
                                        type="button"
                                        onClick={() => setAreaEditingNew(prev => ({ ...prev, [house.rowIndex]: false }))}
                                        className="px-4 py-1.5 border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg text-xs font-semibold transition-colors"
                                      >
                                        {language === 'el' ? 'Ακύρωση' : 'Cancel'}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setAreaDecisions(prev => ({ ...prev, [house.rowIndex]: 'rejected' }))}
                                      className="px-4 py-1.5 border border-[var(--status-error)]/40 text-[var(--status-error)] hover:bg-[var(--status-error-bg)] rounded-lg text-xs font-semibold transition-colors"
                                    >
                                      {language === 'el' ? 'Θα το διορθώσω στο Excel' : 'Correct in Excel'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                // Suggestion exists — show primary actions
                                <div className="flex gap-2 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => setAreaDecisions(prev => ({ ...prev, [house.rowIndex]: 'confirmed' }))}
                                    className="px-4 py-1.5 bg-[var(--status-success)] hover:opacity-90 text-white rounded-lg text-xs font-semibold transition-opacity"
                                  >
                                    {language === 'el' ? `Χρήση "${ua.suggestion}"` : `Use "${ua.suggestion}"`}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAreaEditingNew(prev => ({ ...prev, [house.rowIndex]: true }))}
                                    className="px-4 py-1.5 border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)] rounded-lg text-xs font-semibold transition-colors"
                                  >
                                    {language === 'el' ? 'Καταχώρηση υπό διαφορετικό όνομα' : 'Register under a different name'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAreaDecisions(prev => ({ ...prev, [house.rowIndex]: 'rejected' }))}
                                    className="px-4 py-1.5 border border-[var(--status-error)]/40 text-[var(--status-error)] hover:bg-[var(--status-error-bg)] rounded-lg text-xs font-semibold transition-colors"
                                  >
                                    {language === 'el' ? 'Θα το διορθώσω στο Excel' : 'Correct in Excel'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })()}

                        <div>
                          <p className="block text-sm font-medium text-[var(--text)] mb-2">
                            {language === 'el' ? 'Φωτογραφίες' : 'Photos'} ({language === 'el' ? 'Προαιρετικό' : 'Optional'})
                          </p>
                          <label className="flex items-center gap-3 w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl cursor-pointer hover:border-[var(--accent)] transition-colors">
                            <span className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-hover-bg)]">
                              {language === 'el' ? 'Επιλογή Φωτογραφιών' : 'Choose Photos'}
                            </span>
                            <span className="text-sm text-[var(--text-muted)] truncate">
                              {housePhotos[house.rowIndex]?.length
                                ? `${housePhotos[house.rowIndex].length} ${language === 'el' ? 'φωτογραφία(ες) επιλέχθηκε(αν)' : 'photo(s) selected'}`
                                : (language === 'el' ? 'Δεν έχουν επιλεχθεί φωτογραφίες' : 'No photos chosen')}
                            </span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || [])
                                setHousePhotos((prev) => ({
                                  ...prev,
                                  [house.rowIndex]: files,
                                }))
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  {bulkJobId && (
                    <div className="pt-2 pb-1">
                      <p className="text-sm text-[var(--text-muted)] mb-2">
                        {language === 'el'
                          ? `Επεξεργασία ${bulkJobProgress} από ${bulkJobTotal} ακίνητα...`
                          : `Processing ${bulkJobProgress} of ${bulkJobTotal} homes...`}
                      </p>
                      <div className="w-full bg-[var(--border-subtle)] rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[var(--accent)] h-2 rounded-full transition-all duration-500"
                          style={{ width: bulkJobTotal > 0 ? `${Math.round((bulkJobProgress / bulkJobTotal) * 100)}%` : '0%' }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap justify-end gap-4 pt-4">
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
                        setUnknownAreas([])
                        setAreaDecisions({})
                        setBulkJobId(null)
                      }}
                      className="min-w-[8rem] px-6 py-3 bg-[var(--ink-soft)] text-[var(--text)] rounded-xl hover:bg-[var(--ink-soft)] transition-all font-semibold text-sm border border-[var(--border-subtle)]"
                    >
                      {getTranslation(language, 'cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={
                        bulkUploadLoading ||
                        !!bulkJobId ||
                        areaValidating ||
                        unknownAreas.some(ua => !areaDecisions[ua.rowIndex]) ||
                        unknownAreas.some(ua => areaDecisions[ua.rowIndex] === 'rejected')
                      }
                      className="min-w-[8rem] px-6 py-3 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] rounded-xl hover:bg-[var(--btn-primary-hover-bg)] transition-colors font-semibold text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bulkJobId
                        ? (language === 'el' ? 'Επεξεργασία...' : 'Processing...')
                        : bulkUploadLoading
                          ? (language === 'el' ? 'Ανέβασμα...' : 'Uploading...')
                          : areaValidating
                            ? (language === 'el' ? 'Έλεγχος...' : 'Checking...')
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
