/**
 * AI Prompts for Real Estate Search
 * 
 * This file contains all AI prompts used in the application.
 * Modify these prompts to change AI behavior without touching the main code.
 */

/**
 * System prompt for extracting filters from user queries
 */
export const FILTER_EXTRACTION_SYSTEM_PROMPT = `Extract hard filters from real estate search query. Return JSON with extracted filters only.

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
  }
}

Rules:
- Extract only hard filters (explicit requirements)
- HARD FILTERS (will filter database): city, country, area, listingType, price, bedrooms, bathrooms, size, parking, floor, yearBuilt, yearRenovated
- SOFT FILTERS (used for scoring only): distance categories (Metro, Bus, School, Hospital, Park, University), preferredAreas, heatingCategory, heatingAgent
- CRITICAL: Do NOT infer, assume, or extract values that are not explicitly mentioned in the query. If a field is not mentioned, set it to null. Only extract values when the user explicitly states them.
- CRITICAL EXAMPLE: If user says "I want heating in the house" or "needs heating" or "with heating" → heatingCategory: null, heatingAgent: null (because they did NOT specify "central heating" or "autonomous heating" or any fuel type). DO NOT extract "central" just because they mentioned "heating".
- City: Extract city names (handle both English and Greek - convert Greek to English: "Αθήνα" → "Athens")
- Country: Extract country names (handle both English and Greek - convert Greek to English: "Ελλάδα" → "Greece")
- Area: Extract area names (handle both English and Greek - convert Greek to English: "Αιγάλεω" → "Aigaleo")
  * IMPORTANT: Distinguish between hard filter area and preferred areas:
    - Hard filter area: User says "in X" or "at X" or "X area" (specific requirement) → set "area": "X"
    - Preferred areas: User says "like X, Y, Z" or "areas like X, Y, Z" or "neighborhoods like X, Y, Z" or "X, Y, or Z" (examples/preferences) → set "area": null, "preferredAreas": ["X", "Y", "Z"]
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
- Parking: True or False (HARD FILTER)
  * ONLY extract if user explicitly mentions parking (e.g., "with parking", "parking available", "parking", "needs parking", "must have parking", "no parking", "without parking")
  * If user says "with parking" or "parking" or "needs parking" or "must have parking" → parking: true (filter database to only show homes WITH parking)
  * If user says "no parking" or "without parking" or "parking not needed" → parking: false (filter database to only show homes WITHOUT parking)
  * If user does NOT mention parking at all, set to null (no filtering by parking)
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

/**
 * System prompt for calculating match percentages
 */
export const MATCH_CALCULATION_SYSTEM_PROMPT = `Calculate match percentage (0-100) for each property by comparing the user's original query against ALL property attributes. Return JSON with match percentages only.

    CRITICAL RULE: If the user query ONLY mentions something that matches 100% with a value of the properties (e.g., "athens", "athens greece", "i want a house with 1 bathroom", "i want a house with parking") and ALL properties in the list match that information, they MUST ALL get 100% match.

    SCORING DISTRIBUTION RULE: When multiple properties match the query and we have more information apart from hard filters, distribute scores across a RANGE (e.g., 0-100%), NOT binary (100% or 0%). Properties should have DIFFERENT scores based on how well they match, with the best matches getting 85-100%, good matches getting 70-85%, acceptable matches getting 50-70%, and poor matches getting 0-50%. Only use 0% for properties that completely don't match the query.

IMPORTANT RULES:
- Compare the user's query against ALL property data: location, price, size, bedrooms, bathrooms, floor, heating, parking, year built/renovated, availability, area safety, area vibe, owner rating, listing type, description
- NOTE: Distance/proximity to amenities (metro, bus, school, hospital, park, university) is already handled by filtering and will be scored separately in post-processing. Focus on other attributes when calculating match percentages.
- If the user query ONLY mentions specific information that describe a house (e.g., "athens","i want 1 bathroom","i want the house to be on the second floor) → ALL matching properties get 100%
- If the user query mentions location + soft criteria (e.g., "athens children", "athens family") → Consider area vibe and safety scores, properties with matching vibe/safety score higher
- SAFETY RULE: Area safety should ONLY be a prominent factor when the query specifically mentions: kids, children, elderly, seniors, elderly people, people in need, vulnerable, family with children, etc. If safety is NOT specifically mentioned in relation to these groups, do NOT let safety significantly influence match percentages (only minor influence, 1-5 points difference at most)
- If the user query mentions specific features (e.g., "athens parking", "athens 2 bedrooms") → Consider those specific attributes
- Properties have already been filtered by hard filters (city, price, bedrooms, listing type, distances, etc.), so focus on matching the semantic meaning of the query

CRITICAL: Missing Information Handling:
- If a property has null/undefined/missing values for attributes the user requested (e.g., user asks for "parking" but property has parking: null, or user asks for "garage" but property has parking: null), DO NOT exclude it from results
- Instead, PENALIZE it in the match percentage (subtract 10-20 points) for missing requested information
- Properties with the requested information should score higher than those without it
- Missing information (null/undefined) should score higher than explicitly false values
- This applies to ALL attributes: parking, heating, floor, year built, size, amenities, DISTANCES, etc.
- DISTANCE-SPECIFIC: Distance/proximity to amenities is already handled by filtering and will be scored in post-processing. You do NOT need to heavily weight distances in your scoring - focus on other attributes. However, you can still consider distance as a minor factor (1-5 points difference) when comparing properties, but it should NOT be the primary factor since it's handled separately.
- Example: User asks "athens parking" → Athens houses WITH parking (parking: true) get 90-100%, Athens houses with MISSING parking info (parking: null) get 70-80%, Athens houses WITHOUT parking (parking: false) get 50-60%
- Example: User asks "athens garage" → Same logic as parking (garage = parking)
- CRITICAL: When parking is marked as "essential", "required", "must have", "need", "necessary", or similar strong language:
  * Houses WITH parking (parking: true) get 90-100%
  * Houses with MISSING parking info (parking: null) get 40-55% (HEAVY penalty, not just 10-20 points)
  * Houses WITHOUT parking (parking: false) get 20-35% (VERY HEAVY penalty, should be near bottom)
  * Properties without parking should NEVER be the top result when parking is essential
  * Example: "parking is essential" → House with parking: 90-100%, House with null parking: 40-55%, House without parking: 20-35%
- Example: User asks "athens central heating" → Houses WITH central heating get 90-100%, houses with MISSING heating info (heatingCategory: null) get 70-80%, houses with different heating get 50-60%
- NOTE: Distance/proximity to amenities is already handled by filtering and post-processing. Focus on other attributes when scoring.

Consider ALL attributes when calculating match:
- Location (city, country, area) - exact match = 100% if ONLY location is mentioned
- CRITICAL: Greek and English location names are EQUIVALENT - "athens" = "Αθήνα", "thessaloniki" = "Θεσσαλονίκη", "greece" = "Ελλάδα", etc. Do NOT penalize match percentage if the query uses one language and the property data uses the other. They should be treated as 100% match for location purposes.
- Preferred areas: If the user mentions areas as preferences (e.g., "like Filothei, Psychiko, Ekali"), properties in those preferred areas should get a BONUS of 10-15 points. Properties in other areas should NOT be penalized, they just don't get the bonus. This is a preference boost, not a filter.
- DISTANCE/PROXIMITY - Distance/proximity to amenities (metro, bus, school, hospital, park, university) is already handled by filtering and will be scored separately in post-processing. You should focus on other attributes (location, price, size, bedrooms, bathrooms, floor, heating, parking, year built/renovated, area safety, area vibe, owner rating, listing type, description) when calculating match percentages. Distance can be a minor consideration (1-5 points) but should NOT be the primary factor.
- Area safety (0-10 scale) - ONLY use as a prominent factor when query mentions: kids, children, elderly, seniors, elderly people, people in need, vulnerable, family with children, etc. If NOT mentioned, safety should have MINIMAL influence (1-5 points difference at most, not a major factor)
- Area vibe (e.g., "family-friendly", "vibrant", "quiet") - match vibe keywords from query but give a little bit more importance to the first word of vibe and then the second
- Area characteristics (isSuburban, isUrban, isUpscale, isNearWater) - match if query mentions these characteristics (e.g., "suburban", "urban", "upscale", "near water", "coastal", "seaside")
- Floor height (high/low) - match if query mentions floor height preferences (e.g., "high floors", "upper floors", "low floor", "ground floor")
- Elevator requirements - If user requires elevator for floors above a certain level (e.g., "elevator if above 2nd floor"), properties on those floors WITHOUT elevator information should be PENALIZED heavily (subtract 20-30 points). Properties on ground/first floor are not affected. Properties on 2nd floor and above with missing elevator info should score significantly lower when elevator is required.
- Photo analysis (visual features) - if photoAnalysis is provided, use it to match visual queries (view, looks, appearance, style, design, balcony, terrace, garden, pool, etc.). Properties with matching visual features from photos should score higher. If hasPhotos is false, penalize slightly for visual queries.
- Price, size, bedrooms, bathrooms - match if mentioned in query
- Parking, heating, amenities - match if mentioned in query, PENALIZE if missing (null/undefined)
- Owner rating - higher rating = better match
- Description - semantic match with query

Return JSON only:
{
  "matches": [
    {"id": 1, "matchPercentage": 100},
    {"id": 2, "matchPercentage": 100}
  ]
}`

/**
 * Creates the user prompt for match calculation
 */
export function createMatchCalculationUserPrompt(query: string, homesData: any[]): string {
  return `User's Original Query: "${query}"

Properties (already filtered by hard filters like city, price, bedrooms, etc.):
${JSON.stringify(homesData, null, 2)}

Calculate match percentage (0-100) for each property by comparing the user's query "${query}" against ALL property attributes including safety, vibe, location, price, size, amenities, owner rating, description, area characteristics (suburban, urban, upscale, near water), floor height (high/low), and photo analysis (visual features from photos).

CRITICAL: If the query "${query}" ONLY mentions specific information that matches 100% with property values (e.g., "athens", "1 bathroom", "second floor") and ALL properties in the list match that information, they MUST ALL get 100%.

CRITICAL: SCORING DISTRIBUTION - When multiple properties match the query, distribute scores across a RANGE (e.g., 60-100%), NOT binary (100% or 0%). Properties should have DIFFERENT scores based on how well they match:
- Best matches (meet all criteria, close distances, high safety when needed): 85-100%
- Good matches (meet most criteria, moderate distances): 70-85%
- Acceptable matches (meet some criteria, farther distances): 60-70%
- Poor matches (meet few criteria, missing important info): 50-60%
- Only use 0% for properties that completely don't match the query

CRITICAL: GREEK/ENGLISH LOCATION EQUIVALENCE - Greek and English location names are EQUIVALENT and should be treated as 100% match:
- "athens" = "Αθήνα" (same location, 100% match)
- "thessaloniki" = "Θεσσαλονίκη" (same location, 100% match)
- "greece" = "Ελλάδα" (same location, 100% match)
- If the query says "athens" and a property has city: "Αθήνα", it's a 100% location match
- If the query says "Αθήνα" and a property has city: "Athens", it's a 100% location match
- Do NOT reduce match percentage due to language differences in location names

MISSING INFORMATION: If a property has null/undefined values for attributes the user requested, PENALIZE it (subtract 10-20 points) but DO NOT exclude it. Properties with missing info should score lower than those with the information.

DISTANCE-SPECIFIC RULE: Distance/proximity to amenities (metro, bus, school, hospital, park, university) is already handled by filtering and will be scored separately in post-processing. You should focus on other attributes (location, price, size, bedrooms, bathrooms, floor, heating, parking, year built/renovated, area safety, area vibe, owner rating, listing type, description) when calculating match percentages. Distance can be a minor consideration (1-5 points) but should NOT be the primary factor.

VISUAL FEATURES EXAMPLES:
- Query "view" or "sea view" or "mountain view" or "city view" → Check photoAnalysis field. Properties with matching views in photoAnalysis get 90-100%, properties without matching views get 60-80%, properties without photos (hasPhotos: false) get 50-70%
- Query "beautiful" or "nice looking" or "modern style" or "aesthetic" → Check photoAnalysis field. Properties with matching visual characteristics get 85-100%, others get lower scores
- Query "balcony" or "terrace" or "garden" or "pool" → Check photoAnalysis field. Properties with these features visible in photos get 90-100%, others get lower scores

AREA CHARACTERISTICS EXAMPLES:
- Query "suburban near water" or "suburban near water" → Properties with isSuburban: true AND isNearWater: true get 90-100%, properties with only one match get 70-85%, others get 50-70%
- Query "upscale with high floors" or "upscale high floors" → Properties with isUpscale: true AND floorHeight: 'high' get 90-100%, properties with only one match get 70-85%, others get 50-70%
- Query "suburban" → Properties with isSuburban: true get 85-100%, others get 60-80%
- Query "near water" or "coastal" or "seaside" → Properties with isNearWater: true get 85-100%, others get 60-80%
- Query "urban" or "city center" → Properties with isUrban: true get 85-100%, others get 60-80%

FLOOR HEIGHT EXAMPLES:
- Query "high floors" or "upper floors" or "high floor" → Properties with floorHeight: 'high' get 85-100%, others get 60-80%
- Query "low floor" or "ground floor" → Properties with floorHeight: 'low' get 85-100%, others get 60-80%
- Query "elevator if above 2nd floor" or "elevator if above floor 2" → This means properties on floor 2 and above MUST have an elevator. Properties on floor 0 or 1 are not affected (elevator not required). Properties on floor 2 and above WITHOUT elevator mentioned in description should be PENALIZED heavily (subtract 25-30 points) as they likely don't have an elevator. Properties on floor 2 and above WITH elevator mentioned should score normally or slightly higher. DO NOT interpret this as "prefer 2nd floor" - it's a requirement that 2nd floor and above must have elevator.
- Query "elevator if above 2nd floor" or "elevator if above floor 2" → Properties on floor 0 or 1 get normal scores (elevator not required). Properties on floor 2 and above WITHOUT elevator information should be PENALIZED heavily (subtract 25-30 points) as they may not have an elevator. Properties on floor 2 and above with elevator mentioned in description should score higher.

BASIC EXAMPLES:
- Query "athens" → ALL Athens properties (whether city is "Athens" or "Αθήνα") MUST get 100% (they all match the location, no other criteria)
- Query "Αθήνα" → ALL Athens properties (whether city is "Athens" or "Αθήνα") MUST get 100% (same as above, Greek/English are equivalent)
- Query "i want 1 bathroom" → ALL properties with 1 bathroom MUST get 100% (they all match the bathroom count)
- Query "i want the house to be on the second floor" → ALL properties on floor 2 MUST get 100% (they all match the floor)
- Query "athens parking" → Athens properties WITH parking (parking: true) get 90-100%, Athens properties with MISSING parking info (parking: null) get 70-80%, Athens properties WITHOUT parking (parking: false) get 50-60%
- Query "athens garage" → Same as parking (garage = parking)
- Query "parking is essential" or "parking required" or "must have parking" or "need parking" → 
  * Properties WITH parking (parking: true) get 90-100% (top priority)
  * Properties with MISSING parking info (parking: null) get 40-55% (HEAVY penalty, should be near bottom)
  * Properties WITHOUT parking (parking: false) get 20-35% (VERY HEAVY penalty, should be at bottom)
  * Properties without parking should NEVER rank higher than properties with parking when parking is essential
- Query "athens children" → Athens properties with family-friendly vibe or high safety should score higher (90-100%), others lower (70-85%) - Safety is prominent here because "children" is mentioned
- Query "athens elderly" → Athens properties with high safety scores should score higher (90-100%), others lower (70-85%) - Safety is prominent here because "elderly" is mentioned
- Query "athens safe" → Safety should have MINIMAL influence (1-5 points difference) since no vulnerable groups are mentioned - Focus on other criteria instead
- Query "athens" → Safety should have MINIMAL influence (1-5 points difference) - All Athens properties should score similarly regardless of safety
- Query "athens 2 bedrooms" → Athens properties with 2 bedrooms get 100%, others get lower scores
- Query "i want a house with my 2 sons and me, in a safe neighborhood so the kids can play near and easy access to schools...the rent should be 800 at most and a parking would be good but not essential" →
  * Safety is prominent (kids mentioned) - properties with high safety (7-10) get +10-15 points, medium safety (5-7) get +5-10 points, low safety (<5) get -5-10 points
  * School and park distances are already handled by filtering and post-processing - focus on other attributes
  * Parking is nice-to-have (not essential) - properties with parking get +5 points, without parking get 0 points, null parking get -5 points
  * Price already filtered (max 800), so all properties match price
  * Final scores should be DISTRIBUTED across a range (e.g., 60-100%), NOT binary (100% or 0%)
  * Properties with family-friendly vibe should score higher (85-100%)
  * Properties with suburban/residential vibe should score higher (80-95%)
  * Properties with urban/vibrant vibe should score medium (70-85%)
- Query "parking is essential" or "parking required" or "must have parking" or "need parking" or "we need parking" →
  * Properties WITH parking (parking: true) get 85-100% (top priority, can be highest)
  * Properties with MISSING parking info (parking: null) get 40-55% (HEAVY penalty - subtract 40-50 points from base score)
  * Properties WITHOUT parking (parking: false) get 20-35% (VERY HEAVY penalty - subtract 60-70 points from base score)
  * Properties without parking should NEVER rank in top results when parking is essential
  * Example: A property that would score 90% without considering parking should score: with parking = 90-95%, null parking = 45-50%, without parking = 25-30%
- Query "i am a student looking for a house in athens near uni and nightlife parties" → 
  * Distance to university is already handled by filtering and post-processing
  * Focus on other attributes: Athens location match, vibrant/student-friendly vibe, nightlife proximity (area characteristics)
  * Properties with vibrant/student-friendly vibe should score higher (85-100%)
  * Properties with urban/central vibe (good for nightlife) should score higher (80-95%)
  * Properties with suburban/quiet vibe should score lower (60-75%)

Return JSON:
{
  "matches": [
    {"id": 1, "matchPercentage": 100},
    {"id": 2, "matchPercentage": 100}
  ]
}`
}

