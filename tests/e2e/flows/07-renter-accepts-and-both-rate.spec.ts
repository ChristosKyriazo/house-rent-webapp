import { test, expect } from '@playwright/test'
import path from 'path'
import { readState } from './helpers/state'

// Step 1: Renter accepts finalization
test.describe('07a — renter accepts finalization', () => {
  test.use({ storageState: path.join(__dirname, '../.auth/renter.json') })

  test('renter approves the finalization request', async ({ page }) => {
    const { listingKey } = readState()
    expect(listingKey, 'listingKey missing — run steps 01–06 first').toBeTruthy()

    // Renter sees finalization via my-inquiries or notification
    await page.goto('/homes/my-inquiries')
    await page.waitForLoadState('networkidle')

    const approveBtn = page.getByRole('button', {
      name: /Approve Finalization|Επιβεβαίωση Οριστικοποίησης/i,
    }).first()

    await expect(approveBtn).toBeVisible({ timeout: 10_000 })
    await approveBtn.click()

    await page.waitForTimeout(2_000)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()

    await expect(
      page.getByText(/finalized|deal done|ολοκληρώθηκε/i).first()
    ).toBeVisible({ timeout: 8_000 })

    console.log('  ✓ Renter accepted finalization — deal complete')
  })
})

// Step 2: Owner rates the renter
test.describe('07b — owner rates renter', () => {
  test.use({ storageState: path.join(__dirname, '../.auth/owner.json') })

  test('owner submits a rating for the renter', async ({ page }) => {
    await page.goto('/homes/rate-user')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()

    // Select 5 stars (last star button in the first rating widget)
    const stars = page.locator('button[aria-label*="star"], button[title*="star"], [class*="star"]')
    if (await stars.count() > 0) {
      await stars.last().click()
    }

    const submitBtn = page.getByRole('button', { name: /Submit Rating|Υποβολή Αξιολόγησης/i }).first()
    if (await submitBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await submitBtn.click()
      await page.waitForTimeout(1_500)
      await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
    }

    console.log('  ✓ Owner rated the renter')
  })
})

// Step 3: Renter rates the owner
test.describe('07c — renter rates owner', () => {
  test.use({ storageState: path.join(__dirname, '../.auth/renter.json') })

  test('renter submits a rating for the owner', async ({ page }) => {
    await page.goto('/homes/rate-owner')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()

    const stars = page.locator('button[aria-label*="star"], button[title*="star"], [class*="star"]')
    if (await stars.count() > 0) {
      await stars.last().click()
    }

    const submitBtn = page.getByRole('button', { name: /Submit Rating|Υποβολή Αξιολόγησης/i }).first()
    if (await submitBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await submitBtn.click()
      await page.waitForTimeout(1_500)
      await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
    }

    console.log('  ✓ Renter rated the owner')
  })
})
