import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/broker.json') })

test('broker deletes an E2E test listing', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Find an E2E test listing owned by this broker
  const myListings = await page.evaluate(async () => {
    const resp = await fetch('/api/homes/my-listings')
    if (!resp.ok) return [] as Array<{ id: string; key: string; title: string }>
    const data = await resp.json()
    return (data.homes ?? []) as Array<{ id: string; key: string; title: string }>
  })

  const target = myListings.find(l => l.title?.startsWith('E2E Test Listing'))

  if (!target) {
    test.skip(true, 'No E2E test listing found — run broker-publishes-listing first')
    return
  }

  // Navigate to my-listings so the recording shows the list before deletion
  await page.goto('/homes/my-listings')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(target.title)).toBeVisible({ timeout: 8_000 })

  // Delete via API
  const deleteResult = await page.evaluate(async (id) => {
    const resp = await fetch(`/api/homes/${id}`, { method: 'DELETE' })
    const body = await resp.json().catch(() => ({}))
    return { ok: resp.ok, status: resp.status, body }
  }, target.id)

  expect(deleteResult.ok, `Delete failed (${deleteResult.status}): ${JSON.stringify(deleteResult.body)}`).toBeTruthy()

  // Reload and confirm the listing is gone
  await page.goto('/homes/my-listings')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(target.title)).not.toBeVisible({ timeout: 8_000 })

  console.log(`  ✓ Deleted listing "${target.title}" (id=${target.id})`)
})
