// Feature flags — controlled via environment variables.
// Set to "false" (exact string) to disable; any other value (including absent) means enabled.
// Example: FEATURE_AI_SEARCH=false disables AI search without a deploy.

function isEnabled(envVar: string | undefined): boolean {
  return envVar !== 'false'
}

export const features = {
  aiSearch: isEnabled(process.env.FEATURE_AI_SEARCH),
  bookings: isEnabled(process.env.FEATURE_BOOKINGS),
} as const
