/**
 * What a listing's own text and photos say about the specific things a query asked for.
 *
 * This replaces keyword-overlap scoring that treated every query word as a feature. "2 bedroom
 * apartment in Athens with balcony" yielded the "features" bedroom/apartment/athens/balcony, so a
 * listing scored for merely containing the word "apartment"; and its negation check matched
 * the letters "no" anywhere after a keyword — inside "re-no-vated", "north", "economy" — so the
 * listing that matched the query perfectly took the maximum penalty and showed 0%. The pet and
 * student rules matched "pets allowed" and "students welcome" as prohibitions.
 *
 * Here a query can only ask for a **concept** from a fixed vocabulary (balcony, furnished, sea
 * view …), each with English and Greek patterns. Evidence is matched on word boundaries, and a
 * negation only counts when it sits in the same clause, at most three words before the feature.
 * Everything is folded to lower-case, accent-free Greek first, so "Μπαλκόνι" and "μπαλκονι"
 * are the same word.
 *
 * Kept free of scoring weights: it reports fractions in 0..1 and `score-home` decides what they
 * are worth, so the search route and the saved-search matcher cannot weigh evidence differently.
 */

/** Lower-case, strip every diacritic, and unify final sigma so stems match in any case. */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ')
}

const LETTER = '[\\p{L}\\p{N}]'

/** A pattern that only matches as whole words. Stems opt into suffixes with `\\p{L}*`. */
function word(source: string): RegExp {
  return new RegExp(`(?<!${LETTER})(?:${source})(?!${LETTER})`, 'u')
}

/**
 * A negator, then up to three words of the same clause, then the feature. Commas and sentence
 * punctuation end the clause, so "no agency fees, large balcony" does not negate the balcony.
 */
const NEGATOR =
  'no|not|without|lacks?|lacking|χωρισ|δεν\\s+(?:εχει|διαθετει|υπαρχει|περιλαμβανει)'
function negated(source: string): RegExp {
  return new RegExp(
    `(?<!${LETTER})(?:${NEGATOR})\\s+(?:[^\\s.,;:!?]+\\s+){0,3}?(?:${source})(?!${LETTER})`,
    'u',
  )
}

interface Concept {
  id: string
  /** Phrases in a query that ask for this concept. */
  query: string[]
  /** Phrases in a listing that confirm it. Defaults to `query`. */
  evidence?: string[]
  /** Phrases in a listing that state the opposite outright ("unfurnished"). */
  opposite?: string[]
  /** Photo tags (lib/photo-vision.ts KNOWN_FEATURES) that confirm it visually. */
  photoTags?: string[]
  /** Structured fields that confirm it without any text. */
  confirmedBy?: (home: EvidenceHome) => boolean
  /** "no X" in a listing is not a contradiction for this concept — a disqualifier owns it. */
  negationHandledElsewhere?: boolean
  /** Concept ids that, when also asked for, make this one redundant ("sea view" ⊃ "view"). */
  supersededBy?: string[]
}

const YEAR = () => new Date().getFullYear()

/**
 * The vocabulary. Patterns are written against `fold()` output: lower-case, no accents, σ for ς.
 * A concept not listed here cannot be asked for — on purpose, so an ordinary word like
 * "apartment" or a place name can never be mistaken for a feature.
 */
export const CONCEPTS: readonly Concept[] = [
  {
    id: 'balcony',
    query: ['balcon(?:y|ies)', 'verandas?', 'μπαλκον\\p{L}*', 'βεραντ\\p{L}*'],
    photoTags: ['balcony', 'terrace', 'patio'],
  },
  {
    id: 'terrace',
    query: ['terrac\\p{L}*', 'roof\\s?tops?', 'ταρατσ\\p{L}*'],
    photoTags: ['terrace', 'rooftop', 'patio'],
  },
  {
    id: 'garden',
    query: ['gardens?', '(?:back)?yards?', 'κηπ\\p{L}*', 'αυλ\\p{L}*'],
    photoTags: ['garden', 'yard'],
  },
  {
    id: 'pool',
    query: ['(?:swimming\\s+)?pools?', 'jacuzzi', 'πισιν\\p{L}*'],
    photoTags: ['pool', 'swimming pool', 'jacuzzi'],
  },
  {
    id: 'seaView',
    query: [
      'sea\\s*views?',
      'views?\\s+(?:of|to|over)\\s+the\\s+sea',
      'θεα\\s+(?:στη\\s+|στην\\s+|προσ\\s+(?:τη\\s+|την\\s+)?)?θαλασσα',
    ],
    evidence: [
      'sea\\s*views?',
      'views?\\s+(?:of|to|over)\\s+the\\s+sea',
      'overlooking\\s+the\\s+sea',
      'θεα\\s+(?:στη\\s+|στην\\s+|προσ\\s+(?:τη\\s+|την\\s+)?)?θαλασσα',
    ],
    photoTags: ['sea view'],
  },
  {
    id: 'view',
    query: ['views?', 'panoramic', 'θεα'],
    evidence: ['views?', 'panoramic', 'overlooking', 'θεα'],
    photoTags: ['sea view', 'mountain view', 'city view', 'panoramic view'],
    supersededBy: ['seaView'],
  },
  {
    id: 'fireplace',
    query: ['fire\\s?places?', 'τζακ\\p{L}*'],
    photoTags: ['fireplace'],
  },
  {
    id: 'storage',
    query: ['storage(?:\\s+(?:room|space|unit))?', 'store\\s?rooms?', 'αποθηκ\\p{L}*'],
    photoTags: ['storage', 'walk-in closet'],
  },
  {
    id: 'elevator',
    query: ['elevators?', 'lifts?', 'ασανσερ', 'ανελκυστηρ\\p{L}*'],
  },
  {
    id: 'airConditioning',
    query: ['air[\\s-]?condition\\p{L}*', 'aircon', 'a\\/c', 'κλιματισ\\p{L}*'],
  },
  {
    id: 'furnished',
    query: ['(?:fully\\s+|semi[\\s-])?furnished', 'furniture', 'επιπλωμεν\\p{L}*'],
    evidence: ['(?:fully\\s+|semi[\\s-])?furnished', 'furniture\\s+included', 'επιπλωμεν\\p{L}*'],
    opposite: ['unfurnished', 'ανεπιπλωτ\\p{L}*', 'χωρισ\\s+επιπλα'],
    negationHandledElsewhere: true,
  },
  {
    id: 'unfurnished',
    query: ['unfurnished', 'ανεπιπλωτ\\p{L}*', 'χωρισ\\s+επιπλα'],
    opposite: ['(?:fully\\s+)?furnished', 'επιπλωμεν\\p{L}*'],
  },
  {
    id: 'renovated',
    query: ['renovat\\p{L}*', 'refurbish\\p{L}*', 'ανακαινισ\\p{L}*'],
    confirmedBy: home => (home.yearRenovated ?? 0) >= YEAR() - 5,
  },
  {
    id: 'newBuild',
    query: [
      'new\\s?(?:build|building|construction)',
      'newly\\s+built',
      'brand[\\s-]new',
      'νεοδμητ\\p{L}*',
      'καινουργ\\p{L}*',
    ],
    evidence: ['new\\s?(?:build|building|construction)', 'newly\\s+built', 'brand[\\s-]new', 'νεοδμητ\\p{L}*'],
    confirmedBy: home => (home.yearBuilt ?? 0) >= YEAR() - 10,
  },
  {
    id: 'modernKitchen',
    query: [
      '(?:new|modern|renovated|equipped)\\s+kitchen',
      'μοντερν\\p{L}*\\s+κουζιν\\p{L}*',
      'ανακαινισμεν\\p{L}*\\s+κουζιν\\p{L}*',
    ],
    evidence: [
      '(?:new|modern|renovated|fully\\s+equipped|equipped)\\s+kitchen',
      'μοντερν\\p{L}*\\s+κουζιν\\p{L}*',
      'ανακαινισμεν\\p{L}*\\s+κουζιν\\p{L}*',
      'εξοπλισμεν\\p{L}*\\s+κουζιν\\p{L}*',
    ],
    photoTags: ['modern kitchen', 'island kitchen'],
  },
  {
    id: 'woodFloors',
    query: ['parquet', '(?:hard)?wood(?:en)?\\s+floor\\p{L}*', 'παρκε', 'ξυλιν\\p{L}*\\s+πατωμ\\p{L}*'],
    photoTags: ['hardwood floors', 'parquet floors'],
  },
  {
    id: 'bright',
    query: ['bright', 'sunny', 'sunlit', '(?:lots\\s+of\\s+|natural\\s+)light', 'φωτειν\\p{L}*', 'ηλιολουστ\\p{L}*', 'ηλιοφωτ\\p{L}*'],
    photoTags: ['bright', 'natural light'],
  },
  {
    id: 'quiet',
    query: ['quiet', 'peaceful', 'calm', 'ησυχ\\p{L}*', 'ηρεμ\\p{L}*'],
    opposite: ['noisy', 'θορυβωδ\\p{L}*'],
  },
  {
    id: 'solarHeater',
    query: ['solar(?:\\s+(?:water\\s+)?heater|\\s+panels?)?', 'ηλιακ\\p{L}*'],
  },
  {
    id: 'doubleGlazing',
    query: ['double[\\s-]glaz\\p{L}*', '(?:double|thermal)[\\s-](?:pane|glass)\\p{L}*', 'διπλ\\p{L}*\\s+τζαμ\\p{L}*', 'θερμοδιακοπ\\p{L}*'],
  },
  {
    id: 'securityDoor',
    query: ['security\\s+door', 'armou?red\\s+door', 'πορτα\\s+ασφαλειασ', 'θωρακισμεν\\p{L}*\\s+πορτα'],
  },
  {
    id: 'penthouse',
    query: ['penthouse', 'ρετιρε'],
  },
  {
    id: 'petFriendly',
    query: ['pets?', 'dogs?', 'cats?', 'pupp(?:y|ies)', 'kittens?', 'animals?', 'κατοικιδ\\p{L}*', 'σκυλ\\p{L}*', 'γατ\\p{L}*'],
    evidence: [
      // Not preceded by "no" — "no pets allowed" contains "pets allowed".
      '(?<!no[\\s-])pets?\\s+(?:are\\s+|is\\s+)?(?:allowed|welcome|accepted|permitted)',
      'pet[\\s-]friendly',
      'κατοικιδ\\p{L}*\\s+(?:επιτρεπ\\p{L}*|ευπροσδεκτ\\p{L}*)',
      'επιτρεπ\\p{L}*\\s+(?:τα\\s+)?κατοικιδ\\p{L}*',
    ],
    negationHandledElsewhere: true,
  },
]

const COMPILED = CONCEPTS.map(concept => {
  const evidence = concept.evidence ?? concept.query
  return {
    concept,
    query: concept.query.map(word),
    evidence: evidence.map(word),
    negated: concept.negationHandledElsewhere ? [] : evidence.map(negated),
    opposite: (concept.opposite ?? []).map(word),
  }
})

export interface EvidenceHome {
  title?: string | null
  description?: string | null
  descriptionGreek?: string | null
  yearBuilt?: number | null
  yearRenovated?: number | null
  photoTags?: string[] | null
}

export interface ListingEvidence {
  /** Concept ids the query asked for. */
  requested: string[]
  /** …that the listing's text, structured fields or photos confirm. */
  confirmed: string[]
  /** …that the listing explicitly denies ("no balcony", "unfurnished"). */
  contradicted: string[]
  /** …confirmed by the photos specifically. */
  confirmedInPhotos: string[]
  /** Set when the listing excludes the person asking (no pets, adults only …). */
  disqualifier: string | null
}

/** The concepts a query asks for. Exported so the UI and tests can show what was understood. */
export function requestedConcepts(query: string): string[] {
  const q = fold(query)
  const ids = COMPILED.filter(c => c.query.some(re => re.test(q))).map(c => c.concept.id)
  return ids.filter(id => {
    const concept = CONCEPTS.find(c => c.id === id)!
    return !concept.supersededBy?.some(other => ids.includes(other))
  })
}

export function assessListing(query: string | null | undefined, home: EvidenceHome): ListingEvidence {
  const empty: ListingEvidence = {
    requested: [],
    confirmed: [],
    contradicted: [],
    confirmedInPhotos: [],
    disqualifier: null,
  }
  if (!query || !query.trim()) return empty

  const text = fold([home.title, home.description, home.descriptionGreek].filter(Boolean).join('\n'))
  const tags = new Set((home.photoTags ?? []).map(t => t.toLowerCase()))
  const requested = requestedConcepts(query)

  const confirmed: string[] = []
  const contradicted: string[] = []
  const confirmedInPhotos: string[] = []

  for (const id of requested) {
    const c = COMPILED.find(x => x.concept.id === id)!
    const inPhotos = (c.concept.photoTags ?? []).some(tag => tags.has(tag))
    if (inPhotos) confirmedInPhotos.push(id)

    // Negation is checked first: "no balcony" also contains the word "balcony".
    if (c.negated.some(re => re.test(text)) || c.opposite.some(re => re.test(text))) {
      contradicted.push(id)
      continue
    }
    if (c.evidence.some(re => re.test(text)) || c.concept.confirmedBy?.(home) || inPhotos) {
      confirmed.push(id)
    }
  }

  return {
    requested,
    confirmed,
    contradicted,
    confirmedInPhotos,
    disqualifier: findDisqualifier(query, text),
  }
}

// --- Disqualifiers -----------------------------------------------------------
//
// A listing that excludes the person asking is not a weak match, it is no match. Every
// listing pattern below must be a prohibition: the previous rules made the "not" optional
// ("pets (not)? allowed"), so "Pets allowed!" disqualified every dog owner.

interface Rule {
  /** The query says this about the person searching. */
  asker: string[]
  /** …unless it says the opposite ("non-smoker", "no kids"). */
  askerUnless?: string[]
  /** The listing forbids it. */
  forbids: string[]
  reason: string
}

const RULES: readonly Rule[] = [
  {
    asker: ['pets?', 'dogs?', 'cats?', 'pupp(?:y|ies)', 'kittens?', 'animals?', 'κατοικιδ\\p{L}*', 'σκυλ\\p{L}*', 'γατ\\p{L}*'],
    askerUnless: ['no\\s+pets?', 'without\\s+pets?', 'χωρισ\\s+κατοικιδ\\p{L}*'],
    forbids: [
      'no[\\s-]pets?',
      'pets?\\s*:\\s*no',
      'pets?\\s+(?:are\\s+|is\\s+)?not\\s+(?:allowed|permitted|accepted|welcome)',
      'no\\s+animals?',
      'animals?\\s+(?:are\\s+)?not\\s+(?:allowed|permitted|accepted)',
      'pet[\\s-]?free',
      'απαγορευ\\p{L}*\\s+(?:τα\\s+)?(?:κατοικιδ|ζω)\\p{L}*',
      '(?:κατοικιδ|ζω)\\p{L}*\\s+απαγορευ\\p{L}*',
      'δεν\\s+επιτρεπ\\p{L}*\\s+(?:τα\\s+)?(?:κατοικιδ|ζω)\\p{L}*',
      '(?:κατοικιδ|ζω)\\p{L}*\\s+δεν\\s+επιτρεπ\\p{L}*',
      'χωρισ\\s+κατοικιδ\\p{L}*',
    ],
    reason: 'No pets allowed',
  },
  {
    // Only someone who smokes is excluded by a no-smoking listing. "I want a smoke-free flat"
    // used to match the smoking rule and then disqualify every non-smoking listing.
    asker: ['smokers?', 'i\\s+smoke', '(?:i\\s+am|im|i\'m)\\s+a\\s+smoker', 'καπνιζ\\p{L}*', 'καπνιστ\\p{L}*'],
    askerUnless: ['non[\\s-]?smok\\p{L}*', 'no[\\s-]smok\\p{L}*', 'smoke[\\s-]free', 'don\'?t\\s+smoke', 'δεν\\s+καπνιζ\\p{L}*', 'μη\\s+καπνιστ\\p{L}*'],
    forbids: [
      'no[\\s-]smoking',
      'smoking\\s+(?:is\\s+)?not\\s+(?:allowed|permitted)',
      'smoke[\\s-]?free',
      'non[\\s-]smoking',
      'απαγορευ\\p{L}*\\s+(?:το\\s+)?καπνισμα',
      'καπνισμα\\s+απαγορευ\\p{L}*',
      'δεν\\s+επιτρεπ\\p{L}*\\s+(?:το\\s+)?καπνισμα',
    ],
    reason: 'No smoking allowed',
  },
  {
    asker: ['(?:fully\\s+|semi[\\s-])?furnished', 'furniture', 'επιπλωμεν\\p{L}*', 'επιπλα'],
    askerUnless: ['unfurnished', 'without\\s+furniture', 'χωρισ\\s+επιπλα', 'ανεπιπλωτ\\p{L}*'],
    forbids: [
      'unfurnished',
      'not\\s+furnished',
      'without\\s+furniture',
      'no\\s+furniture',
      'χωρισ\\s+επιπλα',
      'δεν\\s+(?:ειναι\\s+)?επιπλωμεν\\p{L}*',
      'ανεπιπλωτ\\p{L}*',
    ],
    reason: 'Property is unfurnished',
  },
  {
    asker: ['children', 'kids?', 'toddlers?', 'baby', 'babies', 'παιδ\\p{L}*', 'μωρ\\p{L}*'],
    askerUnless: ['no\\s+(?:kids|children)', 'without\\s+(?:kids|children)', 'χωρισ\\s+παιδ\\p{L}*', 'δεν\\s+εχω\\s+παιδ\\p{L}*'],
    forbids: [
      'no\\s+(?:children|kids)',
      '(?:children|kids)\\s+(?:are\\s+)?not\\s+(?:allowed|permitted|welcome|accepted)',
      'adults?\\s+only',
      'δεν\\s+επιτρεπ\\p{L}*\\s+(?:τα\\s+)?παιδ\\p{L}*',
      'παιδ\\p{L}*\\s+δεν\\s+επιτρεπ\\p{L}*',
      'απαγορευ\\p{L}*\\s+(?:τα\\s+)?παιδ\\p{L}*',
      'μονο\\s+ενηλικ\\p{L}*',
    ],
    reason: 'No children allowed',
  },
  {
    asker: ['students?', 'φοιτητ\\p{L}*'],
    forbids: [
      'no\\s+students?',
      'students?\\s+(?:are\\s+)?not\\s+(?:allowed|permitted|welcome|accepted)',
      'δεν\\s+επιτρεπ\\p{L}*\\s+(?:σε\\s+)?φοιτητ\\p{L}*',
      'φοιτητ\\p{L}*\\s+δεν\\s+επιτρεπ\\p{L}*',
      'οχι\\s+φοιτητ\\p{L}*',
    ],
    reason: 'No students allowed',
  },
  {
    asker: [
      'short[\\s-]term',
      '1[\\s-]month',
      'month[\\s-]to[\\s-]month',
      'flexible\\s+(?:lease|term|contract)',
      'βραχυχρονι\\p{L}*',
      'μηνα[\\s-]+μηνα',
    ],
    forbids: [
      'minimum\\s+(?:lease|contract|rental)?\\s*(?:of\\s+)?(?:6|7|8|9|10|11|12|18|24)\\s*months?',
      '(?:6|7|8|9|10|11|12|18|24)[\\s-]month\\s+minimum',
      'long[\\s-]term\\s+only',
      'ελαχιστη\\s+διαρκεια\\s+(?:μισθωσησ?\\s+)?(?:6|7|8|9|10|11|12)\\s*μην\\p{L}*',
    ],
    reason: 'Minimum lease term required',
  },
  {
    // "suitable for families" and "family preferred" describe or prefer — they do not
    // exclude anyone, so only explicit "only" phrasing counts.
    asker: ['single\\s+(?:person|tenant|occupant)', 'just\\s+(?:me|myself)', 'one\\s+person', 'solo', 'μονοσ\\s+μου', 'μονη\\s+μου'],
    forbids: ['couples?\\s+only', 'families\\s+only', 'only\\s+(?:for\\s+)?(?:couples|families)', 'μονο\\s+(?:για\\s+)?ζευγαρ\\p{L}*', 'μονο\\s+(?:για\\s+)?οικογενει\\p{L}*'],
    reason: 'Couples or families only',
  },
]

const COMPILED_RULES = RULES.map(rule => ({
  reason: rule.reason,
  asker: rule.asker.map(word),
  askerUnless: (rule.askerUnless ?? []).map(word),
  forbids: rule.forbids.map(word),
}))

function findDisqualifier(query: string, foldedListingText: string): string | null {
  if (!foldedListingText) return null
  const q = fold(query)
  for (const rule of COMPILED_RULES) {
    if (!rule.asker.some(re => re.test(q))) continue
    if (rule.askerUnless.some(re => re.test(q))) continue
    if (rule.forbids.some(re => re.test(foldedListingText))) return rule.reason
  }
  return null
}

/** Disqualifier check alone, for callers that have no other use for the evidence. */
export function calculateDisqualifiers(
  query: string | null | undefined,
  description: string | null | undefined,
  descriptionGreek?: string | null,
): string | null {
  if (!query) return null
  return findDisqualifier(query, fold([description, descriptionGreek].filter(Boolean).join('\n')))
}
