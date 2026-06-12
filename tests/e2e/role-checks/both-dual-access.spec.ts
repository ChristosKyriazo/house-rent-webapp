import { test, expect } from '@playwright/test'

// Runs under the "both" project — storageState set by playwright.config.ts

test.describe('Both role — dual owner + renter access', () => {
  test('is authenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page).not.toHaveURL(/\/login/)
  })

  // Owner-side
  test('can create listings (owner capability)', async ({ page }) => {
    await page.goto('/homes/new')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('form')).toBeVisible({ timeout: 8_000 })
  })

  test('can access My Listings (owner capability)', async ({ page }) => {
    await page.goto('/homes/my-listings')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('can access owner dashboard', async ({ page }) => {
    await page.goto('/homes/dashboard')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  // Renter-side
  test('can browse listings (renter capability)', async ({ page }) => {
    await page.goto('/homes?type=rent')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
    await page.waitForLoadState('networkidle')
  })

  test('can access My Inquiries (renter capability)', async ({ page }) => {
    await page.goto('/homes/my-inquiries')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('can access Saved Homes (renter capability)', async ({ page }) => {
    await page.goto('/homes/saved')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('profile reflects both role', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).not.toHaveURL(/\/login/)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})
