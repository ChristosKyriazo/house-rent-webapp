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
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  globalSetup: './tests/e2e/global-setup.ts',
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
      testMatch: '**/owner.spec.ts',
    },
    {
      name: 'renter',
      use: { ...devices['Desktop Chrome'], storageState: './tests/e2e/.auth/renter.json' },
      testMatch: '**/renter.spec.ts',
    },
    {
      name: 'broker',
      use: { ...devices['Desktop Chrome'], storageState: './tests/e2e/.auth/broker.json' },
      testMatch: '**/broker.spec.ts',
    },
    {
      name: 'both',
      use: { ...devices['Desktop Chrome'], storageState: './tests/e2e/.auth/both.json' },
      testMatch: '**/both.spec.ts',
    },
  ],
})
