import { test, expect } from '@playwright/test'
import path from 'path'
import { readState } from './helpers/state'

test.use({ storageState: path.join(__dirname, '../.auth/renter.json') })

test('02 — renter finds listing and submits inquiry', async ({ page }) => {
  const { listingKey, listingTitle } = readState()
  expect(listingKey, 'listingKey missing — run step 01 first').toBeTruthy()

  await page.goto(`/homes/${listingKey}`)
  await page.waitForLoadState('networkidle')

  // Confirm we're on the right listing
  await expect(page.getByText(listingTitle!)).toBeVisible({ timeout: 8_000 })

  // Click the Inquire button
  const inquireBtn = page.getByRole('button', { name: /Inquire|Δήλωση Ενδιαφέροντος/i })
  await expect(inquireBtn).toBeVisible({ timeout: 8_000 })
  await inquireBtn.click()

  // After inquiry: button disappears or changes state (no error)
  await page.waitForTimeout(2_000)
  await expect(page.getByText(/something went wrong/i)).not.toBeVisible()

  // Verify inquiry was registered — button should no longer say "Inquire"
  await expect(
    page.getByRole('button', { name: /Inquire|Δήλωση Ενδιαφέροντος/i })
  ).not.toBeVisible({ timeout: 5_000 })

  console.log(`  ✓ Inquiry submitted on listing ${listingKey}`)
})
