/** Allowed viewing slot lengths (minutes), must match owner set-availability options. */
export const APPOINTMENT_SLOT_MINUTES = [15, 30, 45, 60] as const

export function isValidAppointmentSlotMinutes(n: number): boolean {
  return APPOINTMENT_SLOT_MINUTES.includes(n as (typeof APPOINTMENT_SLOT_MINUTES)[number])
}

/**
 * Reads appointmentThresholdMinutes from inquiry.contactInfo (DB JSON string or parsed object).
 */
export function parseAppointmentThresholdMinutes(contactInfo: unknown): number | null {
  if (contactInfo == null) return null

  let parsed: Record<string, unknown> | null = null
  if (typeof contactInfo === 'string') {
    try {
      parsed = JSON.parse(contactInfo) as Record<string, unknown>
    } catch {
      return null
    }
  } else if (typeof contactInfo === 'object' && contactInfo !== null) {
    parsed = contactInfo as Record<string, unknown>
  }

  if (!parsed) return null
  const n = Number(parsed.appointmentThresholdMinutes)
  if (isValidAppointmentSlotMinutes(n)) return n
  return null
}

/** Derive slot length from an existing booking's start/end when inquiry metadata is missing. */
export function minutesBetween(startIso: string, endIso: string): number {
  const a = new Date(startIso).getTime()
  const b = new Date(endIso).getTime()
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 30
  const m = Math.round((b - a) / 60000)
  return isValidAppointmentSlotMinutes(m) ? m : 30
}
