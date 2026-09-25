import { describe, expect, it } from 'vitest'
import { parseArrivalsDeparturesGrid, pickAdEmail, pickAdPhone } from '@/lib/arrivals-departures-parse'

const HEADERS = [
  'Room Name',
  'Guest Name',
  'Guest 2',
  'Number of Guests',
  'Booking ID',
  'Notes',
  'Nights',
  'Additional',
  'Phone Number',
  'Email',
]

describe('A&D parse', () => {
  it('saves phone and email from arrival columns', () => {
    const parsed = parseArrivalsDeparturesGrid(
      [
        ['Arrival: 10/02/2026'],
        HEADERS,
        ['Garden', 'Alex Fixture', '', '2', '9001', '', '2', '', '+27821119001', 'alex.9001@guest.test'],
      ],
      '2026-10-02'
    )
    expect(parsed.bookings).toHaveLength(1)
    expect(pickAdPhone(parsed.bookings[0])).toBe('+27821119001')
    expect(pickAdEmail(parsed.bookings[0])).toBe('alex.9001@guest.test')
    expect(parsed.bookings[0].bookingId).toBe('9001')
  })

  it('maps a Booking.com relay email without inventing a replacement', () => {
    const parsed = parseArrivalsDeparturesGrid(
      [
        ['Arrival: 10/03/2026'],
        HEADERS,
        [
          'Trout',
          'Relay Guest',
          '',
          '2',
          '9002',
          'Booking.com',
          '1',
          '',
          '+27821119002',
          'relay.9002@guest.booking.com',
        ],
      ],
      '2026-10-03'
    )
    expect(pickAdEmail(parsed.bookings[0])).toBe('relay.9002@guest.booking.com')
    expect(pickAdPhone(parsed.bookings[0])).toBe('+27821119002')
  })

  it('keeps empty contact cells empty and counts BLOCK rows', () => {
    const parsed = parseArrivalsDeparturesGrid(
      [
        ['Arrival: 10/04/2026'],
        HEADERS,
        ['Garden', 'No Contact', '', '2', '9003', '', '1', '', '', ''],
        ['Cove', 'BLOCK', '', '1', '9004', '', '1', '', '', ''],
      ],
      '2026-10-04'
    )
    const guest = parsed.bookings.find((row) => row.bookingId === '9003')
    expect(pickAdPhone(guest!)).toBeUndefined()
    expect(pickAdEmail(guest!)).toBeUndefined()
    expect(parsed.skippedBlocks).toBe(1)
  })
})
