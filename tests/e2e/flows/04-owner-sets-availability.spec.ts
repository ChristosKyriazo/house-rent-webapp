import { test, expect } from '@playwright/test'
import path from 'path'
import { readState } from './helpers/state'

test.use({ storageState: path.join(__dirname, '../.auth/owner.json') })

test('04 — owner sets viewing availability', async ({ page }) => {
  const { listingKey } = readState()
  expect(listingKey, 'listingKey missing — run steps 01–03 first').toBeTruthy()

  await page.goto(`/homes/${listingKey}/set-availability`)
  await page.waitForLoadState('networkidle')

  // Add a slot — tomorrow's date
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateStr = tomorrow.toISOString().split('T')[0] // YYYY-MM-DD

  // Click "Add Availability Slot"
  const addSlotBtn = page.getByRole('button', { name: /Add Availability Slot|Προσθήκη Διαστήματος/i })
  await expect(addSlotBtn).toBeVisible({ timeout: 8_000 })
  await addSlotBtn.click()

  // Fill date
  const dateInput = page.locator('input[type="date"]').last()
  await dateInput.fill(dateStr)

  // Fill start time (10:00)
  const timeInputs = page.locator('input[type="time"]')
  await timeInputs.nth(0).fill('10:00')

  // Fill end time (11:00)
  await timeInputs.nth(1).fill('11:00')

  // Save
  const saveBtn = page.getByRole('button', { name: /Save Availability|Αποθήκευση Διαθεσιμότητας/i })
  await expect(saveBtn).toBeVisible({ timeout: 5_000 })
  await saveBtn.click()

  await page.waitForTimeout(2_000)
  await expect(page.getByText(/something went wrong/i)).not.toBeVisible()

  // Success toast or confirmation
  await expect(
    page.getByText(/saved|αποθηκεύτηκε|success|επιτυχία/i).first()
  ).toBeVisible({ timeout: 8_000 })

  console.log(`  ✓ Availability slot set for ${dateStr} 10:00–11:00`)
})
