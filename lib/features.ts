// Feature flags — controlled via environment variables.
// Set to "false" (exact string) to disable; any other value (including absent) means enabled.
// Example: FEATURE_AI_SEARCH=false disables AI search without a deploy.

function isEnabled(envVar: string | undefined): boolean {
  return envVar !== 'false'
}

/** Opt-in flags — absent means disabled. Use for anything not yet safe to expose. */
function isOptedIn(envVar: string | undefined): boolean {
  return envVar === 'true'
}

export const features = {
  aiSearch: isEnabled(process.env.FEATURE_AI_SEARCH),
  bookings: isEnabled(process.env.FEATURE_BOOKINGS),
  usageAssistant: isEnabled(process.env.FEATURE_USAGE_ASSISTANT),
  // Opt-in, not opt-out: there is no Viber/SMS delivery pipeline behind this yet.
  // See app/api/subscription/viber-alerts/route.ts for what has to exist first.
  viberAlerts: isOptedIn(process.env.FEATURE_VIBER_ALERTS),
} as const

/**
 * Client-visible mirror. `NEXT_PUBLIC_*` is inlined at build time, so this must be read as a
 * whole property access — destructuring `process.env` in a client component does not work.
 */
export const clientFeatures = {
  viberAlerts: process.env.NEXT_PUBLIC_FEATURE_VIBER_ALERTS === 'true',
} as const
