'use client'

import { getTranslation, translateValue, type Language } from '@/lib/translations'
import { getAreaName } from '@/lib/area-utils'

const isGreekInput = (text: string) => /[Ͱ-Ͽἀ-῿]/.test(text)

export interface ManualFilters {
  city: string; country: string; minPrice: string; maxPrice: string
  minSize: string; maxSize: string; heatingCategory: string; heatingAgent: string
  minBedrooms: string; maxBedrooms: string; yearBuilt: string
}

interface AreaOption { id: number; name: string; nameGreek: string | null; city?: string | null; cityGreek?: string | null; country?: string | null; countryGreek?: string | null }
interface CityOption { city: string; cityGreek: string | null; country: string; countryGreek: string | null }
interface CountryOption { country: string; countryGreek: string | null }
interface AreaSuggestion { id: number; name: string; nameGreek: string | null; city: string | null; cityGreek: string | null; country: string | null; countryGreek: string | null }
interface AreaDisplayOption { name?: string | null; nameGreek?: string | null; city: string | null; cityGreek: string | null; country: string | null; countryGreek: string | null }

interface ManualFiltersPanelProps {
  language: Language
  filters: ManualFilters
  onFiltersChange: (f: ManualFilters) => void
  areas: AreaDisplayOption[]
  allAreas: AreaOption[]
  // City autocomplete
  cityQuery: string; setCityQuery: (q: string) => void
  showCityDropdown: boolean; setShowCityDropdown: (v: boolean) => void
  citySuggestions: CityOption[]; setCitySuggestions: (s: CityOption[]) => void
  onCitySelect: (c: CityOption) => void; searchCities: (q: string) => void
  // Country autocomplete
  countryQuery: string; setCountryQuery: (q: string) => void
  showCountryDropdown: boolean; setShowCountryDropdown: (v: boolean) => void
  countrySuggestions: CountryOption[]; setCountrySuggestions: (s: CountryOption[]) => void
  onCountrySelect: (c: CountryOption) => void; searchCountries: (q: string) => void
  // Area autocomplete
  areaQuery: string; setAreaQuery: (q: string) => void
  showAreaDropdown: boolean; setShowAreaDropdown: (v: boolean) => void
  areaSuggestions: AreaSuggestion[]; setAreaSuggestions: (s: AreaSuggestion[]) => void
  selectedAreas: string[]; setSelectedAreas: (a: string[]) => void
  onAreaSelect: (a: AreaSuggestion) => void; searchAreas: (q: string) => void
  // Exclusions
  excludeInquired: boolean; setExcludeInquired: (v: boolean) => void
  excludeApproved: boolean; setExcludeApproved: (v: boolean) => void
  // Actions
  loading: boolean; onBack: () => void; onSubmit: () => void
}

export function ManualFiltersPanel(p: ManualFiltersPanelProps) {
  const { language: lang, filters, onFiltersChange: set } = p
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = (key: string) => getTranslation(lang, key as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tv = (val: string) => translateValue(lang, val as any)
  const inputCls = 'w-full px-4 py-3 border border-[var(--border-subtle)] bg-[var(--ink-soft)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text)] placeholder:text-[var(--text)]/50'
  const labelCls = 'block text-sm font-medium text-[var(--text)] mb-2'

  return (
    <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-[var(--border-subtle)] mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[var(--text)]">{t('filterByFeatures')}</h2>
        <button onClick={p.onBack} className="px-3 py-1.5 text-sm text-[var(--text)] hover:text-[var(--accent)] transition-colors">
          ← {t('back')}
        </button>
      </div>

      <div className="space-y-4 mb-4">
        {/* City + Country */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <label htmlFor="filter-city" className={labelCls}>{t('city')}</label>
            <input id="filter-city" type="text" className={inputCls} placeholder={t('anyCity')}
              value={p.cityQuery || (filters.city ? (lang === 'el' ? (p.areas.find(a => a.city === filters.city)?.cityGreek || filters.city) : filters.city) : '')}
              onChange={e => {
                const q = e.target.value; p.setCityQuery(q)
                if (q.length > 0) { p.setShowCityDropdown(true); p.searchCities(q) }
                else { p.setShowCityDropdown(false); p.setCitySuggestions([]); set({ ...filters, city: '' }) }
              }}
              onFocus={() => { if (p.cityQuery.length > 0 || filters.city) { p.setShowCityDropdown(true); if (p.cityQuery.length > 0) p.searchCities(p.cityQuery) } }}
              onBlur={() => setTimeout(() => p.setShowCityDropdown(false), 200)}
            />
            {p.showCityDropdown && p.citySuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                {p.citySuggestions.map((c, i) => (
                  <button key={i} type="button" onClick={() => p.onCitySelect(c)}
                    className="w-full px-4 py-3 text-left text-[var(--text)] hover:bg-[var(--canvas-mid)] transition-colors border-b border-[var(--border-subtle)] last:border-b-0">
                    <div className="font-medium">{isGreekInput(p.cityQuery) && c.cityGreek ? c.cityGreek : c.city}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <label htmlFor="filter-country" className={labelCls}>{t('country')}</label>
            <input id="filter-country" type="text" className={inputCls} placeholder={t('anyCountry')}
              value={p.countryQuery || (filters.country ? (lang === 'el' ? (p.areas.find(a => a.country === filters.country)?.countryGreek || filters.country) : filters.country) : '')}
              onChange={e => {
                const q = e.target.value; p.setCountryQuery(q)
                if (q.length > 0) { p.setShowCountryDropdown(true); p.searchCountries(q) }
                else { p.setShowCountryDropdown(false); p.setCountrySuggestions([]); set({ ...filters, country: '' }) }
              }}
              onFocus={() => { if (p.countryQuery.length > 0 || filters.country) { p.setShowCountryDropdown(true); if (p.countryQuery.length > 0) p.searchCountries(p.countryQuery) } }}
              onBlur={() => setTimeout(() => p.setShowCountryDropdown(false), 200)}
            />
            {p.showCountryDropdown && p.countrySuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                {p.countrySuggestions.map((c, i) => (
                  <button key={i} type="button" onClick={() => p.onCountrySelect(c)}
                    className="w-full px-4 py-3 text-left text-[var(--text)] hover:bg-[var(--canvas-mid)] transition-colors border-b border-[var(--border-subtle)] last:border-b-0">
                    <div className="font-medium">{isGreekInput(p.countryQuery) && c.countryGreek ? c.countryGreek : c.country}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Area */}
        <div>
          <label htmlFor="filter-area" className={labelCls}>{t('cityArea')}</label>
          <div className="space-y-3">
            {p.selectedAreas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {p.selectedAreas.map(area => (
                  <div key={area} className="btn-primary inline-flex items-center gap-2 px-3 py-1.5 text-sm">
                    <span className="text-sm font-medium">{getAreaName(area, p.allAreas, lang)}</span>
                    <button type="button" onClick={() => p.setSelectedAreas(p.selectedAreas.filter(a => a !== area))}
                      className="text-[var(--btn-primary-fg)] hover:text-[var(--status-error)] transition-colors" aria-label={t('close')}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              <input id="filter-area" type="text" className={inputCls} placeholder={t('selectCityArea')}
                value={p.areaQuery}
                onChange={e => { const q = e.target.value; p.setAreaQuery(q); if (q.length > 0) { p.setShowAreaDropdown(true); p.searchAreas(q) } else { p.setShowAreaDropdown(false); p.setAreaSuggestions([]) } }}
                onFocus={() => { if (p.areaQuery.length > 0) p.setShowAreaDropdown(true) }}
                onBlur={() => setTimeout(() => p.setShowAreaDropdown(false), 200)}
              />
              {p.showAreaDropdown && p.areaSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                  {p.areaSuggestions.map(area => (
                    <button key={area.id} type="button" onClick={() => p.onAreaSelect(area)}
                      className="w-full px-4 py-3 text-left text-[var(--text)] hover:bg-[var(--canvas-mid)] transition-colors border-b border-[var(--border-subtle)] last:border-b-0">
                      <div className="font-medium">{isGreekInput(p.areaQuery) && area.nameGreek ? area.nameGreek : area.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="filter-price-min" className={labelCls}>{t('minPrice')}</label>
            <input id="filter-price-min" type="number" min="0" className={inputCls} placeholder="0"
              value={filters.minPrice} onChange={e => set({ ...filters, minPrice: e.target.value })} />
          </div>
          <div>
            <label htmlFor="filter-price-max" className={labelCls}>{t('maxPrice')}</label>
            <input id="filter-price-max" type="number" min="0" className={inputCls} placeholder={t('any')}
              value={filters.maxPrice} onChange={e => set({ ...filters, maxPrice: e.target.value })} />
          </div>
        </div>

        {/* Size */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="filter-size-min" className={labelCls}>{t('minSize')}</label>
            <input id="filter-size-min" type="number" min="0" className={inputCls} placeholder="0"
              value={filters.minSize} onChange={e => set({ ...filters, minSize: e.target.value })} />
          </div>
          <div>
            <label htmlFor="filter-size-max" className={labelCls}>{t('maxSize')}</label>
            <input id="filter-size-max" type="number" min="0" className={inputCls} placeholder={t('any')}
              value={filters.maxSize} onChange={e => set({ ...filters, maxSize: e.target.value })} />
          </div>
        </div>

        {/* Heating */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="filter-heating-category" className={labelCls}>{t('heatingCategory')}</label>
            <select id="filter-heating-category" className={inputCls}
              value={filters.heatingCategory} onChange={e => set({ ...filters, heatingCategory: e.target.value })}>
              <option value="">{t('any')}</option>
              <option value="central">{tv('central')}</option>
              <option value="autonomous">{tv('autonomous')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="filter-heating-agent" className={labelCls}>{t('heatingAgent')}</label>
            <select id="filter-heating-agent" className={inputCls}
              value={filters.heatingAgent} onChange={e => set({ ...filters, heatingAgent: e.target.value })}>
              <option value="">{t('any')}</option>
              <option value="oil">{tv('oil')}</option>
              <option value="natural gas">{tv('natural gas')}</option>
              <option value="electricity">{tv('electricity')}</option>
              <option value="other">{tv('other')}</option>
            </select>
          </div>
        </div>

        {/* Bedrooms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="filter-bedrooms-min" className={labelCls}>{t('minBedrooms')}</label>
            <input id="filter-bedrooms-min" type="number" min="0" className={inputCls} placeholder="0"
              value={filters.minBedrooms} onChange={e => set({ ...filters, minBedrooms: e.target.value })} />
          </div>
          <div>
            <label htmlFor="filter-bedrooms-max" className={labelCls}>{t('maxBedrooms')}</label>
            <input id="filter-bedrooms-max" type="number" min="0" className={inputCls} placeholder={t('any')}
              value={filters.maxBedrooms} onChange={e => set({ ...filters, maxBedrooms: e.target.value })} />
          </div>
        </div>

        {/* Year built */}
        <div>
          <label htmlFor="filter-year" className={labelCls}>{t('yearBuilt')}</label>
          <input id="filter-year" type="number" min="1900" max={new Date().getFullYear()} className={inputCls} placeholder={t('any')}
            value={filters.yearBuilt} onChange={e => set({ ...filters, yearBuilt: e.target.value })} />
        </div>

        {/* Exclusion checkboxes */}
        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={p.excludeInquired} onChange={e => p.setExcludeInquired(e.target.checked)}
              className="w-5 h-5 rounded border-[var(--border-subtle)] bg-[var(--ink-soft)] text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)] cursor-pointer" />
            <span className="text-sm font-medium text-[var(--text)]">{t('excludeInquired') || 'Exclude Inquired Listings'}</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={p.excludeApproved} onChange={e => p.setExcludeApproved(e.target.checked)}
              className="w-5 h-5 rounded border-[var(--border-subtle)] bg-[var(--ink-soft)] text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)] cursor-pointer" />
            <span className="text-sm font-medium text-[var(--text)]">{t('excludeApproved') || 'Exclude Approved Listings'}</span>
          </label>
        </div>
      </div>

      <button onClick={p.onSubmit} disabled={p.loading} className="btn-primary w-full px-6 py-3 sm:w-auto disabled:opacity-50">
        {p.loading ? t('searching') : t('applyFilters')}
      </button>
    </div>
  )
}
