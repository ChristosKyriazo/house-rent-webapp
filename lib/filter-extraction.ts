import { prisma } from './prisma'

// Helper function to remove Greek accents (same as in areas/search)
function removeGreekAccents(str: string): string {
  const accentMap: Record<string, string> = {
    'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω',
    'ὰ': 'α', 'ὲ': 'ε', 'ὴ': 'η', 'ὶ': 'ι', 'ὸ': 'ο', 'ὺ': 'υ', 'ὼ': 'ω',
    'ᾶ': 'α', 'ῆ': 'η', 'ῖ': 'ι', 'ῦ': 'υ', 'ῶ': 'ω',
    'ᾳ': 'α', 'ῃ': 'η', 'ῳ': 'ω',
    'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω',
    'Ὰ': 'Α', 'Ὲ': 'Ε', 'Ὴ': 'Η', 'Ὶ': 'Ι', 'Ὸ': 'Ο', 'Ὺ': 'Υ', 'Ὼ': 'Ω',
    'ᾼ': 'Α', 'ῌ': 'Η', 'ῼ': 'Ω',
  }
  
  return str
    .split('')
    .map(char => accentMap[char] || char)
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

interface ExtractedFilters {
  city?: string
  country?: string
  area?: string
  minPrice?: number
  maxPrice?: number
  minBedrooms?: number
  maxBedrooms?: number
  minSize?: number
  maxSize?: number
  parking?: boolean
  heatingCategory?: string
  heatingAgent?: string
  minFloor?: number
  maxFloor?: number
  minYearBuilt?: number
  maxYearBuilt?: number
  minYearRenovated?: number
  maxYearRenovated?: number
  minBathrooms?: number
  maxBathrooms?: number
  minClosestMetro?: number
  maxClosestMetro?: number
  minClosestBus?: number
  maxClosestBus?: number
  minClosestSchool?: number
  maxClosestSchool?: number
  minClosestHospital?: number
  maxClosestHospital?: number
  minClosestPark?: number
  maxClosestPark?: number
  confidence: number // 0-1, how confident we are in the extraction
}

/**
 * Simple pattern matching to extract basic filters from user query
 * Returns filters with confidence score
 */
export async function extractFiltersSimple(query: string): Promise<ExtractedFilters> {
  const filters: ExtractedFilters = { confidence: 0 }
  const queryLower = query.toLowerCase()
  const queryNormalized = removeGreekAccents(queryLower)
  
  let foundFilters = 0
  let totalPossibleFilters = 0

  // Extract bedrooms (e.g., "2 bedroom", "2-bedroom", "2BR", "two bedrooms")
  const bedroomPatterns = [
    /(\d+)\s*(?:bedroom|bedrooms|bed|br|beds?)/i,
    /(\d+)\s*-\s*(?:bedroom|bedrooms|bed|br)/i,
    /(?:bedroom|bedrooms|bed|br).*?(\d+)/i,
  ]
  for (const pattern of bedroomPatterns) {
    const match = query.match(pattern)
    if (match) {
      const bedrooms = parseInt(match[1])
      if (bedrooms >= 1 && bedrooms <= 10) {
        filters.minBedrooms = bedrooms
        filters.maxBedrooms = bedrooms
        foundFilters++
        break
      }
    }
  }
  totalPossibleFilters++

  // Extract bathrooms (e.g., "2 bathroom", "2-bathroom", "2BA")
  const bathroomPatterns = [
    /(\d+)\s*(?:bathroom|bathrooms|bath|ba|baths?)/i,
    /(\d+)\s*-\s*(?:bathroom|bathrooms|bath|ba)/i,
  ]
  for (const pattern of bathroomPatterns) {
    const match = query.match(pattern)
    if (match) {
      const bathrooms = parseInt(match[1])
      if (bathrooms >= 1 && bathrooms <= 10) {
        // Note: We don't have bathroom filter in schema, but we can note it
        foundFilters++
        break
      }
    }
  }

  // Extract price (e.g., "under 500", "less than 600", "max 700", "up to 800", "500 euros")
  const pricePatterns = [
    /(?:under|below|less than|max|maximum|up to|at most)\s*(?:€|euros?|eur)?\s*(\d+)/i,
    /(?:over|above|more than|min|minimum|at least)\s*(?:€|euros?|eur)?\s*(\d+)/i,
    /(?:€|euros?|eur)\s*(\d+)/i,
    /(\d+)\s*(?:€|euros?|eur)/i,
  ]
  
  for (const pattern of pricePatterns) {
    const match = query.match(pattern)
    if (match) {
      const price = parseInt(match[1])
      if (price >= 100 && price <= 100000) {
        if (pattern.source.includes('under|below|less|max|maximum|up to|at most')) {
          filters.maxPrice = price
        } else if (pattern.source.includes('over|above|more|min|minimum|at least')) {
          filters.minPrice = price
        } else {
          // If just a number, assume it's max price with some tolerance
          filters.maxPrice = Math.round(price * 1.2) // Allow 20% above
        }
        foundFilters++
        totalPossibleFilters++
        break
      }
    }
  }

  // Extract size (e.g., "50m2", "50 sqm", "50 square meters")
  const sizePatterns = [
    /(\d+)\s*(?:m2|sqm|square meters?|square metres?)/i,
    /(?:size|area).*?(\d+)/i,
  ]
  for (const pattern of sizePatterns) {
    const match = query.match(pattern)
    if (match) {
      const size = parseInt(match[1])
      if (size >= 20 && size <= 1000) {
        filters.minSize = size
        foundFilters++
        totalPossibleFilters++
        break
      }
    }
  }

  // Extract parking (e.g., "with parking", "parking available", "no parking")
  if (/(?:with|has|include|including)\s+parking/i.test(query)) {
    filters.parking = true
    foundFilters++
    totalPossibleFilters++
  } else if (/(?:no|without|lack of)\s+parking/i.test(query)) {
    filters.parking = false
    foundFilters++
    totalPossibleFilters++
  }

  // Extract heating category (e.g., "central heating", "autonomous heating")
  if (/(?:central|centrally)\s+heating/i.test(query)) {
    filters.heatingCategory = 'central'
    foundFilters++
    totalPossibleFilters++
  } else if (/autonomous\s+heating/i.test(query)) {
    filters.heatingCategory = 'autonomous'
    foundFilters++
    totalPossibleFilters++
  }

  // Extract heating agent (e.g., "natural gas", "oil", "electricity")
  if (/natural\s+gas/i.test(query)) {
    filters.heatingAgent = 'natural gas'
    foundFilters++
    totalPossibleFilters++
  } else if (/\boil\b/i.test(query) && /heating/i.test(query)) {
    filters.heatingAgent = 'oil'
    foundFilters++
    totalPossibleFilters++
  } else if (/electric(?:ity|al)\s+heating/i.test(query)) {
    filters.heatingAgent = 'electricity'
    foundFilters++
    totalPossibleFilters++
  }

  // Extract city and country - need to check against database
  // Fetch all areas to match against
  const allAreas = await prisma.area.findMany({
    select: {
      name: true,
      nameGreek: true,
      city: true,
      cityGreek: true,
      country: true,
      countryGreek: true,
    },
  })

  // Try to match city
  for (const area of allAreas) {
    if (area.city) {
      const cityLower = area.city.toLowerCase()
      const cityNormalized = removeGreekAccents(cityLower)
      if (queryLower.includes(cityLower) || queryNormalized.includes(queryNormalized)) {
        filters.city = area.city
        foundFilters++
        totalPossibleFilters++
        break
      }
    }
    if (area.cityGreek) {
      const cityGreekLower = area.cityGreek.toLowerCase()
      const cityGreekNormalized = removeGreekAccents(cityGreekLower)
      if (queryLower.includes(cityGreekLower) || queryNormalized.includes(cityGreekNormalized)) {
        filters.city = area.city || area.cityGreek
        foundFilters++
        totalPossibleFilters++
        break
      }
    }
  }

  // Try to match country
  for (const area of allAreas) {
    if (area.country) {
      const countryLower = area.country.toLowerCase()
      const countryNormalized = removeGreekAccents(countryLower)
      if (queryLower.includes(countryLower) || queryNormalized.includes(queryNormalized)) {
        filters.country = area.country
        foundFilters++
        totalPossibleFilters++
        break
      }
    }
    if (area.countryGreek) {
      const countryGreekLower = area.countryGreek.toLowerCase()
      const countryGreekNormalized = removeGreekAccents(countryGreekLower)
      if (queryLower.includes(countryGreekLower) || queryNormalized.includes(countryGreekNormalized)) {
        filters.country = area.country || area.countryGreek
        foundFilters++
        totalPossibleFilters++
        break
      }
    }
  }

  // Try to match area name
  for (const area of allAreas) {
    if (area.name) {
      const nameLower = area.name.toLowerCase()
      const nameNormalized = removeGreekAccents(nameLower)
      if (queryLower.includes(nameLower) || queryNormalized.includes(queryNormalized)) {
        filters.area = area.name
        foundFilters++
        totalPossibleFilters++
        break
      }
    }
    if (area.nameGreek) {
      const nameGreekLower = area.nameGreek.toLowerCase()
      const nameGreekNormalized = removeGreekAccents(nameGreekLower)
      if (queryLower.includes(nameGreekLower) || queryNormalized.includes(nameGreekNormalized)) {
        filters.area = area.name || area.nameGreek
        foundFilters++
        totalPossibleFilters++
        break
      }
    }
  }

  // Calculate confidence: how many filters we found vs possible
  // If we found at least 2 filters, confidence is high
  if (totalPossibleFilters > 0) {
    filters.confidence = Math.min(1, foundFilters / Math.max(2, totalPossibleFilters))
  } else {
    filters.confidence = 0
  }

  return filters
}

/**
 * Use AI to extract hard filters from user query
 * Returns JSON with filter values only, plus prompt/response for logging
 */
export async function extractFiltersWithAI(
  query: string,
  openai: any
): Promise<ExtractedFilters & { filterExtractionPrompt?: string; filterExtractionResponse?: string }> {
  const systemPrompt = `Extract hard filters from real estate search query. Return JSON only.

Structure:
{
  "city": "Athens" or null,
  "country": "Greece" or null,
  "area": "Nea Smirni" or null,
  "minPrice": 400 or null,
  "maxPrice": 600 or null,
  "minBedrooms": 2 or null,
  "maxBedrooms": 3 or null,
  "minSize": 50 or null,
  "maxSize": 100 or null,
  "parking": true or false or null,
  "heatingCategory": "central" or "autonomous" or null,
  "heatingAgent": "natural gas" or "oil" or "electricity" or "other" or null,
  "minFloor": 1 or null,
  "maxFloor": 5 or null,
  "minYearBuilt": 2000 or null,
  "maxYearBuilt": 2020 or null,
  "minYearRenovated": 2010 or null,
  "maxYearRenovated": 2023 or null,
  "minBathrooms": 1 or null,
  "maxBathrooms": 3 or null,
  "minClosestMetro": 0.5 or null,
  "maxClosestMetro": 2.0 or null,
  "minClosestBus": 0.1 or null,
  "maxClosestBus": 1.0 or null,
  "minClosestSchool": 0.5 or null,
  "maxClosestSchool": 2.0 or null,
  "minClosestHospital": 1.0 or null,
  "maxClosestHospital": 5.0 or null,
  "minClosestPark": 0.5 or null,
  "maxClosestPark": 3.0 or null
}

Rules:
- Extract only hard filters (explicit requirements)
- City: Extract city names (handle both English and Greek - convert Greek to English: "Αθήνα" → "Athens")
- Country: Extract country names (handle both English and Greek - convert Greek to English: "Ελλάδα" → "Greece")
- Area: Extract area names (handle both English and Greek - convert Greek to English: "Αιγάλεω" → "Aigaleo")
- Price: 
  * "under 500" or "at most 500" or "max 500" → maxPrice: 500, minPrice: null
  * "over 500" or "at least 500" or "min 500" → minPrice: 500, maxPrice: null
  * "500-800" or "between 500 and 800" → minPrice: 500, maxPrice: 800
- Bedroom number: 
  * "2 bedrooms" or "2 bedroom" or "2BR" → minBedrooms: 2, maxBedrooms: null (user wants at least 2)
  * "at most 2 bedrooms" or "maximum 2 bedrooms" or "up to 2 bedrooms" → maxBedrooms: 2, minBedrooms: null
  * "exactly 2 bedrooms" or "2 bedrooms exactly" → minBedrooms: 2, maxBedrooms: 2
- Bathroom number: 
  * "2 bathrooms" or "2 bathroom" or "2BA" → minBathrooms: 2, maxBathrooms: null (user wants at least 2)
  * "at most 2 bathrooms" or "maximum 2 bathrooms" or "up to 2 bathrooms" → maxBathrooms: 2, minBathrooms: null
  * "exactly 2 bathrooms" or "2 bathrooms exactly" → minBathrooms: 2, maxBathrooms: 2
- Floor number: 
  * "2nd floor" or "floor 2" or "second floor" → minFloor: 2, maxFloor: null (user wants at least floor 2)
  * "at most 2nd floor" or "maximum floor 2" or "up to floor 2" → maxFloor: 2, minFloor: null
  * "exactly 2nd floor" or "floor 2 exactly" → minFloor: 2, maxFloor: 2
- Size: 
  * "50 m2" or "50 sqm" → minSize: 50, maxSize: null (user wants at least 50)
  * "at most 50 m2" or "maximum 50 m2" → maxSize: 50, minSize: null
  * "50-100 m2" → minSize: 50, maxSize: 100
- Year built: 
  * "built 2000" or "from 2000" → minYearBuilt: 2000, maxYearBuilt: null
  * "at most 2000" or "before 2000" → maxYearBuilt: 2000, minYearBuilt: null
  * "2000-2010" → minYearBuilt: 2000, maxYearBuilt: 2010
- Year renovated: Same logic as year built
- Heating category: Central or Autonomous
- Heating agent: Natural gas, Oil, Electricity, Other
- Parking: True or False
- Proximity to destinations (metro, bus, school, hospital, park):
  * "close to metro" or "near metro" or "metro nearby" → minClosestMetro: 0, maxClosestMetro: null (user wants close, no upper limit specified)
  * "at most 1 km from metro" or "within 1 km of metro" → maxClosestMetro: 1.0, minClosestMetro: null
  * "at least 0.5 km from metro" → minClosestMetro: 0.5, maxClosestMetro: null
  * Same logic applies to: bus, school, hospital, park
  * IMPORTANT: When user describes destinations as "close", "near", "nearby", "close to", set min to 0 (they want it close, starting from 0)
- Return null for unspecified fields
- Always return location names in English format (e.g., "Athens" not "Αθήνα", "Greece" not "Ελλάδα")
- IMPORTANT: When a number is mentioned without "at most", "maximum", "up to", "at least", "minimum", "exactly", assume the user wants that value OR MORE (set min, leave max as null)`

  const fullPrompt = `System: ${systemPrompt}\n\nUser Query: ${query}`

  try {
    console.log('=== AI FILTER EXTRACTION ===')
    console.log('System Prompt:', systemPrompt)
    console.log('User Query:', query)
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const responseContent = completion.choices[0]?.message?.content
    console.log('AI Response (raw):', responseContent)
    
    if (responseContent) {
      const parsed = JSON.parse(responseContent)
      console.log('AI Response (parsed):', JSON.stringify(parsed, null, 2))
      console.log('=== END FILTER EXTRACTION ===')
      return {
        ...parsed,
        confidence: 0.9,
        filterExtractionPrompt: fullPrompt,
        filterExtractionResponse: responseContent,
      }
    }
  } catch (error) {
    console.error('AI filter extraction error:', error)
    console.log('=== END FILTER EXTRACTION (ERROR) ===')
    return {
      confidence: 0,
      filterExtractionPrompt: fullPrompt,
      filterExtractionResponse: error instanceof Error ? error.message : String(error),
    }
  }

  return { 
    confidence: 0,
    filterExtractionPrompt: fullPrompt,
    filterExtractionResponse: 'No response from AI',
  }
}

/**
 * Extract filters using AI only (removed simple pattern matching)
 */
export async function extractFiltersHybrid(
  query: string,
  openai: any | null
): Promise<ExtractedFilters> {
  // Always use AI for filter extraction
  if (openai && process.env.OPENAI_API_KEY) {
    return await extractFiltersWithAI(query, openai)
  }

  // Fallback if AI is not available
  return { confidence: 0 }
}

