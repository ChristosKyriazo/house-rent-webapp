import { test, expect } from '@playwright/test'

test.describe('Owner role', () => {
  test('is authenticated and sees the app', async ({ page }) => {
    await page.goto('/')
    // Should not be redirected to login
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('can access My Listings page', async ({ page }) => {
    await page.goto('/homes/my-listings')
    await expect(page).not.toHaveURL(/\/login/)
    // Should see listing management UI — not an error
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
    await expect(page.locator('body')).toBeVisible()
  })

  test('can access the Create Listing form', async ({ page }) => {
    await page.goto('/homes/new')
    await expect(page).not.toHaveURL(/\/login/)
    // Form should be present
    await expect(page.locator('form')).toBeVisible({ timeout: 8_000 })
    // Title input should exist
    await expect(page.locator('input[type="text"]').first()).toBeVisible()
  })

  test('can create a listing end-to-end', async ({ page }) => {
    await page.goto('/homes/new')
    await page.locator('form').waitFor({ state: 'visible', timeout: 8_000 })

    // Required fields
    await page.locator('input[type="text"]').nth(0).fill('E2E Test Listing — Owner')
    // City is the second required text input (after title)
    await page.locator('input[type="text"]').nth(1).fill('Athens')
    // Country is the third required text input
    await page.locator('input[type="text"]').nth(2).fill('Greece')
    // Price (first number input, placeholder 900)
    await page.locator('input[type="number"]').nth(0).fill('750')
    // Size (second number input)
    await page.locator('input[type="number"]').nth(1).fill('65')

    await page.locator('button[type="submit"]').click()

    // Should redirect to the new listing page or my-listings after creation
    await page.waitForURL(/\/homes\/\d+|\/homes\/my-listings/, { timeout: 15_000 })
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('can access listing analytics page', async ({ page }) => {
    await page.goto('/homes/analytics')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('can access the dashboard', async ({ page }) => {
    await page.goto('/homes/dashboard')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('can access profile page', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).toBeVisible()
  })
})
