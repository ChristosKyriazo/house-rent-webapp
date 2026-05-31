import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { processBulkUploadJob } from '@/lib/bulk-upload-processor'
import * as XLSX from 'xlsx'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { requestLogger } from '@/lib/logger'
import { detectImageType } from '@/lib/image-validation'

export async function POST(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userRole = user.role || 'user'
    if (userRole !== 'owner' && userRole !== 'both' && userRole !== 'broker') {
      return NextResponse.json({ error: 'Only owners and brokers can upload listings' }, { status: 403 })
    }

    const formData = await request.formData()
    const excelFile = formData.get('excelFile') as File
    const useAIDescription = formData.get('useAIDescription') === 'true'

    if (!excelFile) {
      return NextResponse.json({ error: 'Excel file is required' }, { status: 400 })
    }

    if (excelFile.name.toLowerCase().endsWith('.numbers')) {
      return NextResponse.json(
        { error: 'Apple Numbers files cannot be uploaded directly. In Numbers, choose File → Export To → Excel (.xlsx), then upload the exported file.' },
        { status: 400 }
      )
    }

    // Parse Excel just enough to validate and get row count
    const arrayBuffer = await excelFile.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(worksheet) as any[]

    if (data.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 })
    }

    // Create the job record first so we get its ID for the directory name
    const job = await prisma.bulkUploadJob.create({
      data: {
        userId: user.id,
        status: 'pending',
        total: data.length,
      },
    })

    // Save Excel file into a per-job directory
    const jobDir = join(process.cwd(), 'public', 'uploads', 'jobs', job.id)
    await mkdir(jobDir, { recursive: true })
    const excelPath = join(jobDir, 'data.xlsx')
    await writeFile(excelPath, Buffer.from(arrayBuffer))

    // Save photos to their final location immediately; record paths by row index
    const photosByIndex: Record<string, string[]> = {}
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith('photos_')) continue
      const index = parseInt(key.replace('photos_', ''))
      if (isNaN(index)) continue

      const photoFile = value as File
      if (photoFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: `Photo ${photoFile.name} for house ${index + 1} exceeds 5MB limit` },
          { status: 400 }
        )
      }

      const photoBuffer = Buffer.from(await photoFile.arrayBuffer())
      const detected = detectImageType(photoBuffer)
      if (!detected) {
        return NextResponse.json(
          { error: `Photo ${photoFile.name} for house ${index + 1} is not a valid JPEG, PNG, or WebP image` },
          { status: 400 }
        )
      }

      const timestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substring(7)
      // Extension derived from magic bytes — never from client-supplied filename
      const filename = `${timestamp}-${randomSuffix}.${detected.ext}`
      const uploadsDir = join(process.cwd(), 'public', 'uploads')
      await mkdir(uploadsDir, { recursive: true })
      await writeFile(join(uploadsDir, filename), photoBuffer)

      const indexKey = String(index)
      if (!photosByIndex[indexKey]) photosByIndex[indexKey] = []
      photosByIndex[indexKey].push(`/uploads/${filename}`)
    }

    const confirmedNewAreasRaw = formData.get('confirmedNewAreas')
    const confirmedNewAreas = confirmedNewAreasRaw ? JSON.parse(confirmedNewAreasRaw as string) : []

    // Persist the job options and file path, then kick off background processing
    await prisma.bulkUploadJob.update({
      where: { id: job.id },
      data: {
        filePath: excelPath,
        options: { useAIDescription, confirmedNewAreas, photosByIndex },
      },
    })

    // Fire-and-forget: Node.js keeps running after the response is sent
    processBulkUploadJob(job.id).catch((err) =>
      log.error({ err, jobId: job.id }, 'Background bulk upload job crashed')
    )

    return NextResponse.json({ jobId: job.id })
  } catch (error: any) {
    log.error({ err: error }, 'Bulk upload error')
    return NextResponse.json(
      { error: error.message || 'Failed to start bulk upload' },
      { status: 500 }
    )
  }
}
