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

Structure: {"filters": {"city": "Athens" or null, "country": "Greece" or null, "area": "Nea Smirni" or null, "districts": ["Central Athens", "Northern Suburbs"] or null, "listingtype": "Rent" or "Buy" or null, "minPrice": 400 or null, "maxPrice": 600 or null, "minBedrooms": 2 or null, "maxBedrooms": 3 or null, "minSize": 50 or null, "maxSize": 100 or null, "parking": true or false or null, "parkingSoftPreference": true or false or null, "heatingCategory": "central" or "autonomous" or null, "heatingAgent": "natural gas" or "oil" or "electricity" or null, "minFloor": 1 or null, "maxFloor": 5 or null, "minYearBuilt": 2000 or null, "maxYearBuilt": 2020 or null, "minYearRenovated": 2010 or null, "maxYearRenovated": 2023 or null, "minBathrooms": 1 or null, "maxBathrooms": 3 or null, "Metro": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned", "Bus": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned", "School": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned", "Hospital": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned", "Park": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned", "University": "Essential" or "Strong" or "Not important" or "Avoid" or "Not mentioned", "Safety": "Essential" or "Strong" or "Not important" or "Not mentioned", "preferredAreas": ["Filothei", "Psychiko"] or null, "vibePreference": "waterfront" or "urban" or "central" or "family-friendly" or "quiet" or "upscale" or "working-class" or "rural" or "suburban" or null, "hasLocationPreference": true or false}}

RULES:
- HARD FILTERS (filter DB): city, country, area, districts, listingType, price, bedrooms, bathrooms, size, parking (unless soft preference), floor, yearBuilt, yearRenovated
- Price semantics: If the user query or appended context indicates RENT/rental, minPrice/maxPrice are monthly rent. If it indicates BUY/sale/purchase, minPrice/maxPrice are total purchase price. When ambiguous and context is provided, follow the context.
- SOFT FILTERS (scoring only): distance categories, preferredAreas, heatingCategory, heatingAgent, parking (if soft preference)
- CRITICAL: Only extract explicitly mentioned values. Do NOT infer. "heating" alone → heatingCategory: null, heatingAgent: null
- Parking extraction: ONLY extract parking if user explicitly mentions "parking", "garage", "car", "vehicle", or similar parking-related terms. Do NOT infer parking from mentions of pets/dogs, family, or any other context. If user mentions "dog" or "pet" → parking: null (only Park distance category should be Essential). If parking is not explicitly mentioned → parking: null
- Soft preference phrases: "not a deal breaker", "not that important", "nice to have", "would be good but not essential" → set parkingSoftPreference: true
- Location: Convert Greek to English ("Αθήνα" → "Athens"). Hard filter area: "in X" → area: "X". Preferred areas: "like X, Y" → area: null, preferredAreas: ["X", "Y"]
- Districts: If user mentions a district (e.g., "Central Athens", "Northern Suburbs", "Southern Suburbs"), extract as districts: ["District Name"]. If multiple districts mentioned, extract all: districts: ["District1", "District2"]. Districts are hard filters and work like areas. If user mentions a district but no city, still extract the district (it will be filtered by available districts in DB per city if city is provided, otherwise all districts will be searched). Match district names flexibly (handle misspellings, Greek/English variations, partial names).
- MISSING CHARACTERS & TYPOS: Be flexible with misspellings and alternative spellings. Common examples:
  * "athns", "athens", "αθνα", "αθήνα" → "Athens"
  * "θεσ/νικη", "θεσσαλονικη", "θεσσαλονίκη", "saloniak", "thessaloniki", "thessalonica" → "Thessaloniki"
  * "praking", "parking", "παρκινγκ" → parking: true
  * "salonika", "saloniki", "salonika" → "Thessaloniki"
  * "patra", "πατρα", "πατρας" → "Patras"
  * "iraklio", "ηρακλειο", "heraklion" → "Heraklion"
  * Partial city names or abbreviations should be interpreted (e.g., "ath" → "Athens", "thess" → "Thessaloniki")
- Numbers: Price without qualifiers (e.g., "I want a house for 500") → maxPrice: 500 (treat as maximum)
- Bedrooms/Bathrooms: Fixed number without qualifier (e.g., "2 bedrooms", "two rooms", "2 bathrooms") → minBedrooms: 2, maxBedrooms: null (exact number). "at most X bedrooms" → minBedrooms: null, maxBedrooms: X. "at least X bedrooms" → minBedrooms: X, maxBedrooms: null. "exactly X bedrooms" → minBedrooms: X, maxBedrooms: X. Same logic applies to bathrooms
- Other numbers without qualifiers → assume "at least" (set min, max: null)
- Distance categories: Essential/Strong/Not important/Avoid. Reflect user's stated importance. "not essential" → Strong (not Essential). Unmentioned → "Not mentioned"
- Hospital category: Essential ONLY if explicitly asked for (e.g., "near hospital", "close to hospital"). Strong if user mentions they are or have people in need/elders/elderly/seniors/disabled/vulnerable/medical needs. Otherwise → "Not mentioned"
- Public transport rules:
  * "public transport" or "public transportation" or "move easily" or "easy to move" or "accessibility" → Metro: Essential, Bus: Essential (Metro has higher priority)
  * "near bus station" or "close to bus" or "bus access" → Bus: Essential (higher priority)
  * "near metro station" or "close to metro" or "metro access" → Metro: Essential (higher priority)
- Park category: CRITICAL - If user mentions pet/dog/cat/animal/pets → Park: Essential (ALWAYS set to Essential when pets are mentioned). Also Essential if user explicitly wants park. Strong if mentions park would be nice but no pets mentioned. Unmentioned → "Not mentioned"
- Safety category: Essential if user explicitly wants safe area OR mentions kids/children OR person in need OR elderly. Strong if mentions safety would be nice but not in explicit ways above. Not important if not mentioned. Unmentioned → "Not mentioned"
- Vibe preference: Extract 1-2 words describing the vibe/atmosphere the user wants based on location preferences. Location-based mappings:
  * "near the beach", "near beach", "by the sea", "waterfront", "coastal" → vibePreference: "waterfront"
  * "near the center", "city center", "downtown", "central", "with a lot of people", "busy area", "crowded" → vibePreference: "urban" or "central"
  * "for kids", "family", "with children", "family-friendly" → vibePreference: "family-friendly" (matches: family, suburban, urban)
  * "quiet", "peaceful", "calm", "tranquil", "away from noise" → vibePreference: "quiet" (matches: rural, suburban)
  * "upscale", "luxury", "premium", "high-end", "expensive", "financial stability", "pricey" → vibePreference: "upscale"
  * "near mountain", "mountainous", "mountain area" → vibePreference: "rural" or "quiet"
  * "young workers", "affordable", "budget-friendly", "student area" → vibePreference: "working-class"
  * If user mentions location preferences (beach, center, mountain, etc.), set "hasLocationPreference": true
  * If no vibe/location mentioned → vibePreference: null, hasLocationPreference: false`

