import OpenAI from 'openai'

interface NormalizeInput {
  title: string
  street: string | null
  description: string | null
}

interface NormalizeOutput {
  titleEn: string
  titleEl: string
  streetEn: string | null
  streetEl: string | null
  descriptionEn: string | null
  descriptionEl: string | null
}

const SYSTEM_PROMPT = `You are a bilingual property listing assistant for a Greek real estate platform.
Given property listing fields that may be in Greek, English, or a mix — possibly with spelling or typographic errors:
1. Correct any spelling/orthographical errors in each field
2. Produce a clean English version and a clean Greek version of each field
3. For street addresses, keep the street number and preserve the address structure

Respond ONLY with a valid JSON object matching this exact shape:
{
  "titleEn": string,
  "titleEl": string,
  "streetEn": string | null,
  "streetEl": string | null,
  "descriptionEn": string | null,
  "descriptionEl": string | null
}
null means the field was not provided.`

export async function normalizeBulkTextFields(
  input: NormalizeInput,
  openai: OpenAI
): Promise<NormalizeOutput> {
  const userContent = [
    `title: ${input.title}`,
    `street: ${input.street ?? 'null'}`,
    `description: ${input.description ?? 'null'}`,
  ].join('\n')

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw) as Partial<NormalizeOutput>

  return {
    titleEn: parsed.titleEn || input.title,
    titleEl: parsed.titleEl || input.title,
    streetEn: parsed.streetEn !== undefined ? parsed.streetEn : input.street,
    streetEl: parsed.streetEl !== undefined ? parsed.streetEl : input.street,
    descriptionEn: parsed.descriptionEn !== undefined ? parsed.descriptionEn : input.description,
    descriptionEl: parsed.descriptionEl !== undefined ? parsed.descriptionEl : input.description,
  }
}
