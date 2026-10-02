import { test, expect } from '@playwright/test'
import path from 'path'
import { readState } from './helpers/state'

// Owner confirms the tenant by sending a finalization offer
test.use({ storageState: path.join(__dirname, '../.auth/owner.json') })

test('05 — owner sends finalization offer to renter', async ({ page }) => {
  const { listingKey } = readState()
  expect(listingKey, 'listingKey missing — run steps 01–04 first').toBeTruthy()

  await page.goto(`/homes/inquiries/${listingKey}`)
  await page.waitForLoadState('networkidle')

  // "Confirm tenant" button appears when the inquiry is approved (done in step 03)
  const confirmTenantBtn = page.getByRole('button', {
    name: /Confirm tenant|Επιβεβαίωση ενοικιαστή/i,
  }).first()
  await expect(confirmTenantBtn).toBeVisible({ timeout: 10_000 })
  await confirmTenantBtn.click()

  // Modal: "Confirm this tenant" / "Επιβεβαίωση αυτού του ενοικιαστή"
  await expect(
    page.getByText(/Confirm this tenant|Επιβεβαίωση αυτού του ενοικιαστή/i)
  ).toBeVisible({ timeout: 5_000 })

  // Fill required move-in date (one month from now)
  const moveIn = new Date()
  moveIn.setMonth(moveIn.getMonth() + 1)
  await page.locator('#move-in-date').fill(moveIn.toISOString().split('T')[0])

  // Send the finalization offer to the renter
  const sendBtn = page.getByRole('button', {
    name: /Send to tenant|Αποστολή στον ενοικιαστή/i,
  })
  await expect(sendBtn).toBeVisible({ timeout: 5_000 })
  await sendBtn.click()

  // Notification: "Finalization request sent to tenant."
  await expect(
    page.getByText(/Finalization request sent|Αίτημα οριστικοποίησης εστάλη/i).first()
  ).toBeVisible({ timeout: 10_000 })

  console.log(`  ✓ Finalization offer sent to renter (move-in: ${moveIn.toISOString().split('T')[0]})`)
})
