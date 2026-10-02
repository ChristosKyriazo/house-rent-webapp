import { NextRequest, NextResponse } from 'next/server'
import { badRequest, parsePositiveInt, serverError } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'
import { getUserScore, getBrokerScore } from '@/lib/ratings'

// GET: Aggregate score for a user or broker profile
// ?kind=tenant  → viewing_tenant + moveout_tenant ratings received
// ?kind=broker  → viewing_broker ratings received
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> | { userId: string } }
) {
  const log = requestLogger(request)
  try {
    const { userId: rawId } = await Promise.resolve(params)
    const userId = parsePositiveInt(rawId)
    if (!userId) return badRequest('Invalid user ID')

    const kind = request.nextUrl.searchParams.get('kind') ?? 'tenant'

    if (kind === 'broker') {
      const result = await getBrokerScore(userId)
      return NextResponse.json(result)
    }

    const result = await getUserScore(userId)
    return NextResponse.json(result)
  } catch (error) {
    log.error({ err: error }, 'Get user ratings error')
    return serverError()
  }
}
