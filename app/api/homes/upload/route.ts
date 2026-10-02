import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { getCurrentUser } from '@/lib/auth'
import { requestLogger } from '@/lib/logger'
import { detectImageType } from '@/lib/image-validation'
import { unauthorized } from '@/lib/api-utils'

// Increase body size limit for file uploads
export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Read buffer first so we can validate by magic bytes, not client-supplied MIME type
    const buffer = Buffer.from(await file.arrayBuffer())
    const detected = detectImageType(buffer)
    if (!detected) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    // Extension comes from magic-byte detection, never from the client-supplied filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 15)
    const filename = `${timestamp}-${randomStr}.${detected.ext}`
    const filepath = join(uploadsDir, filename)

    // Save file
    await writeFile(filepath, buffer)

    // Return the public URL
    const publicUrl = `/uploads/${filename}`

    return NextResponse.json(
      { url: publicUrl, filename },
      { status: 200 }
    )
  } catch (error) {
    log.error({ err: error }, 'Upload error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

