import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { serverError } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'
import type { InvitationDetails } from '@/types/team'

// GET: fetch invitation details for the /join-team acceptance page.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  const log = requestLogger(request)
  try {
    const { token } = await params
    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
      select: {
        status: true,
        expiresAt: true,
        inviteeEmail: true,
        message: true,
        tier: true,
        inviter: { select: { name: true } },
      },
    })

    const base: InvitationDetails = {
      valid: false,
      inviterName: invitation?.inviter.name ?? null,
      agencyName: invitation?.inviter.name ?? null,
      inviteeEmail: invitation?.inviteeEmail ?? '',
      message: invitation?.message ?? null,
      tier: (invitation?.tier ?? 'pro') as InvitationDetails['tier'],
    }

    if (!invitation) return NextResponse.json({ ...base, reason: 'not_found' })
    if (invitation.status !== 'pending') return NextResponse.json({ ...base, reason: 'already_decided' })
    if (invitation.expiresAt < new Date()) return NextResponse.json({ ...base, reason: 'expired' })

    // Optional: flag an email mismatch so the UI can warn (does not block fetching details).
    const user = await getCurrentUser()
    if (user && user.email.toLowerCase() !== invitation.inviteeEmail.toLowerCase()) {
      return NextResponse.json({ ...base, valid: true, reason: 'email_mismatch' })
    }

    return NextResponse.json({ ...base, valid: true })
  } catch (error) {
    log.error({ err: error }, 'Error fetching invitation')
    return serverError()
  }
}
