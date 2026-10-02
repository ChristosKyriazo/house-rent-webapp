import { removeGreekAccents } from '../utils'

export function calculateDescriptionBonus(
  userQuery: string,
  homeDescription: string | null,
  yearBuilt: number | null = null,
  yearRenovated: number | null = null
): { bonus: number; penalty: number; extractedKeywords: string[]; matchedKeywords: string[]; hasNewMention: boolean } {
  if (!homeDescription) {
    return { bonus: 0, penalty: 0, extractedKeywords: [], matchedKeywords: [], hasNewMention: false }
  }

  let penalty = 0
  let hasNewMention = false

  const queryLower = userQuery.toLowerCase().trim()
  const featureKeywords: string[] = []

  const stopWords = new Set([
    'i', 'want', 'need', 'looking', 'for', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'θελω', 'θέλω', 'χρειάζομαι', 'ψάχνω', 'για', 'το', 'τη', 'τον', 'τα', 'της', 'των', 'με', 'σε', 'από', 'προς', 'και', 'ή', 'αλλά',
  ])

  const words = queryLower
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .filter(word => !stopWords.has(word))

  words.forEach(word => {
    if (word.length > 2) {
      featureKeywords.push(word)
      const normalized = removeGreekAccents(word)
      if (normalized !== word) featureKeywords.push(normalized)
    }
  })

  const featurePatterns = [
    /\b(new|modern|updated|renovated)\s+(stove|oven|kitchen|appliance|appliances)\b/i,
    /\b(big|large|spacious|huge)\s+(balcony|terrace|patio|deck)\b/i,
    /\b(backyard|garden|yard|outdoor|outdoor space)\b/i,
    /\b(pool|swimming pool|jacuzzi|hot tub)\b/i,
    /\b(view|views|sea view|mountain view|city view|panoramic)\b/i,
    /\b(fireplace|fire place)\b/i,
    /\b(storage|storage space|closet|closets)\b/i,
    /\b(garage|parking space|parking)\b/i,
    /\b(modern|renovated|updated|new)\s+(bathroom|bathrooms)\b/i,
    /\b(wood|hardwood|parquet)\s+(floor|floors|flooring)\b/i,
    /\b(air conditioning|ac|heating|central heating)\b/i,
    /\b(elevator|lift)\b/i,
  ]

  featurePatterns.forEach(pattern => {
    const match = queryLower.match(pattern)
    if (match) {
      const matchWords = match[0].split(/\s+/)
      matchWords.forEach(word => {
        if (word.length > 3 && !['new', 'big', 'large', 'modern', 'updated', 'renovated'].includes(word.toLowerCase())) {
          featureKeywords.push(word.toLowerCase())
        }
      })
      featureKeywords.push(match[0].toLowerCase())
    }
  })

  const standaloneFeatures = [
    'stove', 'oven', 'balcony', 'terrace', 'backyard', 'garden', 'pool', 'view',
    'fireplace', 'storage', 'garage', 'elevator', 'appliance', 'appliances',
  ]
  standaloneFeatures.forEach(feature => {
    if (queryLower.includes(feature)) featureKeywords.push(feature)
  })

  const uniqueFeatureKeywords = [...new Set(featureKeywords)]

  if (uniqueFeatureKeywords.length === 0) {
    return { bonus: 0, penalty: 0, extractedKeywords: [], matchedKeywords: [], hasNewMention: false }
  }

  const matchedKeywords: string[] = []
  const descLower = homeDescription.toLowerCase()
  const descNormalized = removeGreekAccents(descLower)

  const newPatterns = [
    /\b(new|modern|updated|renovated|recent)\s+(kitchen|bathroom|bathrooms|appliance|appliances|stove|oven|renovation|renovations)\b/i,
    /\b(new|modern|updated|renovated)\s+(house|home|apartment|property)\b/i,
  ]
  hasNewMention = newPatterns.some(pattern => pattern.test(userQuery))

  uniqueFeatureKeywords.forEach(keyword => {
    const keywordNormalized = removeGreekAccents(keyword)

     
    const negativePatterns = [
      new RegExp(`(doesn't|does not|don't|do not|no|without|lack|lacks|missing|does not have|doesn't have)\\s+.*?${keywordNormalized}`, 'i'),
      new RegExp(`${keywordNormalized}.*?(doesn't|does not|don't|do not|no|without|lack|lacks|missing)`, 'i'),
      new RegExp(`(no|without)\\s+${keywordNormalized}`, 'i'),
      new RegExp(`(δεν|χωρίς|λείπει|λείπει το|δεν έχει|δεν υπάρχει)\\s+.*?${keywordNormalized}`, 'i'),
      new RegExp(`${keywordNormalized}.*?(δεν|χωρίς|λείπει|δεν έχει)`, 'i'),
      new RegExp(`(χωρίς)\\s+${keywordNormalized}`, 'i'),
    ]
     

    const hasNegativeMention = negativePatterns.some(
      pattern => pattern.test(descLower) || pattern.test(descNormalized)
    )

    if (hasNegativeMention) {
      penalty -= 15
    } else if (descLower.includes(keyword) || descNormalized.includes(keywordNormalized)) {
      matchedKeywords.push(keyword)
    }
  })

  const matchRatio = matchedKeywords.length / uniqueFeatureKeywords.length
  let descriptionBonus = 0

  if (matchedKeywords.length > 0) {
    descriptionBonus = Math.min(matchedKeywords.length * 1.5 + matchRatio * 3, 12)
  }

  if (hasNewMention) {
    const currentYear = new Date().getFullYear()
    const latestYear = Math.max(yearRenovated || 0, yearBuilt || 0)

    if (latestYear > 0) {
      const yearsSinceLatest = currentYear - latestYear
      if (yearsSinceLatest <= 2) {
        descriptionBonus += 3
      } else if (yearsSinceLatest <= 5) {
        descriptionBonus += 2
      } else if (yearsSinceLatest <= 10) {
        descriptionBonus += 1
      } else if (yearsSinceLatest <= 20) {
        descriptionBonus += 0.5
      }
      descriptionBonus = Math.min(descriptionBonus, 8)
    }
  }

  penalty = Math.max(penalty, -20)

  return {
    bonus: descriptionBonus,
    penalty,
    extractedKeywords: uniqueFeatureKeywords,
    matchedKeywords,
    hasNewMention,
  }
}

export function calculateDisqualifiers(userQuery: string, homeDescription: string | null): string | null {
  if (!homeDescription || !userQuery) return null

  const qLower = userQuery.toLowerCase()
  const dLower = homeDescription.toLowerCase()
  const dNorm = removeGreekAccents(dLower)

  /* eslint-disable security/detect-unsafe-regex -- patterns match internal DB strings, not user input */
  const RULES: Array<{ queryPatterns: RegExp[]; descPatterns: RegExp[]; reason: string }> = [
    {
      queryPatterns: [/\bpets?\b/, /\bdogs?\b/, /\bcats?\b/, /\banimals?\b/, /κατοικίδ/],
      descPatterns: [
        /no[\s-]pets?\b/,
        /pets?\s*(:|are|is)?\s*(not\s+)?(allowed|permitted|accepted|welcome)/,
        /pets?\s+not\s+(allowed|permitted|welcome)/,
        /no\s+animals?\b/,
        /animals?\s*(not\s+)?(allowed|permitted|accepted)/,
        /pet[\s-]?free/,
        /strictly\s+no\s+pets?/,
        /απαγορεύ[α-ω]+\s+κατοικίδ/,
        /κατοικίδ[α-ω]*\s+απαγορεύ/,
        /δεν\s+επιτρέπ[α-ω]+\s+κατοικίδ/,
        /κατοικίδ[α-ω]*\s+δεν\s+επιτρέπ/,
      ],
      reason: 'No pets allowed',
    },
    {
      queryPatterns: [/\bsmok(ing|e|ers?)\b/, /κάπνισμα/, /καπνιστ/],
      descPatterns: [
        /no[\s-]smoking\b/,
        /smoking\s*(:|is|are)?\s*(not\s+)?(allowed|permitted)/,
        /smoke[\s-]?free/,
        /non[\s-]smoking/,
        /απαγορεύ[α-ω]+\s+κάπνισμα/,
        /κάπνισμα\s+απαγορεύ/,
        /δεν\s+επιτρέπ[α-ω]+\s+κάπνισμα/,
      ],
      reason: 'No smoking allowed',
    },
    {
      queryPatterns: [/\bfurnish(ed|ing)?\b/, /\bfurniture\b/, /επιπλωμέν/, /έπιπλα/],
      descPatterns: [
        /\bunfurnished\b/,
        /not?\s+furnished\b/,
        /without\s+furniture/,
        /no\s+furniture/,
        /χωρίς\s+έπιπλα/,
        /δεν\s+(είναι\s+)?επιπλωμέν/,
        /ανεπίπλωτ/,
      ],
      reason: 'Property is unfurnished',
    },
    {
      queryPatterns: [/\b(children|kids?)\b/, /παιδ(ιά|ί)\b/],
      descPatterns: [
        /no\s+(children|kids)\b/,
        /(children|kids)\s*(:|are|is)?\s*(not\s+)?(allowed|permitted|welcome)/,
        /adults?\s+only/,
        /δεν\s+επιτρέπ[α-ω]+\s+παιδ/,
        /παιδ[α-ω]*\s+δεν\s+επιτρέπ/,
        /απαγορεύ[α-ω]+\s+παιδ/,
      ],
      reason: 'No children allowed',
    },
    {
      queryPatterns: [/\bstudents?\b/, /φοιτητ/],
      descPatterns: [
        /no\s+students?\b/,
        /students?\s*(:|are|is)?\s*(not\s+)?(allowed|permitted|welcome)/,
        /δεν\s+επιτρέπ[α-ω]+\s+φοιτητ/,
        /φοιτητ[α-ω]*\s+δεν\s+επιτρέπ/,
      ],
      reason: 'No students allowed',
    },
    {
      // Short-term / flexible lease queries vs long minimum-term requirements
      queryPatterns: [
        /\bshort[\s-]term\b/, /\b1[\s-]month\b/, /\bmonth[\s-]to[\s-]month\b/,
        /\bflexible\s+(lease|term|contract)\b/, /βραχυχρόνι/, /\bμήνα[\s-]+μήνα\b/,
      ],
      descPatterns: [
        /minimum\s+(lease|contract|rental)?\s*(of\s+)?(6|7|8|9|10|11|12|18|24)\s*months?/,
        /\b(6|7|8|9|10|11|12|18|24)[\s-]month\s+minimum/,
        /long[\s-]term\s+only/,
        /ελάχιστη\s+διάρκεια\s+(μίσθωσης?\s+)?(6|7|8|9|10|11|12)\s*μήν/,
      ],
      reason: 'Minimum lease term required',
    },
    {
      // Single-person / solo queries vs couples/families only listings
      queryPatterns: [
        /\bsingle\s+(person|tenant|occupant)\b/, /\bjust\s+(me|myself)\b/,
        /\bone\s+person\b/, /\bsolo\b/, /\bμόνο[ς]?\s+μου\b/,
      ],
      descPatterns: [
        /couples?\s+only/, /families\s+only/, /family\s+preferred/,
        /suitable\s+for\s+(couples?|families)/, /μόνο\s+ζευγάρι/, /μόνο\s+οικογένει/,
      ],
      reason: 'Couples or families preferred',
    },
  ]
  /* eslint-enable security/detect-unsafe-regex */

  for (const rule of RULES) {
    if (!rule.queryPatterns.some(p => p.test(qLower))) continue
    if (rule.descPatterns.some(p => p.test(dLower) || p.test(dNorm))) return rule.reason
  }

  return null
}
