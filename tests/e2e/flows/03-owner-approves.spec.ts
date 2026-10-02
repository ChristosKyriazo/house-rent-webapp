import { test, expect } from '@playwright/test'
import path from 'path'
import { readState, writeState } from './helpers/state'

test.use({ storageState: path.join(__dirname, '../.auth/owner.json') })

test('03 — owner approves inquiry and sets viewing slots', async ({ page }) => {
  const { listingKey, listingTitle } = readState()
  expect(listingKey, 'listingKey missing — run steps 01–02 first').toBeTruthy()

  await page.goto(`/homes/inquiries/${listingKey}`)
  await page.waitForLoadState('networkidle')

  // "Approve"/"Έγκριση" does NOT directly approve — it navigates to set-availability?inquiryId=…
  const approveBtn = page.getByRole('button', { name: /^Approve$|^Έγκριση$/i }).first()
  await expect(approveBtn).toBeVisible({ timeout: 10_000 })
  await approveBtn.click()

  // Wait for redirect to set-availability page
  await page.waitForURL(/\/set-availability/, { timeout: 15_000 })
  await page.waitForLoadState('networkidle')

  // Fill tomorrow's date — time inputs already default to 09:00 / 17:00
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateStr = tomorrow.toISOString().split('T')[0]

  const dateInput = page.locator('input[type="date"]').first()
  await dateInput.fill(dateStr)

  // Click "Προσθήκη" / "Add" to stage the slot
  const addBtn = page.getByRole('button', { name: /^Add$|^Προσθήκη$/i })
  await addBtn.click()

  // Slot should appear in the list
  await expect(page.getByText('09:00')).toBeVisible({ timeout: 5_000 })

  // "Save Availability" simultaneously approves the inquiry AND persists slots
  const saveBtn = page.getByRole('button', { name: /Save Availability|Αποθήκευση Διαθεσιμότητας/i })
  await expect(saveBtn).toBeVisible({ timeout: 5_000 })
  await saveBtn.click()

  // App redirects to inquiries page after a 1200 ms delay
  await page.waitForURL(/\/homes\/inquiries\//, { timeout: 20_000 })
  await page.waitForLoadState('networkidle')

  // Inquiry card should now show the "Approved"/"Εγκεκριμένο" badge
  await expect(
    page.getByText(/Εγκεκριμένο|Approved/i).first()
  ).toBeVisible({ timeout: 10_000 })

  // The finalization service requires a scheduledBooking.endTime in the past.
  // We create one here (lowest DB ID, so findFirst returns it) before test 04
  // creates the UI future booking. This allows finalization to proceed in test 05.
  const bookingSetup = await page.evaluate(async (key: string) => {
    const [homeRes, inquiriesRes] = await Promise.all([
      fetch(`/api/homes/${key}`),
      fetch(`/api/inquiries/${key}`),
    ])
    if (!homeRes.ok || !inquiriesRes.ok) {
      return { ok: false, error: 'fetch failed' }
    }
    const { home } = await homeRes.json()
    const { inquiries } = await inquiriesRes.json()
    const approvedInq = (inquiries as Array<{ id: number; approved: boolean }>)
      .find(i => i.approved)
    if (!approvedInq) return { ok: false, error: 'no approved inquiry' }

    // Create a past booking using the inquiry ID as an epoch-millisecond offset.
    // Each inquiry has a unique auto-incremented ID so these times (in 1970) never
    // overlap between test runs, and they're always in the past (endTime < now).
    const epochMs = approvedInq.id * 3600 * 1000 // 1 hour per inquiry ID
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerId: home.owner.id,
        inquiryId: approvedInq.id,
        title: 'E2E Past Meeting',
        startTime: new Date(epochMs).toISOString(),
        endTime:   new Date(epochMs + 3600 * 1000).toISOString(),
        location: 'Property',
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, error: JSON.stringify(err) }
    }
    const data = await res.json()
    return { ok: true, inquiryId: approvedInq.id, bookingId: data.booking?.id }
  }, listingKey!)

  expect(bookingSetup.ok, `Past booking setup failed: ${bookingSetup.error}`).toBeTruthy()

  writeState({ listingKey, listingTitle, inquiryId: bookingSetup.inquiryId })
  console.log(`  ✓ Inquiry approved, slot set: ${dateStr}, past booking: id=${bookingSetup.bookingId}`)
})
