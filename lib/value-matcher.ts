/**
 * Fuzzy matching utility for matching user input to existing database values
 */

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  const len1 = str1.length
  const len2 = str2.length

  if (len1 === 0) return len2
  if (len2 === 0) return len1

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return matrix[len1][len2]
}

// Calculate similarity score (0-1, where 1 is identical)
function similarityScore(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length)
  if (maxLen === 0) return 1
  const distance = levenshteinDistance(str1, str2)
  return 1 - distance / maxLen
}

/**
 * Find the best matching value from a list of candidates
 * @param input - The user input to match
 * @param candidates - Array of valid values to match against
 * @param threshold - Minimum similarity score (0-1) to consider a match. Default 0.6
 * @returns The best matching value or null if no match above threshold
 */
export function findBestMatch(
  input: string | null | undefined,
  candidates: string[],
  threshold: number = 0.6
): string | null {
  if (!input || input.trim() === '') return null
  
  const normalizedInput = input.trim().toLowerCase()
  
  // First, try exact match (case-insensitive)
  const exactMatch = candidates.find(c => c.toLowerCase() === normalizedInput)
  if (exactMatch) return exactMatch
  
  // Try partial match (contains)
  const partialMatch = candidates.find(c => 
    normalizedInput.includes(c.toLowerCase()) || c.toLowerCase().includes(normalizedInput)
  )
  if (partialMatch) return partialMatch
  
  // Calculate similarity scores for all candidates
  const scores = candidates.map(candidate => ({
    value: candidate,
    score: similarityScore(normalizedInput, candidate.toLowerCase())
  }))
  
  // Sort by score (highest first)
  scores.sort((a, b) => b.score - a.score)
  
  // Return the best match if it's above threshold
  if (scores.length > 0 && scores[0].score >= threshold) {
    return scores[0].value
  }
  
  return null
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

