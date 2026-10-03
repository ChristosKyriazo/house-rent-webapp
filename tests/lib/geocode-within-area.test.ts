import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

// Zografou centre, a real Zografou street, and a same-named street in central Athens (~5 km away).
const ZOGRAFOU = { lat: 37.9755, lng: 23.7700 }
const IN_ZOGRAFOU = { lat: 37.9771, lng: 23.7735 }
const CENTRAL_ATHENS = { lat: 37.9833, lng: 23.7155 }

function stubGeocoder(answers: Record<string, { lat: number; lng: number } | null>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const address = decodeURIComponent(new URL(url).searchParams.get('address') ?? '')
    const hit = answers[address]
    return {
      json: async () => hit
        ? { status: 'OK', results: [{ geometry: { location: hit } }] }
        : { status: 'ZERO_RESULTS', results: [] },
    } as Response
  }))
}

describe('geocodeAddress keeps pins inside the listing area', () => {
  beforeEach(() => { process.env.GOOGLE_MAPS_API_KEY = 'test'; vi.resetModules() })
  afterEach(() => vi.unstubAllGlobals())

  it('accepts a street result inside the area', async () => {
    stubGeocoder({
      'Zografou, Athens, Greece': ZOGRAFOU,
      'Papagou 50, Zografou, Athens, Greece': IN_ZOGRAFOU,
    })
    const { geocodeAddress } = await import('@/lib/google-maps')
    expect(await geocodeAddress('Papagou 50', 'Zografou', 'Athens', 'Greece')).toEqual(IN_ZOGRAFOU)
  })

  it('REGRESSION: rejects a same-named street in another neighbourhood and uses the area centre', async () => {
    // "Socrates 17" resolved to central Athens and the listing was pinned 5 km from Zografou.
    stubGeocoder({
      'Zografou, Athens, Greece': ZOGRAFOU,
      'Socrates 17, Zografou, Athens, Greece': CENTRAL_ATHENS,
      'Socrates 17, Athens, Greece': CENTRAL_ATHENS,
    })
    const { geocodeAddress } = await import('@/lib/google-maps')
    expect(await geocodeAddress('Socrates 17', 'Zografou', 'Athens', 'Greece')).toEqual(ZOGRAFOU)
  })

  it('still falls back to the city when the area itself is unknown', async () => {
    stubGeocoder({ 'Athens, Greece': CENTRAL_ATHENS })
    const { geocodeAddress } = await import('@/lib/google-maps')
    expect(await geocodeAddress('Nowhere 1', 'Atlantis', 'Athens', 'Greece')).toEqual(CENTRAL_ATHENS)
  })
})
