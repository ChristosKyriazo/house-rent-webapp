import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { unauthorized } from '@/lib/api-utils'
import { features } from '@/lib/features'

/**
 * Activation for paid Viber/SMS alerts.
 *
 * Disabled by default, and deliberately so: there is no delivery pipeline behind this flag.
 * `User` has no verified phone column, no provider is wired up, and nothing anywhere reads
 * `viberAlertsActive` to send anything. Until those exist this route only ever granted a paid
 * flag — advertised at €2.99 in the UI — to any authenticated caller, for a feature that could
 * not have been delivered even if they had paid.
 *
 * Turning `FEATURE_VIBER_ALERTS` on is not sufficient to make this correct. Before it ships:
 *   1. `User.phone` + `phoneVerifiedAt` (OTP-verified — an unverified number means billing a
 *      user to message a stranger).
 *   2. A server-priced Stripe line item, with `viberAlertsActive` flipped from the webhook
 *      only, never from a client-triggered route.
 *   3. A sender invoked from `createNotification`, so routing lives in one place.
 */
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return unauthorized()

  if (!features.viberAlerts) {
    return NextResponse.json(
      { error: 'not_implemented', message: 'Viber and SMS alerts are not available yet.' },
      { status: 501 }
    )
  }

  return NextResponse.json(
    { error: 'payment_required', message: 'Viber and SMS alerts require checkout.' },
    { status: 402 }
  )
}
