/** Allowed viewing slot lengths (minutes), must match owner set-availability options. */
export const APPOINTMENT_SLOT_MINUTES = [15, 30, 45, 60] as const

export function isValidAppointmentSlotMinutes(n: number): boolean {
  return APPOINTMENT_SLOT_MINUTES.includes(n as (typeof APPOINTMENT_SLOT_MINUTES)[number])
}

/** Owner-provided contact + notes stored on Inquiry.contactInfo (JSON). */
export interface ParsedOwnerContactInfo {
  name?: string
  email?: string
  phone?: string
  appointmentThresholdMinutes?: number
  /** Free text shown to the renter before the viewing */
  ownerNotesBeforeAppointment?: string
}

/**
 * Parses inquiry.contactInfo (DB JSON string or object) for display on the book slot page.
 */
export function parseContactInfo(contactInfo: unknown): ParsedOwnerContactInfo | null {
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

  const out: ParsedOwnerContactInfo = {}
  if (typeof parsed.name === 'string' && parsed.name.trim()) out.name = parsed.name.trim()
  if (typeof parsed.email === 'string' && parsed.email.trim()) out.email = parsed.email.trim()
  if (typeof parsed.phone === 'string' && parsed.phone.trim()) out.phone = parsed.phone.trim()
  const n = Number(parsed.appointmentThresholdMinutes)
  if (isValidAppointmentSlotMinutes(n)) out.appointmentThresholdMinutes = n
  if (
    typeof parsed.ownerNotesBeforeAppointment === 'string' &&
    parsed.ownerNotesBeforeAppointment.trim().length > 0
  ) {
    out.ownerNotesBeforeAppointment = parsed.ownerNotesBeforeAppointment.trim()
  }

  return Object.keys(out).length > 0 ? out : null
}

/**
 * Reads appointmentThresholdMinutes from inquiry.contactInfo (DB JSON string or parsed object).
 */
export function parseAppointmentThresholdMinutes(contactInfo: unknown): number | null {
  const parsed = parseContactInfo(contactInfo)
  if (parsed?.appointmentThresholdMinutes != null) return parsed.appointmentThresholdMinutes
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
