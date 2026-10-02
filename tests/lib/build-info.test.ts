import { describe, expect, it } from 'vitest'
import { buildInfo } from '@/lib/build-info'

describe('buildInfo', () => {
  it('reads commit and environment from the deployed image tag', () => {
    expect(buildInfo('ghcr.io/christoskyriazo/house-rent-webapp:sha-b87c26f-production'))
      .toEqual({ version: 'b87c26f', environment: 'production' })
    expect(buildInfo('ghcr.io/x/y:sha-44ff08c-staging'))
      .toEqual({ version: '44ff08c', environment: 'staging' })
  })

  it('reports local without an image, unknown for an unrecognised one (e.g. a rollback)', () => {
    expect(buildInfo(undefined)).toEqual({ version: 'local', environment: 'local' })
    expect(buildInfo('house-rent-rollback:previous')).toEqual({ version: 'unknown', environment: 'unknown' })
  })
})
