'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getCityName, getCountryName, getAreaName, getHomeTitle } from '@/lib/area-utils'

interface Home {
  id: number
  key: string
  title: string
  titleGreek?: string | null
  city: string
  country: string
  area: string | null
  listingType: string
  pricePerMonth: number
  bedrooms: number
  bathrooms: number
  sizeSqMeters: number | null
  floor: number | null
  yearBuilt: number | null
  yearRenovated: number | null
  heatingCategory: string | null
  heatingAgent: string | null
  parking: boolean | null
  energyClass: string | null
  description: string | null
  descriptionGreek: string | null
  photos: string | null
  closestMetro: number | null
  closestSchool: number | null
  closestHospital: number | null
  closestPark: number | null
}

type AreaRow = { name: string; nameGreek: string | null; city: string | null; cityGreek: string | null; country: string | null; countryGreek: string | null }

function fmt(v: number | null | undefined, unit = '') {
  return v != null ? `${v}${unit}` : '—'
}
function fmtBool(v: boolean | null | undefined, language: string) {
  if (v == null) return '—'
  return v ? (language === 'el' ? 'Ναι' : 'Yes') : (language === 'el' ? 'Όχι' : 'No')
}

function CompareContent() {
  const { language } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEl = language === 'el'

  const keys = (searchParams.get('keys') ?? '').split(',').filter(Boolean).slice(0, 3)
  const [homes, setHomes] = useState<Home[]>([])
  const [areas, setAreas] = useState<AreaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (keys.length === 0) { setLoading(false); return }
    Promise.all([
      ...keys.map(k => fetch(`/api/homes/${k}`).then(r => r.json())),
      fetch('/api/areas').then(r => r.json()),
    ]).then(results => {
      const areasData = results[results.length - 1]
      setAreas(areasData.areas ?? [])
      const fetched = results.slice(0, keys.length).map(d => d.home).filter(Boolean)
      setHomes(fetched)
    }).catch(() => setError(isEl ? 'Σφάλμα φόρτωσης' : 'Failed to load')).finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join(',')])

  const parsePhotos = (raw: string | null) => {
    try { const p = JSON.parse(raw ?? '[]'); return Array.isArray(p) ? p : [] } catch { return [] }
  }

  if (loading) return (
    <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)]/25 border-t-[var(--accent)] animate-spin" />
    </div>
  )

  if (error || keys.length === 0) return (
    <div className="min-h-screen bg-[var(--ink-soft)] flex flex-col items-center justify-center gap-4">
      <p className="text-[var(--text-muted)]">{error ?? (isEl ? 'Δεν επιλέχτηκαν ακίνητα για σύγκριση.' : 'No properties selected for comparison.')}</p>
      <Link href="/homes" className="btn-primary">{isEl ? 'Αναζήτηση' : 'Browse properties'}</Link>
    </div>
  )

  // bestIs: 'min' = lower value is better, 'max' = higher is better, null = no highlight
  const rows: Array<{ label: string; values: (home: Home) => string; numericValue?: (home: Home) => number | null; bestIs: 'min' | 'max' | null }> = [
    { label: isEl ? 'Τιμή' : 'Price', values: h => `€${h.pricePerMonth.toLocaleString()}${h.listingType === 'rent' ? '/μήνα' : ''}`, numericValue: h => h.pricePerMonth, bestIs: 'min' },
    { label: isEl ? 'Τύπος' : 'Type', values: h => h.listingType === 'rent' ? (isEl ? 'Ενοικίαση' : 'Rent') : (isEl ? 'Πώληση' : 'Sale'), bestIs: null },
    { label: isEl ? 'Υπνοδωμάτια' : 'Bedrooms', values: h => fmt(h.bedrooms), numericValue: h => h.bedrooms, bestIs: 'max' },
    { label: isEl ? 'Μπάνια' : 'Bathrooms', values: h => fmt(h.bathrooms), numericValue: h => h.bathrooms, bestIs: 'max' },
    { label: isEl ? 'Εμβαδόν' : 'Size', values: h => fmt(h.sizeSqMeters, ' m²'), numericValue: h => h.sizeSqMeters, bestIs: 'max' },
    { label: isEl ? 'Όροφος' : 'Floor', values: h => fmt(h.floor), bestIs: null },
    { label: isEl ? 'Έτος κατασκευής' : 'Year built', values: h => fmt(h.yearBuilt), numericValue: h => h.yearBuilt, bestIs: 'max' },
    { label: isEl ? 'Ανακαίνιση' : 'Renovated', values: h => fmt(h.yearRenovated), numericValue: h => h.yearRenovated, bestIs: 'max' },
    { label: isEl ? 'Ενεργειακή κλάση' : 'Energy class', values: h => h.energyClass ?? '—', bestIs: null },
    { label: isEl ? 'Θέρμανση' : 'Heating', values: h => [h.heatingCategory, h.heatingAgent].filter(Boolean).join(' / ') || '—', bestIs: null },
    { label: isEl ? 'Parking' : 'Parking', values: h => fmtBool(h.parking, language), numericValue: h => h.parking == null ? null : h.parking ? 1 : 0, bestIs: 'max' },
    { label: isEl ? 'Μετρό (km)' : 'Metro (km)', values: h => fmt(h.closestMetro), numericValue: h => h.closestMetro, bestIs: 'min' },
    { label: isEl ? 'Σχολείο (km)' : 'School (km)', values: h => fmt(h.closestSchool), numericValue: h => h.closestSchool, bestIs: 'min' },
    { label: isEl ? 'Νοσοκομείο (km)' : 'Hospital (km)', values: h => fmt(h.closestHospital), numericValue: h => h.closestHospital, bestIs: 'min' },
    { label: isEl ? 'Πάρκο (km)' : 'Park (km)', values: h => fmt(h.closestPark), numericValue: h => h.closestPark, bestIs: 'min' },
  ]

  return (
    <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <button onClick={() => router.back()} className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            ← {isEl ? 'Πίσω' : 'Back'}
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)]">
            {isEl ? 'Σύγκριση ακινήτων' : 'Compare Properties'}
          </h1>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Header row with photo + title */}
            <thead>
              <tr>
                <th className="w-40 p-3 text-left text-sm text-[var(--text-muted)] font-medium sticky left-0 z-10 bg-[var(--ink-soft)]" />
                {homes.map(home => {
                  const photos = parsePhotos(home.photos)
                  return (
                    <th key={home.key} className="p-3 text-left align-top min-w-[200px]">
                      <Link href={`/homes/${home.key}`} className="group block">
                        {photos[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photos[0]} alt={home.title} className="mb-3 h-36 w-full rounded-2xl object-cover" />
                        )}
                        <p className="font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                          {getHomeTitle(language, home)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {home.area ? `${getAreaName(home.area, areas, language)}, ` : ''}
                          {getCityName(home.city, areas, language)}, {getCountryName(home.country, areas, language)}
                        </p>
                      </Link>
                    </th>
                  )
                })}
              </tr>
            </thead>

            {/* Comparison rows */}
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? 'bg-[var(--surface)]' : 'bg-[var(--ink-soft)]'}>
                  <td className={`sticky left-0 z-10 rounded-l-xl px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide ${i % 2 === 0 ? 'bg-[var(--surface)]' : 'bg-[var(--ink-soft)]'}`}>
                    {row.label}
                  </td>
                  {homes.map(home => {
                    const val = row.values(home)
                    let isBest = false
                    if (homes.length > 1 && row.bestIs && row.numericValue) {
                      const numericValues = homes.map(h => row.numericValue!(h)).filter((v): v is number => v != null)
                      const thisVal = row.numericValue(home)
                      if (thisVal != null && numericValues.length > 1) {
                        const bestVal = row.bestIs === 'min' ? Math.min(...numericValues) : Math.max(...numericValues)
                        isBest = thisVal === bestVal
                      }
                    }
                    return (
                      <td key={home.key} className={`px-4 py-3 text-sm text-[var(--text)] ${i === homes.length - 1 ? 'rounded-r-xl' : ''} ${isBest && val !== '—' ? 'font-semibold text-[var(--accent)]' : ''}`}>
                        {val}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)]/25 border-t-[var(--accent)] animate-spin" />
      </div>
    }>
      <CompareContent />
    </Suspense>
  )
}
