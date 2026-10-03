/**
 * A tab opened before a deploy still references the previous build's JavaScript chunks.
 * They no longer exist after the deploy, so the next client-side navigation fails to load
 * them and lands on an error screen — a "crash" that a refresh fixes. Detect that case so
 * error boundaries can reload once instead of showing an error.
 */
const RELOAD_FLAG = 'kaparro:reloaded-for-new-build'

export function isStaleBuildError(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | null
  const text = `${e?.name ?? ''} ${e?.message ?? ''}`
  return /ChunkLoadError|Loading (CSS )?chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(text)
}

/** Reload once per tab session; returns true when a reload was started. */
export function reloadOnceForNewBuild(): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return false
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()))
  } catch {
    // No sessionStorage (private mode): still reload — the error screen is the worse outcome.
  }
  window.location.reload()
  return true
}
