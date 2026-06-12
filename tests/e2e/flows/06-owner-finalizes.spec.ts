import { test, expect } from '@playwright/test'
import path from 'path'
import { readState } from './helpers/state'

test.use({ storageState: path.join(__dirname, '../.auth/owner.json') })

test('06 — owner sends finalization offer to renter', async ({ page }) => {
  const { listingKey } = readState()
  expect(listingKey, 'listingKey missing — run steps 01–05 first').toBeTruthy()

  await page.goto(`/homes/inquiries/${listingKey}`)
  await page.waitForLoadState('networkidle')

  // Find the approved inquiry and click Finalize
  const finalizeBtn = page.getByRole('button', { name: /^Finalize$|^Οριστικοποίηση$/i }).first()
  await expect(finalizeBtn).toBeVisible({ timeout: 10_000 })
  await finalizeBtn.click()

  // Confirmation dialog may appear
  const confirmBtn = page.getByRole('button', { name: /Confirm|Yes|Ναι|Επιβεβαίωση/i }).first()
  if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirmBtn.click()
  }

  await page.waitForTimeout(2_000)
  await expect(page.getByText(/something went wrong/i)).not.toBeVisible()

  // Status should update to "finalization sent" or similar
  await expect(
    page.getByText(/finali|sent|στάλθηκε|αίτημα/i).first()
  ).toBeVisible({ timeout: 8_000 })

  console.log(`  ✓ Finalization offer sent for listing ${listingKey}`)
})
