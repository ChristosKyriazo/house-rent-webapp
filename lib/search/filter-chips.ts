/**
 * Turns the conversational search's accumulated filters into removable chips.
 *
 * The chat accumulates filters invisibly across turns, so a user who wanted to loosen one
 * criterion had to describe the change in prose and spend an AI credit to have the model
 * re-derive everything. Chips make the active filters visible and let a single bound be
 * dropped directly — the search re-runs, no model call involved.
 *
 * Each half of a numeric range is its own chip on purpose: "≥ €400" and "≤ €600" are
 * separately removable, because raising a ceiling is a different intent from removing a
 * floor.
 */

import { BOUND_PAIRS, isMinBound } from './numeric-bounds'

export interface FilterChip {
  /** Stable key for React and for removal. */
  id: string
  label: string
  /** Filter fields this chip owns — removing the chip deletes all of them. */
  fields: string[]
}

type Filters = Record<string, unknown>

/** Never shown: internal scoring hints and values the UI itself owns. */
const HIDDEN_FIELDS = new Set([
  'listingType', // the rent/buy toggle is authoritative; a chip could contradict it
  'confidence',
  'hasLocationPreference',
  'parkingSoftPreference',
])

const BOUND_UNITS: Record<string, { en: (n: string) => string; el: (n: string) => string }> = {
  price: { en: n => `€${n}`, el: n => `${n}€` },
  bedrooms: { en: n => `${n} bed`, el: n => `${n} υ/δ` },
  bathrooms: { en: n => `${n} bath`, el: n => `${n} μπάνια` },
  size: { en: n => `${n} m²`, el: n => `${n} τ.μ.` },
  floor: { en: n => `floor ${n}`, el: n => `όροφος ${n}` },
  yearBuilt: { en: n => `built ${n}`, el: n => `κατασκευή ${n}` },
  yearRenovated: { en: n => `renovated ${n}`, el: n => `ανακαίνιση ${n}` },
}

const DISTANCE_LABELS: Record<string, { en: string; el: string }> = {
  Metro: { en: 'Metro', el: 'Μετρό' },
  Bus: { en: 'Bus', el: 'Λεωφορείο' },
  School: { en: 'School', el: 'Σχολείο' },
  Hospital: { en: 'Hospital', el: 'Νοσοκομείο' },
  Park: { en: 'Park', el: 'Πάρκο' },
  University: { en: 'University', el: 'Πανεπιστήμιο' },
  Safety: { en: 'Safety', el: 'Ασφάλεια' },
}

const CATEGORY_LABELS: Record<string, { en: string; el: string }> = {
  Essential: { en: 'essential', el: 'απαραίτητο' },
  Strong: { en: 'important', el: 'σημαντικό' },
  'Not important': { en: 'not important', el: 'αδιάφορο' },
  Avoid: { en: 'avoid', el: 'αποφυγή' },
}

function formatNumber(value: unknown): string | null {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return null
  return n.toLocaleString('en-US')
}

/**
 * Build the chip list, in a stable reading order: where → how much → how big → the rest.
 */
export function buildFilterChips(filters: Filters | null | undefined, isEl: boolean): FilterChip[] {
  if (!filters) return []
  const chips: FilterChip[] = []
  const lang = isEl ? 'el' : 'en'

  // Location first — it's what people scan for.
  for (const field of ['area', 'city', 'country'] as const) {
    const value = filters[field]
    if (typeof value === 'string' && value.trim()) {
      chips.push({ id: field, label: value, fields: [field] })
    }
  }

  const preferred = filters.preferredAreas
  if (Array.isArray(preferred) && preferred.length > 0) {
    chips.push({
      id: 'preferredAreas',
      label: `${isEl ? 'κοντά σε' : 'near'} ${preferred.join(', ')}`,
      fields: ['preferredAreas'],
    })
  }

  // Numeric bounds — one chip per side so each is independently removable.
  for (const pair of BOUND_PAIRS) {
    for (const field of [pair.min, pair.max]) {
      const formatted = formatNumber(filters[field])
      if (formatted === null) continue
      const unit = BOUND_UNITS[pair.name]
      const rendered = unit ? unit[lang](formatted) : formatted
      chips.push({
        id: field,
        label: `${isMinBound(field) ? '≥' : '≤'} ${rendered}`,
        fields: [field],
      })
    }
  }

  if (filters.parking === true) {
    chips.push({ id: 'parking', label: isEl ? 'Πάρκινγκ' : 'Parking', fields: ['parking', 'parkingSoftPreference'] })
  }

  for (const field of ['heatingCategory', 'heatingAgent'] as const) {
    const value = filters[field]
    if (typeof value === 'string' && value.trim()) {
      chips.push({ id: field, label: value, fields: [field] })
    }
  }

  // Soft criteria — shown so the user can see why scoring favours what it favours.
  for (const [field, label] of Object.entries(DISTANCE_LABELS)) {
    const value = filters[field]
    if (typeof value !== 'string' || !value || value === 'Not mentioned') continue
    const category = CATEGORY_LABELS[value]
    chips.push({
      id: field,
      label: `${label[lang]}: ${category ? category[lang] : value}`,
      fields: [field],
    })
  }

  const vibe = filters.vibePreference
  if (typeof vibe === 'string' && vibe.trim()) {
    chips.push({ id: 'vibePreference', label: vibe, fields: ['vibePreference', 'hasLocationPreference'] })
  }

  return chips
}

/**
 * Remove a chip's fields. Returns a new object — the caller keeps the old one for the
 * optimistic-update rollback path.
 */
export function removeChipFields(filters: Filters, fields: string[]): Filters {
  const next = { ...filters }
  for (const field of fields) delete next[field]
  return next
}

/**
 * Everything a chip could own, used to clear the board while keeping the fields the UI
 * itself is responsible for (the rent/buy toggle above all).
 */
export function clearableFields(filters: Filters): string[] {
  return Object.keys(filters).filter(key => !HIDDEN_FIELDS.has(key))
}
