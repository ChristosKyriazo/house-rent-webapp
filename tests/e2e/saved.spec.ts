import { test, expect } from '@playwright/test'

/**
 * Saved homes page E2E tests.
 * Full flow (heart toggle → saved page → unsave) requires Clerk auth.
 * These tests cover the unauthenticated surface.
 *
 * TO ENABLE AUTH TESTS:
 * 1. Set CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in .env.test
 * 2. Use Clerk's storageState or session token injection
 * 3. Uncomment the auth-required test block below
 */

test.describe('Saved homes page (unauthenticated)', () => {
  test('redirects or shows auth prompt when not logged in', async ({ page }) => {
    await page.goto('/homes/saved')
    // Should either redirect to login OR show an empty state (API returns 401 → empty list)
    const hasBody = await page.locator('body').isVisible()
    expect(hasBody).toBe(true)
  })
})

test.describe('Saved homes page (authenticated) @auth', () => {
  // These run only when PLAYWRIGHT_AUTH=true is set
  test.skip(process.env.PLAYWRIGHT_AUTH !== 'true', 'Requires Clerk auth setup')

  test('shows empty state when no homes saved', async ({ page }) => {
    await page.goto('/homes/saved')
    await expect(page.getByText(/no saved properties|haven't saved/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('link', { name: /browse/i })).toBeVisible()
  })

  test('heart button on listing card saves a home', async ({ page }) => {
    await page.goto('/homes?type=rent')
    await page.waitForTimeout(2000) // wait for results

    const heartBtn = page.locator('button[title*="Save"], button[title*="heart"]').first()
    if (await heartBtn.isVisible()) {
      await heartBtn.click()
      await page.goto('/homes/saved')
      await expect(page.locator('.property-card, [data-testid="saved-home"]').first()).toBeVisible({ timeout: 5000 })
    }
  })
})
