/**
 * Fuzzy matching utility for matching user input to existing database values.
 * Uses Jaro-Winkler similarity which gives extra weight to matching prefixes —
 * critical for geographic names like "Keramikos" vs "Thermaikos" where the
 * prefix encodes the distinct identity and pure Levenshtein gives false high scores
 * due to shared suffixes (e.g. both ending in "-aikos").
 */

function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1
  const len1 = s1.length
  const len2 = s2.length
  if (len1 === 0 || len2 === 0) return 0

  const matchWindow = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1)
  const s1Matched = new Array(len1).fill(false)
  const s2Matched = new Array(len2).fill(false)

  let matches = 0
  for (let i = 0; i < len1; i++) {
    const lo = Math.max(0, i - matchWindow)
    const hi = Math.min(i + matchWindow + 1, len2)
    for (let j = lo; j < hi; j++) {
      if (s2Matched[j] || s1[i] !== s2[j]) continue
      s1Matched[i] = true
      s2Matched[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0

  let transpositions = 0
  let k = 0
  for (let i = 0; i < len1; i++) {
    if (!s1Matched[i]) continue
    while (!s2Matched[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }

  return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3
}

/**
 * Jaro-Winkler similarity — like Jaro but awards a prefix bonus (max 4 chars).
 * For geographic names this is superior to Levenshtein because the prefix
 * encodes distinct identity while shared suffixes (e.g. "-aikos") do not.
 */
function jaroWinkler(s1: string, s2: string, p = 0.1): number {
  const jaro = jaroSimilarity(s1, s2)
  let prefix = 0
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) prefix++
    else break
  }
  return jaro + prefix * p * (1 - jaro)
}

/**
 * Find the best matching value from a list of candidates using Jaro-Winkler similarity.
 * Threshold raised to 0.82 for geographic names — at 0.5 the old Levenshtein approach
 * would suggest "Thermaikos" for "Keramikos" because they share the "-aikos" suffix.
 * Jaro-Winkler + 0.82 threshold eliminates that false positive while still catching
 * genuine typos like "Kerameikos" → "Keramikos" (distance of 1 char, ~0.93 JW score).
 *
 * @param input      - The user input to match
 * @param candidates - Array of valid values to match against
 * @param threshold  - Minimum Jaro-Winkler score (default 0.82)
 */
export function findBestMatch(
  input: string | null | undefined,
  candidates: string[],
  threshold = 0.82
): string | null {
  if (!input || input.trim() === '') return null

  const normalizedInput = input.trim().toLowerCase()

  // 1. Exact match (case-insensitive)
  const exactMatch = candidates.find(c => c.toLowerCase() === normalizedInput)
  if (exactMatch) return exactMatch

  // 2. Starts-with match — "keram" → "Kerameikos" ranks above suffix matches
  const prefixMatch = candidates.find(c => c.toLowerCase().startsWith(normalizedInput) || normalizedInput.startsWith(c.toLowerCase()))
  if (prefixMatch) return prefixMatch

  // 3. Contains match (full substring)
  const containsMatch = candidates.find(c =>
    normalizedInput.includes(c.toLowerCase()) || c.toLowerCase().includes(normalizedInput)
  )
  if (containsMatch) return containsMatch

  // 4. Jaro-Winkler fuzzy match (prefix-aware, resists suffix inflation)
  let best: { value: string; score: number } | null = null
  for (const candidate of candidates) {
    const score = jaroWinkler(normalizedInput, candidate.toLowerCase())
    if (!best || score > best.score) best = { value: candidate, score }
  }

  return best && best.score >= threshold ? best.value : null
}

/**
 * Match parking value - handles various formats (1, yes, ναι, 0, no, όχι)
 */
export function matchParkingValue(input: string | null | undefined): boolean | null {
  if (!input) return null
  
  const normalized = String(input).trim().toLowerCase()
  
  // Remove common punctuation and extra spaces
  const cleaned = normalized.replace(/[.,!?;:]/g, '').trim()
  
  // Positive values (more comprehensive)
  const positiveValues = [
    '1', 'yes', 'ναι', 'true', 'y', 'ναιι', 'yes!', 
    'available', 'διαθέσιμο', 'έχει', 'has', 'υπάρχει',
    'ναιι', 'yes!', 'yep', 'yeah', 'si', 'sí'
  ]
  if (positiveValues.some(val => cleaned === val || cleaned.includes(val))) {
    return true
  }
  
  // Negative values (more comprehensive)
  const negativeValues = [
    '0', 'no', 'όχι', 'false', 'n', 'οχι', 'no!',
    'not available', 'μη διαθέσιμο', 'δεν έχει', 'does not have',
    'δεν υπάρχει', 'nope', 'nah', 'nein'
  ]
  if (negativeValues.some(val => cleaned === val || cleaned.includes(val))) {
    return false
  }
  
  return null
}

/**
 * Get unique non-null values from database for a specific field
 */
export async function getUniqueFieldValues(
  prisma: any,
  field: string
): Promise<string[]> {
  try {
    const homes = await prisma.home.findMany({
      where: {
        [field]: { not: null }
      },
      select: {
        [field]: true
      },
      distinct: [field]
    })
    
    return homes
      .map((home: any) => home[field])
      .filter((value: any): value is string => value !== null && value !== undefined)
      .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index)
  } catch (error) {
    console.error(`Error fetching unique values for field ${field}:`, error)
    return []
  }
}

