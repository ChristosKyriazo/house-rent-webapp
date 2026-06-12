import { test, expect } from '@playwright/test'
import path from 'path'
import { readState } from './helpers/state'

test.use({ storageState: path.join(__dirname, '../.auth/renter.json') })

test('05 — renter books a viewing slot', async ({ page }) => {
  const { listingKey } = readState()
  expect(listingKey, 'listingKey missing — run steps 01–04 first').toBeTruthy()

  await page.goto(`/homes/${listingKey}/book`)
  await page.waitForLoadState('networkidle')

  await expect(page.getByText(/something went wrong/i)).not.toBeVisible()

  // Select the first available slot
  const slotBtn = page.getByRole('button', { name: /10:00|select|choose|επιλογή/i }).first()
  if (await slotBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await slotBtn.click()
  } else {
    // Slots may be shown as clickable divs/cards
    const slot = page.locator('[class*="slot"], [class*="time"], [class*="available"]').first()
    await expect(slot).toBeVisible({ timeout: 8_000 })
    await slot.click()
  }

  // Confirm booking
  const confirmBtn = page.getByRole('button', { name: /Confirm Booking|Book Viewing|Επιβεβαίωση Κράτησης|Κράτηση/i })
  if (await confirmBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await confirmBtn.click()
  }

  await page.waitForTimeout(2_000)
  await expect(page.getByText(/something went wrong/i)).not.toBeVisible()

  // Success confirmation
  await expect(
    page.getByText(/confirmed|booked|scheduled|επιβεβαιώθηκε|κρατήθηκε/i).first()
  ).toBeVisible({ timeout: 10_000 })

  console.log(`  ✓ Viewing booked on listing ${listingKey}`)
})
