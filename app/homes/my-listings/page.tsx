'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'
import { getCityName, getCountryName, getAreaName, getHomeTitle, getHomeStreet } from '@/lib/area-utils'
import TranslatedDescription from '@/app/components/TranslatedDescription'
import { SkeletonList } from '@/app/components/SkeletonCard'
import ConfirmDialog from '@/app/components/ConfirmDialog'
import UpgradeGate from '@/app/components/UpgradeGate'

interface Home {
  id: number
  key: string
  title: string
  titleGreek?: string | null
  description: string | null
  descriptionGreek: string | null
  street: string | null
  streetGreek?: string | null
  city: string
  country: string
  area: string | null
  listingType: string
  pricePerMonth: number
  bedrooms: number
  bathrooms: number
  sizeSqMeters: number | null
  finalized: boolean
  slotPromoted: boolean
  promotedUntil: string | null
  createdAt: string
  inquiryCount?: number
}

export default function MyListingsPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [userHomes, setUserHomes] = useState<Home[]>([])
  const [loading, setLoading] = useState(true)
  const [areas, setAreas] = useState<Array<{ name: string; nameGreek: string | null; city: string | null; cityGreek: string | null; country: string | null; countryGreek: string | null }>>([])
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'plus' | 'pro'>('free')
  const [slotsUsed, setSlotsUsed] = useState(0)
  const [promotingKey, setPromotingKey] = useState<string | null>(null)

  const slotLimit = subscriptionTier === 'pro' ? 5 : subscriptionTier === 'plus' ? 2 : 0

  async function handlePromote(homeKey: string, mode: 'slot' | 'boost') {
    setPromotingKey(homeKey)
    try {
      const res = await fetch('/api/homes/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeKey, mode }),
      })
      const data = await res.json()
      if (!res.ok) return
      setUserHomes(prev => prev.map(h => {
        if (h.key !== homeKey) return h
        if (mode === 'slot') return { ...h, slotPromoted: data.slotPromoted }
        return { ...h, promotedUntil: data.promotedUntil }
      }))
      setSlotsUsed(prev => {
        if (mode !== 'slot') return prev
        return data.slotPromoted ? prev + 1 : prev - 1
      })
    } finally {
      setPromotingKey(null)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileResponse = await fetch('/api/profile')
        if (!profileResponse.ok) { router.push('/login'); return }
        const profileData = await profileResponse.json()
        if (!profileData.user) { router.push('/login'); return }

        const role = profileData.user.role || 'user'
        if (role !== 'owner' && role !== 'both' && role !== 'broker') {
          router.push('/profile')
          return
        }
        const tier = profileData.user.subscriptionTier ?? 'free'
        setSubscriptionTier(tier)

        const homesResponse = await fetch('/api/homes/my-listings')
        if (homesResponse.ok) {
          const homesData = await homesResponse.json()
          setUserHomes(homesData.homes || [])
          setSlotsUsed(homesData.slotsUsed ?? 0)
        } else {
          console.error('Failed to fetch listings:', homesResponse.status)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router])

  useEffect(() => {
    fetch('/api/areas')
      .then((res) => res.json())
      .then((data) => setAreas(data.areas || []))
      .catch((error) => console.error('Error fetching areas:', error))
  }, [])

  const toggleSelect = (key: string) => {
    setSelectedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const allSelected = userHomes.length > 0 && selectedKeys.length === userHomes.length
  const toggleAll = () => setSelectedKeys(allSelected ? [] : userHomes.map(h => h.key))

  const handleBulkDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/homes/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: selectedKeys }),
      })
      if (res.ok) {
        setUserHomes(prev => prev.filter(h => !selectedKeys.includes(h.key)))
        setSelectedKeys([])
      }
    } finally {
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 h-10 w-48 rounded-xl bg-[var(--ink-soft)] animate-pulse" />
          <SkeletonList count={4} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-[var(--text)] mb-1">{getTranslation(language, 'myListings')}</h1>
            <p className="text-[var(--text-muted)]">{getTranslation(language, 'manageListings')}</p>
          </div>

          {/* Slot counter — Plus/Pro only */}
          {slotLimit > 0 && (
            <div className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl border border-amber-500/25 bg-amber-500/8">
              <div className="flex gap-1">
                {Array.from({ length: slotLimit }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${i < slotsUsed ? 'bg-amber-400' : 'bg-[var(--border-subtle)]'}`}
                  />
                ))}
              </div>
              <span className="text-xs text-amber-300/80 font-medium">
                {slotsUsed}/{slotLimit} {language === 'el' ? 'θέσεις' : 'slots'}
              </span>
            </div>
          )}
        </div>

        <div className="mb-6 flex items-center justify-between gap-4">
          {userHomes.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              {allSelected
                ? (language === 'el' ? 'Αποεπιλογή όλων' : 'Deselect all')
                : (language === 'el' ? 'Επιλογή όλων' : 'Select all')}
            </button>
          )}
          <Link
            href="/homes/new"
            className="ml-auto px-6 py-3 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] rounded-2xl hover:bg-[var(--btn-primary-hover-bg)] transition-all font-semibold shadow-lg shadow-[var(--accent)]/15 hover:shadow-xl transform hover:-translate-y-0.5"
          >
            + {getTranslation(language, 'newListing')}
          </Link>
        </div>

        {userHomes.length === 0 ? (
          <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-12 text-center shadow-xl border border-[var(--border-subtle)]">
            <p className="text-xl text-[var(--text-muted)]">{getTranslation(language, 'noListings')}</p>
          </div>
        ) : (
          <div className="space-y-4 pb-24">
            {userHomes.map((home) => {
              const isSelected = selectedKeys.includes(home.key)
              return (
                <div
                  key={home.id}
                  className={`relative bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-6 shadow-xl border transition-all ${
                    isSelected
                      ? 'border-[var(--status-error)]/50 ring-2 ring-[var(--status-error)]/20'
                      : home.finalized
                        ? 'border-purple-500/50 opacity-60'
                        : 'border-[var(--border-subtle)] hover:border-[var(--accent)]/35 transform hover:-translate-y-1'
                  }`}
                >
                  {/* Checkbox — top right, outside Link */}
                  <div className="absolute top-5 right-5 z-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(home.key)}
                      onClick={e => e.stopPropagation()}
                      aria-label={language === 'el' ? `Επιλογή: ${getHomeTitle(language, home)}` : `Select: ${getHomeTitle(language, home)}`}
                      className="w-5 h-5 cursor-pointer accent-[var(--status-error)] rounded"
                    />
                  </div>

                  {home.finalized && (
                    <div className="mb-4 p-3 bg-purple-600/20 border border-purple-500/50 rounded-xl text-center">
                      <p className="text-sm font-bold text-purple-400 uppercase">
                        {getTranslation(language, 'dealDone')}
                      </p>
                    </div>
                  )}

                  <Link
                    href={home.finalized ? '#' : `/homes/${home.key}?from=my-listings`}
                    onClick={(e) => {
                      if (home.finalized) e.preventDefault()
                    }}
                    className={`block pr-8 ${home.finalized ? 'pointer-events-none' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-2xl font-bold text-[var(--text)]">{getHomeTitle(language, home)}</h3>
                          <span className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                            home.listingType === 'rent'
                              ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]'
                              : 'bg-[var(--ink-soft)] text-[var(--text)] border border-[var(--accent)]'
                          }`}>
                            {home.listingType === 'rent' ? `🏠 ${getTranslation(language, 'rent')}` : `💰 ${getTranslation(language, 'sell')}`}
                          </span>
                          {!home.finalized && (home.inquiryCount ?? 0) > 0 && (
                            <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-[var(--status-info-bg)] text-[var(--status-info)] border border-[var(--status-info)]/30">
                              {home.inquiryCount} {language === 'el' ? 'ενδιαφερόμενοι' : `inquir${home.inquiryCount === 1 ? 'y' : 'ies'}`}
                            </span>
                          )}
                        </div>
                        <p className="text-[var(--text-muted)] flex items-center gap-1 mb-2">
                          <span>📍</span>
                          {getHomeStreet(language, home) && <span>{getHomeStreet(language, home)}, </span>}
                          {home.area && <span>{getAreaName(home.area, areas, language)}, </span>}
                          {getCityName(home.city, areas, language)}, {getCountryName(home.country, areas, language)}
                        </p>
                        {(home.description || home.descriptionGreek) && (
                          <TranslatedDescription
                            description={home.description}
                            descriptionGreek={home.descriptionGreek}
                            className="text-[var(--text-muted)] line-clamp-2"
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
                      <div>
                        <p className="text-3xl font-bold text-[var(--text)]">
                          €{home.pricePerMonth.toLocaleString()}
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">
                          {home.listingType === 'rent' ? getTranslation(language, 'perMonth') : getTranslation(language, 'totalPrice')}
                        </p>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
                        <span>{home.bedrooms} {getTranslation(language, 'bedrooms')}</span>
                        <span>{home.bathrooms} {getTranslation(language, 'bathrooms')}</span>
                        {home.sizeSqMeters && <span>{home.sizeSqMeters} m²</span>}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <p className="text-xs text-[var(--text-muted)]">
                        {getTranslation(language, 'publishedOn')} {new Date(home.createdAt).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      {subscriptionTier === 'free' ? (
                        <UpgradeGate requiredTier="plus" currentTier={subscriptionTier} feature="promote" mode="replace">
                          <button className="text-xs px-3 py-1.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] font-semibold">
                            ⭐ {language === 'el' ? 'Προώθηση' : 'Promote'}
                          </button>
                        </UpgradeGate>
                      ) : home.slotPromoted ? (
                        <button
                          onClick={() => handlePromote(home.key, 'slot')}
                          disabled={promotingKey === home.key}
                          className="text-xs px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 transition-all font-semibold disabled:opacity-50"
                        >
                          ⭐ {language === 'el' ? 'Θέση ✓' : 'Slot ✓'}
                        </button>
                      ) : slotsUsed < slotLimit ? (
                        <button
                          onClick={() => handlePromote(home.key, 'slot')}
                          disabled={promotingKey === home.key}
                          className="text-xs px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all disabled:opacity-50"
                        >
                          ⭐ {language === 'el' ? 'Προσθήκη σε θέση' : 'Add to slot'}
                        </button>
                      ) : home.promotedUntil && new Date(home.promotedUntil) > new Date() ? (
                        <span className="text-xs text-[var(--text-muted)]">
                          {language === 'el' ? 'Boost έως ' : 'Boosted until '}
                          {new Date(home.promotedUntil).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePromote(home.key, 'boost')}
                          disabled={promotingKey === home.key}
                          className="text-xs px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-amber-500/30 hover:text-amber-400 transition-all disabled:opacity-50"
                        >
                          ⚡ {language === 'el' ? 'Boost €4.99 / 30μ.' : 'Boost €4.99 / 30d'}
                        </button>
                      )}
                    </div>
                  </Link>

                  {/* Analytics link — Plus/Pro only */}
                  {subscriptionTier !== 'free' && (
                    <div className="px-1 pt-2 pb-1">
                      <Link
                        href={`/homes/${home.key}/analytics`}
                        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        {language === 'el' ? 'Στατιστικά' : 'Analytics'}
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating bulk-action bar */}
      {selectedKeys.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[var(--z-fixed)] flex items-center gap-4 px-6 py-4 bg-[var(--surface-high)] border border-[var(--border-default)] rounded-2xl shadow-2xl backdrop-blur-xl">
          <span className="text-[var(--text)] font-semibold text-sm">
            {selectedKeys.length} {language === 'el' ? 'επιλεγμένα' : 'selected'}
          </span>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={deleting}
            className="btn-danger px-5 py-2 text-sm"
          >
            {language === 'el' ? `Διαγραφή (${selectedKeys.length})` : `Delete (${selectedKeys.length})`}
          </button>
          <button
            onClick={() => setSelectedKeys([])}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            {language === 'el' ? 'Εκκαθάριση' : 'Clear'}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        language={language}
        variant="danger"
        title={language === 'el' ? 'Διαγραφή αγγελιών' : 'Delete listings'}
        message={
          language === 'el'
            ? `Είστε σίγουροι ότι θέλετε να διαγράψετε ${selectedKeys.length} ${selectedKeys.length === 1 ? 'αγγελία' : 'αγγελίες'}; Η ενέργεια αυτή δεν μπορεί να αναιρεθεί.`
            : `Are you sure you want to delete ${selectedKeys.length} listing${selectedKeys.length === 1 ? '' : 's'}? This cannot be undone.`
        }
        confirmLabel={deleting ? (language === 'el' ? 'Διαγραφή...' : 'Deleting...') : (language === 'el' ? 'Ναι, διάγραψε' : 'Yes, delete')}
        cancelLabel={language === 'el' ? 'Ακύρωση' : 'Cancel'}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
