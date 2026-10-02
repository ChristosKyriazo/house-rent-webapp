/**
 * Paired numeric bounds for conversational search.
 *
 * Every quantitative criterion the user can give is a *range*, never an exact value:
 * "600" is only meaningful once you know whether it was an answer to "at most?" or
 * "at least?". Two things follow from that, and both live here.
 *
 * 1. **Bound-explicit questions.** The assistant names the bound when it asks ("what's
 *    the most you'd want to pay?") and declares which field the answer belongs to, so a
 *    bare "600" binds deterministically instead of being guessed at by the model.
 *
 * 2. **Reconciliation on revision.** When the user changes their mind, the new bound can
 *    contradict the stale opposite one — "under €600" followed by "actually at least
 *    €800" leaves minPrice 800 / maxPrice 600, an impossible filter that silently returns
 *    nothing. Whichever side the user just set wins; the other is dropped.
 */

export interface BoundPair {
  /** Stable identifier, also the key used by `pendingNumeric`. */
  name: string
  min: string
  max: string
  /** Smallest sensible step — bedrooms are whole, price is not. */
  integer: boolean
}

export const BOUND_PAIRS: readonly BoundPair[] = [
  { name: 'price', min: 'minPrice', max: 'maxPrice', integer: false },
  { name: 'bedrooms', min: 'minBedrooms', max: 'maxBedrooms', integer: true },
  { name: 'bathrooms', min: 'minBathrooms', max: 'maxBathrooms', integer: true },
  { name: 'size', min: 'minSize', max: 'maxSize', integer: false },
  { name: 'floor', min: 'minFloor', max: 'maxFloor', integer: true },
  { name: 'yearBuilt', min: 'minYearBuilt', max: 'maxYearBuilt', integer: true },
  { name: 'yearRenovated', min: 'minYearRenovated', max: 'maxYearRenovated', integer: true },
] as const

/** Every field name that is one half of a numeric range. */
export const BOUND_FIELDS: ReadonlySet<string> = new Set(
  BOUND_PAIRS.flatMap(p => [p.min, p.max])
)

/** `minPrice` → its pair, `maxPrice` → the same pair. */
export function pairForField(field: string): BoundPair | undefined {
  return BOUND_PAIRS.find(p => p.min === field || p.max === field)
}

/** The other half of the range: `minPrice` → `maxPrice`. */
export function oppositeBound(field: string): string | undefined {
  const pair = pairForField(field)
  if (!pair) return undefined
  return pair.min === field ? pair.max : pair.min
}

export function isMinBound(field: string): boolean {
  return BOUND_PAIRS.some(p => p.min === field)
}

type Filters = Record<string, unknown>

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

/**
 * Drop bounds that the fields just set have made impossible.
 *
 * `justSet` is the set of fields the current turn actually wrote. Only the *stale*
 * opposite side is removed — a user who says "at least €800" after "under €600" meant to
 * raise their floor, not to be shown nothing.
 *
 * Mutates and returns `filters`, and reports what it removed so the assistant can say so.
 */
export function reconcileBounds(filters: Filters, justSet: Iterable<string>): string[] {
  const touched = new Set(justSet)
  const dropped: string[] = []

  for (const pair of BOUND_PAIRS) {
    const min = asNumber(filters[pair.min])
    const max = asNumber(filters[pair.max])
    if (min === null || max === null || min <= max) continue

    // Contradiction. Keep the side the user just gave us.
    const minIsFresh = touched.has(pair.min)
    const maxIsFresh = touched.has(pair.max)

    let stale: string
    if (minIsFresh && !maxIsFresh) stale = pair.max
    else if (maxIsFresh && !minIsFresh) stale = pair.min
    // Both (or neither) changed this turn — the model contradicted itself in a single
    // response. Widen rather than narrow: drop the upper bound so the user still sees
    // results, since an empty page tells them nothing about what went wrong.
    else stale = pair.max

    delete filters[stale]
    dropped.push(stale)
  }

  return dropped
}

/**
 * Bind bare numbers from a reply to the bounds the assistant just asked about.
 *
 * The model is told to declare `pendingNumeric` when it asks a quantitative question, so
 * "600" in reply to "what's the most you'd pay?" resolves to `maxPrice` here rather than
 * being re-derived from conversation history by the next completion — which is where it
 * used to silently become `minPrice`.
 *
 * Only fires on replies that are *purely* numeric. Anything with a qualifier ("at least
 * 600", "600 max", "around 600 but flexible") is left to the model, which can read the
 * qualifier and may legitimately choose the other bound.
 */
export function bindPendingNumericAnswer(
  reply: string,
  pendingNumeric: string[] | null | undefined
): Record<string, number> {
  if (!pendingNumeric || pendingNumeric.length === 0) return {}

  const numbers = parseBareNumbers(reply)
  if (numbers.length === 0) return {}

  const bound: Record<string, number> = {}
  // Positional: the model lists the fields in the order its question asked about them.
  for (let i = 0; i < Math.min(numbers.length, pendingNumeric.length); i++) {
    const field = pendingNumeric[i]
    if (!BOUND_FIELDS.has(field)) continue
    const pair = pairForField(field)!
    bound[field] = pair.integer ? Math.round(numbers[i]) : numbers[i]
  }
  return bound
}

/**
 * Numbers from a reply that carries no other meaning — "600", "2 and 900", "1.200€".
 * Returns [] when the reply contains words that could change the interpretation.
 */
export function parseBareNumbers(reply: string): number[] {
  const trimmed = reply.trim()
  if (!trimmed) return []

  // Strip currency and the filler that survives an otherwise bare answer. Deliberately
  // no `\b` — JavaScript word boundaries are ASCII-only and never fire around Greek, so
  // "600 ευρώ" would keep its letters and be rejected. Over-stripping is safe: anything
  // that still contains a letter afterwards is rejected anyway, so "600 or more" and
  // "under 600" both correctly fall through to the model.
  const stripped = trimmed
    .replace(/[€$£]/g, ' ')
    .replace(/(euros|euro|eur|per month|monthly|and|or)/gi, ' ')
    .replace(/(ευρώ|το ?μήνα|τον ?μήνα|και|ή)/gi, ' ')
    // A comma before whitespace separates list items ("2, 900"); one wedged between
    // digits is a decimal point ("1200,50") and must survive.
    .replace(/,(?=\s)/g, ' ')
    .replace(/[;/]/g, ' ')

  // Any remaining letters mean the reply said something we must not second-guess.
  if (/\p{L}/u.test(stripped)) return []
  // And anything that is not a digit or a separator means it is not a bare number.
  if (!/^[\d.,\s]+$/.test(stripped)) return []

  return stripped
    .split(/\s+/)
    .filter(Boolean)
    .map(parseSeparatedNumber)
    .filter((n): n is number => n !== null && n >= 0)
}

/**
 * Resolve "1.200" (thousands) from "1200.50" (decimal) without a backtracking regex —
 * this parses arbitrary user input, so the pattern must stay linear.
 */
function parseSeparatedNumber(token: string): number | null {
  let normalised: string

  if (token.includes(',')) {
    // European decimal comma: dots can only be thousands separators.
    normalised = token.replace(/\./g, '').replace(',', '.')
  } else {
    const lastDot = token.lastIndexOf('.')
    const isDecimalPoint = lastDot !== -1 && token.length - lastDot - 1 !== 3
    normalised = isDecimalPoint
      ? token.slice(0, lastDot).replace(/\./g, '') + '.' + token.slice(lastDot + 1)
      : token.replace(/\./g, '')
  }

  const n = Number(normalised)
  return Number.isFinite(n) ? n : null
}
