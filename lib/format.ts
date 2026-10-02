/**
 * Locale-aware date/time formatting.
 *
 * Before this module the ternary `language === 'el' ? 'el-GR' : 'en-US'` was written
 * inline at 32 call sites, two of which used `en-GB` instead — so the same kind of
 * value rendered as both 03/04 and 04/03 depending on the screen. The locale now
 * lives in one place.
 *
 * Usable from both server and client code (no React, no 'use client').
 */

import type { Language } from '@/lib/translations'

/**
 * English dates use en-GB (day/month) to match el-GR, so a date never flips meaning
 * when the user toggles language. Change this one constant to move the whole app.
 */
const EN_LOCALE = 'en-GB'
const EL_LOCALE = 'el-GR'

export function localeFor(language: Language): string {
  return language === 'el' ? EL_LOCALE : EN_LOCALE
}

type DateInput = Date | string | number

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value)
}

/** 14:30 */
export function formatTime(value: DateInput, language: Language): string {
  return toDate(value).toLocaleTimeString(localeFor(language), {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 4 Mar */
export function formatDateShort(value: DateInput, language: Language): string {
  return toDate(value).toLocaleDateString(localeFor(language), {
    month: 'short',
    day: 'numeric',
  })
}

/** 4 March 2026 */
export function formatDateLong(value: DateInput, language: Language): string {
  return toDate(value).toLocaleDateString(localeFor(language), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Wednesday, 4 March 2026 */
export function formatDateFull(value: DateInput, language: Language): string {
  return toDate(value).toLocaleDateString(localeFor(language), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Wednesday, 4 March 2026 at 14:30 */
export function formatDateTimeFull(value: DateInput, language: Language): string {
  const date = toDate(value)
  return `${formatDateFull(date, language)} ${formatTime(date, language)}`
}
