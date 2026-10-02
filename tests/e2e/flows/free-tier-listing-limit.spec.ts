import { test, expect } from '@playwright/test'
import path from 'path'
import { pickListingTemplate } from '../fixtures/listing-templates'

/**
 * Verifies that free-tier accounts are blocked from creating more than
 * 1 listing and receive a clear 402 subscription_required response.
 *
 * Each describe block runs under a different auth session so the two
 * accounts are tested independently.
 */

test.describe('owner — free-tier listing limit', () => {
  test.use({ storageState: path.join(__dirname, '../.auth/owner.json') })

  test('owner gets 402 when trying to create a second listing', async ({ page }) => {
    await assertFreeTierLimit(page)
  })
})

test.describe('broker — free-tier listing limit', () => {
  test.use({ storageState: path.join(__dirname, '../.auth/broker.json') })

  test('broker gets 402 when trying to create a second listing', async ({ page }) => {
    await assertFreeTierLimit(page)
  })
})

async function assertFreeTierLimit(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Check how many listings this account already has
  const existing = await page.evaluate(async () => {
    const resp = await fetch('/api/homes/my-listings')
    if (!resp.ok) return [] as Array<{ id: string; title: string }>
    const data = await resp.json()
    return (data.homes ?? []) as Array<{ id: string; title: string }>
  })

  // If zero listings, create one first so the limit can be triggered
  if (existing.length === 0) {
    const setup = pickListingTemplate()
    const setupResult = await page.evaluate(async (data) => {
      const resp = await fetch('/api/homes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const body = await resp.json().catch(() => ({}))
      return { ok: resp.ok, status: resp.status, body }
    }, { title: `E2E Test Listing ${Date.now()}`, ...setup })

    expect(
      setupResult.ok,
      `Setup listing failed (${setupResult.status}): ${JSON.stringify(setupResult.body)}`
    ).toBeTruthy()
  }

  // Attempt a second listing — must be blocked
  const extra = pickListingTemplate()
  const result = await page.evaluate(async (data) => {
    const resp = await fetch('/api/homes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const body = await resp.json().catch(() => ({}))
    return { ok: resp.ok, status: resp.status, body }
  }, { title: `E2E Test Listing Extra ${Date.now()}`, ...extra })

  expect(result.status, `Expected 402 but got ${result.status}: ${JSON.stringify(result.body)}`).toBe(402)
  expect(result.body.error).toBe('subscription_required')
  expect(result.body.requiredTier).toBe('plus')

  console.log(`  ✓ Free-tier limit enforced: 402 subscription_required, requiredTier=${result.body.requiredTier}`)
}
