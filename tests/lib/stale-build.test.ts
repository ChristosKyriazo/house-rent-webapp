import { describe, expect, it } from 'vitest'
import { isStaleBuildError } from '@/lib/stale-build'

describe('isStaleBuildError', () => {
  it('recognises missing-chunk errors from webpack, Turbopack and browsers', () => {
    expect(isStaleBuildError({ name: 'ChunkLoadError', message: 'Loading chunk 123 failed.' })).toBe(true)
    expect(isStaleBuildError(new Error('Loading CSS chunk app-layout failed'))).toBe(true)
    expect(isStaleBuildError(new TypeError('Failed to fetch dynamically imported module: https://kaparro.com/_next/static/chunks/a.js'))).toBe(true)
    expect(isStaleBuildError(new TypeError('Importing a module script failed.'))).toBe(true)
  })
  it('leaves real bugs alone', () => {
    expect(isStaleBuildError(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe(false)
    expect(isStaleBuildError(null)).toBe(false)
  })
})
