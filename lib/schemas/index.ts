import { z } from 'zod'

// ── Shared primitives ──────────────────────────────────────────────────────────

const positiveInt =z.coerce.number().int().positive()
const nonEmptyString =z.string().min(1)
const isoDate =z.string().datetime({ offset: true }).or(z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid date' }))

// ── Bookings ──────────────────────────────────────────────────────────────────

export const createBookingSchema = z.object({
  title: nonEmptyString,
  startTime: isoDate,
  endTime: isoDate,
  ownerId: positiveInt.optional(),
  inquiryId: positiveInt.nullable().optional(),
  availabilityId: positiveInt.optional(),
  description: z.string().optional(),
  location: z.string().optional(),
})

// ── Homes ─────────────────────────────────────────────────────────────────────

export const createHomeSchema = z.object({
  title: nonEmptyString.max(200),
  description: z.string().optional(),
  descriptionGreek: z.string().optional(),
  street: z.string().optional(),
  city: nonEmptyString,
  country: nonEmptyString,
  area: z.string().optional(),
  listingType: z.string().optional(),
  pricePerMonth: z.coerce.number().positive(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  floor: z.coerce.number().int().nullable().optional(),
  heatingCategory: z.string().optional(),
  heatingAgent: z.string().optional(),
  parking: z.union([z.boolean(), z.enum(['true', 'false'])]).nullable().optional(),
  sizeSqMeters: z.coerce.number().positive(),
  yearBuilt: z.union([z.coerce.number().int().min(1800).max(new Date().getFullYear()), z.literal(''), z.null()]).optional(),
  yearRenovated: z.union([z.coerce.number().int().min(1800).max(new Date().getFullYear()), z.literal(''), z.null()]).optional(),
  availableFrom: z.string().optional(),
  photos: z.unknown().optional(),
  energyClass: z.string().optional(),
  useAIDescription: z.boolean().optional(),
})

// ── Inquiries ─────────────────────────────────────────────────────────────────

export const createInquirySchema = z.object({
  homeId: positiveInt,
  message: z.string().optional(),
})

// ── Ratings ───────────────────────────────────────────────────────────────────

const starScore = z.number().int().min(1).max(5)

export const createRatingSchema = z.discriminatedUnion('type', [
  // Owner or broker rates tenant after viewing
  z.object({
    type: z.literal('viewing_tenant'),
    ratedUserId: positiveInt,
    bookingId: positiveInt,
    scores: z.object({ experience: starScore }),
    comment: z.string().max(400).optional(),
  }),
  // Tenant rates broker after viewing
  z.object({
    type: z.literal('viewing_broker'),
    ratedUserId: positiveInt,
    bookingId: positiveInt,
    scores: z.object({ punctual: starScore, helpful: starScore, listingMatch: starScore }),
    comment: z.string().max(400).optional(),
  }),
  // Tenant rates house at move-in (+3 days)
  z.object({
    type: z.literal('movein_house'),
    ratedHomeId: positiveInt,
    finalizationId: positiveInt,
    scores: z.object({ accuracy: starScore, condition: starScore, handover: starScore }),
    comment: z.string().max(150).optional(),
  }),
  // Tenant rates house at move-out
  z.object({
    type: z.literal('moveout_house'),
    ratedHomeId: positiveInt,
    finalizationId: positiveInt,
    scores: z.object({
      overallCondition: starScore,
      recommend: starScore,
      ownerFair: starScore,
      moveoutHandling: starScore,
    }),
    comment: z.string().max(400).optional(),
  }),
  // Owner rates tenant at move-out
  z.object({
    type: z.literal('moveout_tenant'),
    ratedUserId: positiveInt,
    finalizationId: positiveInt,
    scores: z.object({ propertyCare: starScore, rulesPayment: starScore, wouldRentAgain: starScore }),
    comment: z.string().max(400).optional(),
  }),
])

// ── Profile ───────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  occupation: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  bio: z.string().max(1000).optional(),
})

// ── Auth ──────────────────────────────────────────────────────────────────────

export const setRoleSchema = z.object({
  role: z.enum(['user', 'owner', 'both', 'broker']),
})

// ── Availability ──────────────────────────────────────────────────────────────

export const createAvailabilitySchema = z.object({
  homeId: positiveInt,
  date: z.string().refine(s => !isNaN(Date.parse(s)), { message: 'Invalid date' }),
  startTime: isoDate,
  endTime: isoDate,
})

// ── Promote ───────────────────────────────────────────────────────────────────

export const promoteHomeSchema = z.object({
  homeId: positiveInt,
  days: z.number().int().min(1).max(365),
})

// ── Translate ─────────────────────────────────────────────────────────────────

export const translateDescriptionSchema = z.object({
  description: z.string().min(1).max(5000),
  targetLanguage: z.enum(['en', 'el']).optional(),
})
