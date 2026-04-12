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
    /** Short landlord notes (rules, tenant preferences, pets, etc.) to weave into both descriptions */
    ownerNotes?: string | null
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

    // Format floor description correctly
    let floorDescription: string | null = null
    if (houseData.floor !== null) {
      if (houseData.floor === 0) {
        floorDescription = 'ground floor (ισόγειο)'
      } else if (houseData.floor < 0) {
        floorDescription = `below ground floor (υπόγειο), level ${houseData.floor}`
      } else {
        floorDescription = `floor ${houseData.floor}`
      }
    }

    const propertyDetails = [
      `${houseData.bedrooms} bedroom${houseData.bedrooms !== 1 ? 's' : ''}`,
      `${houseData.bathrooms} bathroom${houseData.bathrooms !== 1 ? 's' : ''}`,
      houseData.sizeSqMeters ? `${houseData.sizeSqMeters} m²` : null,
      floorDescription,
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

    const notesBlock = houseData.ownerNotes?.trim()
      ? `

LANDLORD RULES (BINDING — treat as factual requirements, not marketing angles):
The owner specified the following. These are rules or eligibility criteria for this listing, NOT vague "lifestyle" suggestions.
${houseData.ownerNotes.trim()}`
      : ''

    const model =
      process.env.OPENAI_HOUSE_DESCRIPTION_MODEL ||
      process.env.OPENAI_COMPATIBILITY_MODEL ||
      'gpt-4o-mini'

    // JSON output avoids fragile ENGLISH:/GREEK: parsing when models reorder or use markdown
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a professional real estate broker writing property descriptions to attract potential ${listingTypeText === 'rental' ? 'tenants' : 'buyers'}. 

Your task is to output a single JSON object with exactly two string fields:
- "description": full English listing text (about 180–220 words, 2–3 paragraphs separated by blank lines)
- "descriptionGreek": full Greek listing text (about 180–220 words, same structure)

Do not include markdown code fences. Do not add any other keys.

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
- CRITICAL FLOOR DESCRIPTION RULES:
  * If floor is 0: In English say "ground floor", in Greek say "ισόγειο" (NOT "υπόγειο")
  * If floor is negative (e.g., -1, -2): In English say "below ground floor" or "basement level", in Greek say "υπόγειο" (NOT "ισόγειο")
  * If floor is positive (e.g., 1, 2, 3): In English say "Xth floor", in Greek say "Xος όροφος" or "Xο όροφο"
- CRITICAL: Format each description in 2-3 separate, well-structured paragraphs. Each paragraph should be on its own line with a blank line between paragraphs.
- Keep descriptions general and appealing, not overly technical
- CRITICAL: Each description MUST be about 180–220 words and complete - do not cut off mid-sentence. Make sure both descriptions end naturally.
${houseData.ownerNotes?.trim() ? `
RULES LANGUAGE (mandatory when LANDLORD RULES are provided above):
- State each rule in **direct, assertive, honest** wording. Renters must understand what is allowed and what is not.
- Do NOT soften rules into vague positives. FORBIDDEN examples: "ideal for families", "perfect for students", "great for pet lovers" when the owner meant exclusivity or a ban — that misleads.
- REQUIRED style examples (adapt to the actual rules): "This property is available only to families." / "Letting is restricted to students." / "Pets are not permitted." / "Smoking is not allowed on the premises." / "The landlord requires…"
- If the owner wrote "only X" or "no Y", reflect **exclusivity or prohibition** explicitly in both languages (English + Greek with equivalent legal/ everyday clarity).
- You may use a short dedicated paragraph for tenancy rules if that keeps them clearest; you may also weave rules into the text, but they must read as **requirements**, not optional perks.
- Greek: same assertive clarity (e.g. μόνο για οικογένειες, δεν επιτρέπονται κατοικίδια, αποκλειστικά για φοιτητές — as appropriate to the notes).
` : ''}

Write in a warm, inviting but subtle tone for the property itself${houseData.ownerNotes?.trim() ? '; for the rules section, prioritize clarity and honesty over sales language' : ''}. Vary your writing style to make each description unique and engaging. Do not include the price in either description.`
        },
        {
          role: 'user',
          content: `Property: ${houseData.title}
Location: ${locationInfo}
Type: For ${listingTypeText} at ${priceText}
Details: ${propertyDetails}
${houseData.availableFrom ? `Available from: ${houseData.availableFrom}` : ''}
${proximityInfo.length > 0 ? `Nearby amenities: ${proximityInfo.join(', ')}` : ''}
${areaInfo.length > 0 ? `Area information: ${areaInfo.join(', ')}` : ''}${notesBlock}

Return JSON only with "description" and "descriptionGreek". Both must be complete, natural, multi-paragraph text. ${houseData.availableFrom ? `If available from date is provided, mention it naturally in both descriptions.` : ''}${houseData.ownerNotes?.trim() ? ' The LANDLORD RULES above must appear in both languages as clear, assertive tenancy rules (who may rent, what is forbidden), not as soft marketing.' : ''} Do not mention hospitals, specific distances, or numbers except for house qualities.`,
        },
      ],
      temperature: 0.85,
      max_tokens: 4096,
    })

    const raw = completion.choices[0]?.message?.content?.trim() || ''
    let finalEnglishDescription: string | null = null
    let finalGreekDescription: string | null = null

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        const en = parsed.description ?? parsed.Description
        const el = parsed.descriptionGreek ?? parsed.description_greek ?? parsed.DescriptionGreek
        if (typeof en === 'string' && en.trim()) {
          finalEnglishDescription = en.trim().replace(/\n\n+/g, '\n\n')
        }
        if (typeof el === 'string' && el.trim()) {
          finalGreekDescription = el.trim().replace(/\n\n+/g, '\n\n')
        }
      } catch {
        console.warn('House description JSON parse failed, raw length:', raw.length)
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

