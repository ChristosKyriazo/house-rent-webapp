import OpenAI from 'openai'
import { readFile } from 'fs/promises'
import { join } from 'path'

// Canonical list of visual features we detect. Keep in sync with search synonym map below.
const KNOWN_FEATURES = [
  'balcony', 'terrace', 'patio',
  'garden', 'yard',
  'sea view', 'mountain view', 'city view', 'panoramic view',
  'pool', 'swimming pool', 'jacuzzi',
  'fireplace',
  'hardwood floors', 'parquet floors', 'marble floors',
  'modern kitchen', 'island kitchen', 'open kitchen',
  'renovated bathroom',
  'bright', 'natural light', 'high ceilings', 'open plan',
  'rooftop', 'loft', 'duplex',
  'walk-in closet', 'storage',
]

// Synonym map: query word/phrase → which photo tags to check
// Used by calculatePhotoBonus in ai-search-helpers
export const PHOTO_TAG_SYNONYMS: Record<string, string[]> = {
  balcony: ['balcony', 'terrace', 'patio'],
  terrace: ['terrace', 'balcony', 'patio', 'rooftop'],
  patio: ['patio', 'terrace', 'balcony'],
  garden: ['garden', 'yard'],
  yard: ['yard', 'garden'],
  view: ['sea view', 'mountain view', 'city view', 'panoramic view'],
  'sea view': ['sea view', 'panoramic view'],
  'mountain view': ['mountain view', 'panoramic view'],
  'city view': ['city view', 'panoramic view'],
  panoramic: ['panoramic view'],
  pool: ['pool', 'swimming pool', 'jacuzzi'],
  'swimming pool': ['pool', 'swimming pool'],
  jacuzzi: ['jacuzzi', 'pool'],
  fireplace: ['fireplace'],
  'hardwood floor': ['hardwood floors', 'parquet floors'],
  parquet: ['parquet floors', 'hardwood floors'],
  'marble floor': ['marble floors'],
  kitchen: ['modern kitchen', 'island kitchen', 'open kitchen'],
  'modern kitchen': ['modern kitchen', 'island kitchen'],
  'island kitchen': ['island kitchen', 'modern kitchen'],
  bathroom: ['renovated bathroom'],
  'renovated bathroom': ['renovated bathroom'],
  bright: ['bright', 'natural light'],
  light: ['bright', 'natural light'],
  'high ceiling': ['high ceilings'],
  'open plan': ['open plan'],
  rooftop: ['rooftop'],
  loft: ['loft'],
  duplex: ['duplex'],
  closet: ['walk-in closet'],
  'walk-in closet': ['walk-in closet'],
  storage: ['storage'],
}

/** Analyze up to 3 photos and return an array of visible visual feature tags. */
export async function analyzePhotosForTags(
  photoPaths: string[],
  openai: OpenAI
): Promise<string[]> {
  if (!photoPaths.length) return []

  const toAnalyze = photoPaths.slice(0, 3)
  const imageContents: OpenAI.Chat.Completions.ChatCompletionContentPart[] = []

  const MAX_IMAGE_BYTES = 1_024 * 1024 // 1 MB — larger images cost too much and gain little

  for (const photoPath of toAnalyze) {
    try {
      const absolutePath = join(process.cwd(), 'public', photoPath)
      const buffer = await readFile(absolutePath)
      if (buffer.length > MAX_IMAGE_BYTES) {
        console.warn(`Photo skipped (${Math.round(buffer.length / 1024)}KB > 1MB): ${photoPath}`)
        continue
      }
      const base64 = buffer.toString('base64')
      const ext = photoPath.split('.').pop()?.toLowerCase() || 'jpeg'
      const mime =
        ext === 'png' ? 'image/png' :
        ext === 'webp' ? 'image/webp' :
        ext === 'gif' ? 'image/gif' : 'image/jpeg'

      imageContents.push({
        type: 'image_url',
        image_url: { url: `data:${mime};base64,${base64}`, detail: 'low' },
      })
    } catch {
      // skip unreadable / missing file
    }
  }

  if (!imageContents.length) return []

  const model = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini'

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze these real estate property photos. Identify only clearly visible features.
Return a JSON object: {"features": [...]} where the array contains lowercase strings chosen ONLY from this list:
${KNOWN_FEATURES.map(f => `"${f}"`).join(', ')}
Return {"features": []} if nothing clearly applies. No explanations.`,
            },
            ...imageContents,
          ],
        },
      ],
      max_tokens: 200,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content?.trim() || '{}'
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw)
    } catch {
      return []
    }

    for (const val of Object.values(parsed)) {
      if (Array.isArray(val)) {
        return (val as unknown[])
          .filter((t): t is string => typeof t === 'string')
          .filter(t => KNOWN_FEATURES.includes(t.toLowerCase()))
      }
    }
    return []
  } catch {
    return []
  }
}

/** Parse the stored photoTags JSON string back to a string array. */
export function parsePhotoTags(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
  } catch {
    return []
  }
}
