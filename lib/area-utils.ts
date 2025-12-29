/**
 * Calculate Levenshtein distance between two strings
 * Used to find the most similar area name
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length
  const dp: number[][] = []

  for (let i = 0; i <= m; i++) {
    dp[i] = [i]
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        )
      }
    }
  }

  return dp[m][n]
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is identical)
 */
function similarityScore(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length)
  if (maxLength === 0) return 1
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  return 1 - distance / maxLength
}

/**
 * Find the most similar area from a list of areas
 */
export function findMostSimilarArea(
  query: string,
  areas: Array<{ id: number; name: string; nameGreek: string | null }>
): { id: number; name: string; nameGreek: string | null } | null {
  if (!query || query.trim().length === 0 || areas.length === 0) {
    return null
  }

  const queryLower = query.toLowerCase().trim()
  let bestMatch: { area: typeof areas[0]; score: number } | null = null

  for (const area of areas) {
    // Check similarity with English name
    const scoreEn = similarityScore(queryLower, area.name.toLowerCase())
    
    // Check similarity with Greek name if available
    let scoreEl = 0
    if (area.nameGreek) {
      scoreEl = similarityScore(queryLower, area.nameGreek.toLowerCase())
    }

    const maxScore = Math.max(scoreEn, scoreEl)
    
    if (!bestMatch || maxScore > bestMatch.score) {
      bestMatch = { area, score: maxScore }
    }
  }

  // Only return if similarity is above a threshold (e.g., 0.5)
  return bestMatch && bestMatch.score > 0.5 ? bestMatch.area : null
}

/**
 * Get area name based on language
 */
export function getAreaName(
  area: string | null,
  areas: Array<{ name: string; nameGreek: string | null }>,
  language: 'el' | 'en'
): string {
  if (!area) return ''
  
  // Find the area in the list
  const areaData = areas.find(a => a.name === area || a.nameGreek === area)
  
  if (!areaData) return area
  
  // Return Greek name if language is Greek and it exists, otherwise return English name
  if (language === 'el' && areaData.nameGreek) {
    return areaData.nameGreek
  }
  
  return areaData.name
}

