import { describe, expect, it } from 'vitest'
import { execSync } from 'child_process'
import { API_ERRORS_EL, apiErrorText, translateApiError } from '@/lib/api-errors'

describe('API error translations', () => {
  it('every fixed error message the API can return has Greek', () => {
    // Same extraction as a human would do: every literal error string in app/api and lib.
    const out = execSync(
      `git grep -hoE "(badRequest|forbidden|notFound)\\('[^']+'\\)|error: '[^']+'|error: \\"[^\\"]+\\"" -- app/api lib`,
      { encoding: 'utf8' },
    )
    const messages = new Set(
      out.split('\n').filter(Boolean).map(l =>
        l.replace(/^(badRequest|forbidden|notFound)\('/, '').replace(/'\)$/, '').replace(/^error: ['"]/, '').replace(/['"]$/, '')),
    )
    const missing = [...messages].filter(m => translateApiError(m, 'el') === m && !/^[Ͱ-Ͽ\s]+$/.test(m))
    expect(missing, `Add Greek to lib/api-errors.ts for: ${missing.join(' | ')}`).toEqual([])
  })

  it('translates exact and variable messages, and leaves English alone', () => {
    expect(apiErrorText({ error: 'You already have an appointment at this time' }, 'el')).toBe('Έχετε ήδη ραντεβού αυτή την ώρα.')
    expect(apiErrorText({ error: 'You already have an appointment at this time' }, 'en')).toBe('You already have an appointment at this time')
    expect(translateApiError('Photo a.jpg for house 3 exceeds 5MB limit', 'el')).toBe('Η φωτογραφία a.jpg του σπιτιού 3 ξεπερνά τα 5MB.')
  })

  it('falls back sensibly', () => {
    expect(apiErrorText({}, 'el', 'Προεπιλογή')).toBe('Προεπιλογή')
    expect(apiErrorText(null, 'en')).toBe('Something went wrong. Please try again.')
    expect(apiErrorText({ error: 'Some brand-new message' }, 'el')).toBe('Some brand-new message')
    expect(Object.keys(API_ERRORS_EL).length).toBeGreaterThan(150)
  })
})
