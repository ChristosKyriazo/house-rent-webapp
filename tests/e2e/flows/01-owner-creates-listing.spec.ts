import { test, expect } from '@playwright/test'
import path from 'path'
import { clearState, writeState } from './helpers/state'

test.use({ storageState: path.join(__dirname, '../.auth/owner.json') })

test('01 — owner creates a listing', async ({ page }) => {
  clearState()

  const title = `E2E Test Listing ${Date.now()}`

  await page.goto('/homes/new')
  await page.locator('form').waitFor({ state: 'visible', timeout: 10_000 })

  // Title
  await page.getByPlaceholder(/Cozy 2-bedroom|Ζεστό/i).fill(title)

  // City — type and confirm (may have autocomplete dropdown)
  await page.getByPlaceholder(/^Athens$|^Αθήνα$/i).fill('Athens')
  await page.keyboard.press('Escape') // dismiss any dropdown

  // Country
  await page.getByPlaceholder(/^Greece$|^Ελλάδα$/i).fill('Greece')
  await page.keyboard.press('Escape')

  // Price (€/month) — first number input
  await page.locator('input[type="number"]').nth(0).fill('750')

  // Size (m²) — second number input
  await page.locator('input[type="number"]').nth(1).fill('65')

  await page.locator('button[type="submit"]').click()

  // Redirect → /homes/{key}?from=my-listings
  await page.waitForURL(/\/homes\/[^/]+(\?|$)/, { timeout: 20_000 })

  const url = new URL(page.url())
  const listingKey = url.pathname.replace('/homes/', '')
  expect(listingKey).toBeTruthy()

  writeState({ listingKey, listingTitle: title })
  console.log(`  ✓ Listing created: key=${listingKey}`)
})
