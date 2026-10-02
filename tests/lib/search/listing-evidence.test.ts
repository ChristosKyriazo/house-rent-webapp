import { describe, expect, it } from 'vitest'
import { assessListing, calculateDisqualifiers, requestedConcepts } from '@/lib/search/listing-evidence'
import { evidenceScoreOptions, scoreHome } from '@/lib/search/score-home'
import { buildIntentText } from '@/lib/search/intent-text'
import { FEATURE_IDS, FEATURE_TEXT } from '@/lib/search/features'

describe('requestedConcepts', () => {
  it('only treats vocabulary features as requests — never ordinary words or places', () => {
    // The old scorer took every query word as a "feature", so "apartment" and "athens"
    // earned a bonus from almost every listing.
    expect(requestedConcepts('2 bedroom apartment in Athens with balcony')).toEqual(['balcony'])
    expect(requestedConcepts('cheap flat near the metro in Kifisia')).toEqual([])
  })

  it('reads Greek, with or without accents and in any case', () => {
    expect(requestedConcepts('Θέλω ΜΠΑΛΚΌΝΙ και τζάκι')).toEqual(['balcony', 'fireplace'])
    expect(new Set(requestedConcepts('επιπλωμενο με κλιματισμο'))).toEqual(new Set(['airConditioning', 'furnished']))
  })

  it('a sea view supersedes a generic view', () => {
    expect(requestedConcepts('flat with a sea view')).toEqual(['seaView'])
  })

  it('does not hear "furnished" inside "unfurnished"', () => {
    expect(requestedConcepts('unfurnished please')).toEqual(['unfurnished'])
  })
})

describe('assessListing', () => {
  it('REGRESSION: a perfectly matching listing is confirmed, not penalised', () => {
    // Used to take the maximum penalty — "no" inside "renovated" counted as a negation —
    // which drove the fit of the best listing to 0%.
    const e = assessListing('2 bedroom apartment in Athens with balcony', {
      description: 'Bright apartment in Athens, fully renovated, with a large balcony.',
    })
    expect(e.confirmed).toEqual(['balcony'])
    expect(e.contradicted).toEqual([])
    const fit = scoreHome({ semantic: 0.8 }, evidenceScoreOptions(e))
    expect(fit).toBeGreaterThan(scoreHome({ semantic: 0.8 }))
  })

  it('REGRESSION: "north" and "economy" are not negations', () => {
    const e = assessListing('apartment with fireplace', {
      description: 'Spacious apartment in the north suburbs with a fireplace, economy heating.',
    })
    expect(e.confirmed).toEqual(['fireplace'])
    expect(e.contradicted).toEqual([])
  })

  it('a negation in the same clause contradicts', () => {
    expect(assessListing('needs a balcony', { description: 'Cosy studio, no balcony.' }).contradicted)
      .toEqual(['balcony'])
    expect(assessListing('needs an elevator', { description: 'Third floor without an elevator.' }).contradicted)
      .toEqual(['elevator'])
    expect(assessListing('θέλω μπαλκόνι', { description: 'Διαμέρισμα χωρίς μπαλκόνι.' }).contradicted)
      .toEqual(['balcony'])
  })

  it('a negation in another clause does not', () => {
    const e = assessListing('needs a balcony', { description: 'No agency fees, large balcony.' })
    expect(e.confirmed).toEqual(['balcony'])
    expect(e.contradicted).toEqual([])
  })

  it('reads the Greek description too', () => {
    const e = assessListing('with a fireplace', { description: 'Nice flat.', descriptionGreek: 'Διαθέτει τζάκι.' })
    expect(e.confirmed).toEqual(['fireplace'])
  })

  it('confirms from structured data and photos when the text is silent', () => {
    const year = new Date().getFullYear()
    expect(assessListing('renovated flat', { description: 'Nice flat.', yearRenovated: year - 1 }).confirmed)
      .toEqual(['renovated'])
    const photo = assessListing('with a pool', { description: 'Nice flat.', photoTags: ['swimming pool'] })
    expect(photo.confirmed).toEqual(['pool'])
    expect(photo.confirmedInPhotos).toEqual(['pool'])
  })

  it('an explicit opposite contradicts', () => {
    expect(assessListing('unfurnished', { description: 'Fully furnished apartment.' }).contradicted)
      .toEqual(['unfurnished'])
  })

  it('a listing that simply does not mention a feature is neither confirmed nor contradicted', () => {
    const e = assessListing('with a pool', { description: 'Two bedrooms near the metro.' })
    expect(e.requested).toEqual(['pool'])
    expect(e.confirmed).toEqual([])
    expect(e.contradicted).toEqual([])
  })
})

describe('disqualifiers', () => {
  it('REGRESSION: welcoming listings do not disqualify', () => {
    // The optional "not" made "pets allowed" match the no-pets rule.
    expect(calculateDisqualifiers('I have a dog', 'Lovely flat. Pets allowed!')).toBeNull()
    expect(calculateDisqualifiers('I have a dog', 'Pets are welcome.')).toBeNull()
    expect(calculateDisqualifiers('I am a student', 'Students welcome.')).toBeNull()
    expect(calculateDisqualifiers('family with kids', 'Children are welcome.')).toBeNull()
  })

  it('real prohibitions still disqualify, in English and Greek', () => {
    expect(calculateDisqualifiers('I have a dog', 'No pets allowed.')).toBe('No pets allowed')
    expect(calculateDisqualifiers('I have a dog', 'Pets are not allowed.')).toBe('No pets allowed')
    expect(calculateDisqualifiers('έχω σκύλο', 'Δεν επιτρέπονται κατοικίδια.')).toBe('No pets allowed')
    expect(calculateDisqualifiers('family with kids', 'Adults only.')).toBe('No children allowed')
    expect(calculateDisqualifiers('I am a student', 'No students.')).toBe('No students allowed')
    expect(calculateDisqualifiers('looking for furnished', 'Unfurnished.')).toBe('Property is unfurnished')
  })

  it('only a smoker is excluded by a no-smoking listing', () => {
    expect(calculateDisqualifiers('I smoke', 'Non-smoking building.')).toBe('No smoking allowed')
    // Someone *asking* for a smoke-free flat used to be disqualified from every one.
    expect(calculateDisqualifiers('I want a smoke-free apartment', 'Non-smoking building.')).toBeNull()
    expect(calculateDisqualifiers('non-smoker couple', 'No smoking.')).toBeNull()
  })

  it('"no kids" in the query does not trigger the children rule', () => {
    expect(calculateDisqualifiers('couple, no kids', 'Adults only.')).toBeNull()
  })

  it('describing who a home suits is not an exclusion', () => {
    expect(calculateDisqualifiers('single person', 'Suitable for families.')).toBeNull()
    expect(calculateDisqualifiers('single person', 'Couples only.')).toBe('Couples or families only')
  })

  it('"no pets allowed" is never read as pet-friendly evidence', () => {
    expect(assessListing('I have a dog', { description: 'No pets allowed.' }).confirmed).toEqual([])
  })

  it('reads the Greek description', () => {
    expect(calculateDisqualifiers('I have a cat', 'Nice flat.', 'Απαγορεύονται τα κατοικίδια.')).toBe('No pets allowed')
  })
})

describe('chat features reach the evidence', () => {
  it('every feature phrase in the intent text is recognised', () => {
    // If a phrase stops matching its concept or rule, a chat answer silently stops counting.
    const household = new Set(['pets', 'children', 'student', 'smoker', 'shortTerm', 'livesAlone'])
    for (const id of FEATURE_IDS) {
      if (household.has(id)) continue
      expect(requestedConcepts(FEATURE_TEXT[id].intent), id).not.toEqual([])
    }
  })

  it('"we have a dog" in chat disqualifies a no-pets listing', () => {
    const intent = buildIntentText({ city: 'Athens', features: ['pets'] })
    expect(calculateDisqualifiers(intent, 'No pets allowed.')).toBe('No pets allowed')
    expect(assessListing(intent, { description: 'Pets welcome.' }).confirmed).toEqual(['petFriendly'])
  })

  it('household facts drive their rules', () => {
    const fx = (id: string) => buildIntentText({ features: [id] })
    expect(calculateDisqualifiers(fx('children'), 'Adults only.')).toBe('No children allowed')
    expect(calculateDisqualifiers(fx('student'), 'No students.')).toBe('No students allowed')
    expect(calculateDisqualifiers(fx('smoker'), 'Non-smoking.')).toBe('No smoking allowed')
    expect(calculateDisqualifiers(fx('shortTerm'), 'Minimum lease 12 months.')).toBe('Minimum lease term required')
    expect(calculateDisqualifiers(fx('livesAlone'), 'Couples only.')).toBe('Couples or families only')
  })

  it('ignores ids outside the vocabulary', () => {
    expect(buildIntentText({ features: ['balcony', 'helipad'] })).toContain('with a balcony')
    expect(buildIntentText({ features: ['helipad'] })).not.toContain('helipad')
  })
})
