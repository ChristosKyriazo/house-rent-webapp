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
  listingType?: string
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
  Metro?: string
  Bus?: string
  School?: string
  Hospital?: string
  Park?: string
  University?: string
  requiresElevator?: boolean // true if user requires elevator (e.g., "elevator if above 2nd floor")
  elevatorRequiredFromFloor?: number // Floor number from which elevator is required (e.g., 2 means elevator required from 2nd floor and above)
  preferredAreas?: string[] // Array of area names mentioned as preferences (e.g., "like Filothei, Psychiko") - NOT hard filters, just preferences
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
  const systemPrompt = `Extract hard filters from real estate search query. Return JSON with extracted filters AND reasoning for each extracted value.

Structure:
{
  "filters": {
    "city": "Athens" or null,
    "country": "Greece" or null,
    "area": "Nea Smirni" or null,
    "listingtype": "Rent" or "Buy" or null,
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
    "Metro": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned",
    "Bus": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned",
    "School": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned",
    "Hospital": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned",
    "Park": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned",
    "University": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned",
    "requiresElevator": true or false or null,
    "elevatorRequiredFromFloor": 2 or null,
    "preferredAreas": ["Filothei", "Psychiko", "Ekali"] or null,
  },
  "reasoning": {
    "city": "Reason why city was extracted or set to null",
    "country": "Reason why country was extracted or set to null",
    "area": "Reason why area was extracted or set to null",
    "listingtype": "Reason why listing type was extracted or set to null",
    "minPrice": "Reason why minPrice was extracted or set to null",
    "maxPrice": "Reason why maxPrice was extracted or set to null",
    "minBedrooms": "Reason why minBedrooms was extracted or set to null",
    "maxBedrooms": "Reason why maxBedrooms was extracted or set to null",
    "minSize": "Reason why minSize was extracted or set to null",
    "maxSize": "Reason why maxSize was extracted or set to null",
    "parking": "Reason why parking was extracted or set to null",
    "heatingCategory": "Reason why heatingCategory was extracted or set to null. CRITICAL: If user says ONLY 'heating' or 'with heating' or 'needs heating' WITHOUT specifying the type (e.g., 'central heating', 'autonomous heating'), you MUST set to null. Do NOT infer 'central' from just 'heating'.",
    "heatingAgent": "Reason why heatingAgent was extracted or set to null. CRITICAL: If user says ONLY 'heating' or 'with heating' or 'needs heating' WITHOUT specifying the fuel/agent (e.g., 'natural gas', 'oil', 'electricity'), you MUST set to null. Do NOT infer any fuel/agent from just 'heating'.",
    "minFloor": "Reason why minFloor was extracted or set to null. IMPORTANT: If user mentions a floor number only in the context of an elevator requirement (e.g., 'elevator if above 2nd floor'), do NOT extract it as minFloor. Only extract minFloor when user explicitly states a floor preference.",
    "maxFloor": "Reason why maxFloor was extracted or set to null",
    "minYearBuilt": "Reason why minYearBuilt was extracted or set to null",
    "maxYearBuilt": "Reason why maxYearBuilt was extracted or set to null",
    "minYearRenovated": "Reason why minYearRenovated was extracted or set to null",
    "maxYearRenovated": "Reason why maxYearRenovated was extracted or set to null",
    "minBathrooms": "Reason why minBathrooms was extracted or set to null",
    "maxBathrooms": "Reason why maxBathrooms was extracted or set to null",
    "Metro": "Reason why Metro category was assigned (Essential/Strong/Not important/Avoid/Not mentioned)",
    "Bus": "Reason why Bus category was assigned",
    "School": "Reason why School category was assigned",
    "Hospital": "Reason why Hospital category was assigned",
    "Park": "Reason why Park category was assigned",
    "University": "Reason why University category was assigned",
    "requiresElevator": "Reason why requiresElevator was extracted or set to null",
    "elevatorRequiredFromFloor": "Reason why elevatorRequiredFromFloor was extracted or set to null",
    "preferredAreas": "Reason why preferredAreas was extracted or set to null",
  }
}

Rules:
- Extract only hard filters (explicit requirements)
- CRITICAL: Do NOT infer, assume, or extract values that are not explicitly mentioned in the query. If a field is not mentioned, set it to null. Only extract values when the user explicitly states them.
- CRITICAL EXAMPLE: If user says "I want heating in the house" or "needs heating" or "with heating" → heatingCategory: null, heatingAgent: null (because they did NOT specify "central heating" or "autonomous heating" or any fuel type). DO NOT extract "central" just because they mentioned "heating".
- City: Extract city names (handle both English and Greek - convert Greek to English: "Αθήνα" → "Athens")
- Country: Extract country names (handle both English and Greek - convert Greek to English: "Ελλάδα" → "Greece")
- Area: Extract area names (handle both English and Greek - convert Greek to English: "Αιγάλεω" → "Aigaleo")
  * IMPORTANT: Distinguish between hard filter area and preferred areas:
    - Hard filter area: User says "in X" or "at X" or "X area" (specific requirement) → set "area": "X"
    - Preferred areas: User says "like X, Y, Z" or "areas like X, Y, Z" or "neighborhoods like X, Y, Z" or "X, Y, or Z" (examples/preferences) → set "area": null, "preferredAreas": ["X", "Y", "Z"]
    - If user says "in X" or "at X" → it's a hard filter (set "area": "X")
    - If user says "like X, Y, Z" or "areas such as X, Y, Z" or "neighborhoods like X, Y, Z" → it's a preference (set "preferredAreas": ["X", "Y", "Z"], "area": null)
    - If user lists multiple areas with "or" (e.g., "X or Y or Z") and doesn't say "in" or "at", treat as preferred areas
    - Always convert Greek area names to English format in the array
- Listing type: Extract listing type (handle both English and Greek - convert Greek to English: "Αιγάλεω" → "Aigaleo")
  * "rent" or "rental" or "rental apartment" or "rental house" or "rental property" or "rental flat" or "rental room" or "rental suite" or "rental townhouse" or "rental villa" or "rental condo" or "rental duplex" or "rental triplex" or "rental quadruplex" or "rental quintuplex" or "rental sextuplex" or "rental septuplex" or "rental octuplex" or "rental nonuplex" or "rental decuplex" or "rental undecuplex" or "rental duodecuplex" or "rental tredecuplex" or "rental quattuordeciplex" or "rental quindecuplex" or "rental sexdeciplex" or "rental septendeciplex" or "rental octodeciplex" or "rental novemdeciplex" or "rental vigintiplex" → listingType: "Rent"
  * "buy" or "purchase" or "purchase apartment" or "purchase house" or "purchase property" or "purchase flat" or "purchase room" or "purchase suite" or "purchase townhouse" or "purchase villa" or "purchase condo" or "purchase duplex" or "purchase triplex" or "purchase quadruplex" or "purchase quintuplex" or "purchase sextuplex" or "purchase septuplex" or "purchase octuplex" or "purchase nonuplex" or "purchase decuplex" or "purchase undecuplex" or "purchase duodecuplex" or "purchase tredeciplex" or "purchase quattuordeciplex" or "purchase quindecuplex" or "purchase sexdeciplex" or "purchase septendeciplex" or "purchase octodeciplex" or "purchase novemdeciplex" or "purchase vigintiplex" → listingType: "Buy"
- Price: 
  * "under 500" or "at most 500" or "max 500" → maxPrice: 500, minPrice: 0
  * "over 500" or "at least 500" or "min 500" → minPrice: 500, maxPrice: null
  * "500-800" or "between 500 and 800" → minPrice: 500, maxPrice: 800
- Bedroom number: 
  * "2 bedrooms" or "2 bedroom" or "2BR" → minBedrooms: 2, maxBedrooms: null (user wants at least 2).
  * "at most 2 bedrooms" or "maximum 2 bedrooms" or "up to 2 bedrooms" → maxBedrooms: 2, minBedrooms: null
  * "exactly 2 bedrooms" or "2 bedrooms exactly" → minBedrooms: 2, maxBedrooms: 2
  * if user mentions only number of family members, set minBedrooms to the number of family members and maxBedrooms:null
- Bathroom number: 
  * "2 bathrooms" or "2 bathroom" or "2BA" → minBathrooms: 2, maxBathrooms: null (user wants at least 2)
  * "at most 2 bathrooms" or "maximum 2 bathrooms" or "up to 2 bathrooms" → maxBathrooms: 2, minBathrooms: null
  * "exactly 2 bathrooms" or "2 bathrooms exactly" → minBathrooms: 2, maxBathrooms: 2
- Floor number: 
  * "2nd floor" or "floor 2" or "second floor" → minFloor: 2, maxFloor: null (user wants at least floor 2)
  * "at most 2nd floor" or "maximum floor 2" or "up to floor 2" → maxFloor: 2, minFloor: null
  * "exactly 2nd floor" or "floor 2 exactly" → minFloor: 2, maxFloor: 2
  * CRITICAL: If the user mentions a floor number ONLY in the context of an elevator requirement (e.g., "elevator if above 2nd floor"), do NOT extract it as minFloor. The floor number in elevator requirements is a threshold for when elevator is needed, NOT a floor preference. Only extract minFloor/maxFloor when the user explicitly states a floor preference (e.g., "I want 2nd floor" or "at least 3rd floor").
- Elevator requirements:
  * "elevator if above 2nd floor" or "elevator if above floor 2" or "elevator if 2nd floor and above" or "elevator from 2nd floor" → requiresElevator: true, elevatorRequiredFromFloor: 2, minFloor: null (do NOT set minFloor - this is not a floor preference)
  * "elevator if above 3rd floor" or "elevator if above floor 3" → requiresElevator: true, elevatorRequiredFromFloor: 3, minFloor: null (do NOT set minFloor)
  * "elevator required" or "must have elevator" or "need elevator" → requiresElevator: true, elevatorRequiredFromFloor: null (required for all floors)
  * "no elevator needed" or "elevator not required" → requiresElevator: false, elevatorRequiredFromFloor: null
  * CRITICAL: When extracting elevator requirements with a floor threshold, do NOT also extract that floor as minFloor. The user is stating a requirement (elevator needed if property is on that floor or above), NOT a preference to live on that floor. Only set minFloor if the user explicitly says they want to live on a specific floor (e.g., "I want 2nd floor" or "at least floor 3").
- Size: 
  * "50 m2" or "50 sqm" → minSize: 50, maxSize: null (user wants at least 50)
  * "at most 50 m2" or "maximum 50 m2" → maxSize: 50, minSize: null
  * "50-100 m2" → minSize: 50, maxSize: 100
- Year built: 
  * "built 2000" or "from 2000" or "after 2000" or "since 2000"  → minYearBuilt: 2000, maxYearBuilt: null
  * "at most 2000" or "before 2000" → maxYearBuilt: 2000, minYearBuilt: null
  * "2000-2010" → minYearBuilt: 2000, maxYearBuilt: 2010
- Year renovated: Same logic as year built
- Heating category: 
  * CRITICAL: ONLY extract if user explicitly mentions the SPECIFIC heating type with the word "heating" (e.g., "central heating", "autonomous heating")
  * If user says ONLY "heating" or "with heating" or "needs heating" WITHOUT specifying the type, set to null
  * Examples that SHOULD extract: "central heating" → heatingCategory: "central", "autonomous heating" → heatingCategory: "autonomous"
  * Examples that should NOT extract (set to null): "heating", "with heating", "needs heating", "has heating", "heating system", "good heating" → ALL set to null because type is not specified
  * DO NOT infer "central" from just "heating" - if type is not explicitly stated, set to null
- Heating agent:
  * CRITICAL: ONLY extract if user explicitly mentions the SPECIFIC heating fuel/agent with the word "heating" or in context of heating (e.g., "natural gas heating", "oil heating", "electric heating")
  * If user says ONLY "heating" or "with heating" or "needs heating" WITHOUT specifying the fuel/agent, set to null
  * Examples that SHOULD extract: "natural gas heating" → heatingAgent: "natural gas", "oil heating" → heatingAgent: "oil", "electric heating" → heatingAgent: "electricity", "heating with natural gas" → heatingAgent: "natural gas"
  * Examples that should NOT extract (set to null): "heating", "with heating", "needs heating", "has heating", "heating system", "good heating" → ALL set to null because fuel/agent is not specified
  * DO NOT infer any fuel/agent from just "heating" - if fuel/agent is not explicitly stated, set to null
- Parking: True or False
  * ONLY extract if user explicitly mentions parking (e.g., "with parking", "parking available", "no parking")
  * If user does NOT mention parking, set to null
- Proximity to destinations (metro, bus, school, hospital, park):
  * "close to metro" or "near metro" or "metro nearby" → Metro: essential Bus: strong
  * if the user mentions he is a student or if he is looking for an apartment close to universities → Metro: strong Bus: strong University: Essential
  * "accessible" or "easy transfer" or the user says he needs public transportation in some way → Metro: essential Bus: essential
  * If the user mentions he has kids or he wants to be near school → School: essential
  * If the user mentions he is elderly/person in need or he wants to be near hospital → Hospital: essential
  * If the user mentions he wants to be near a park or he has kids or he has pets or he wants to be near a playground → Park: essential
  * IMPORTANT: When user describes destinations as "close", "near", "nearby", "close to", set min to 0 (they want it close, starting from 0)
- Return null for unspecified fields (except distance categories - see below)
- Always return location names in English format (e.g., "Athens" not "Αθήνα", "Greece" not "Ελλάδα")
- IMPORTANT: When a number is mentioned without "at most", "maximum", "up to", "at least", "minimum", "exactly", assume the user wants that value OR MORE (set min, leave max as null)
- CRITICAL for distance categories (Metro, Bus, School, Hospital, Park, University): If the user does NOT mention anything about a specific amenity/distance, return "Not mentioned" instead of null. Only return null if the field is truly not applicable or cannot be determined. If the user mentions the amenity in any way (even just "near metro" or "close to school"), use the appropriate category (Essential/Strong/Not important/Avoid). If the user does NOT mention it at all, return "Not mentioned".`

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

