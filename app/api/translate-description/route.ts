import { NextRequest, NextResponse } from 'next/server'
import { translateDescription } from '@/lib/description-translator'
import { getCurrentUser } from '@/lib/auth'
import { checkTranslationLimit } from '@/lib/rate-limit'
import { validateBody } from '@/lib/api-utils'
import { translateDescriptionSchema } from '@/lib/schemas'
import OpenAI from 'openai'
import { requestLogger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await checkTranslationLimit(user.id))) {
      return NextResponse.json({ error: 'Too many requests. Please wait before translating again.' }, { status: 429 })
    }

    const rawBody = await request.json()
    const { data: body, error: validationError } = validateBody(translateDescriptionSchema, rawBody)
    if (validationError) return validationError

    const { description, targetLanguage = 'el' } = body

    const openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }) : null

    const translated = await translateDescription(description, targetLanguage, openai)

    return NextResponse.json({
      translated: translated || description,
    })
  } catch (error: any) {
    log.error({ err: error }, 'Error in translate-description API')
    return NextResponse.json(
      { error: error.message || 'Failed to translate description' },
      { status: 500 }
    )
  }
}




