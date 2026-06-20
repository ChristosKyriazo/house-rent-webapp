import { chromium } from '@playwright/test'
import { createClerkClient } from '@clerk/backend'
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'
import type { Page } from '@playwright/test'

config({ path: path.resolve(__dirname, '../../.env.test') })

const BASE_URL = process.env.E2E_BASE_URL ?? 'https://dev.kaparro.com'
const AUTH_DIR = path.join(__dirname, '.auth')

function cfHeaders(): Record<string, string> {
  const id = process.env.CF_ACCESS_CLIENT_ID
  const secret = process.env.CF_ACCESS_CLIENT_SECRET
  if (id && secret) return { 'CF-Access-Client-Id': id, 'CF-Access-Client-Secret': secret }
  return {}
}

async function loginAs(page: Page, email: string, label: string) {
  console.log(`  → Signing in as ${label} (${email})`)

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

  const { data: users } = await clerk.users.getUserList({ emailAddress: [email] })
  if (!users.length) throw new Error(`No Clerk user found for email: ${email}`)

  const { token } = await clerk.signInTokens.createSignInToken({
    userId: users[0].id,
    expiresInSeconds: 60,
  })

  await page.goto(`${BASE_URL}/login?__clerk_ticket=${token}`)
  await page.waitForURL(`${BASE_URL}/`, { timeout: 20_000 })

  console.log(`  ✓ ${label} signed in`)
}

export default async function globalSetup() {
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })

  const roles = [
    { label: 'owner',  emailVar: 'TEST_OWNER_EMAIL',  file: 'owner.json'  },
    { label: 'renter', emailVar: 'TEST_RENTER_EMAIL',  file: 'renter.json' },
    { label: 'broker', emailVar: 'TEST_BROKER_EMAIL',  file: 'broker.json' },
    { label: 'both',   emailVar: 'TEST_BOTH_EMAIL',    file: 'both.json'   },
  ]

  for (const role of roles) {
    if (!process.env[role.emailVar]) {
      throw new Error(`Missing credentials for role "${role.label}". Set ${role.emailVar} in .env.test`)
    }
  }

  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error('CLERK_SECRET_KEY is required in .env.test')
  }

  const headers = cfHeaders()
  if (Object.keys(headers).length > 0) {
    console.log('\n[global-setup] CF Access service token found — injecting headers on all requests')
  }

  const browser = await chromium.launch({
    args: ['--disable-blink-features=AutomationControlled'],
  })
  console.log('\n[global-setup] Authenticating test accounts...')

  for (const role of roles) {
    const authFile = path.join(AUTH_DIR, role.file)

    if (fs.existsSync(authFile)) {
      const age = Date.now() - fs.statSync(authFile).mtimeMs
      if (age < 12 * 60 * 60 * 1000) {
        console.log(`  ↩ ${role.label}: reusing cached session`)
        continue
      }
    }

    const context = await browser.newContext({
      extraHTTPHeaders: headers,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    })
    await context.route('**/npm/@clerk/clerk-js@*/dist/clerk.browser.js', async route => {
      const response = await route.fetch()
      await route.fulfill({ response })
    })
    const page = await context.newPage()
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    })

    try {
      await loginAs(page, process.env[role.emailVar]!, role.label)
      await context.storageState({ path: authFile })
    } catch (err) {
      const screenshot = path.join(AUTH_DIR, `${role.label}-login-failure.png`)
      await page.screenshot({ path: screenshot })
      throw new Error(
        `Login failed for role "${role.label}". Screenshot saved to ${screenshot}.\n${err}`,
      )
    } finally {
      await context.close()
    }
  }

  await browser.close()
  console.log('[global-setup] All sessions ready.\n')
}
