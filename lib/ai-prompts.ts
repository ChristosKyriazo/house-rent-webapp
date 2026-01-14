/**
 * AI Prompts for Real Estate Search
 * 
 * This file contains all AI prompts used in the application.
 * Modify these prompts to change AI behavior without touching the main code.
 */

/**
 * System prompt for extracting filters from user queries
 */
export const FILTER_EXTRACTION_SYSTEM_PROMPT = `Extract filters from real estate search query. Return JSON only.

Structure: {"filters": {"city": "Athens" or null, "country": "Greece" or null, "area": "Nea Smirni" or null, "listingtype": "Rent" or "Buy" or null, "minPrice": 400 or null, "maxPrice": 600 or null, "minBedrooms": 2 or null, "maxBedrooms": 3 or null, "minSize": 50 or null, "maxSize": 100 or null, "parking": true or false or null, "parkingSoftPreference": true or false or null, "heatingCategory": "central" or "autonomous" or null, "heatingAgent": "natural gas" or "oil" or "electricity" or null, "minFloor": 1 or null, "maxFloor": 5 or null, "minYearBuilt": 2000 or null, "maxYearBuilt": 2020 or null, "minYearRenovated": 2010 or null, "maxYearRenovated": 2023 or null, "minBathrooms": 1 or null, "maxBathrooms": 3 or null, "Metro": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned", "Bus": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned", "School": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned", "Hospital": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned", "Park": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned", "University": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned", "Safety": "Essential" or "Strong" or "Not important" or "Not mentioned", "preferredAreas": ["Filothei", "Psychiko"] or null, "vibePreference": "coastal" or "urban" or "family-friendly" or null}}

RULES:
- HARD FILTERS (filter DB): city, country, area, listingType, price, bedrooms, bathrooms, size, parking (unless soft preference), floor, yearBuilt, yearRenovated
- SOFT FILTERS (scoring only): distance categories, preferredAreas, heatingCategory, heatingAgent, parking (if soft preference)
- CRITICAL: Only extract explicitly mentioned values. Do NOT infer. "heating" alone → heatingCategory: null, heatingAgent: null
- Soft preference phrases: "not a deal breaker", "not that important", "nice to have", "would be good but not essential" → set parkingSoftPreference: true
- Location: Convert Greek to English ("Αθήνα" → "Athens"). Hard filter area: "in X" → area: "X". Preferred areas: "like X, Y" → area: null, preferredAreas: ["X", "Y"]
- Numbers: Price without qualifiers (e.g., "I want a house for 500") → maxPrice: 500 (treat as maximum)
- Bedrooms/Bathrooms: Fixed number without qualifier (e.g., "2 bedrooms", "two rooms", "2 bathrooms") → minBedrooms: 2, maxBedrooms: null (exact number). "at most X bedrooms" → minBedrooms: null, maxBedrooms: X. "at least X bedrooms" → minBedrooms: X, maxBedrooms: null. "exactly X bedrooms" → minBedrooms: X, maxBedrooms: X. Same logic applies to bathrooms
- Other numbers without qualifiers → assume "at least" (set min, max: null)
- Distance categories: Essential/Strong/Not important/Avoid. Reflect user's stated importance. "not essential" → Strong (not Essential). Unmentioned → "Not mentioned"
- Hospital category: Essential ONLY if explicitly asked for (e.g., "near hospital", "close to hospital"). Strong if user mentions they are or have people in need/elders/elderly/seniors/disabled/vulnerable/medical needs. Otherwise → "Not mentioned"
- Public transport rules:
  * "public transport" or "public transportation" or "move easily" or "easy to move" or "accessibility" → Metro: Essential, Bus: Essential (Metro has higher priority)
  * "near bus station" or "close to bus" or "bus access" → Bus: Essential (higher priority)
  * "near metro station" or "close to metro" or "metro access" → Metro: Essential (higher priority)
- Safety category: Essential if user explicitly wants safe area OR mentions kids/children OR person in need OR elderly. Strong if mentions safety would be nice but not in explicit ways above. Not important if not mentioned. Unmentioned → "Not mentioned"
- Vibe preference: Extract 1-2 words describing the vibe/atmosphere the user wants. Examples: "near the beach" → "coastal", "city center" → "urban", "for kids" → "family-friendly", "quiet" → "quiet", "upscale" → "upscale". If no vibe mentioned → null`

/**
 * System prompt for calculating match percentages
 */
export const MATCH_CALCULATION_SYSTEM_PROMPT = `Calculate match percentage (0-100) for each property. Return JSON only: {"matches": [{"id": 1, "matchPercentage": 100}]}

CRITICAL RULES:
- Only hard filters, no vibe preferences → all matching properties get 100%
- Vibe preferences mentioned → properties with conflicting vibes get MAX 50-60% (NEVER 100% or 85-100%)
- Distribute scores across range (60-100%), not binary
- Greek/English locations are equivalent (100% match)
- Distance scoring handled separately - focus on other attributes

VIBE MATCHING (MOST IMPORTANT when vibe mentioned):
- Beach/coastal + working-class/urban (non-coastal) vibe → MAX 50-60%
- Beach/coastal + coastal/touristic/upscale vibe → 85-100%
- City center/urban + suburban/quiet vibe → MAX 50-60%
- City center/urban + urban/vibrant vibe → 85-100%
- Safe/family-friendly + working-class/industrial/vibrant vibe → MAX 50-60%
- Safe/family-friendly + family-friendly/quiet/suburban vibe → 85-100%
- Check areaVibe field. Conflicting vibes = MAX 50-60%. Vibe matching > other attributes.

SCORING:
- Missing info: -10 to -20 points (null > false)
- Essential parking: with=true: 90-100%, null: 40-55%, false: 20-35%
- Soft preference: with: +5-10, null: 0, without: -5
- Safety: Prominent only if kids/elderly mentioned (+10-15 for high, -5-10 for low)
- Distance: Minor consideration (1-5 points), handled separately
- Photo analysis: Match visual queries (view, balcony, etc.)
- Owner rating: Higher = better`

/**
 * Creates the user prompt for match calculation
 */
export function createMatchCalculationUserPrompt(query: string, homesData: any[]): string {
  return `Query: "${query}"

Properties (filtered by hard filters):
${JSON.stringify(homesData, null, 2)}

Calculate match percentage (0-100) for each property.

CRITICAL:
- Only hard filters, no vibe → all get 100%
- Vibe mentioned → check areaVibe field. Conflicting vibes = MAX 50-60%
- Distribute scores (60-100%), not binary
- Greek/English locations equivalent

VIBE MATCHING:
- Beach/coastal + working-class/urban vibe → MAX 50-60%
- Beach/coastal + coastal/touristic/upscale vibe → 85-100%
- City center/urban + suburban vibe → MAX 50-60%
- Safe/family + working-class/industrial vibe → MAX 50-60%
- Vibe matching > other attributes

Return: {"matches": [{"id": 1, "matchPercentage": 100}]}`
}
