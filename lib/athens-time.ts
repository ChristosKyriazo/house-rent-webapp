/**
 * Calendar maths in Athens time. The server runs in UTC, so "tomorrow" and "18:00" computed
 * with plain Date methods were 2–3 hours off for Greek users (and times in reminders showed
 * in UTC).
 */
export const ATHENS_TZ = 'Europe/Athens'

/** YYYY-MM-DD of `d` in Athens. */
export function athensDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ATHENS_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

/** Hour 0–23 of `d` in Athens. */
export function athensHour(d: Date): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: ATHENS_TZ, hour: '2-digit', hourCycle: 'h23' }).format(d))
}

/** Athens UTC offset in minutes at instant `d` (120 in winter, 180 in summer). */
function athensOffsetMinutes(d: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ATHENS_TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(d)
  const get = (t: string) => Number(parts.find(p => p.type === t)!.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return Math.round((asUtc - d.getTime()) / 60000)
}

/** The UTC instants that bound the Athens calendar day containing `d`: [start, end). */
export function athensDayRange(d: Date): { start: Date; end: Date } {
  const [y, m, day] = athensDate(d).split('-').map(Number)
  const midnightGuess = new Date(Date.UTC(y, m - 1, day))
  const start = new Date(midnightGuess.getTime() - athensOffsetMinutes(midnightGuess) * 60000)
  const nextGuess = new Date(Date.UTC(y, m - 1, day + 1))
  const end = new Date(nextGuess.getTime() - athensOffsetMinutes(nextGuess) * 60000)
  return { start, end }
}
