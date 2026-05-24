import OpenAI from 'openai'

export function cosineSimilarity(a: number[], b: number[]): number {
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
}): string {
  const parts = [
    home.title,
    home.description,
    `${home.bedrooms} bedrooms, ${home.bathrooms} bathrooms`,
    home.sizeSqMeters ? `${home.sizeSqMeters} sqm` : null,
    `${home.listingType === 'rent' ? 'rent' : 'for sale'} in ${[home.area, home.city, home.country].filter(Boolean).join(', ')}`,
    `price ${home.pricePerMonth}`,
  ]
  return parts.filter(Boolean).join('. ')
}
