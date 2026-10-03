/**
 * Every listing matching `params`, across all pages of GET /api/homes.
 *
 * The API pages at 50 by default (max 200), and the browse page, filtered search and the
 * map used to read only the first page — with 120 live listings, 70 never appeared there.
 * Capped so a runaway result set can't hang the page.
 */
const PAGE_SIZE = 200
const MAX_HOMES = 2000

export async function fetchAllHomes<T = unknown>(params?: URLSearchParams, init?: RequestInit): Promise<T[]> {
  const all: T[] = []
  for (let skip = 0; skip < MAX_HOMES; skip += PAGE_SIZE) {
    const p = new URLSearchParams(params)
    p.set('limit', String(PAGE_SIZE))
    p.set('skip', String(skip))
    const res = await fetch(`/api/homes?${p.toString()}`, init)
    if (!res.ok) throw new Error(String(res.status))
    const data = await res.json()
    all.push(...((data.homes ?? []) as T[]))
    if (!data.hasMore) break
  }
  return all
}
