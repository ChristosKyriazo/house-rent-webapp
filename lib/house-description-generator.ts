import OpenAI from 'openai'

/**
 * Generate house descriptions in both English and Greek using AI
 * Acts like a broker trying to sell the house
 */
export async function generateHouseDescriptions(
  houseData: {
    title: string
    city: string
    country: string
    area: string | null
    listingType: 'rent' | 'sale'
    pricePerMonth: number
    bedrooms: number
    bathrooms: number
    floor: number | null
    sizeSqMeters: number | null
    yearBuilt: number | null
    yearRenovated: number | null
    heatingCategory: string | null
    heatingAgent: string | null
    parking: boolean | null
    energyClass: string | null
    closestMetro: number | null
    closestBus: number | null
    closestSchool: number | null
    closestHospital: number | null
    closestPark: number | null
    closestUniversity: number | null
    areaSafety: number | null
    areaVibe: string | null
    availableFrom: string | null
  },
  openai: OpenAI | null
): Promise<{ description: string | null; descriptionGreek: string | null }> {
  if (!openai || !process.env.OPENAI_API_KEY) {
    console.warn('OpenAI not available, skipping description generation')
    return { description: null, descriptionGreek: null }
  }

  try {
    // Build context about the property
    const locationInfo = [
      houseData.city,
      houseData.country,
      houseData.area ? `in ${houseData.area}` : null,
    ].filter(Boolean).join(', ')

    const propertyDetails = [
      `${houseData.bedrooms} bedroom${houseData.bedrooms !== 1 ? 's' : ''}`,
      `${houseData.bathrooms} bathroom${houseData.bathrooms !== 1 ? 's' : ''}`,
      houseData.sizeSqMeters ? `${houseData.sizeSqMeters} m²` : null,
      houseData.floor !== null ? `floor ${houseData.floor}` : null,
      houseData.yearBuilt ? `built in ${houseData.yearBuilt}` : null,
      houseData.yearRenovated ? `renovated in ${houseData.yearRenovated}` : null,
      houseData.heatingCategory ? `${houseData.heatingCategory} heating` : null,
      houseData.heatingAgent ? `(${houseData.heatingAgent})` : null,
      houseData.parking === true ? 'parking available' : houseData.parking === false ? 'no parking' : null,
      houseData.energyClass ? `energy class ${houseData.energyClass}` : null,
    ].filter(Boolean).join(', ')

    // Build proximity info (for AI context, but AI should describe generally)
    // Only include general proximity info, no specific distances
    const proximityInfo: string[] = []
    if (houseData.closestMetro !== null && houseData.closestMetro <= 2) {
      proximityInfo.push('Metro: nearby')
    }
    
    if (houseData.closestBus !== null && houseData.closestBus <= 1) {
      proximityInfo.push('Bus: nearby')
    }
    
    if (houseData.closestSchool !== null && houseData.closestSchool <= 2) {
      proximityInfo.push('School: nearby')
    }
    
    // Don't include hospitals
    
    if (houseData.closestPark !== null && houseData.closestPark <= 2) {
      proximityInfo.push('Park: nearby')
    }
    
    if (houseData.closestUniversity !== null && houseData.closestUniversity <= 2) {
      proximityInfo.push('University: nearby')
    }

    const areaInfo = [
      // Don't include safety numbers
      houseData.areaVibe ? `Area vibe: ${houseData.areaVibe}` : null,
    ].filter(Boolean)

    const listingTypeText = houseData.listingType === 'rent' ? 'rental' : 'sale'
    const priceText = houseData.listingType === 'rent' 
      ? `€${houseData.pricePerMonth.toLocaleString()}/month`
      : `€${houseData.pricePerMonth.toLocaleString()}`

    // Generate both English and Greek descriptions in a single response
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a professional real estate broker writing property descriptions to attract potential ${listingTypeText === 'rental' ? 'tenants' : 'buyers'}. 

Your task is to create TWO descriptions in a single response:
1. An English description (exactly 200 words, complete and natural)
2. A Greek description (exactly 200 words, complete and natural)

Format your response EXACTLY as follows:
ENGLISH:
[Your English description here - exactly 200 words, 2-3 paragraphs with blank lines between]

GREEK:
[Your Greek description here - exactly 200 words, 2-3 paragraphs with blank lines between]

Requirements for BOTH descriptions:
- IMPORTANT: Vary your opening sentences. Do NOT start every description with the same phrases like "nestled in", "located in", "situated in", "βρίσκεται σε", "τοποθετημένο σε", etc. Be creative and unpredictable with how you begin each description.
- Highlights the property's best features naturally, without being overly enthusiastic
- Mentions proximity to amenities (metro, bus, schools, parks, universities) when relevant, but use general terms like "close to", "nearby", "conveniently located", "κοντά σε", "κοντά" - NEVER mention specific distances, kilometers, or numbers
- DO NOT mention hospitals at all / ΜΗΝ αναφέρεις καθόλου νοσοκομεία
- For parks: Only mention briefly that parks are nearby for walks - do NOT talk about nature, picnics, activities, or any details / Για πάρκα: Αναφέρεις μόνο εν συντομία ότι υπάρχουν πάρκα κοντά για βόλτες
- For schools: Only mention they are nearby if relevant - do NOT go into details / Για σχολεία: Αναφέρεις μόνο ότι είναι κοντά αν είναι σχετικό
- References area vibe when available (use general terms, never mention safety numbers)
- Uses natural, professional language - be charming but not pushy. Vary your sentence structure and vocabulary to avoid repetitive patterns.
- Focuses on lifestyle benefits and convenience
- NEVER mention any numbers except for house qualities (bedrooms, bathrooms, size, floor, year built/renovated)
- CRITICAL: Format each description in 2-3 separate, well-structured paragraphs. Each paragraph should be on its own line with a blank line between paragraphs.
- Keep descriptions general and appealing, not overly technical
- CRITICAL: Each description MUST be exactly 200 words and complete - do not cut off mid-sentence. Make sure both descriptions end naturally.

Write in a warm, inviting but subtle tone. Vary your writing style to make each description unique and engaging. Do not include the price in either description.`
        },
        {
          role: 'user',
          content: `Property: ${houseData.title}
Location: ${locationInfo}
Type: For ${listingTypeText} at ${priceText}
Details: ${propertyDetails}
${houseData.availableFrom ? `Available from: ${houseData.availableFrom}` : ''}
${proximityInfo.length > 0 ? `Nearby amenities: ${proximityInfo.join(', ')}` : ''}
${areaInfo.length > 0 ? `Area information: ${areaInfo.join(', ')}` : ''}

Generate BOTH an English description (exactly 200 words) and a Greek description (exactly 200 words) in your response. Format as:
ENGLISH:
[English description - 2-3 paragraphs]

GREEK:
[Greek description - 2-3 paragraphs]

Both descriptions must be complete, natural, and exactly 200 words each. ${houseData.availableFrom ? `If available from date is provided, mention it naturally in both descriptions.` : ''}Do not mention hospitals, specific distances, or numbers except for house qualities.`
        },
      ],
      temperature: 0.9,
      max_tokens: 1200,
    })

    // Parse the single response to extract English and Greek descriptions
    const fullResponse = completion.choices[0]?.message?.content?.trim() || ''
    
    let finalEnglishDescription: string | null = null
    let finalGreekDescription: string | null = null
    
    if (fullResponse) {
      // Find the positions of the markers
      const englishMarkerIndex = fullResponse.search(/ENGLISH:\s*/i)
      const greekMarkerIndex = fullResponse.search(/GREEK:\s*/i)
      
      if (englishMarkerIndex >= 0 && greekMarkerIndex > englishMarkerIndex) {
        // Extract English description (everything between ENGLISH: and GREEK:)
        const englishStart = englishMarkerIndex + fullResponse.substring(englishMarkerIndex).match(/ENGLISH:\s*/i)?.[0].length || 0
        const englishEnd = greekMarkerIndex
        finalEnglishDescription = fullResponse.substring(englishStart, englishEnd).trim()
        // Ensure paragraph breaks are preserved
        finalEnglishDescription = finalEnglishDescription.replace(/\n\n+/g, '\n\n')
      }
      
      if (greekMarkerIndex >= 0) {
        // Extract Greek description (everything after GREEK: to the end)
        const greekStart = greekMarkerIndex + fullResponse.substring(greekMarkerIndex).match(/GREEK:\s*/i)?.[0].length || 0
        finalGreekDescription = fullResponse.substring(greekStart).trim()
        // Ensure paragraph breaks are preserved
        finalGreekDescription = finalGreekDescription.replace(/\n\n+/g, '\n\n')
      }
      
      // Log if parsing failed
      if (!finalEnglishDescription || !finalGreekDescription) {
        console.warn('Could not parse descriptions. Full response length:', fullResponse.length)
        console.warn('English marker found:', englishMarkerIndex >= 0)
        console.warn('Greek marker found:', greekMarkerIndex >= 0)
        console.warn('Response preview:', fullResponse.substring(0, 500))
        console.warn('Response end:', fullResponse.substring(Math.max(0, fullResponse.length - 500)))
      }
    }

    return {
      description: finalEnglishDescription,
      descriptionGreek: finalGreekDescription,
    }
  } catch (error) {
    console.error('Error generating house descriptions:', error)
    return { description: null, descriptionGreek: null }
  }
}

