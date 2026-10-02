'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { useRole } from '@/app/contexts/RoleContext'
import { getTranslation } from '@/lib/translations'
import { getCityName, getCountryName, getAreaName, getHomeTitle, getHomeStreet } from '@/lib/area-utils'
import TranslatedDescription from '@/app/components/TranslatedDescription'
import { SkeletonList } from '@/app/components/SkeletonCard'
import ConfirmDialog from '@/app/components/ConfirmDialog'
import UpgradeGate from '@/app/components/UpgradeGate'
import { localeFor } from '@/lib/format'

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
  overlimitHiddenAt: string | null
  createdAt: string
  inquiryCount?: number
}

type Tab = 'active' | 'hidden'

function MyListingsInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language, isEl } = useLanguage()
  const { brokerCategory } = useRole()
  const agentId = searchParams.get('agent')

  const [allHomes, setAllHomes] = useState<Home[]>([])
  const [readOnly, setReadOnly] = useState(false)
  const [agentName, setAgentName] = useState<string | null>(null)
  const [boostReqByHome, setBoostReqByHome] = useState<Record<string, string>>({})
  const [requestingKey, setRequestingKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [areas, setAreas] = useState<Array<{ name: string; nameGreek: string | null; city: string | null; cityGreek: string | null; country: string | null; countryGreek: string | null }>>([])
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'plus' | 'pro'>('free')
  const [slotsUsed, setSlotsUsed] = useState(0)
  const [promotingKey, setPromotingKey] = useState<string | null>(null)
  const [promoteError, setPromoteError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>(
    searchParams.get('tab') === 'hidden' ? 'hidden' : 'active'
  )

  const slotLimit = subscriptionTier === 'pro' ? 5 : subscriptionTier === 'plus' ? 2 : 0

  const activeHomes = allHomes.filter(h => !h.overlimitHiddenAt)
  const hiddenHomes = allHomes.filter(h => h.overlimitHiddenAt)
  const userHomes = activeTab === 'hidden' ? hiddenHomes : activeHomes

  async function handlePromote(homeKey: string, mode: 'slot' | 'boost') {
    setPromotingKey(homeKey)
    setPromoteError(null)
    try {
      const res = await fetch('/api/homes/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeKey, mode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPromoteError(isEl ? 'Η προώθηση απέτυχε. Δοκιμάστε ξανά.' : 'Promotion failed. Please try again.')
        return
      }
      setAllHomes(prev => prev.map(h => {
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

  // Default (child) broker: request a boost from the Main broker instead of paying directly.
  async function requestBoost(homeKey: string) {
    setRequestingKey(homeKey)
    setPromoteError(null)
    try {
      const res = await fetch('/api/team/boost-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeKey }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setPromoteError(json.message || (isEl ? 'Το αίτημα απέτυχε.' : 'Request failed.'))
        return
      }
      setBoostReqByHome(prev => ({ ...prev, [homeKey]: 'pending' }))
    } finally {
      setRequestingKey(null)
    }
  }

  // Main broker viewing a team member's listings: proactively boost and pay via Stripe.
  async function proactiveBoost(homeKey: string) {
    setRequestingKey(homeKey)
    setPromoteError(null)
    try {
      const res = await fetch('/api/team/boost-requests/proactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeKey }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.checkoutUrl) { window.location.href = json.checkoutUrl; return }
      setPromoteError(json.message || (isEl ? 'Η προώθηση απέτυχε.' : 'Boost failed.'))
    } finally {
      setRequestingKey(null)
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
        setSubscriptionTier(profileData.user.subscriptionTier ?? 'free')

        const homesResponse = await fetch(`/api/homes/my-listings${agentId ? `?agent=${agentId}` : ''}`)
        if (homesResponse.ok) {
          const homesData = await homesResponse.json()
          setAllHomes(homesData.homes || [])
          setSlotsUsed(homesData.slotsUsed ?? 0)
          setReadOnly(!!homesData.readOnly)
          setAgentName(homesData.agentName ?? null)
        }

        // Default (child) brokers: load existing boost-request states so the button reflects them.
        if (profileData.user.brokerCategory === 'child' && !agentId) {
          const brRes = await fetch('/api/team/boost-requests')
          if (brRes.ok) {
            const { requests } = await brRes.json()
            const map: Record<string, string> = {}
            for (const r of requests) {
              // keep the most recent per home (list is newest-first)
              if (!(r.home.key in map)) map[r.home.key] = r.status
            }
            setBoostReqByHome(map)
          }
        }
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router, agentId])

  useEffect(() => {
    fetch('/api/areas')
      .then(r => r.json())
      .then(d => setAreas(d.areas || []))
      .catch(() => {})
  }, [])

  const toggleSelect = (key: string) => {
    setSelectedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const allSelected = userHomes.length > 0 && selectedKeys.length === userHomes.length
  const toggleAll = () => setSelectedKeys(allSelected ? [] : userHomes.map(h => h.key))

  const handleBulkDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/homes/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: selectedKeys }),
      })
      if (res.ok) {
        setAllHomes(prev => prev.filter(h => !selectedKeys.includes(h.key)))
        setSelectedKeys([])
        setConfirmOpen(false)
      } else {
        setDeleteError(isEl ? 'Η διαγραφή απέτυχε. Δοκιμάστε ξανά.' : 'Delete failed. Please try again.')
        setConfirmOpen(false)
      }
    } catch {
      setDeleteError(isEl ? 'Η διαγραφή απέτυχε. Δοκιμάστε ξανά.' : 'Delete failed. Please try again.')
      setConfirmOpen(false)
    } finally {
      setDeleting(false)
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
        {readOnly && (
          <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-blue-500/30 bg-blue-500/10">
            <span className="text-sm text-blue-300">
              👁 {isEl ? 'Προβολή ομάδας — μόνο ανάγνωση' : 'Team view — read only'}
              {agentName ? ` · ${agentName}` : ''}
            </span>
            <Link href="/homes/agency" className="text-xs text-blue-300 underline shrink-0">{isEl ? 'Πίσω στην ομάδα' : 'Back to team'}</Link>
          </div>
        )}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-[var(--text)] mb-1">
              {readOnly && agentName ? agentName : getTranslation(language, 'myListings')}
            </h1>
            <p className="text-[var(--text-muted)]">{getTranslation(language, 'manageListings')}</p>
          </div>

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
                {slotsUsed}/{slotLimit} {isEl ? 'προωθημένες' : 'promoted'}
              </span>
            </div>
          )}
        </div>

        {/* Tabs: Active / Hidden */}
        {hiddenHomes.length > 0 && (
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => { setActiveTab('active'); setSelectedKeys([]) }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'active'
                  ? 'bg-[var(--accent)] text-[var(--ink)]'
                  : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border-subtle)]'
              }`}
            >
              {isEl ? 'Ενεργές' : 'Active'} ({activeHomes.length})
            </button>
            <button
              onClick={() => { setActiveTab('hidden'); setSelectedKeys([]) }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'hidden'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-amber-300 border border-[var(--border-subtle)]'
              }`}
            >
              {isEl ? 'Κρυφές' : 'Hidden'} ({hiddenHomes.length})
            </button>
          </div>
        )}

        {/* Hidden tab explainer */}
        {activeTab === 'hidden' && hiddenHomes.length > 0 && (
          <div className="mb-6 px-5 py-4 rounded-2xl bg-amber-500/8 border border-amber-500/20">
            <p className="text-sm text-amber-300 font-semibold mb-1">
              {isEl ? 'Αυτές οι αγγελίες δεν είναι ορατές στους ενοικιαστές.' : 'These listings are not visible to renters.'}
            </p>
            <p className="text-xs text-amber-300/70">
              {isEl
                ? 'Αναβαθμίστε το πλάνο σας για να τις επαναφέρετε αυτόματα, ή διαγράψτε αυτές που δεν χρειάζεστε.'
                : 'Upgrade your plan to restore them automatically, or delete the ones you no longer need.'}
            </p>
            <Link
              href="/upgrade"
              className="inline-block mt-3 text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400 transition-colors"
            >
              {isEl ? 'Αναβάθμιση' : 'Upgrade'}
            </Link>
          </div>
        )}

        <div className="mb-6 flex items-center justify-between gap-4">
          {userHomes.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              {allSelected
                ? (isEl ? 'Αποεπιλογή όλων' : 'Deselect all')
                : (isEl ? 'Επιλογή όλων' : 'Select all')}
            </button>
          )}
          {activeTab === 'active' && (
            <Link
              href="/homes/new"
              className="ml-auto px-6 py-3 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] rounded-2xl hover:bg-[var(--btn-primary-hover-bg)] transition-all font-semibold shadow-lg shadow-[var(--accent)]/15 hover:shadow-xl transform hover:-translate-y-0.5"
            >
              + {getTranslation(language, 'newListing')}
            </Link>
          )}
        </div>

        {promoteError && (
          <div className="mb-4 px-4 py-3 rounded-2xl bg-[var(--status-error-bg)] border border-[var(--status-error)]/30 text-[var(--status-error)] text-sm flex items-center justify-between">
            <span>{promoteError}</span>
            <button type="button" onClick={() => setPromoteError(null)} className="ml-4 text-[var(--status-error)]/60 hover:text-[var(--status-error)] transition-colors">✕</button>
          </div>
        )}
        {deleteError && (
          <div className="mb-4 px-4 py-3 rounded-2xl bg-[var(--status-error-bg)] border border-[var(--status-error)]/30 text-[var(--status-error)] text-sm flex items-center justify-between">
            <span>{deleteError}</span>
            <button type="button" onClick={() => setDeleteError(null)} className="ml-4 text-[var(--status-error)]/60 hover:text-[var(--status-error)] transition-colors">✕</button>
          </div>
        )}

        {userHomes.length === 0 ? (
          <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-12 text-center shadow-xl border border-[var(--border-subtle)]">
            <p className="text-xl text-[var(--text-muted)]">
              {activeTab === 'hidden'
                ? (isEl ? 'Δεν υπάρχουν κρυφές αγγελίες.' : 'No hidden listings.')
                : getTranslation(language, 'noListings')}
            </p>
          </div>
        ) : (
          <div className="space-y-4 pb-24">
            {userHomes.map((home) => {
              const isSelected = selectedKeys.includes(home.key)
              const isHidden = Boolean(home.overlimitHiddenAt)
              return (
                <div
                  key={home.id}
                  className={`relative bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-6 shadow-xl border transition-all ${
                    isHidden
                      ? 'border-amber-500/20 opacity-70'
                      : isSelected
                        ? 'border-[var(--status-error)]/50 ring-2 ring-[var(--status-error)]/20'
                        : home.finalized
                          ? 'border-purple-500/50 opacity-60'
                          : 'border-[var(--border-subtle)] hover:border-[var(--accent)]/35 transform hover:-translate-y-1'
                  }`}
                >
                  {/* Hidden badge */}
                  {isHidden && (
                    <div className="mb-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 w-fit">
                      <span className="text-amber-400 text-xs">⚠</span>
                      <span className="text-xs font-semibold text-amber-300">
                        {isEl ? 'Κρυφή — μη ορατή σε ενοικιαστές' : 'Hidden — not visible to renters'}
                      </span>
                    </div>
                  )}

                  {/* Checkbox */}
                  <div className="absolute top-5 right-5 z-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(home.key)}
                      onClick={e => e.stopPropagation()}
                      aria-label={isEl ? `Επιλογή: ${getHomeTitle(language, home)}` : `Select: ${getHomeTitle(language, home)}`}
                      className="w-5 h-5 cursor-pointer accent-[var(--status-error)] rounded"
                    />
                  </div>

                  {home.finalized && !isHidden && (
                    <div className="mb-4 p-3 bg-purple-600/20 border border-purple-500/50 rounded-xl text-center">
                      <p className="text-sm font-bold text-purple-400 uppercase">
                        {getTranslation(language, 'dealDone')}
                      </p>
                    </div>
                  )}

                  <Link
                    href={`/homes/${home.key}?from=my-listings`}
                    className={`block pr-8 ${home.finalized ? 'pointer-events-none' : ''}`}
                    tabIndex={home.finalized ? -1 : undefined}
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
                          {!home.finalized && !isHidden && (home.inquiryCount ?? 0) > 0 && (
                            <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-[var(--status-info-bg)] text-[var(--status-info)] border border-[var(--status-info)]/30">
                              {home.inquiryCount} {isEl ? 'ενδιαφερόμενοι' : `inquir${home.inquiryCount === 1 ? 'y' : 'ies'}`}
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

                    {!isHidden && (
                      <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                        <p className="text-xs text-[var(--text-muted)]">
                          {getTranslation(language, 'publishedOn')} {new Date(home.createdAt).toLocaleDateString(localeFor(language), {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        {readOnly ? (
                          home.promotedUntil && new Date(home.promotedUntil) > new Date() ? (
                            <span className="text-xs text-emerald-300">
                              ⭐ {isEl ? 'Προωθείται έως ' : 'Boosted until '}
                              {new Date(home.promotedUntil).toLocaleDateString(localeFor(language), { month: 'short', day: 'numeric' })}
                            </span>
                          ) : (
                            <button
                              onClick={() => proactiveBoost(home.key)}
                              disabled={requestingKey === home.key}
                              className="text-xs px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all disabled:opacity-50"
                            >
                              ⚡ {isEl ? 'Προώθηση €4.99 / 30 μέρες' : 'Boost €4.99 / 30d'}
                            </button>
                          )
                        ) : subscriptionTier === 'free' ? (
                          <UpgradeGate requiredTier="plus" currentTier={subscriptionTier} feature="promote" mode="replace">
                            <button className="text-xs px-3 py-1.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] font-semibold">
                              ⭐ {isEl ? 'Προώθηση' : 'Promote'}
                            </button>
                          </UpgradeGate>
                        ) : home.slotPromoted ? (
                          <button
                            onClick={() => handlePromote(home.key, 'slot')}
                            disabled={promotingKey === home.key}
                            className="text-xs px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 transition-all font-semibold disabled:opacity-50"
                          >
                            ⭐ {isEl ? 'Προωθείται ✓' : 'Promoted ✓'}
                          </button>
                        ) : slotsUsed < slotLimit ? (
                          <button
                            onClick={() => handlePromote(home.key, 'slot')}
                            disabled={promotingKey === home.key}
                            className="text-xs px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all disabled:opacity-50"
                          >
                            ⭐ {isEl ? 'Προώθηση' : 'Promote'}
                          </button>
                        ) : home.promotedUntil && new Date(home.promotedUntil) > new Date() ? (
                          <span className="text-xs text-[var(--text-muted)]">
                            {isEl ? 'Προωθείται έως ' : 'Promoted until '}
                            {new Date(home.promotedUntil).toLocaleDateString(localeFor(language), { month: 'short', day: 'numeric' })}
                          </span>
                        ) : brokerCategory === 'child' ? (
                          boostReqByHome[home.key] === 'pending' ? (
                            <span className="text-xs text-amber-300">⏳ {isEl ? 'Ζητήθηκε προώθηση' : 'Boost requested'}</span>
                          ) : (
                            <button
                              onClick={() => requestBoost(home.key)}
                              disabled={requestingKey === home.key}
                              className="text-xs px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-amber-500/30 hover:text-amber-400 transition-all disabled:opacity-50"
                            >
                              {boostReqByHome[home.key] === 'rejected'
                                ? <>✕ {isEl ? 'Απορρίφθηκε · Ξανά' : 'Declined · Request again'}</>
                                : <>⚡ {isEl ? 'Αίτημα προώθησης' : 'Request boost from team'}</>}
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => handlePromote(home.key, 'boost')}
                            disabled={promotingKey === home.key}
                            className="text-xs px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-amber-500/30 hover:text-amber-400 transition-all disabled:opacity-50"
                          >
                            ⚡ {isEl ? 'Προώθηση €4.99 / 30 μέρες' : 'Promote €4.99 / 30d'}
                          </button>
                        )}
                      </div>
                    )}
                  </Link>

                  {!isHidden && !home.finalized && (home.inquiryCount ?? 0) > 0 && (
                    <div className="px-1 pt-2 pb-1">
                      <Link
                        href={`/homes/inquiries/${home.key}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400 hover:text-green-300 transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {isEl ? `Διαχείριση αιτημάτων (${home.inquiryCount})` : `Manage inquiries (${home.inquiryCount})`}
                      </Link>
                    </div>
                  )}

                  {!isHidden && subscriptionTier !== 'free' && (
                    <div className="px-1 pt-2 pb-1">
                      <Link
                        href="/homes/analytics"
                        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        {isEl ? 'Στατιστικά' : 'Analytics'}
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedKeys.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[var(--z-fixed)] flex items-center gap-4 px-6 py-4 bg-[var(--surface-high)] border border-[var(--border-default)] rounded-2xl shadow-2xl backdrop-blur-xl">
          <span className="text-[var(--text)] font-semibold text-sm">
            {selectedKeys.length} {isEl ? 'επιλεγμένα' : 'selected'}
          </span>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={deleting}
            className="btn-danger px-5 py-2 text-sm"
          >
            {isEl ? `Διαγραφή (${selectedKeys.length})` : `Delete (${selectedKeys.length})`}
          </button>
          <button
            onClick={() => setSelectedKeys([])}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            {isEl ? 'Εκκαθάριση' : 'Clear'}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        language={language}
        variant="danger"
        title={isEl ? 'Διαγραφή αγγελιών' : 'Delete listings'}
        message={
          isEl
            ? `Είστε σίγουροι ότι θέλετε να διαγράψετε ${selectedKeys.length} ${selectedKeys.length === 1 ? 'αγγελία' : 'αγγελίες'}; Η ενέργεια αυτή δεν μπορεί να αναιρεθεί.`
            : `Are you sure you want to delete ${selectedKeys.length} listing${selectedKeys.length === 1 ? '' : 's'}? This cannot be undone.`
        }
        confirmLabel={deleting ? (isEl ? 'Διαγραφή...' : 'Deleting...') : (isEl ? 'Ναι, διάγραψε' : 'Yes, delete')}
        cancelLabel={isEl ? 'Ακύρωση' : 'Cancel'}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

export default function MyListingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <SkeletonList count={4} />
        </div>
      </div>
    }>
      <MyListingsInner />
    </Suspense>
  )
}
