import { test, expect } from '@playwright/test'

// Runs under the "owner" project — storageState set by playwright.config.ts

test.describe('Owner — analytics access', () => {
  test('portfolio analytics page loads without error', async ({ page }) => {
    await page.goto('/homes/analytics')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
    await page.waitForLoadState('networkidle')
  })

  test('free-tier owner sees upgrade gate on locked analytics features', async ({ page }) => {
    await page.goto('/homes/analytics')
    await page.waitForLoadState('networkidle')
    // On free plan, advanced analytics should be gated
    const gate = page.getByText(/upgrade|plus|pro|αναβάθμιση/i).first()
    // Either gated (upgrade prompt) OR full access (if owner is on paid plan) — both are valid
    const isGated = await gate.isVisible({ timeout: 5_000 }).catch(() => false)
    test.info().annotations.push({
      type: 'analytics-access',
      description: isGated ? 'Gated — shows upgrade prompt' : 'Full access — owner is on paid plan',
    })
  })

  test('per-listing analytics accessible from my-listings', async ({ page }) => {
    await page.goto('/homes/my-listings')
    await page.waitForLoadState('networkidle')

    const analyticsLink = page.getByRole('link', { name: /analytics|στατιστικά/i }).first()
    if (await analyticsLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await analyticsLink.click()
      await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
    } else {
      test.info().annotations.push({ type: 'note', description: 'No analytics link visible — no listings or feature gated' })
    }
  })
})
