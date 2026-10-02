import { test, expect } from '@playwright/test'
import path from 'path'
import { readState } from './helpers/state'

// Renter books a slot that the owner set in step 03
test.use({ storageState: path.join(__dirname, '../.auth/renter.json') })

test('04 — renter books a viewing slot', async ({ page }) => {
  const { listingKey } = readState()
  expect(listingKey, 'listingKey missing — run steps 01–03 first').toBeTruthy()

  // Navigate first to activate the renter's Clerk session in the browser
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Cancel any stale future scheduled bookings left over from previous test runs.
  // Deleting a listing sets booking.homeId to null (SetNull) but the booking row stays
  // as 'scheduled', causing USER_CONFLICT errors on subsequent runs.
  await page.evaluate(async () => {
    const res = await fetch('/api/bookings')
    if (!res.ok) return
    const { bookings } = await res.json()
    const future = (bookings ?? []).filter(
      (b: { status: string; endTime: string }) =>
        b.status === 'scheduled' && new Date(b.endTime) > new Date()
    )
    for (const b of future as Array<{ id: number }>) {
      await fetch(`/api/bookings/${b.id}`, { method: 'DELETE' })
    }
  })

  await page.goto(`/homes/${listingKey}/book`)
  await page.waitForLoadState('networkidle')

  // Time slots are rendered as <select> dropdowns, one per availability date
  const slotSelect = page.locator('select').first()
  await expect(slotSelect).toBeVisible({ timeout: 15_000 })

  // First option is always the placeholder (""), index 1 is the first real slot
  await slotSelect.selectOption({ index: 1 })

  // After selecting a slot, the "Confirm Booking" section appears below
  const confirmBtn = page.getByRole('button', { name: /Confirm Booking|Επιβεβαίωση Κράτησης/i })
  await expect(confirmBtn).toBeVisible({ timeout: 10_000 })
  await confirmBtn.click()

  // Success toast: "Booking confirmed! You can view it in your calendar."
  await expect(
    page.getByText(/Booking confirmed|Η κράτηση επιβεβαιώθηκε/i).first()
  ).toBeVisible({ timeout: 10_000 })

  console.log('  ✓ Viewing slot booked')
})
