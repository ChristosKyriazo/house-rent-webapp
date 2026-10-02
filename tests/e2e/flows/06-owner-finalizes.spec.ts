import { test, expect } from '@playwright/test'
import path from 'path'
import { readState } from './helpers/state'

// Renter accepts the finalization offer on the listing detail page
test.use({ storageState: path.join(__dirname, '../.auth/renter.json') })

test('06 — renter accepts the finalization offer', async ({ page }) => {
  const { listingKey } = readState()
  expect(listingKey, 'listingKey missing — run steps 01–05 first').toBeTruthy()

  // "Approve Finalization" button appears on the listing page when the renter has
  // a pending 'finalize' notification (sent by the owner in step 05)
  await page.goto(`/homes/${listingKey}`)
  await page.waitForLoadState('networkidle')

  const approveBtn = page.getByRole('button', {
    name: /Approve Finalization|Επιβεβαίωση Οριστικοποίησης/i,
  })
  await expect(approveBtn).toBeVisible({ timeout: 15_000 })
  await approveBtn.click()

  // Toast: "Deal finalized! Redirecting..." before redirect to /homes/approved
  await expect(
    page.getByText(/Deal finalized|Η συμφωνία ολοκληρώθηκε/i).first()
  ).toBeVisible({ timeout: 10_000 })

  console.log('  ✓ Renter accepted finalization — deal complete')
})
