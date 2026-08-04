/**
 * Decides what the assistant asks next — in code, not in the prompt.
 *
 * Question selection used to live in the system prompt as English control flow ("max 3
 * ask turns", "prefer searching once you have city plus a budget", "never re-ask what you
 * know"), which is why it contradicted itself in three places and why the assistant stopped
 * asking after a few turns regardless of how little it actually knew.
 *
 * The policy here is ranked by one idea: **ask the question that most sharpens the match
 * percentage.** An unknown criterion is not neutral — it is scored with a prior
 * (`DISTANCE_UNKNOWN`, a 0.5 safety mid-point, `SEM_NEUTRAL`), which means every home looks
 * equally plausible on that axis and the percentages bunch together. Learning a criterion
 * that carries a scoring component replaces a prior with real signal across the whole
 * result set, so those slots outrank hard filters that merely shrink the candidate list.
 *
 * The model never chooses the question and never reports which bound it asked for. It is
 * handed a slot and asked to phrase it warmly. That deletes the class of bug where a
 * correctness-critical field depended on prompt adherence.
 */

import { BOUND_PAIRS } from './numeric-bounds'
import { COMPONENT_WEIGHTS } from './score-home'

export type SlotKind = 'component' | 'hard'

/**
 * Question value is banded into three tiers, because raw scoring weights and
 * hard-filter usefulness are not the same currency and ranking them against each
 * other directly is meaningless.
 *
 * - **Primary hard filters (0.8–1.0)** — location, budget, bedrooms. Table stakes: without
 *   them the result set is not worth ranking at all, and users expect to be asked.
 * - **Components (0.4–0.75)** — everything that carries scoring weight. These outrank the
 *   remaining hard filters because a component replaces a prior across the *whole* result
 *   set, which is what actually separates one home from another. A hard filter only trims
 *   the list; it does nothing for the ranking inside it.
 * - **Secondary hard filters (≤0.35)** — size, bathrooms, heating, building age. Useful,
 *   but they neither sharpen percentages nor is anyone upset to not be asked.
 *
 * Within the component band, order follows `COMPONENT_WEIGHTS` exactly.
 */
const COMPONENT_BAND_FLOOR = 0.4
const COMPONENT_BAND_SPAN = 0.35
const HEAVIEST_COMPONENT = COMPONENT_WEIGHTS.distance

/** `scale` lets one slot cover a fraction of a component's weight (school+park vs all distances). */
function componentValue(weight: number, scale = 1): number {
  return COMPONENT_BAND_FLOOR + (weight * scale / HEAVIEST_COMPONENT) * COMPONENT_BAND_SPAN
}

export interface Slot {
  id: string
  /** Filter fields that count as this slot being answered. */
  fields: string[]
  kind: SlotKind
  /**
   * How much asking sharpens the result. Component slots inherit their scoring weight;
   * hard filters are valued by how much they narrow a realistic candidate set.
   */
  value: number
  /** For numeric slots, the bound the question should ask for. */
  bound?: string
  /** What the question is about, for the model to phrase. Never shown verbatim. */
  topicEn: string
  topicEl: string
}

/**
 * Ordered by scoring value, not by conversational convention.
 *
 * Proximity sits at the top because `distance` is the heaviest component after semantics
 * and it is the one users most reliably have an opinion about. Year built and renovation
 * sit at the bottom because they are hard filters that carry no component weight at all —
 * knowing them narrows the list but does nothing to separate the homes that remain.
 */
export const SLOTS: readonly Slot[] = [
  {
    id: 'location',
    fields: ['city', 'area', 'preferredAreas'],
    kind: 'hard',
    value: 1.0,
    topicEn: 'which city or neighbourhood they want to live in',
    topicEl: 'σε ποια πόλη ή περιοχή θέλουν να μείνουν',
  },
  {
    id: 'price',
    fields: ['minPrice', 'maxPrice'],
    kind: 'hard',
    value: 0.9,
    bound: 'maxPrice',
    topicEn: 'the most they want to spend',
    topicEl: 'το ανώτατο ποσό που θέλουν να δώσουν',
  },
  {
    id: 'bedrooms',
    fields: ['minBedrooms', 'maxBedrooms'],
    kind: 'hard',
    value: 0.8,
    bound: 'minBedrooms',
    topicEn: 'the fewest bedrooms they would accept',
    topicEl: 'τον ελάχιστο αριθμό υπνοδωματίων που δέχονται',
  },
  {
    id: 'transit',
    fields: ['Metro', 'Bus'],
    kind: 'component',
    value: componentValue(COMPONENT_WEIGHTS.distance),
    topicEn: 'how much they need to be near a metro station or bus route, and whether they drive',
    topicEl: 'πόσο τους ενδιαφέρει να είναι κοντά σε μετρό ή λεωφορείο, και αν οδηγούν',
  },
  {
    id: 'vibe',
    fields: ['vibePreference'],
    kind: 'component',
    value: componentValue(COMPONENT_WEIGHTS.vibe),
    topicEn: 'what kind of neighbourhood they want — lively and central, quiet and residential, by the sea',
    topicEl: 'τι είδους γειτονιά θέλουν — ζωντανή και κεντρική, ήσυχη και οικιστική, κοντά στη θάλασσα',
  },
  {
    id: 'safety',
    fields: ['Safety'],
    kind: 'component',
    value: componentValue(COMPONENT_WEIGHTS.safety),
    topicEn: 'how important it is that the area feels safe',
    topicEl: 'πόσο σημαντικό είναι να νιώθουν ασφαλείς στην περιοχή',
  },
  {
    id: 'household',
    fields: ['School', 'Park'],
    kind: 'component',
    value: componentValue(COMPONENT_WEIGHTS.distance, 0.8),
    topicEn: 'who is moving in — children, pets, anyone who would want a school or a park nearby',
    topicEl: 'ποιοι θα μετακομίσουν — παιδιά, κατοικίδια, κάποιος που θα ήθελε σχολείο ή πάρκο κοντά',
  },
  {
    id: 'parking',
    fields: ['parking', 'parkingSoftPreference'],
    kind: 'component',
    value: componentValue(COMPONENT_WEIGHTS.parking),
    topicEn: 'whether they need a parking space',
    topicEl: 'αν χρειάζονται θέση στάθμευσης',
  },
  {
    id: 'size',
    fields: ['minSize', 'maxSize'],
    kind: 'hard',
    value: 0.35,
    bound: 'minSize',
    topicEn: 'the smallest floor area that would work for them',
    topicEl: 'το μικρότερο εμβαδόν που τους βολεύει',
  },
  {
    id: 'bathrooms',
    fields: ['minBathrooms', 'maxBathrooms'],
    kind: 'hard',
    value: 0.3,
    bound: 'minBathrooms',
    topicEn: 'the fewest bathrooms they need',
    topicEl: 'τον ελάχιστο αριθμό μπάνιων που χρειάζονται',
  },
  {
    id: 'amenities',
    fields: ['Hospital', 'University'],
    kind: 'component',
    value: componentValue(COMPONENT_WEIGHTS.distance, 0.5),
    topicEn: 'whether being near a hospital or a university matters to them',
    topicEl: 'αν τους ενδιαφέρει να είναι κοντά σε νοσοκομείο ή πανεπιστήμιο',
  },
  {
    id: 'heating',
    fields: ['heatingCategory', 'heatingAgent'],
    kind: 'hard',
    value: 0.25,
    topicEn: 'whether they care what kind of heating the place has',
    topicEl: 'αν τους ενδιαφέρει το είδος της θέρμανσης',
  },
  {
    id: 'building',
    fields: ['minYearBuilt', 'maxYearBuilt', 'minYearRenovated', 'maxYearRenovated', 'minFloor', 'maxFloor'],
    kind: 'hard',
    value: 0.2,
    bound: 'minYearBuilt',
    topicEn: 'whether they want a newer or recently renovated building, or a particular floor',
    topicEl: 'αν θέλουν νεότερο ή πρόσφατα ανακαινισμένο κτίριο, ή συγκεκριμένο όροφο',
  },
] as const

type Filters = Record<string, unknown>

/** A slot counts as known once any of its fields carries a real value. */
export function isSlotKnown(slot: Slot, filters: Filters): boolean {
  return slot.fields.some(field => {
    const value = filters[field]
    if (value === null || value === undefined || value === '') return false
    if (value === 'Not mentioned') return false
    if (Array.isArray(value)) return value.length > 0
    return true
  })
}

export interface NextQuestion {
  slots: Slot[]
  /** Bound fields the question asks for, in order — written by the policy, not the model. */
  pendingNumeric: string[]
  /** True once nothing worth asking is left. */
  exhausted: boolean
}

/**
 * Pick the next question.
 *
 * Returns up to two slots so one natural sentence can cover both ("how many bedrooms, and
 * what's the most you'd want to pay?") without turning into an interrogation. A slot that
 * has already been asked and still came back unknown is not asked again — the user
 * declined to answer, and repeating it is the failure mode users notice most.
 */
export function selectNextQuestion(
  filters: Filters,
  askedSlotIds: readonly string[] = [],
  maxSlots = 2
): NextQuestion {
  const asked = new Set(askedSlotIds)

  const candidates = SLOTS
    .filter(slot => !isSlotKnown(slot, filters))
    .filter(slot => !asked.has(slot.id))
    .sort((a, b) => b.value - a.value)
    .slice(0, maxSlots)

  const pendingNumeric = candidates
    .map(slot => slot.bound)
    .filter((bound): bound is string => Boolean(bound))

  return {
    slots: candidates,
    pendingNumeric,
    exhausted: candidates.length === 0,
  }
}

/**
 * How much of the scoring picture we actually have, 0..1.
 *
 * Only component slots count: they are what separates one home from another. Hard filters
 * shrink the list without sharpening the ranking within it, so a conversation that has
 * pinned down city and budget but nothing else still has weak percentages, and this number
 * says so honestly.
 */
export function criteriaCoverage(filters: Filters): number {
  const componentSlots = SLOTS.filter(slot => slot.kind === 'component')
  const total = componentSlots.reduce((sum, slot) => sum + slot.value, 0)
  if (total === 0) return 1
  const known = componentSlots
    .filter(slot => isSlotKnown(slot, filters))
    .reduce((sum, slot) => sum + slot.value, 0)
  return known / total
}

/** Slot ids answered by the filters as they now stand. */
export function knownSlotIds(filters: Filters): string[] {
  return SLOTS.filter(slot => isSlotKnown(slot, filters)).map(slot => slot.id)
}

/** Every field any slot can own — used to validate the model's `clear` targets. */
export const ALL_SLOT_FIELDS: ReadonlySet<string> = new Set(SLOTS.flatMap(s => s.fields))

/** Numeric bound fields, re-exported so callers need one import for question building. */
export const BOUND_FIELD_NAMES: readonly string[] = BOUND_PAIRS.flatMap(p => [p.min, p.max])
