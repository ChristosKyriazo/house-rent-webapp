import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/broker.json') })

test('broker upgrade to plus redirects to Stripe Checkout', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const profile = await page.evaluate(async () => {
    const resp = await fetch('/api/profile')
    const data = await resp.json()
    return { tier: data.user?.subscriptionTier ?? 'unknown', role: data.user?.role }
  })
  console.log(`  Current tier: ${profile.tier} (role: ${profile.role})`)

  await page.goto('/upgrade')
  await page.waitForLoadState('networkidle')

  const result = await page.evaluate(async () => {
    const resp = await fetch('/api/subscription/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: 'plus' }),
    })
    const body = await resp.json().catch(() => ({}))
    return { ok: resp.ok, status: resp.status, body }
  })

  console.log(`  Upgrade response: ${result.status} — ${JSON.stringify(result.body)}`)

  expect(result.ok, `Expected 200 but got ${result.status}: ${JSON.stringify(result.body)}`).toBeTruthy()
  expect(result.body.checkoutUrl, 'Expected a Stripe checkoutUrl in the response').toBeTruthy()
  expect(result.body.checkoutUrl).toContain('checkout.stripe.com')

  console.log(`  ✓ Stripe Checkout URL received: ${result.body.checkoutUrl}`)
  console.log(`  (tier flips to plus after completing payment at the above URL)`)
})
