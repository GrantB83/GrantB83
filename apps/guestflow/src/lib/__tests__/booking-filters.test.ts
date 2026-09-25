import { describe, expect, it } from 'vitest'
import {
  ACTIVE_GUEST_BOOKING_SQL,
  CODES_UNRESOLVED_REASON,
  filterActiveGuestBookings,
  isActiveGuestBooking,
  isCancelledStatus,
  isOwnerBlock,
} from '../booking-filters'

describe('booking-filters', () => {
  it('treats cancelled, canceled, and no show as cancelled', () => {
    expect(isCancelledStatus('cancelled')).toBe(true)
    expect(isCancelledStatus('Canceled')).toBe(true)
    expect(isCancelledStatus('NO SHOW')).toBe(true)
    expect(isCancelledStatus('confirmed')).toBe(false)
  })

  it('treats upper(trim(guest_name)) = BLOCK as an owner block', () => {
    expect(isOwnerBlock({ guest_name: 'BLOCK' })).toBe(true)
    expect(isOwnerBlock({ guest_name: '  block  ' })).toBe(true)
    expect(isOwnerBlock({ guestName: 'Block' })).toBe(true)
    expect(isOwnerBlock({ guest_name: 'Ada Booker' })).toBe(false)
  })

  it('keeps a normal confirmed booking and drops cancelled + BLOCK', () => {
    const rows = [
      { guest_name: 'Ada Booker', status: 'confirmed' },
      { guest_name: 'Ada Booker', status: 'cancelled' },
      { guest_name: 'BLOCK', status: 'confirmed' },
      { guest_name: 'No Show Guest', status: 'no show' },
    ]
    expect(rows.map(isActiveGuestBooking)).toEqual([true, false, false, false])
    expect(filterActiveGuestBookings(rows)).toHaveLength(1)
    expect(filterActiveGuestBookings(rows)[0].guest_name).toBe('Ada Booker')
  })

  it('exports SQL that excludes cancelled variants and BLOCK', () => {
    expect(ACTIVE_GUEST_BOOKING_SQL).toContain("'cancelled'")
    expect(ACTIVE_GUEST_BOOKING_SQL).toContain("'canceled'")
    expect(ACTIVE_GUEST_BOOKING_SQL).toContain("'no show'")
    expect(ACTIVE_GUEST_BOOKING_SQL).toContain("'BLOCK'")
  })

  it('exports the fail-closed codes reason', () => {
    expect(CODES_UNRESOLVED_REASON).toBe('codes: property unresolved')
  })
})
