import { NextResponse } from 'next/server'
import { buildInfo } from '@/lib/build-info'

export const dynamic = 'force-dynamic'

/** Liveness, plus which commit and environment are answering (see lib/build-info.ts). */
export async function GET() {
  return NextResponse.json({ status: 'ok', ...buildInfo(process.env.APP_IMAGE) }, { status: 200 })
}
