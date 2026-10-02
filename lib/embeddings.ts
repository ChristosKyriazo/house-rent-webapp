import OpenAI from 'openai'

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

export async function generateEmbedding(text: string, openai: OpenAI): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),
  })
  return response.data[0].embedding
}

export function buildHomeText(home: {
  title: string
  description?: string | null
  city: string
  country: string
  area?: string | null
  listingType: string
  bedrooms: number
  bathrooms: number
  pricePerMonth: number
  sizeSqMeters?: number | null
  parking?: boolean | null
  energyClass?: string | null
  heatingCategory?: string | null
  heatingAgent?: string | null
  yearBuilt?: number | null
  yearRenovated?: number | null
}): string {
  const parts = [
    // Location + type — strongest semantic anchor
    `${home.listingType === 'rent' ? 'rental' : 'for sale'} property in ${[home.area, home.city, home.country].filter(Boolean).join(', ')}`,
    // Room counts as readable text (not raw numbers)
    `${home.bedrooms}-bedroom ${home.bathrooms}-bathroom`,
    home.sizeSqMeters ? `${home.sizeSqMeters} square meters` : null,
    // Categorical signals — exactly what users describe semantically
    home.parking ? 'parking available' : null,
    home.heatingCategory ? `${home.heatingCategory} heating` : null,
    home.heatingAgent ? `${home.heatingAgent} heating system` : null,
    home.energyClass ? `energy class ${home.energyClass}` : null,
    home.yearRenovated ? `renovated in ${home.yearRenovated}` : null,
    home.yearBuilt ? (home.yearBuilt > 2010 ? `modern building built ${home.yearBuilt}` : `built ${home.yearBuilt}`) : null,
    // Natural language last — adds semantic richness but shouldn't dominate
    home.title,
    home.description,
  ]
  return parts.filter(Boolean).join('. ')
}
