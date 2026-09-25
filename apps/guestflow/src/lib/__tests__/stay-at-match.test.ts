import { describe, expect, it } from 'vitest'
import { matchStayAtBooking } from '@/lib/stay-at-match'

const bookings = [
  {
    id: 1,
    guest_name: 'Alex Fixture',
    check_in: '2026-10-02',
    check_out: '2026-10-04',
    nightsbridge_booking_id: '5667',
  },
  {
    id: 2,
    guest_name: 'Other Guest',
    check_in: '2026-10-08',
    check_out: '2026-10-10',
    nightsbridge_booking_id: '5700',
  },
]

describe('stay@ match', () => {
  it('matches a unique booking by ref and dates', () => {
    const hit = matchStayAtBooking(bookings, {
      from: 'alex.stay@guest.test',
      subject: 'Question about booking 5667',
      text: 'Arriving 02 Oct 2026, leaving 04 Oct 2026. Name: Alex Fixture',
    })
    expect(hit?.id).toBe(1)
  })

  it('returns null when two bookings could match the same name without a ref', () => {
    const ambiguous = [
      ...bookings,
      {
        id: 3,
        guest_name: 'Alex Fixture',
        check_in: '2026-11-01',
        check_out: '2026-11-03',
        nightsbridge_booking_id: '5800',
      },
    ]
    const hit = matchStayAtBooking(ambiguous, {
      from: 'alex.stay@guest.test',
      subject: 'Hello',
      text: 'Name: Alex Fixture',
    })
    expect(hit).toBeNull()
  })

  it('returns null when there is no name, ref, or date signal', () => {
    expect(
      matchStayAtBooking(bookings, {
        from: 'stranger@guest.test',
        subject: 'Hi',
        text: 'Just saying hello',
      })
    ).toBeNull()
  })
})
