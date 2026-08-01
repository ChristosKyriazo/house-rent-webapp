/**
 * Calibration for the semantic (embedding) signal.
 *
 * Raw cosine similarity between a short user query and a listing's synthetic
 * description paragraph (see `buildHomeText` in lib/embeddings.ts) lives in a
 * narrow band for `text-embedding-3-small` — roughly 0.20 for "unrelated" up to
 * ~0.50 for "this is exactly it". Comparing that number directly against a
 * user-facing percentage is meaningless: a 70% threshold never fires, a 30%
 * threshold fires on everything.
 *
 * `semanticScore` stretches that live band across the full 0..1 range with a
 * logistic curve so the number can be weighed against the other components and
 * shown to a user.
 *
 *   cos 0.20 → 0.12   cos 0.32 → 0.50   cos 0.38 → 0.79   cos 0.50 → 0.95
 *
 * These constants are model-specific, not environment-specific, so they live in
 * code: changing them changes what every stored `minMatchPercent` means, and
 * that has to happen atomically with a re-score, never per-deploy.
 */

/** Cosine similarity that should read as "50% semantic fit". */
export const SEM_CENTER = 0.32

/** Logistic temperature — smaller is a sharper cutoff around SEM_CENTER. */
export const SEM_TEMP = 0.06

/**
 * Bumped whenever SEM_CENTER / SEM_TEMP or the component weights change, so a
 * stored threshold can be recognised as belonging to an older calibration.
 */
export const SCORING_VERSION = 1

/** Neutral value used when a home has no embedding to compare against. */
export const SEM_NEUTRAL = 0.5

/** Map a raw cosine similarity to a calibrated 0..1 fit score. */
export function semanticScore(cosine: number): number {
  if (!Number.isFinite(cosine)) return SEM_NEUTRAL
  return 1 / (1 + Math.exp(-(cosine - SEM_CENTER) / SEM_TEMP))
}
