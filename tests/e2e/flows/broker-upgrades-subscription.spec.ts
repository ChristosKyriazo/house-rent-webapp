import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/broker.json') })

test('broker upgrade to plus — full Stripe checkout flow', async ({ page }) => {
  // ── 1. Check starting tier ────────────────────────────────────────────────
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const before = await page.evaluate(async () => {
    const resp = await fetch('/api/profile')
    const data = await resp.json()
    return { tier: data.user?.subscriptionTier ?? 'unknown', role: data.user?.role }
  })
  console.log(`  Before — role: ${before.role}, tier: ${before.tier}`)

  // If already plus/pro from a previous run, downgrade first so the test is repeatable
  if (before.tier !== 'free') {
    await page.evaluate(async () => {
      await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'free' }),
      })
    })
    console.log(`  Downgraded back to free`)
  }

  // ── 2. Request Stripe Checkout session ───────────────────────────────────
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

  expect(result.ok, `Upgrade API failed ${result.status}: ${JSON.stringify(result.body)}`).toBeTruthy()
  expect(result.body.checkoutUrl).toContain('checkout.stripe.com')
  console.log(`  Checkout URL obtained`)

  // ── 3. Navigate to Stripe hosted checkout ────────────────────────────────
  await page.goto(result.body.checkoutUrl)
  await page.waitForLoadState('domcontentloaded')

  // Email
  const emailField = page.locator('input[type="email"], #email').first()
  await emailField.waitFor({ timeout: 15000 })
  await emailField.fill('broker@test.com')

  // Stripe card fields are in iframes — use keyboard navigation from the email field.
  // Tab moves focus: email → card number (iframe) → expiry → CVC → cardholder name
  await emailField.press('Tab')
  await page.waitForTimeout(500)
  await page.keyboard.type('4242424242424242')

  await page.keyboard.press('Tab')
  await page.waitForTimeout(300)
  await page.keyboard.type('1228')

  await page.keyboard.press('Tab')
  await page.waitForTimeout(300)
  await page.keyboard.type('123')

  await page.keyboard.press('Tab')
  await page.waitForTimeout(300)
  await page.keyboard.type('Test Broker')

  // ── 4. Submit ─────────────────────────────────────────────────────────────
  await page.getByRole('button', { name: /pay and subscribe/i }).click()
  console.log(`  Payment submitted`)

  // ── 5. Wait for redirect back to /upgrade?success=true ───────────────────
  await page.waitForURL(/\/upgrade\?success=true/, { timeout: 30000 })
  console.log(`  ✓ Redirected to success page`)

  // ── 6. Poll profile until tier flips (webhook is async) ──────────────────
  let finalTier = 'free'
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(2000)
    finalTier = await page.evaluate(async () => {
      const resp = await fetch('/api/profile')
      const data = await resp.json()
      return data.user?.subscriptionTier ?? 'free'
    })
    console.log(`  Poll ${i + 1}: tier = ${finalTier}`)
    if (finalTier === 'plus') break
  }

  expect(finalTier, 'Tier should have flipped to plus after webhook').toBe('plus')
  console.log(`  ✓ Tier confirmed as plus in DB`)
})
