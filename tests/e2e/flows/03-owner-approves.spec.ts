import { test, expect } from '@playwright/test'
import path from 'path'
import { readState } from './helpers/state'

test.use({ storageState: path.join(__dirname, '../.auth/owner.json') })

test('03 — owner sees inquiry and approves it', async ({ page }) => {
  const { listingKey } = readState()
  expect(listingKey, 'listingKey missing — run steps 01–02 first').toBeTruthy()

  await page.goto(`/homes/inquiries/${listingKey}`)
  await page.waitForLoadState('networkidle')

  // Should see at least one pending inquiry
  const approveBtn = page.getByRole('button', { name: /^Approve$|^Έγκριση$/i }).first()
  await expect(approveBtn).toBeVisible({ timeout: 10_000 })
  await approveBtn.click()

  // After approval the button should disappear or show "Approved" status
  await page.waitForTimeout(2_000)
  await expect(page.getByText(/something went wrong/i)).not.toBeVisible()

  // Verify approved badge appears
  await expect(
    page.getByText(/approved|εγκεκριμένο/i).first()
  ).toBeVisible({ timeout: 8_000 })

  console.log(`  ✓ Inquiry approved for listing ${listingKey}`)
})
