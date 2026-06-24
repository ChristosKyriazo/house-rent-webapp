import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/owner.json') })

test('owner deletes an E2E test listing', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const myListings = await page.evaluate(async () => {
    const resp = await fetch('/api/homes/my-listings')
    if (!resp.ok) return [] as Array<{ id: string; key: string; title: string }>
    const data = await resp.json()
    return (data.homes ?? []) as Array<{ id: string; key: string; title: string }>
  })

  const target = myListings.find(l => l.title?.startsWith('E2E Test Listing'))

  if (!target) {
    test.skip(true, 'No E2E test listing found — run owner-creates-listing first')
    return
  }

  // Show the listing in my-listings before deleting
  await page.goto('/homes/my-listings')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(target.title)).toBeVisible({ timeout: 8_000 })

  const deleteResult = await page.evaluate(async (id) => {
    const resp = await fetch(`/api/homes/${id}`, { method: 'DELETE' })
    const body = await resp.json().catch(() => ({}))
    return { ok: resp.ok, status: resp.status, body }
  }, target.id)

  expect(deleteResult.ok, `Delete failed (${deleteResult.status}): ${JSON.stringify(deleteResult.body)}`).toBeTruthy()

  // Reload and confirm it is gone
  await page.goto('/homes/my-listings')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(target.title)).not.toBeVisible({ timeout: 8_000 })

  console.log(`  ✓ Owner deleted listing "${target.title}" (id=${target.id})`)
})
