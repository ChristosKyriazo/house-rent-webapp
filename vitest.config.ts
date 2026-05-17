import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    globals: true,
    clearMocks: true,
    exclude: ['tests/e2e/**', 'node_modules/**'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
})
