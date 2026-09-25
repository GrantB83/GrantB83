import { describe, expect, it } from 'vitest'
import { classifyEmail, classifyPhone } from '@/lib/nb-gaps'

describe('NB gap detection', () => {
  it('treats empty, short, placeholder, and intermediary phones as missing', () => {
    expect(classifyPhone('').missing).toBe(true)
    expect(classifyPhone('12345').missing).toBe(true)
    expect(classifyPhone('0000000000').kind).toBe('placeholder')
    expect(classifyPhone('0821234567').missing).toBe(false)
  })

  it('flags relay-only emails without treating them as missing outreach phones', () => {
    const relay = classifyEmail('guest.123@guest.booking.com')
    expect(relay.relayOnly).toBe(true)
    expect(relay.missing).toBe(false)
    expect(classifyEmail('bookings@lekkeslaap.co.za').kind).toBe('intermediary')
    expect(classifyEmail('none@none.com').kind).toBe('placeholder')
    expect(classifyEmail('stay@thebrowns.co.za').kind).toBe('intermediary')
  })
})
