import { test, expect } from '@playwright/test'

test('home page smoke render', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
})

test('login page smoke render', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('body')).toBeVisible()
})
