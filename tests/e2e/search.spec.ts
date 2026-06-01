import { test, expect } from '@playwright/test'

test.describe('Search page', () => {
  test('shows rent and buy options', async ({ page }) => {
    await page.goto('/homes/search')
    await expect(page.getByRole('button', { name: /rent/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /buy/i })).toBeVisible()
  })

  test('rent button navigates to /homes with type=rent', async ({ page }) => {
    await page.goto('/homes/search')
    await page.getByRole('button', { name: /rent/i }).first().click()
    await expect(page).toHaveURL(/\/homes.*type=rent/)
  })

  test('buy button navigates to /homes with type=buy', async ({ page }) => {
    await page.goto('/homes/search')
    await page.getByRole('button', { name: /buy/i }).first().click()
    await expect(page).toHaveURL(/\/homes.*type=buy/)
  })
})

test.describe('Homes listing page', () => {
  test('renders without crashing', async ({ page }) => {
    await page.goto('/homes?type=rent')
    await expect(page.locator('body')).toBeVisible()
    // Should not show an error boundary
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('shows manual filter option after choosing rent', async ({ page }) => {
    await page.goto('/homes?type=rent')
    // Manual filter or AI search toggle should be visible
    await expect(
      page.getByRole('button', { name: /manual|filter|search/i }).first()
    ).toBeVisible({ timeout: 5000 })
  })
})
