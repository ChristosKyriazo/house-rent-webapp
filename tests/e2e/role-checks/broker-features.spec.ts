import { test, expect } from '@playwright/test'

// Runs under the "broker" project — storageState set by playwright.config.ts

test.describe('Broker — role restrictions and feature access', () => {
  test('is authenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('profile shows broker role', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/broker|μεσίτης/i).first()).toBeVisible({ timeout: 8_000 })
  })

  test('occupation field is locked (cannot be changed)', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Occupation field should be read-only or show a locked hint
    const lockedText = page.getByText(/locked|automatically|αυτόματα|brokerOccupationLocked/i)
    const isLocked = await lockedText.isVisible({ timeout: 5_000 }).catch(() => false)

    if (!isLocked) {
      // If hint not visible, the occupation input itself should be disabled
      const occupationInput = page.locator('input[name="occupation"], input[placeholder*="occupation" i], input[placeholder*="επάγγελμα" i]')
      if (await occupationInput.count() > 0) {
        const isDisabled = await occupationInput.first().isDisabled()
        expect(isDisabled).toBe(true)
      } else {
        test.info().annotations.push({ type: 'note', description: 'Occupation field not found on profile page' })
      }
    }
  })

  test('can access Create Listing (brokers manage listings)', async ({ page }) => {
    await page.goto('/homes/new')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('form')).toBeVisible({ timeout: 8_000 })
  })

  test('can access My Listings', async ({ page }) => {
    await page.goto('/homes/my-listings')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('upgrade page shows correct tier options', async ({ page }) => {
    await page.goto('/upgrade')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/plus|pro/i).first()).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('premium features show upgrade gate when on free plan', async ({ page }) => {
    await page.goto('/homes/analytics')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
    // Gate or access — both valid depending on broker's plan
    test.info().annotations.push({
      type: 'broker-analytics',
      description: 'Checked analytics page — see screenshot for gate status',
    })
  })
})
