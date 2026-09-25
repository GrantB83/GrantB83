import { describe, expect, it } from 'vitest'
import { applyFieldWrite, shouldTripMassCancelGuard } from '@/lib/nb-reconcile'

describe('NB reconciliation conflict matrix', () => {
  it('lets report win dates unless the email is newer', () => {
    const report = applyFieldWrite({
      field: 'check_in',
      current: { value: '2026-09-25', source: 'email', at: '2026-09-24T10:00:00.000Z' },
      incoming: { value: '2026-09-26', source: 'report', at: '2026-09-25T08:00:00.000Z' },
    })
    expect(report.action).toBe('write')
    const olderEmail = applyFieldWrite({
      field: 'check_in',
      current: { value: '2026-09-26', source: 'report', at: '2026-09-25T08:00:00.000Z' },
      incoming: { value: '2026-09-25', source: 'email', at: '2026-09-24T10:00:00.000Z' },
    })
    expect(olderEmail.action).toBe('keep')
    const newerEmail = applyFieldWrite({
      field: 'check_in',
      current: { value: '2026-09-26', source: 'report', at: '2026-09-25T08:00:00.000Z' },
      incoming: { value: '2026-09-27', source: 'email', at: '2026-09-25T12:00:00.000Z' },
    })
    expect(newerEmail.action).toBe('write')
  })

  it('never overwrites verified contacts and records later diffs as alt', () => {
    const frozen = applyFieldWrite({
      field: 'guest_phone',
      current: { value: '+27820000000', verified: 'staff_verified' },
      incoming: { value: '+27821234567', source: 'report' },
    })
    expect(frozen.action).toBe('alt')
  })

  it('trips the mass-cancel guard above 50%', () => {
    expect(shouldTripMassCancelGuard(10, 6)).toBe(true)
    expect(shouldTripMassCancelGuard(10, 5)).toBe(false)
  })

  it('keeps email amounts over an older report', () => {
    const keep = applyFieldWrite({
      field: 'amount',
      current: { value: '1500', source: 'email', at: '2026-09-25T10:00:00.000Z' },
      incoming: { value: '1400', source: 'report', at: '2026-09-25T09:00:00.000Z' },
    })
    expect(keep.action).toBe('keep')
  })
})
