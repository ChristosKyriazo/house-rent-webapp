'use client'

import Link from 'next/link'
import { getTranslation, type Language } from '@/lib/translations'
import { greekUppercaseNoAnnotations } from '@/lib/utils'
import { getCityName, getCountryName, getAreaName, getHomeTitle } from '@/lib/area-utils'
import TranslatedDescription from './TranslatedDescription'
import { SaveButton } from './SaveButton'

export interface HomeCardHome {
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
  energyClass: string | null
  createdAt: string
  matchPercentage?: number
  incompatibilityReason?: string
  owner: { email: string; name: string | null; createdAt?: string }
}

interface HomeCardProps {
  home: HomeCardHome
  status: 'inquired' | 'approved' | 'dismissed' | undefined
  language: Language
  allAreas: Array<{ id: number; name: string; nameGreek: string | null }>
  areas: Array<{ city: string | null; cityGreek: string | null; country: string | null; countryGreek: string | null }>
  compareKeys: string[]
  onCompareToggle: (key: string) => void
}

interface CardBodyProps {
  home: HomeCardHome
  language: Language
  allAreas: HomeCardProps['allAreas']
  areas: HomeCardProps['areas']
  textColor: string
}

function CardBody({ home, language, allAreas, areas, textColor }: CardBodyProps) {
  return (
    <>
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <h2 className={`text-2xl font-bold flex-1 ${textColor}`}>{getHomeTitle(language, home)}</h2>
          <span className={`px-2 py-1 rounded-lg text-xs font-semibold ml-2 ${
            home.listingType === 'rent'
              ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]'
              : 'border border-[var(--btn-secondary-border)] bg-[var(--btn-secondary-bg)] text-[var(--text)]'
          }`}>
            {home.listingType === 'rent' ? `🏠 ${getTranslation(language, 'rent')}` : `💰 ${getTranslation(language, 'buy')}`}
          </span>
        </div>
        <p className="flex items-center gap-1 text-[var(--text-muted)]">
          <span>📍</span>
          {home.area && <>{getAreaName(home.area, allAreas, language)}, </>}
          {getCityName(home.city, areas, language)}, {getCountryName(home.country, areas, language)}
        </p>
      </div>

      {(home.description || home.descriptionGreek) && (
        <TranslatedDescription
          description={home.description}
          descriptionGreek={home.descriptionGreek}
          className="mb-4 line-clamp-2 text-[var(--text-muted)]"
        />
      )}

      <div className="flex items-center justify-between mb-4 pt-4 border-t border-[var(--border-subtle)]">
        <div>
          <p className={`text-3xl font-bold ${textColor}`}>€{home.pricePerMonth.toLocaleString()}</p>
          <p className="text-sm text-[var(--text-muted)]">
            {home.listingType === 'rent' ? getTranslation(language, 'perMonth') : getTranslation(language, 'totalPrice')}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold ${textColor}`}>
            {home.bedrooms} <span className="text-[var(--text-muted)]">{getTranslation(language, 'bedroomsShort')}</span>
          </p>
          <p className={`text-sm font-semibold ${textColor}`}>
            {home.bathrooms} <span className="text-[var(--text-muted)]">{getTranslation(language, 'bathroomsShort')}</span>
          </p>
        </div>
      </div>

      {home.energyClass && (
        <div className="mb-4 pt-4 border-t border-[var(--border-subtle)]">
          <p className="text-xs text-[var(--text-muted)]">
            {getTranslation(language, 'energyClass')}: <span className={`font-medium ${textColor}`}>{home.energyClass}</span>
          </p>
        </div>
      )}

      <div className="pt-4 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            {getTranslation(language, 'publishedBy')}{' '}
            <span className={`font-medium ${textColor}`}>{home.owner.name || home.owner.email}</span>
          </p>
          {home.owner.createdAt && (
            <span className="text-xs text-[var(--text-muted)]">
              {language === 'el' ? 'Μέλος από' : 'Since'}{' '}
              {new Date(home.owner.createdAt).toLocaleDateString(
                language === 'el' ? 'el-GR' : 'en-GB',
                { month: 'short', year: 'numeric' }
              )}
            </span>
          )}
        </div>
      </div>
    </>
  )
}

export function HomeCard({ home, status, language, allAreas, areas, compareKeys, onCompareToggle }: HomeCardProps) {
  const hasInquiry = status === 'inquired'
  const isApproved = status === 'approved'
  const isDismissed = status === 'dismissed'

  let bannerColor = ''
  let bannerText = ''
  if (hasInquiry) {
    bannerColor = 'bg-[var(--status-warning-bg)] border-[var(--status-warning)] text-[var(--status-warning)]'
    bannerText = getTranslation(language, 'inquiryMadeBanner')
  } else if (isApproved) {
    bannerColor = 'bg-[var(--status-success-bg)] border-[var(--status-success)] text-[var(--status-success)]'
    bannerText = getTranslation(language, 'approvedBanner')
  } else if (isDismissed) {
    bannerColor = 'bg-[var(--status-error-bg)] border-[var(--status-error)] text-[var(--status-error)]'
    bannerText = getTranslation(language, 'dismissedBanner')
  }

  const textColor = status ? 'text-[var(--text)]/50' : 'text-[var(--text)]'

  return (
    <div
      className={`relative bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-6 shadow-xl border transition-all transform hover:-translate-y-1 overflow-hidden ${
        status
          ? 'border-[var(--border-subtle)] opacity-60'
          : 'border-[var(--border-subtle)] hover:border-[var(--accent)]/35'
      }`}
      title={isDismissed ? (language === 'el' ? 'Απέρριψες αυτό το ακίνητο' : 'You dismissed this property') : undefined}
    >
      {/* Save + Compare — top left */}
      <div className="absolute left-4 top-4 z-20 flex gap-1">
        <SaveButton homeKey={home.key} size="sm" />
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onCompareToggle(home.key) }}
          title={language === 'el' ? 'Σύγκριση' : 'Compare'}
          aria-label={language === 'el' ? 'Σύγκριση' : 'Compare'}
          className={`rounded-full p-2 text-xs transition-all hover:scale-110 ${
            compareKeys.includes(home.key)
              ? 'bg-[var(--accent)] text-[var(--ink)]'
              : 'bg-[var(--ink-soft)] text-[var(--text-muted)] hover:text-[var(--accent)]'
          }`}
        >
          ⚖
        </button>
      </div>

      {/* AI match badge — top right */}
      {home.matchPercentage !== undefined && (
        <div className="absolute right-4 top-4 z-20 max-w-[min(14rem,calc(100%-2rem))] text-right">
          <div
            className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold shadow-lg border-2 ${
              home.incompatibilityReason
                ? 'border-[var(--status-error)] bg-[var(--status-error-bg)] text-[var(--status-error)]'
                : home.matchPercentage >= 80
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--ink)]'
                  : home.matchPercentage >= 60
                    ? 'border-[var(--status-warning)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]'
                    : 'border-[var(--border-default)] bg-[var(--ink-soft)] text-[var(--text-muted)]'
            }`}
            title={home.incompatibilityReason || undefined}
          >
            {home.matchPercentage.toFixed(1)}% Match
          </div>
          {home.incompatibilityReason && (
            <p className="mt-1 text-[10px] leading-snug text-[var(--text-muted)]">
              {home.incompatibilityReason}
            </p>
          )}
        </div>
      )}

      {/* Status sticker banner */}
      {status && (
        <div className="absolute top-1/2 left-1/2 z-10 transform -translate-x-1/2 -translate-y-1/2 origin-center">
          <div
            className={`relative ${bannerColor} px-6 py-3 shadow-lg border-2 whitespace-nowrap`}
            style={{
              clipPath: 'polygon(2% 0%, 98% 0%, 100% 5%, 98% 10%, 100% 15%, 98% 20%, 100% 25%, 98% 30%, 100% 35%, 98% 40%, 100% 45%, 98% 50%, 100% 55%, 98% 60%, 100% 65%, 98% 70%, 100% 75%, 98% 80%, 100% 85%, 98% 90%, 100% 95%, 98% 100%, 2% 100%, 0% 95%, 2% 90%, 0% 85%, 2% 80%, 0% 75%, 2% 70%, 0% 65%, 2% 60%, 0% 55%, 2% 50%, 0% 45%, 2% 40%, 0% 35%, 2% 30%, 0% 25%, 2% 20%, 0% 15%, 2% 10%, 0% 5%)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{hasInquiry ? '🏷️' : isApproved ? '✅' : '❌'}</span>
              <p className={`text-sm font-black tracking-wide ${language === 'el' ? '' : 'uppercase'}`}>
                {language === 'el' ? greekUppercaseNoAnnotations(bannerText) : bannerText}
              </p>
            </div>
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          </div>
        </div>
      )}

      {isDismissed ? (
        <div className="block cursor-not-allowed pointer-events-none">
          <CardBody home={home} language={language} allAreas={allAreas} areas={areas} textColor={textColor} />
        </div>
      ) : (
        <Link href={`/homes/${home.key}`} className="block">
          <CardBody home={home} language={language} allAreas={allAreas} areas={areas} textColor={textColor} />
        </Link>
      )}
    </div>
  )
}
