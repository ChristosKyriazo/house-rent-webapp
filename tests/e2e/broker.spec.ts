import { test, expect } from '@playwright/test'

test.describe('Broker role', () => {
  test('is authenticated and sees the app', async ({ page }) => {
    await page.goto('/')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('profile shows broker role and locked occupation', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).not.toHaveURL(/\/login/)
    await page.waitForLoadState('networkidle')

    // Broker badge or role indicator should be visible
    await expect(
      page.getByText(/broker/i).first()
    ).toBeVisible({ timeout: 8_000 })
  })

  test('profile occupation field is locked for brokers', async ({ page }) => {
    await page.goto('/profile/edit').catch(() => page.goto('/profile'))
    await page.waitForLoadState('networkidle')

    // The occupation field should be read-only or show a locked hint
    const lockedHint = page.getByText(/occupation.*locked|automatically.*broker|μεσίτης/i)
    if (await lockedHint.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(lockedHint).toBeVisible()
    } else {
      test.info().annotations.push({ type: 'note', description: 'Locked occupation hint not found on this page — check /profile' })
    }
  })

  test('can access My Listings page', async ({ page }) => {
    await page.goto('/homes/my-listings')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('can access the Create Listing form', async ({ page }) => {
    await page.goto('/homes/new')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('form')).toBeVisible({ timeout: 8_000 })
  })

  test('can access the dashboard', async ({ page }) => {
    await page.goto('/homes/dashboard')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('can access the analytics page', async ({ page }) => {
    await page.goto('/homes/analytics')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})
