import { test, expect } from '@playwright/test'
import path from 'path'
import { clearState, writeState } from './helpers/state'

test.use({ storageState: path.join(__dirname, '../.auth/owner.json') })

test('01 — owner creates a listing', async ({ page }) => {
  clearState()

  // Navigate first so the browser has an active Clerk session
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Delete stale E2E listings from previous runs to avoid hitting the free-tier listing limit
  const staleListings = await page.evaluate(async () => {
    const resp = await fetch('/api/homes/my-listings')
    if (!resp.ok) return []
    const { homes } = await resp.json()
    return (homes ?? []).filter((h: { title: string }) => h.title?.startsWith('E2E Test Listing'))
  })

  for (const listing of staleListings as Array<{ key: string; title: string }>) {
    await page.evaluate(async (key) => {
      await fetch(`/api/homes/${key}`, { method: 'DELETE' })
    }, listing.key)
    console.log(`  🗑 Deleted stale listing: ${listing.title}`)
  }

  const title = `E2E Test Listing ${Date.now()}`

  // Create listing via API through the browser (so Clerk auth cookies are included)
  const result = await page.evaluate(async (data) => {
    const resp = await fetch('/api/homes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const body = await resp.json().catch(() => ({}))
    return { ok: resp.ok, status: resp.status, body }
  }, {
    title,
    city: 'Athens',
    country: 'Greece',
    pricePerMonth: '750',
    sizeSqMeters: '65',
    listingType: 'rent',
    bedrooms: '1',
    bathrooms: '1',
  })

  expect(result.ok, `Create listing API failed (${result.status}): ${JSON.stringify(result.body)}`).toBeTruthy()

  const listingKey = result.body.home?.key
  expect(listingKey, 'API did not return a listing key').toBeTruthy()
  expect(listingKey).not.toBe('new')

  // Confirm the listing page is publicly visible
  await page.goto(`/homes/${listingKey}`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 })

  writeState({ listingKey, listingTitle: title })
  console.log(`  ✓ Listing created: key=${listingKey}`)
})
