/**
 * Must-have features and household facts the conversational search can record.
 *
 * The chat used to have no field for "it has to have a balcony" or "I have a dog" beyond the
 * Park distance category, so those requests vanished: the intent text the search scores on
 * never mentioned them, the description evidence never looked for them, and a dog owner was
 * never warned off a "no pets" listing. Each id here has a canonical English phrase that the
 * intent text emits — chosen so that `lib/search/listing-evidence.ts` recognises it, which is
 * what ties a chat answer to the same evidence a typed query gets.
 */

export const FEATURE_IDS = [
  // Property features — matched against each listing's text and photos.
  'balcony', 'terrace', 'garden', 'pool', 'seaView', 'view', 'fireplace', 'storage',
  'elevator', 'airConditioning', 'furnished', 'unfurnished', 'renovated', 'newBuild',
  'modernKitchen', 'woodFloors', 'bright', 'quiet', 'solarHeater', 'doubleGlazing',
  'securityDoor', 'penthouse',
  // Household facts — drive the disqualifiers (no pets, adults only, no students …).
  'pets', 'children', 'student', 'smoker', 'shortTerm', 'livesAlone',
] as const

export type FeatureId = (typeof FEATURE_IDS)[number]

const FEATURE_ID_SET: ReadonlySet<string> = new Set(FEATURE_IDS)

export function isFeatureId(value: unknown): value is FeatureId {
  return typeof value === 'string' && FEATURE_ID_SET.has(value)
}

/** Keep only known ids, de-duplicated, in vocabulary order. */
export function sanitizeFeatures(value: unknown): FeatureId[] {
  if (!Array.isArray(value)) return []
  const wanted = new Set(value.filter(isFeatureId))
  return FEATURE_IDS.filter(id => wanted.has(id))
}

interface FeatureText {
  /** Emitted into the intent text; must trigger the matching evidence concept or rule. */
  intent: string
  en: string
  el: string
}

export const FEATURE_TEXT: Record<FeatureId, FeatureText> = {
  balcony: { intent: 'with a balcony', en: 'Balcony', el: 'Μπαλκόνι' },
  terrace: { intent: 'with a terrace', en: 'Terrace', el: 'Ταράτσα' },
  garden: { intent: 'with a garden', en: 'Garden', el: 'Κήπος' },
  pool: { intent: 'with a pool', en: 'Pool', el: 'Πισίνα' },
  seaView: { intent: 'with a sea view', en: 'Sea view', el: 'Θέα θάλασσα' },
  view: { intent: 'with a view', en: 'View', el: 'Θέα' },
  fireplace: { intent: 'with a fireplace', en: 'Fireplace', el: 'Τζάκι' },
  storage: { intent: 'with a storage room', en: 'Storage', el: 'Αποθήκη' },
  elevator: { intent: 'with an elevator', en: 'Elevator', el: 'Ασανσέρ' },
  airConditioning: { intent: 'with air conditioning', en: 'Air conditioning', el: 'Κλιματισμός' },
  furnished: { intent: 'furnished', en: 'Furnished', el: 'Επιπλωμένο' },
  unfurnished: { intent: 'unfurnished', en: 'Unfurnished', el: 'Ανεπίπλωτο' },
  renovated: { intent: 'renovated', en: 'Renovated', el: 'Ανακαινισμένο' },
  newBuild: { intent: 'new build', en: 'New build', el: 'Νεόδμητο' },
  modernKitchen: { intent: 'with a modern kitchen', en: 'Modern kitchen', el: 'Μοντέρνα κουζίνα' },
  woodFloors: { intent: 'with wooden floors', en: 'Wooden floors', el: 'Ξύλινα πατώματα' },
  bright: { intent: 'bright', en: 'Bright', el: 'Φωτεινό' },
  quiet: { intent: 'quiet', en: 'Quiet', el: 'Ήσυχο' },
  solarHeater: { intent: 'with a solar water heater', en: 'Solar heater', el: 'Ηλιακός' },
  doubleGlazing: { intent: 'with double glazing', en: 'Double glazing', el: 'Διπλά τζάμια' },
  securityDoor: { intent: 'with a security door', en: 'Security door', el: 'Πόρτα ασφαλείας' },
  penthouse: { intent: 'penthouse', en: 'Penthouse', el: 'Ρετιρέ' },
  pets: { intent: 'moving in with pets', en: 'Pets', el: 'Κατοικίδια' },
  children: { intent: 'moving in with children', en: 'Children', el: 'Παιδιά' },
  student: { intent: 'tenant is a student', en: 'Student', el: 'Φοιτητής' },
  smoker: { intent: 'tenant is a smoker', en: 'Smoker', el: 'Καπνιστής' },
  shortTerm: { intent: 'short-term lease', en: 'Short-term', el: 'Βραχυχρόνια' },
  livesAlone: { intent: 'single person', en: 'Living alone', el: 'Μόνος/η' },
}
