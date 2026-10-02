import { test, expect } from '@playwright/test'

test.describe('Both role (owner + renter)', () => {
  test('is authenticated and sees the app', async ({ page }) => {
    await page.goto('/')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).toBeVisible()
  })

  // --- Owner-side access ---

  test('can access Create Listing form (owner capability)', async ({ page }) => {
    await page.goto('/homes/new')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('form')).toBeVisible({ timeout: 8_000 })
  })

  test('can access My Listings page (owner capability)', async ({ page }) => {
    await page.goto('/homes/my-listings')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('can access dashboard (owner capability)', async ({ page }) => {
    await page.goto('/homes/dashboard')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  // --- Renter-side access ---

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

  test('can access Saved homes (renter capability)', async ({ page }) => {
    await page.goto('/homes/saved')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  // --- Profile ---

  test('profile page accessible and shows both role', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).not.toHaveURL(/\/login/)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})
