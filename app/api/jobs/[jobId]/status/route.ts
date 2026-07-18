import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { unauthorized } from '@/lib/api-utils'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return unauthorized()
  }

  const { jobId } = await params
  const job = await prisma.bulkUploadJob.findFirst({
    where: { id: jobId, userId: user.id },
    select: { status: true, progress: true, total: true, results: true, errors: true },
  })

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json(job)
}
