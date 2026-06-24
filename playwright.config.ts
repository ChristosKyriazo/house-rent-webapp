import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

config({ path: '.env.test', override: false })

const BASE_URL = process.env.E2E_BASE_URL ?? 'https://dev.kaparro.com'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['html', { open: 'on-failure' }], ['list']],
  use: {
    baseURL: BASE_URL,
    screenshot: 'on',
    video: 'on',
    trace: 'on-first-retry',
    extraHTTPHeaders: {
      ...(process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET
        ? { 'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID, 'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET }
        : {}),
    },
  },
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  projects: [
    // Unauthenticated — public smoke + feature tests
    {
      name: 'public',
      testMatch: ['**/smoke.spec.ts', '**/search.spec.ts', '**/map.spec.ts', '**/compare.spec.ts', '**/saved.spec.ts', '**/owner-dashboard.spec.ts'],
    },
    // Role-based authenticated projects
    {
      name: 'owner',
      use: { ...devices['Desktop Chrome'], storageState: './tests/e2e/.auth/owner.json' },
      testMatch: ['**/owner.spec.ts', '**/role-checks/owner-*.spec.ts'],
    },
    {
      name: 'renter',
      use: { ...devices['Desktop Chrome'], storageState: './tests/e2e/.auth/renter.json' },
      testMatch: '**/renter.spec.ts',
    },
    {
      name: 'broker',
      use: { ...devices['Desktop Chrome'], storageState: './tests/e2e/.auth/broker.json' },
      testMatch: ['**/broker.spec.ts', '**/role-checks/broker-*.spec.ts'],
    },
    {
      name: 'both',
      use: { ...devices['Desktop Chrome'], storageState: './tests/e2e/.auth/both.json' },
      testMatch: ['**/both.spec.ts', '**/role-checks/both-*.spec.ts'],
    },
    // Sequential story: owner creates → renter inquires → owner approves → … → ratings
    // Each spec file sets its own storageState via test.use()
    {
      name: 'flows',
      testMatch: '**/flows/*.spec.ts',
    },
  ],
})
