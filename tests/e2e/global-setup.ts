import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'
import type { Page } from '@playwright/test'

config({ path: path.resolve(__dirname, '../../.env.test') })

const BASE_URL = process.env.E2E_BASE_URL ?? 'https://dev.kaparro.com'
const AUTH_DIR = path.join(__dirname, '.auth')

async function loginAs(page: Page, email: string, password: string, label: string) {
  console.log(`  → Logging in as ${label} (${email})`)
  await page.goto(`${BASE_URL}/login`)

  // Clerk sign-in: step 1 — identifier
  await page.locator('input[name="identifier"]').waitFor({ state: 'visible', timeout: 15_000 })
  await page.locator('input[name="identifier"]').fill(email)
  await page.locator('button[type="submit"]').first().click()

  // Step 2 — password
  await page.locator('input[name="password"]').waitFor({ state: 'visible', timeout: 10_000 })
  await page.locator('input[name="password"]').fill(password)
  await page.locator('button[type="submit"]').first().click()

  // Wait for redirect to home
  await page.waitForURL(`${BASE_URL}/`, { timeout: 20_000 })
  console.log(`  ✓ ${label} logged in`)
}

export default async function globalSetup() {
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })

  const roles = [
    { label: 'owner',  emailVar: 'TEST_OWNER_EMAIL',  passVar: 'TEST_OWNER_PASSWORD',  file: 'owner.json'  },
    { label: 'renter', emailVar: 'TEST_RENTER_EMAIL',  passVar: 'TEST_RENTER_PASSWORD', file: 'renter.json' },
    { label: 'broker', emailVar: 'TEST_BROKER_EMAIL',  passVar: 'TEST_BROKER_PASSWORD', file: 'broker.json' },
    { label: 'both',   emailVar: 'TEST_BOTH_EMAIL',    passVar: 'TEST_BOTH_PASSWORD',   file: 'both.json'   },
  ]

  // Check all credentials are present before launching browsers
  for (const role of roles) {
    if (!process.env[role.emailVar] || !process.env[role.passVar]) {
      throw new Error(
        `Missing credentials for role "${role.label}". ` +
        `Set ${role.emailVar} and ${role.passVar} in .env.test`
      )
    }
  }

  const browser = await chromium.launch()
  console.log('\n[global-setup] Authenticating test accounts...')

  for (const role of roles) {
    const authFile = path.join(AUTH_DIR, role.file)

    // Reuse saved session if it's less than 12 hours old
    if (fs.existsSync(authFile)) {
      const age = Date.now() - fs.statSync(authFile).mtimeMs
      if (age < 12 * 60 * 60 * 1000) {
        console.log(`  ↩ ${role.label}: reusing cached session`)
        continue
      }
    }

    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await loginAs(page, process.env[role.emailVar]!, process.env[role.passVar]!, role.label)
      await context.storageState({ path: authFile })
    } catch (err) {
      const screenshot = path.join(AUTH_DIR, `${role.label}-login-failure.png`)
      await page.screenshot({ path: screenshot })
      throw new Error(
        `Login failed for role "${role.label}". Screenshot saved to ${screenshot}.\n${err}`
      )
    } finally {
      await context.close()
    }
  }

  await browser.close()
  console.log('[global-setup] All sessions ready.\n')
}
