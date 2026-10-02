'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'
import NotificationPopup from '@/app/components/NotificationPopup'
import RatingForm from '@/app/components/RatingForm'

interface PendingRating {
  actionType: 'viewing_tenant' | 'moveout_tenant'
  finalizationId?: number
  bookingId?: number
  ratedUserId?: number
  homeKey: string
  homeTitle: string
  counterpartName: string | null
  dueDate?: string
}

export default function RateUserPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [pending, setPending] = useState<PendingRating[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PendingRating | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const profileRes = await fetch('/api/profile')
      if (!profileRes.ok) { router.push('/login'); return }
      const { user } = await profileRes.json()
      if (!user || (user.role !== 'owner' && user.role !== 'broker' && user.role !== 'both')) {
        router.push('/profile'); return
      }

      const res = await fetch('/api/ratings/pending')
      if (res.ok) {
        const data = await res.json()
        setPending((data.pending ?? []).filter((p: PendingRating) =>
          p.actionType === 'viewing_tenant' || p.actionType === 'moveout_tenant'
        ))
      }
      setLoading(false)
    }
    fetchData()
  }, [router])

  const viewingTenantSections = [
    {
      questions: [
        { key: 'experience', label: 'How was your overall experience with this tenant?' },
      ],
    },
  ]

  const moveoutTenantSections = [
    {
      questions: [
        { key: 'propertyCare', label: 'Did the tenant take good care of the property?' },
        { key: 'rulesPayment', label: 'Did the tenant pay on time and respect house rules?' },
        { key: 'wouldRentAgain', label: 'Would you rent to this tenant again?' },
      ],
    },
  ]

  const handleSubmit = async (scores: Record<string, number>, comment: string) => {
    if (!selected || !selected.ratedUserId) throw new Error('Missing context')

    const body: Record<string, unknown> = {
      type: selected.actionType,
      ratedUserId: selected.ratedUserId,
      scores,
      comment: comment || undefined,
    }

    if (selected.actionType === 'viewing_tenant') {
      body.bookingId = selected.bookingId
    } else {
      body.finalizationId = selected.finalizationId
    }

    const res = await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'Failed to submit rating')
    }
    setNotification({ type: 'success', message: 'Rating submitted.' })
    setSelected(null)
    setPending(prev => prev.filter(p =>
      !(p.finalizationId === selected.finalizationId &&
        p.bookingId === selected.bookingId &&
        p.actionType === selected.actionType)
    ))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <p className="text-[var(--text)]">{getTranslation(language, 'loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/homes/approved" className="text-[var(--text-muted)] hover:text-[var(--text)] mb-4 inline-block transition-colors">
            ← {getTranslation(language, 'back')}
          </Link>
          <h1 className="text-4xl font-bold text-[var(--text)] mb-2">{getTranslation(language, 'rateYourTenants')}</h1>
          <p className="text-[var(--text-muted)]">{getTranslation(language, 'rateTenantSubtitle')}</p>
        </div>

        {pending.length === 0 ? (
          <div className="bg-[var(--surface)] rounded-3xl p-12 text-center shadow-xl border border-[var(--border-subtle)]">
            <p className="text-xl text-[var(--text-muted)]">{getTranslation(language, 'noPendingRatings')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((item, i) => (
              <div key={i} className="bg-[var(--surface)] rounded-3xl p-6 shadow-xl border border-[var(--border-subtle)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-[var(--text)] break-words">{item.homeTitle}</h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      {getTranslation(language, 'tenantLabel')}: <span className="font-semibold text-[var(--text)]">{item.counterpartName ?? getTranslation(language, 'unknownTenant')}</span>
                    </p>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">
                      {item.actionType === 'viewing_tenant' ? getTranslation(language, 'postViewingRating') : getTranslation(language, 'moveOutRating')}
                    </p>
                  </div>
                  <span className={`self-start shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    item.actionType === 'viewing_tenant'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-orange-500/20 text-orange-400'
                  }`}>
                    {item.actionType === 'viewing_tenant' ? getTranslation(language, 'viewing') : getTranslation(language, 'moveOut')}
                  </span>
                </div>
                <button
                  onClick={() => setSelected(item)}
                  className="w-full px-4 py-2.5 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover-bg)] text-[var(--btn-primary-fg)] rounded-xl font-semibold text-sm transition-all"
                >
                  {getTranslation(language, 'rateNow')}
                </button>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
            <div className="bg-[var(--ink-soft)] rounded-3xl shadow-2xl border border-[var(--border-subtle)] max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text)]">{selected.counterpartName ?? getTranslation(language, 'tenantLabel')}</h2>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">{selected.homeTitle}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl ml-4">×</button>
              </div>
              <RatingForm
                sections={selected.actionType === 'viewing_tenant' ? viewingTenantSections : moveoutTenantSections}
                allowComment={selected.actionType === 'moveout_tenant'}
                commentPlaceholder={getTranslation(language, 'shareTenantExperiencePlaceholder')}
                onSubmit={handleSubmit}
                onCancel={() => setSelected(null)}
                submitLabel={getTranslation(language, 'submitRating')}
              />
            </div>
          </div>
        )}
      </div>

      {notification && (
        <NotificationPopup
          type={notification.type}
          message={notification.message}
          language={language}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  )
}
