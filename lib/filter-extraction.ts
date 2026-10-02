import { FILTER_EXTRACTION_SYSTEM_PROMPT } from './ai-prompts'
import { logAICall } from './ai-logger'

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

type CachedFilterResult = ExtractedFilters & { filterExtractionPrompt?: string; filterExtractionResponse?: string; cachedAt?: number }
const filterCache = new Map<string, CachedFilterResult>()
const FILTER_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Use AI to extract hard filters from user query
 * Returns JSON with filter values only, plus prompt/response for logging
 */

async function extractFiltersWithAI(
  query: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openai: any
): Promise<CachedFilterResult> {
  const callStart = Date.now()
  const now = callStart
  const cached = filterCache.get(query)
  if (cached && cached.confidence > 0.5 && (now - (cached.cachedAt ?? 0)) < FILTER_CACHE_TTL_MS) {
    return cached
  }
  if (cached) filterCache.delete(query)

  const systemPrompt = FILTER_EXTRACTION_SYSTEM_PROMPT
  const fullPrompt = `System: ${systemPrompt}\n\nUser Query: ${query}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15_000)

  try {
    const model = process.env.OPENAI_FILTER_MODEL || 'gpt-4o-mini'
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }, { signal: controller.signal })

    const responseContent = completion.choices[0]?.message?.content

    if (responseContent) {
      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(responseContent)
      } catch {
        console.error('AI filter extraction: invalid JSON response')
        return { confidence: 0, filterExtractionPrompt: fullPrompt, filterExtractionResponse: responseContent }
      }
      const result: CachedFilterResult = {
        ...(parsed as Partial<ExtractedFilters>),
        confidence: 0.9,
        filterExtractionPrompt: fullPrompt,
        filterExtractionResponse: responseContent,
        cachedAt: Date.now(),
      }
      logAICall({
        task: 'filter_extraction',
        model,
        latencyMs: Date.now() - callStart,
        success: true,
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
      })
      filterCache.set(query, result)
      return result
    }
  } catch (error) {
    console.error('AI filter extraction error:', error)
    return {
      confidence: 0,
      filterExtractionPrompt: fullPrompt,
      filterExtractionResponse: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timeoutId)
  }

  return {
    confidence: 0,
    filterExtractionPrompt: fullPrompt,
    filterExtractionResponse: 'No response from AI',
  }
}

type ListingSearchMode ='rent' | 'buy'

/**
 * Extract filters using AI only (removed simple pattern matching)
 * @param options.listingMode When set, tells the model whether prices are monthly rent vs purchase total (same rules as manual search).
 */
export async function extractFiltersHybrid(
  query: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openai: any | null,
  options?: { listingMode?: ListingSearchMode }
): Promise<ExtractedFilters> {
  const modeHint =
    options?.listingMode === 'buy'
      ? '\n\n[Search page: properties FOR SALE (buy). minPrice/maxPrice are total purchase price in EUR unless the user clearly states otherwise.]'
      : options?.listingMode === 'rent'
        ? '\n\n[Search page: properties FOR RENT. minPrice/maxPrice are monthly rent in EUR unless the user clearly states otherwise.]'
        : ''

  if (openai && process.env.OPENAI_API_KEY) {
    return await extractFiltersWithAI(query + modeHint, openai)
  }

  return { confidence: 0 }
}

