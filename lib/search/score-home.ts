/**
 * Absolute fit scoring for a single home against a single query.
 *
 * The point of this module is that every number it produces is **independent of
 * the rest of the result set**. The previous implementation min-max rescaled raw
 * scores into 30..95, which made the best result read ~95% even when everything
 * was bad and the worst read 30% even when everything was good — a rank position
 * wearing a confidence costume. Because it was relative, no absolute threshold
 * could ever be defined against it, which is why saved-search alerts
 * (`lib/saved-search-matcher.ts`) could not reuse it and drifted onto a
 * different, incompatible scale.
 *
 * Here each component normalises to [0,1] on its own terms, and the fit is the
 * weighted mean over **only the components the query actually expressed**. The
 * same (home, query) pair therefore scores the same today and tomorrow, in a set
 * of 3 or a set of 300 — which is what makes `minMatchPercent` honest.
 *
 * Ranking is deliberately *not* the same thing as fit: see `rankScore`.
 */

import { semanticScore } from './calibration'

/**
 * Relative importance of each signal. Renormalised over whatever the query
 * expressed, so a query that only mentions the metro is scored on distance and
 * semantics alone rather than being diluted by absent criteria.
 */
export const COMPONENT_WEIGHTS = {
  semantic: 0.30,
  distance: 0.25,
  vibe: 0.10,
  safety: 0.08,
  parking: 0.05,
} as const

export type ComponentName = keyof typeof COMPONENT_WEIGHTS

/** A component left `undefined` was not expressed by the query and is skipped. */
export type HomeComponents = Partial<Record<ComponentName, number>>

/**
 * Description and photo evidence are **bonuses, not components**.
 *
 * They belong outside the weighted mean for two reasons. Semantically, a listing whose
 * description simply doesn't mention the thing you asked for should not be punished for
 * it — only a listing that contradicts you should be, and that is the `penalty` path.
 * Structurally, a component that is only expressed when it happens to match makes the
 * denominator depend on the listing, so two homes scored for the same query would sit on
 * different scales — and the saved-search matcher, which cannot compute the same evidence,
 * would sit on a third.
 *
 * Keeping the mean's expressed set a pure function of the *query* is what makes
 * `minMatchPercent` mean the same thing everywhere.
 */
export const DESCRIPTION_BONUS_MAX = 0.10
export const PHOTO_BONUS_MAX = 0.05

export interface ScoreOptions {
  /** 0..1 of `DESCRIPTION_BONUS_MAX` — the description confirms what the query asked for. */
  descriptionBonus?: number
  /** 0..1 of `PHOTO_BONUS_MAX` — photo tags confirm a visual feature the query asked for. */
  photoBonus?: number
  /** 0..1 — the description explicitly contradicts the query. Subtracted from the fit. */
  penalty?: number
  /** 0..1 — the listing sits in an area the user named as preferred. Added to the fit. */
  areaBonus?: number
  /** Hard incompatibility found in the description — fit is locked to 0. */
  disqualified?: boolean
  /**
   * Per-query weight adjustments. Used when the query makes one signal unusually
   * load-bearing — e.g. "somewhere quiet and green" is a query *about* the vibe, so
   * vibe carries far more than its default share.
   */
  weights?: Partial<Record<ComponentName, number>>
}

/**
 * The components a given query expresses, derived from the criteria alone.
 *
 * Both the search route and the saved-search matcher call this so their denominators
 * cannot drift apart. `semantic` is always present: there is always an intent to compare
 * against, and a home with no embedding scores the neutral prior rather than dropping the
 * term and changing the scale.
 */
export function expressedComponents(criteria: {
  hasDistances?: boolean
  hasSafety?: boolean
  hasVibe?: boolean
  hasParking?: boolean
}): ComponentName[] {
  const names: ComponentName[] = ['semantic']
  if (criteria.hasDistances) names.push('distance')
  if (criteria.hasVibe) names.push('vibe')
  if (criteria.hasSafety) names.push('safety')
  if (criteria.hasParking) names.push('parking')
  return names
}

/** Vibe weight when the query is explicitly about the character of the location. */
export const VIBE_WEIGHT_LOCATION_PREFERENCE = 0.28

// --- Component normalisers -------------------------------------------------
//
// Each returns [0,1]. Missing data gets an explicit prior rather than 0, because
// "we don't know" must never outrank a known-bad value — the old additive
// scoring returned 0 for an unknown distance and -10 for a home 10km away, so
// listings with incomplete geocoding systematically beat known-distant ones.

/** No distance data: neither rewarded nor punished, but below a real near hit. */
export const DISTANCE_UNKNOWN = 0.35

/** Decay half-widths, in km, per how badly the user wants to be close. */
const DISTANCE_SCALE: Record<string, number> = {
  Essential: 1.2,
  Strong: 2.5,
}

/** Distance the user wants to be *far* from decays over this scale instead. */
const AVOID_SCALE = 3

export function normalizeDistance(km: number | null | undefined, category: string | null | undefined): number {
  if (category === 'Avoid') {
    if (km === null || km === undefined) return DISTANCE_UNKNOWN
    return 1 - Math.exp(-km / AVOID_SCALE)
  }

  const scale = DISTANCE_SCALE[category ?? '']
  if (!scale) return DISTANCE_UNKNOWN
  if (km === null || km === undefined) return DISTANCE_UNKNOWN

  return Math.exp(-Math.max(0, km) / scale)
}

/** Area safety is stored 0..10; anything at or below 5 is a floor. */
export function normalizeSafety(safety: number | null | undefined): number {
  if (safety === null || safety === undefined) return 0.5
  return clamp01((safety - 5) / 5)
}

/** `calculateVibeScore` already returns an absolute 0..100. */
export function normalizeVibe(vibeScore: number): number {
  return clamp01(vibeScore / 100)
}

export function normalizeParking(hasParking: boolean | null | undefined): number {
  if (hasParking === true) return 1
  if (hasParking === false) return 0
  return 0.25
}

/** `calculateDescriptionBonus` saturates well before 25 points in practice. */
export function normalizeDescriptionBonus(bonus: number): number {
  return clamp01(bonus / 25)
}

/** Description penalties arrive negative. */
export function normalizeDescriptionPenalty(penalty: number): number {
  return clamp01(-penalty / 20)
}

/** `calculatePhotoBonus` is capped at 12. */
export function normalizePhoto(bonus: number): number {
  return clamp01(bonus / 12)
}

export { semanticScore }

// --- Aggregation -----------------------------------------------------------

/**
 * Weighted mean over the expressed components, returned as an absolute 0..100.
 *
 * A query always carries semantic intent, so `semantic` should always be
 * supplied (fall back to `SEM_NEUTRAL` when the home has no embedding). That
 * guarantees at least one component and keeps the denominator non-zero.
 */
export function scoreHome(components: HomeComponents, options: ScoreOptions = {}): number {
  if (options.disqualified) return 0

  let weighted = 0
  let totalWeight = 0

  for (const name of Object.keys(COMPONENT_WEIGHTS) as ComponentName[]) {
    const value = components[name]
    if (value === undefined || !Number.isFinite(value)) continue
    const weight = options.weights?.[name] ?? COMPONENT_WEIGHTS[name]
    weighted += clamp01(value) * weight
    totalWeight += weight
  }

  // Nothing at all was expressed — no basis to claim a fit either way.
  if (totalWeight === 0) return 50

  let fit = weighted / totalWeight
  fit += (options.descriptionBonus ?? 0) * DESCRIPTION_BONUS_MAX
  fit += (options.photoBonus ?? 0) * PHOTO_BONUS_MAX
  fit += options.areaBonus ?? 0
  fit -= options.penalty ?? 0

  return Math.round(clamp01(fit) * 1000) / 10
}

/**
 * Ordering key. Freshness is a merchandising decision, not evidence that a
 * listing fits the query, so it belongs here and never in the displayed fit —
 * otherwise a mediocre listing posted yesterday advertises a higher "match" than
 * an excellent one posted last month.
 */
export function rankScore(fit: number, createdAt: Date | string | number): number {
  return fit + recencyBoost(createdAt)
}

export function recencyBoost(createdAt: Date | string | number): number {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  if (!Number.isFinite(ageDays)) return 0
  if (ageDays < 7) return 15
  if (ageDays < 30) return 8
  if (ageDays < 60) return 3
  return 0
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}
