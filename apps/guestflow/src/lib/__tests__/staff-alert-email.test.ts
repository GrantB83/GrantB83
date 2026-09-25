import { describe, expect, it } from 'vitest'
import { alertBodyIsSafe, composeStaffAlertText, sanitizeAlertText } from '@/lib/staff-alert-email'

describe('staff alert body safety', () => {
  it('includes first name, booking ref, and link only', () => {
    const { text } = composeStaffAlertText({
      kind: 'unanswered',
      guestFirstName: 'Lerato Molefe',
      bookingRef: '12345678',
      staffLink: 'https://guestflow.thebrowns.co.za/?thread=9',
    })
    expect(text).toContain('Lerato')
    expect(text).not.toContain('Molefe')
    expect(text).toContain('12345678')
    expect(text).toContain('/?thread=9')
    expect(alertBodyIsSafe(text)).toBe(true)
  })

  it('strips access codes and payment text', () => {
    const dirty = sanitizeAlertText('Gate code 1234\nDeposit ZAR 1500\nGuest: Ann')
    expect(dirty).not.toMatch(/gate code/i)
    expect(dirty).not.toMatch(/deposit/i)
    expect(dirty).toContain('Guest: Ann')
  })
})
