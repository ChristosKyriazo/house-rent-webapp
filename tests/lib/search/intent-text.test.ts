import { describe, expect, it } from 'vitest'
import { buildIntentText, hasUsableIntent } from '@/lib/search/intent-text'

describe('buildIntentText', () => {
  it('renders a whole conversation as one English sentence', () => {
    const text = buildIntentText({
      city: 'Athens',
      area: 'Kolonaki',
      listingType: 'rent',
      minBedrooms: 2,
      maxPrice: 600,
      Metro: 'Essential',
      Safety: 'Essential',
      vibePreference: 'family-friendly',
    })
    expect(text).toBe(
      'rental property in Kolonaki, Athens, at least 2 bedrooms, up to €600, ' +
      'close to a metro station, in a very safe area, family-friendly neighbourhood'
    )
  })

  it('replaces the "[conversational]" placeholder that disabled scoring', () => {
    // The chat used to send a literal placeholder as its query, so no embedding was
    // generated and the description/photo keyword bonuses matched nothing — over half the
    // weight table was inert. Any real intent text must carry actual search terms.
    const text = buildIntentText({ city: 'Athens', maxPrice: 600 })
    expect(text).not.toContain('conversational')
    expect(text).toContain('Athens')
    expect(text).toContain('600')
  })

  it('renders both sides of a range', () => {
    expect(buildIntentText({ minPrice: 400, maxPrice: 600 })).toContain('€400 to €600')
    expect(buildIntentText({ minSize: 80 })).toContain('at least 80 square meters')
    expect(buildIntentText({ maxSize: 120 })).toContain('up to 120 square meters')
  })

  it('distinguishes sale from rental', () => {
    expect(buildIntentText({ listingType: 'sale' })).toContain('property for sale')
    expect(buildIntentText({ listingType: 'rent' })).toContain('rental property')
  })

  it('grades proximity by how much the user wants it', () => {
    expect(buildIntentText({ Metro: 'Essential' })).toContain('close to a metro station')
    expect(buildIntentText({ Metro: 'Strong' })).toContain('near a metro station')
    expect(buildIntentText({ Metro: 'Avoid' })).toContain('away from a metro station')
    expect(buildIntentText({ Metro: 'Not mentioned' })).not.toContain('metro')
  })

  it('stays English so it lands near buildHomeText in the embedding space', () => {
    // The listing side (`buildHomeText`) is English. Mirroring the user's language here
    // would put query and document in different regions and collapse the cosine.
    const text = buildIntentText({ city: 'Αθήνα', minBedrooms: 2 })
    expect(text).toContain('at least 2 bedrooms')
    expect(text).toContain('rental property in')
  })

  it('omits what was never set', () => {
    const text = buildIntentText({ city: 'Athens' })
    expect(text).toBe('rental property in Athens')
  })

  it('handles empty input', () => {
    expect(buildIntentText(null)).toBe('')
    expect(buildIntentText({})).toBe('rental property')
  })
})

describe('hasUsableIntent', () => {
  it('rejects text with no actual criteria', () => {
    expect(hasUsableIntent(buildIntentText({}))).toBe(false)
    expect(hasUsableIntent('')).toBe(false)
  })

  it('accepts text carrying at least one criterion', () => {
    expect(hasUsableIntent(buildIntentText({ city: 'Athens', maxPrice: 600 }))).toBe(true)
  })
})
