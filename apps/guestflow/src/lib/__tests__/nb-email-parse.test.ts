import { describe, expect, it } from 'vitest'
import { parseNbEmail, propertyAllowed } from '@/lib/nb-email-parse'

describe('NB email parse', () => {
  it('parses a Browns NEW_BOOKING', () => {
    const parsed = parseNbEmail({
      from: 'booking@nightsbridge.co.za',
      subject: 'Booking for The Browns (24299) - Booking.com, Friday, 25 Sep 2026',
      text: `Guest name: Lerato Guest\nEmail: guest@example.com\nTel: 0821234567\nArrive: Friday, 25 Sep 2026\nDepart: Sunday, 27 Sep 2026\nNB-12345678\nNotes: OTA 888 phone 0821234567`,
    })
    expect(parsed.status).toBe('ok')
    expect(parsed.type).toBe('NEW_BOOKING')
    expect(parsed.nbRef).toBe('12345678')
    expect(parsed.fields.guest_name).toBe('Lerato Guest')
  })

  it('parses OTA cancellation, TravelIT, and payment without card digits', () => {
    expect(
      parseNbEmail({ subject: 'Cancellation of Booking ID - 12345678', text: 'Guest: Ann\nArrive: 2026-10-01' }).type
    ).toBe('OTA_CANCELLATION')
    expect(
      parseNbEmail({ subject: 'TravelIT confirmation for booking ID 12345678', text: 'Guest name: Pat\nEmail: pat@example.com' }).nbRef
    ).toBe('12345678')
    const payment = parseNbEmail({
      subject: 'Credit card payment - Booking No.: 12345678',
      text: 'Amount: 1500\nCard: 4111111111111111',
    })
    expect(payment.type).toBe('PAYMENT')
    expect(JSON.stringify(payment.fields)).not.toMatch(/4111111111111111/)
  })

  it('ignores sister properties and newsletters', () => {
    expect(propertyAllowed('18053', 'Other lodge')).toBe(false)
    const ignored = parseNbEmail({
      from: 'info@nightsbridge.co.za',
      subject: 'Monthly stats for The Browns',
      text: 'hello',
    })
    expect(ignored.status).toBe('ignored')
  })

  it('fails closed when a required NEW field is missing', () => {
    const parsed = parseNbEmail({
      subject: 'Booking for The Browns (24299) - website, Friday, 25 Sep 2026',
      text: 'Arrive: Friday, 25 Sep 2026',
    })
    expect(parsed.status).toBe('parse_failed')
  })
})
