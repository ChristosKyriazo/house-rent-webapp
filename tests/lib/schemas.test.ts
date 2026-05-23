import { describe, expect, it } from 'vitest'
import {
  createBookingSchema,
  createHomeSchema,
  createInquirySchema,
  createRatingSchema,
  updateProfileSchema,
  setRoleSchema,
  createAvailabilitySchema,
  promoteHomeSchema,
  translateDescriptionSchema,
} from '@/lib/schemas'

describe('createBookingSchema', () => {
  const valid = {
    title: 'Viewing',
    startTime: '2026-06-01T10:00:00.000Z',
    endTime: '2026-06-01T11:00:00.000Z',
    ownerId: 1,
  }

  it('accepts valid booking data', () => {
    expect(createBookingSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects empty title', () => {
    expect(createBookingSchema.safeParse({ ...valid, title: '' }).success).toBe(false)
  })

  it('rejects invalid date strings', () => {
    expect(createBookingSchema.safeParse({ ...valid, startTime: 'bad-date' }).success).toBe(false)
  })

  it('allows optional fields to be absent', () => {
    const { ownerId, ...minimal } = valid
    expect(createBookingSchema.safeParse(minimal).success).toBe(true)
  })
})

describe('createHomeSchema', () => {
  const valid = {
    title: 'Nice apartment',
    city: 'Athens',
    country: 'Greece',
    pricePerMonth: 800,
    sizeSqMeters: 60,
  }

  it('accepts valid home data', () => {
    expect(createHomeSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const { city, ...missing } = valid
    expect(createHomeSchema.safeParse(missing).success).toBe(false)
  })

  it('rejects negative price', () => {
    expect(createHomeSchema.safeParse({ ...valid, pricePerMonth: -100 }).success).toBe(false)
  })

  it('accepts null yearBuilt', () => {
    expect(createHomeSchema.safeParse({ ...valid, yearBuilt: null }).success).toBe(true)
  })

  it('accepts empty string yearBuilt', () => {
    expect(createHomeSchema.safeParse({ ...valid, yearBuilt: '' }).success).toBe(true)
  })
})

describe('createInquirySchema', () => {
  it('accepts valid inquiry', () => {
    expect(createInquirySchema.safeParse({ homeId: 1 }).success).toBe(true)
  })

  it('rejects zero homeId', () => {
    expect(createInquirySchema.safeParse({ homeId: 0 }).success).toBe(false)
  })
})

describe('createRatingSchema', () => {
  const valid = { ratedUserId: 1, type: 'owner', score: 4 }

  it('accepts valid rating', () => {
    expect(createRatingSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects score out of range', () => {
    expect(createRatingSchema.safeParse({ ...valid, score: 6 }).success).toBe(false)
    expect(createRatingSchema.safeParse({ ...valid, score: 0 }).success).toBe(false)
  })

  it('rejects invalid type', () => {
    expect(createRatingSchema.safeParse({ ...valid, type: 'admin' }).success).toBe(false)
  })
})

describe('setRoleSchema', () => {
  it.each(['user', 'owner', 'both', 'broker'])('accepts role %s', (role) => {
    expect(setRoleSchema.safeParse({ role }).success).toBe(true)
  })

  it('rejects invalid role', () => {
    expect(setRoleSchema.safeParse({ role: 'admin' }).success).toBe(false)
  })
})

describe('createAvailabilitySchema', () => {
  const valid = {
    homeId: 1,
    date: '2026-06-01',
    startTime: '2026-06-01T09:00:00.000Z',
    endTime: '2026-06-01T10:00:00.000Z',
  }

  it('accepts valid availability', () => {
    expect(createAvailabilitySchema.safeParse(valid).success).toBe(true)
  })

  it('rejects invalid date', () => {
    expect(createAvailabilitySchema.safeParse({ ...valid, date: 'bad' }).success).toBe(false)
  })
})

describe('promoteHomeSchema', () => {
  it('accepts valid promotion', () => {
    expect(promoteHomeSchema.safeParse({ homeId: 1, days: 30 }).success).toBe(true)
  })

  it('rejects days out of range', () => {
    expect(promoteHomeSchema.safeParse({ homeId: 1, days: 0 }).success).toBe(false)
    expect(promoteHomeSchema.safeParse({ homeId: 1, days: 366 }).success).toBe(false)
  })
})

describe('translateDescriptionSchema', () => {
  it('accepts valid translate request', () => {
    expect(translateDescriptionSchema.safeParse({ description: 'Hello', targetLanguage: 'el' }).success).toBe(true)
  })

  it('accepts without targetLanguage', () => {
    expect(translateDescriptionSchema.safeParse({ description: 'Hello' }).success).toBe(true)
  })

  it('rejects empty description', () => {
    expect(translateDescriptionSchema.safeParse({ description: '' }).success).toBe(false)
  })

  it('rejects unsupported language', () => {
    expect(translateDescriptionSchema.safeParse({ description: 'Hi', targetLanguage: 'fr' }).success).toBe(false)
  })

  it('rejects description over 5000 chars', () => {
    expect(translateDescriptionSchema.safeParse({ description: 'a'.repeat(5001) }).success).toBe(false)
  })
})

describe('updateProfileSchema', () => {
  it('accepts partial updates', () => {
    expect(updateProfileSchema.safeParse({ name: 'Alice' }).success).toBe(true)
    expect(updateProfileSchema.safeParse({}).success).toBe(true)
  })

  it('rejects name exceeding max length', () => {
    expect(updateProfileSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false)
  })
})
