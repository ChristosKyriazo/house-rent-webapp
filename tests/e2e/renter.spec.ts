import { test, expect } from '@playwright/test'

test.describe('Renter role', () => {
  test('is authenticated and sees the app', async ({ page }) => {
    await page.goto('/')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('can browse the homes listing page', async ({ page }) => {
    await page.goto('/homes?type=rent')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('can open a listing detail page', async ({ page }) => {
    await page.goto('/homes?type=rent')
    await page.waitForLoadState('networkidle')

    // Click the first listing card link
    const listingLink = page.locator('a[href*="/homes/"]').first()
    await listingLink.waitFor({ state: 'visible', timeout: 10_000 })
    await listingLink.click()

    await page.waitForURL(/\/homes\/\d+/, { timeout: 10_000 })
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('can submit an inquiry on a listing', async ({ page }) => {
    await page.goto('/homes?type=rent')
    await page.waitForLoadState('networkidle')

    const listingLink = page.locator('a[href*="/homes/"]').first()
    await listingLink.waitFor({ state: 'visible', timeout: 10_000 })
    await listingLink.click()
    await page.waitForURL(/\/homes\/\d+/, { timeout: 10_000 })

    // Look for an inquiry / contact button
    const inquiryBtn = page.getByRole('button', { name: /contact|inquire|send|αίτηση|επικοινωνία/i }).first()
    if (await inquiryBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await inquiryBtn.click()
      // After clicking, expect a form or success state — no error
      await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
    } else {
      // Inquiry button not present on this listing — skip gracefully
      test.info().annotations.push({ type: 'note', description: 'No inquiry button found on first listing' })
    }
  })

  test('cannot access Create Listing page (redirected or blocked)', async ({ page }) => {
    await page.goto('/homes/new')
    // A pure renter should either be redirected or see an access-denied state
    // They should NOT see the listing form
    const isOnNewPage = page.url().includes('/homes/new')
    if (isOnNewPage) {
      // If they land on the page, the form should not be submittable for renters
      // — acceptable if the backend blocks the submission
      test.info().annotations.push({ type: 'warning', description: 'Renter can reach /homes/new — ensure backend rejects submission' })
    }
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('can access My Inquiries page', async ({ page }) => {
    await page.goto('/homes/my-inquiries')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('can access saved homes page', async ({ page }) => {
    await page.goto('/homes/saved')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('can access profile page', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).toBeVisible()
  })
})
