import { test, expect } from '@playwright/test'

/**
 * Owner dashboard E2E tests.
 * Full flow requires Clerk auth with an owner/broker role.
 */

test.describe('Owner dashboard (unauthenticated)', () => {
  test('redirects or shows fallback when not logged in', async ({ page }) => {
    await page.goto('/homes/dashboard')
    await expect(page.locator('body')).toBeVisible()
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})

test.describe('Owner dashboard (authenticated owner) @auth', () => {
  test.skip(process.env.PLAYWRIGHT_AUTH !== 'true', 'Requires Clerk auth setup')

  test('shows stat cards with active listings and inquiries', async ({ page }) => {
    await page.goto('/homes/dashboard')
    await expect(page.getByText(/active listings/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/pending inquiries|upcoming viewings/i)).toBeVisible({ timeout: 5000 })
  })

  test('quick action links are present', async ({ page }) => {
    await page.goto('/homes/dashboard')
    await expect(page.getByRole('link', { name: /new listing|νέα αγγελία/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('link', { name: /my listings|αγγελίες μου/i })).toBeVisible({ timeout: 5000 })
  })
})
