import { NextRequest, NextResponse } from 'next/server'
import { translateDescription } from '@/lib/description-translator'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description, targetLanguage } = body

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    if (!targetLanguage || (targetLanguage !== 'el' && targetLanguage !== 'en')) {
      return NextResponse.json(
        { error: 'Invalid target language' },
        { status: 400 }
      )
    }

    const openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }) : null

    const translated = await translateDescription(description, targetLanguage, openai)

    return NextResponse.json({
      translated: translated || description,
    })
  } catch (error: any) {
    console.error('Error in translate-description API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to translate description' },
      { status: 500 }
    )
  }
}



