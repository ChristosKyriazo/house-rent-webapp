import { prisma } from './prisma'
import { FILTER_EXTRACTION_SYSTEM_PROMPT } from './ai-prompts'
import { removeGreekAccents } from './utils'

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
  Safety?: string // "Essential" or "Strong" or "Not important" or "Not mentioned"
  preferredAreas?: string[] // Array of area names mentioned as preferences (e.g., "like Filothei, Psychiko") - NOT hard filters, just preferences
  // Soft preference flags - if true, the field should NOT be a hard filter, only affect scoring
  parkingSoftPreference?: boolean // true if user says "parking would be nice but not essential" or similar
  vibePreference?: string // 1-2 words describing the vibe the user wants (e.g., "coastal", "urban", "family-friendly", "quiet")
  confidence: number // 0-1, how confident we are in the extraction
}

/**
 * Use AI to extract hard filters from user query
 * Returns JSON with filter values only, plus prompt/response for logging
 */

export async function extractFiltersWithAI(
  query: string,
  openai: any
): Promise<ExtractedFilters & { filterExtractionPrompt?: string; filterExtractionResponse?: string }> {
  const systemPrompt = FILTER_EXTRACTION_SYSTEM_PROMPT

  const fullPrompt = `System: ${systemPrompt}\n\nUser Query: ${query}`

  try {
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
    
    if (responseContent) {
      const parsed = JSON.parse(responseContent)
      return {
        ...parsed,
        confidence: 0.9,
        filterExtractionPrompt: fullPrompt,
        filterExtractionResponse: responseContent,
      }
    }
  } catch (error) {
    console.error('AI filter extraction error:', error)
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

