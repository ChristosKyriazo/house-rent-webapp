/**
 * Why a home scored what it scored — in plain words, from the same numbers that produced
 * the percentage.
 *
 * Reasons are derived from the scoring components (lib/search/score-home.ts) and the listing
 * evidence (lib/search/listing-evidence.ts), never written by a model: they are free, instant,
 * and cannot claim something the score didn't use. The search route returns them with each
 * result (the clickable % badge), and the saved-search matcher puts the top ones in alerts.
 *
 * Pure and dependency-free so the server (notification text) and the browser (the popover)
 * render identical wording.
 */

export type ReasonTone = 'good' | 'partial' | 'bad'
export type Amenity = 'Metro' | 'School' | 'Park' | 'Hospital' | 'University'
export type Lang = 'el' | 'en'

export type MatchReason =
  | { code: 'distance'; tone: ReasonTone; amenity: Amenity; km: number | null; avoid: boolean }
  | { code: 'semantic'; tone: ReasonTone }
  | { code: 'vibe'; tone: ReasonTone; wanted: string }
  | { code: 'safety'; tone: ReasonTone; score: number | null }
  | { code: 'heating'; tone: ReasonTone; wanted: string }
  | { code: 'parking'; tone: ReasonTone; has: boolean | null }
  | { code: 'features'; tone: 'good'; ids: string[] }
  | { code: 'missingFeatures'; tone: 'bad'; ids: string[] }
  | { code: 'preferredArea'; tone: 'good'; area: string }

export type BreakdownPart = 'semantic' | 'distance' | 'vibe' | 'safety' | 'heating' | 'parking'

export interface MatchBreakdown {
  /** Each expressed component: its 0..1 value and its share of the weighted mean. */
  parts: Array<{ part: BreakdownPart; value: number; share: number }>
  /** Added/subtracted outside the mean, in percentage points. */
  adjustments: Array<{ kind: 'features' | 'photos' | 'contradicted' | 'preferredArea'; points: number }>
}

export interface ReasonInput {
  components: Partial<Record<BreakdownPart, number>>
  weights: Record<BreakdownPart, number>
  distances: Array<{ amenity: Amenity; km: number | null; category: string; value: number }>
  vibeWanted?: string | null
  safetyScore?: number | null
  heatingWanted?: string | null
  parkingHas?: boolean | null
  confirmedFeatures?: string[]
  contradictedFeatures?: string[]
  preferredArea?: string | null
  /** Already-scaled adjustments, 0..1 of the fit (as passed to scoreHome). */
  adjust?: { descriptionBonus?: number; photoBonus?: number; penalty?: number; areaBonus?: number }
}

const tone = (v: number, good: number, partial: number): ReasonTone => (v >= good ? 'good' : v >= partial ? 'partial' : 'bad')

export function buildMatchReasons(input: ReasonInput): { reasons: MatchReason[]; breakdown: MatchBreakdown } {
  const reasons: MatchReason[] = []
  const c = input.components

  for (const d of input.distances) {
    reasons.push({ code: 'distance', amenity: d.amenity, km: d.km, avoid: d.category === 'Avoid', tone: d.km == null ? 'partial' : tone(d.value, 0.6, 0.3) })
  }
  if (input.confirmedFeatures?.length) reasons.push({ code: 'features', tone: 'good', ids: input.confirmedFeatures })
  if (input.contradictedFeatures?.length) reasons.push({ code: 'missingFeatures', tone: 'bad', ids: input.contradictedFeatures })
  if (input.preferredArea) reasons.push({ code: 'preferredArea', tone: 'good', area: input.preferredArea })
  if (c.heating !== undefined && input.heatingWanted) reasons.push({ code: 'heating', wanted: input.heatingWanted, tone: tone(c.heating, 0.99, 0.3) })
  if (c.parking !== undefined) reasons.push({ code: 'parking', has: input.parkingHas ?? null, tone: input.parkingHas === true ? 'good' : input.parkingHas === false ? 'bad' : 'partial' })
  if (c.vibe !== undefined && input.vibeWanted) reasons.push({ code: 'vibe', wanted: input.vibeWanted, tone: tone(c.vibe, 0.75, 0.4) })
  if (c.safety !== undefined) reasons.push({ code: 'safety', score: input.safetyScore ?? null, tone: input.safetyScore == null ? 'partial' : tone(c.safety, 0.6, 0.3) })
  if (c.semantic !== undefined) reasons.push({ code: 'semantic', tone: tone(c.semantic, 0.7, 0.45) })

  const expressed = (Object.keys(c) as BreakdownPart[]).filter(p => c[p] !== undefined && Number.isFinite(c[p]!))
  const total = expressed.reduce((s, p) => s + (input.weights[p] ?? 0), 0) || 1
  const order: BreakdownPart[] = ['semantic', 'distance', 'vibe', 'safety', 'heating', 'parking']
  const parts = order
    .filter(p => expressed.includes(p))
    .map(p => ({ part: p, value: clamp01(c[p]!), share: (input.weights[p] ?? 0) / total }))

  const a = input.adjust ?? {}
  const adjustments: MatchBreakdown['adjustments'] = []
  const pts = (x?: number) => Math.round((x ?? 0) * 1000) / 10
  if (pts(a.descriptionBonus) > 0) adjustments.push({ kind: 'features', points: pts(a.descriptionBonus) })
  if (pts(a.photoBonus) > 0) adjustments.push({ kind: 'photos', points: pts(a.photoBonus) })
  if (pts(a.areaBonus) > 0) adjustments.push({ kind: 'preferredArea', points: pts(a.areaBonus) })
  if (pts(a.penalty) > 0) adjustments.push({ kind: 'contradicted', points: -pts(a.penalty) })

  return { reasons, breakdown: { parts, adjustments } }
}

/** Strongest positives first, then mixed, then negatives — what an alert or summary leads with. */
export function topReasons(reasons: MatchReason[], n: number, tones: ReasonTone[] = ['good']): MatchReason[] {
  const rank: Record<ReasonTone, number> = { good: 0, partial: 1, bad: 2 }
  return reasons.filter(r => tones.includes(r.tone)).sort((x, y) => rank[x.tone] - rank[y.tone]).slice(0, n)
}

// ── Wording ────────────────────────────────────────────────────────────────────

const AMENITY: Record<Amenity, { en: string; el: string; elGen: string }> = {
  Metro: { en: 'the metro', el: 'μετρό', elGen: 'το μετρό' },
  School: { en: 'a school', el: 'σχολείο', elGen: 'σχολείο' },
  Park: { en: 'a park', el: 'πάρκο', elGen: 'πάρκο' },
  Hospital: { en: 'a hospital', el: 'νοσοκομείο', elGen: 'νοσοκομείο' },
  University: { en: 'a university', el: 'πανεπιστήμιο', elGen: 'πανεπιστήμιο' },
}

/** Labels for listing-evidence concept ids. */
export const FEATURE_LABELS: Record<string, { en: string; el: string }> = {
  balcony: { en: 'balcony', el: 'μπαλκόνι' },
  terrace: { en: 'terrace', el: 'ταράτσα' },
  garden: { en: 'garden', el: 'κήπος' },
  pool: { en: 'pool', el: 'πισίνα' },
  seaView: { en: 'sea view', el: 'θέα θάλασσα' },
  view: { en: 'view', el: 'θέα' },
  fireplace: { en: 'fireplace', el: 'τζάκι' },
  storage: { en: 'storage', el: 'αποθήκη' },
  elevator: { en: 'elevator', el: 'ασανσέρ' },
  airConditioning: { en: 'air conditioning', el: 'κλιματισμός' },
  furnished: { en: 'furnished', el: 'επιπλωμένο' },
  unfurnished: { en: 'unfurnished', el: 'ανεπίπλωτο' },
  renovated: { en: 'renovated', el: 'ανακαινισμένο' },
  newBuild: { en: 'new build', el: 'νεόδμητο' },
  modernKitchen: { en: 'modern kitchen', el: 'μοντέρνα κουζίνα' },
  woodFloors: { en: 'wooden floors', el: 'ξύλινα πατώματα' },
  bright: { en: 'bright', el: 'φωτεινό' },
  quiet: { en: 'quiet', el: 'ήσυχο' },
  solarHeater: { en: 'solar heater', el: 'ηλιακός' },
  doubleGlazing: { en: 'double glazing', el: 'διπλά τζάμια' },
  securityDoor: { en: 'security door', el: 'πόρτα ασφαλείας' },
  penthouse: { en: 'penthouse', el: 'ρετιρέ' },
  petFriendly: { en: 'pets allowed', el: 'επιτρέπονται κατοικίδια' },
}

/** Neighbourhood types as adjectives (feminine in Greek, agreeing with «γειτονιά»). */
const VIBE_LABEL: Record<string, { en: string; el: string }> = {
  quiet: { en: 'quiet', el: 'ήσυχη' },
  urban: { en: 'lively, urban', el: 'ζωντανή, αστική' },
  central: { en: 'central', el: 'κεντρική' },
  'family-friendly': { en: 'family-friendly', el: 'οικογενειακή' },
  family: { en: 'family-friendly', el: 'οικογενειακή' },
  waterfront: { en: 'seaside', el: 'παραθαλάσσια' },
  upscale: { en: 'upscale', el: 'πολυτελής' },
  'working-class': { en: 'affordable', el: 'οικονομική' },
  student: { en: 'student', el: 'φοιτητική' },
  rural: { en: 'rural', el: 'αγροτική' },
  suburban: { en: 'suburban', el: 'προαστιακή' },
  historic: { en: 'historic', el: 'ιστορική' },
}

function vibeLabel(wanted: string, lang: Lang): string {
  return VIBE_LABEL[wanted.toLowerCase().trim()]?.[lang] ?? wanted
}

const HEATING_LABEL: Record<string, { en: string; el: string }> = {
  autonomous: { en: 'autonomous heating', el: 'αυτόνομη θέρμανση' },
  central: { en: 'central heating', el: 'κεντρική θέρμανση' },
  'natural gas': { en: 'natural-gas heating', el: 'θέρμανση με φυσικό αέριο' },
  oil: { en: 'oil heating', el: 'θέρμανση με πετρέλαιο' },
  electricity: { en: 'electric heating', el: 'ηλεκτρική θέρμανση' },
  power: { en: 'electric heating', el: 'ηλεκτρική θέρμανση' },
}

function distanceText(km: number, lang: Lang): string {
  if (km < 1) return lang === 'el' ? `${Math.round(km * 1000 / 50) * 50} μ.` : `${Math.round(km * 1000 / 50) * 50} m`
  return lang === 'el' ? `${km.toFixed(1).replace('.', ',')} χλμ.` : `${km.toFixed(1)} km`
}

function featureList(ids: string[], lang: Lang): string {
  const names = ids.map(id => FEATURE_LABELS[id]?.[lang] ?? id)
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} ${lang === 'el' ? 'και' : 'and'} ${names[names.length - 1]}`
}

export function reasonText(r: MatchReason, lang: Lang): string {
  const el = lang === 'el'
  switch (r.code) {
    case 'distance': {
      const a = AMENITY[r.amenity]
      if (r.km == null) return el ? `Άγνωστη απόσταση από ${a.elGen}` : `Distance to ${a.en} not known`
      if (r.avoid) return el ? `${distanceText(r.km, lang)} από ${a.elGen} (θέλατε μακριά)` : `${distanceText(r.km, lang)} from ${a.en} (you wanted to be away)`
      return el ? `${distanceText(r.km, lang)} από ${a.elGen}` : `${distanceText(r.km, lang)} from ${a.en}`
    }
    case 'semantic':
      return r.tone === 'good'
        ? (el ? 'Η περιγραφή ταιριάζει πολύ με αυτό που ζητήσατε' : 'Its description closely matches what you asked for')
        : r.tone === 'partial'
          ? (el ? 'Η περιγραφή ταιριάζει εν μέρει με αυτό που ζητήσατε' : 'Its description partly matches what you asked for')
          : (el ? 'Η περιγραφή ταιριάζει λίγο με αυτό που ζητήσατε' : 'Its description is a weak match for what you asked for')
    case 'vibe': {
      const v = vibeLabel(r.wanted, lang)
      return r.tone === 'good'
        ? (el ? `${v.charAt(0).toUpperCase()}${v.slice(1)} γειτονιά, όπως θέλατε` : `A ${v} neighbourhood, as you wanted`)
        : r.tone === 'partial'
          ? (el ? `Δεν είναι σίγουρο ότι η γειτονιά είναι ${v}` : `Not sure the neighbourhood is ${v}`)
          : (el ? `Η γειτονιά δεν είναι ${v}` : `The neighbourhood isn't ${v}`)
    }
    case 'safety':
      if (r.score == null) return el ? 'Άγνωστη ασφάλεια περιοχής' : 'Area safety not known'
      return el ? `Ασφάλεια περιοχής ${r.score.toFixed(1).replace('.', ',')}/10` : `Area safety ${r.score.toFixed(1)}/10`
    case 'heating': {
      const label = HEATING_LABEL[r.wanted.toLowerCase()]?.[lang] ?? r.wanted
      return r.tone === 'good'
        ? (el ? `Έχει ${label}` : `Has ${label}`)
        : (el ? `Δεν αναφέρει αν έχει ${label}` : `Doesn't say whether it has ${label}`)
    }
    case 'parking':
      return r.has === true
        ? (el ? 'Έχει θέση στάθμευσης' : 'Has parking')
        : r.has === false
          ? (el ? 'Χωρίς θέση στάθμευσης' : 'No parking')
          : (el ? 'Δεν αναφέρει στάθμευση' : "Doesn't mention parking")
    // Neutral phrasing: features are nouns (balcony) and adjectives (quiet, renovated) alike.
    case 'features':
      return el ? `Ταιριάζει σε όσα ζητήσατε: ${featureList(r.ids, lang)}` : `Matches what you asked for: ${featureList(r.ids, lang)}`
    case 'missingFeatures':
      return el ? `Η αγγελία λέει το αντίθετο για: ${featureList(r.ids, lang)}` : `The listing says otherwise about: ${featureList(r.ids, lang)}`
    case 'preferredArea':
      return el ? `Στην περιοχή που προτιμάτε (${r.area})` : `In your preferred area (${r.area})`
  }
}

export const BREAKDOWN_LABELS: Record<BreakdownPart | MatchBreakdown['adjustments'][number]['kind'], { en: string; el: string }> = {
  semantic: { en: 'Matches your description', el: 'Ταίριασμα με την περιγραφή σας' },
  distance: { en: 'Distances', el: 'Αποστάσεις' },
  vibe: { en: 'Neighbourhood', el: 'Γειτονιά' },
  safety: { en: 'Safety', el: 'Ασφάλεια' },
  heating: { en: 'Heating', el: 'Θέρμανση' },
  parking: { en: 'Parking', el: 'Στάθμευση' },
  features: { en: 'Features you asked for', el: 'Χαρακτηριστικά που ζητήσατε' },
  photos: { en: 'Seen in photos', el: 'Φαίνονται στις φωτογραφίες' },
  preferredArea: { en: 'Preferred area', el: 'Προτιμώμενη περιοχή' },
  contradicted: { en: 'Missing what you asked for', el: 'Λείπουν όσα ζητήσατε' },
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0))
}
