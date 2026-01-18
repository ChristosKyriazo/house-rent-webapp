import OpenAI from 'openai'

// Cache for translations to avoid repeated API calls
const translationCache = new Map<string, string>()

/**
 * Translate a description to the target language
 * Uses caching to avoid repeated API calls for the same content
 */
export async function translateDescription(
  description: string | null | undefined,
  targetLanguage: 'el' | 'en',
  openai: OpenAI | null
): Promise<string | null> {
  if (!description || !description.trim()) {
    return null
  }

  // If target language is English and description appears to be in English, return as-is
  // If target language is Greek and description appears to be in Greek, return as-is
  // This is a simple heuristic - you might want to improve it
  if (targetLanguage === 'en') {
    // Assume descriptions stored in DB are in English (as per requirements)
    return description
  }

  // Check cache first
  const cacheKey = `${description.substring(0, 100)}_${targetLanguage}`
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey) || description
  }

  if (!openai || !process.env.OPENAI_API_KEY) {
    console.warn('OpenAI not available, returning original description')
    return description
  }

  try {
    const systemPrompt = `You are a professional translator. Translate the following real estate property description to ${targetLanguage === 'el' ? 'Greek' : 'English'}. 

Keep the translation:
- Natural and fluent
- Professional and appealing (like a real estate broker)
- Same tone and style as the original
- Same length (approximately)
- Do not change any numbers, measurements, or specific details

Return only the translated text, nothing else.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: description },
      ],
      temperature: 0.3,
      max_tokens: 400, // Allow for longer descriptions
    })

    const translated = completion.choices[0]?.message?.content?.trim()
    
    if (translated) {
      // Cache the translation
      translationCache.set(cacheKey, translated)
      // Limit cache size to prevent memory issues
      if (translationCache.size > 100) {
        const firstKey = translationCache.keys().next().value
        translationCache.delete(firstKey)
      }
      return translated
    }

    return description
  } catch (error) {
    console.error('Error translating description:', error)
    return description
  }
}


