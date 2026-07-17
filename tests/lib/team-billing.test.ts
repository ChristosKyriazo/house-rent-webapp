import { describe, expect, it } from 'vitest'
import { getSeatCounts } from '@/lib/team-billing'

describe('getSeatCounts', () => {
  it('counts the owner as one Pro seat when there are no members', () => {
    expect(getSeatCounts([])).toEqual({ pro: 1, plus: 0 })
  })

  it('adds a Pro seat per Pro member (on top of the owner)', () => {
    const children = [{ subscriptionTier: 'pro' }, { subscriptionTier: 'pro' }]
    expect(getSeatCounts(children)).toEqual({ pro: 3, plus: 0 })
  })

  it('counts Plus members separately and leaves the owner Pro seat intact', () => {
    const children = [{ subscriptionTier: 'pro' }, { subscriptionTier: 'plus' }]
    expect(getSeatCounts(children)).toEqual({ pro: 2, plus: 1 })
  })

  it('never charges for Free members', () => {
    const children = [{ subscriptionTier: 'free' }, { subscriptionTier: 'free' }, { subscriptionTier: 'plus' }]
    expect(getSeatCounts(children)).toEqual({ pro: 1, plus: 1 })
  })

  it('treats a null tier as unpaid (free)', () => {
    expect(getSeatCounts([{ subscriptionTier: null }])).toEqual({ pro: 1, plus: 0 })
  })
})
