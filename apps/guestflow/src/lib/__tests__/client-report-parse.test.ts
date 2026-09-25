import { describe, expect, it } from 'vitest'
import { parseClientReportGrid, normalizeClientBookingId } from '@/lib/client-report-parse'

describe('Client report parse', () => {
  it('maps labelled Name / Phone / Email / Booking ID columns', () => {
    const rows = parseClientReportGrid([
      ['Client Name', 'Telephone', 'Email', 'Booking ID'],
      ['Alex Fixture', '+27821119010', 'gapfill.9010@guest.test', '9010'],
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].guestName).toBe('Alex Fixture')
    expect(rows[0].phone).toBe('+27821119010')
    expect(rows[0].email).toBe('gapfill.9010@guest.test')
    expect(normalizeClientBookingId(rows[0].bookingId)).toBe('9010')
  })

  it('ignores unknown columns and empty rows', () => {
    const rows = parseClientReportGrid([
      ['Foo', 'Client Name', 'Bar'],
      ['x', '', ''],
      ['x', 'Sam Guest', 'y'],
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].guestName).toBe('Sam Guest')
    expect(rows[0].phone).toBeUndefined()
  })
})
