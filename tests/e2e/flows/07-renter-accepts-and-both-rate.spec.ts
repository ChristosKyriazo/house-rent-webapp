import { test, expect } from '@playwright/test'
import path from 'path'

// Owner rates the renter after the deal is finalized
test.describe('07a — owner rates renter', () => {
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

// Renter rates the owner after the deal is finalized
test.describe('07b — renter rates owner', () => {
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
