import { describe, expect, it } from 'vitest'
import {
  CONTACT_SOURCE_RANK,
  classifyEmailKind,
  isBlockGuestName,
  isRelayEmail,
  mayReplaceContactField,
} from '@/lib/contact-provenance'

describe('contact provenance', () => {
  it('ranks A&D above staff, guest, client report, and stay@', () => {
    expect(CONTACT_SOURCE_RANK.arrivals_departures).toBeGreaterThan(CONTACT_SOURCE_RANK.staff)
    expect(CONTACT_SOURCE_RANK.staff).toBeGreaterThan(CONTACT_SOURCE_RANK.guest)
    expect(CONTACT_SOURCE_RANK.guest).toBeGreaterThan(CONTACT_SOURCE_RANK.client_report)
    expect(CONTACT_SOURCE_RANK.client_report).toBeGreaterThan(CONTACT_SOURCE_RANK.stay_at)
  })

  it('flags Booking.com and other listed OTA relays', () => {
    expect(isRelayEmail('guest.name@guest.booking.com')).toBe(true)
    expect(isRelayEmail('abc@m.expediapartnercentral.com')).toBe(true)
    expect(isRelayEmail('stay@guest.airbnb.com')).toBe(true)
    expect(isRelayEmail('x@agoda-messaging.com')).toBe(true)
    expect(isRelayEmail('bookings@lekkeslaap.co.za')).toBe(true)
    expect(isRelayEmail('reservations@travelground.com')).toBe(true)
    expect(classifyEmailKind('guest.name@guest.booking.com')).toBe('relay')
    expect(classifyEmailKind('alex.5667@guest.test')).toBe('direct')
    expect(isRelayEmail('alex.5667@guest.test')).toBe(false)
  })

  it('lets stay@ replace an A&D relay with a direct address only', () => {
    expect(
      mayReplaceContactField({
        incomingSource: 'stay_at',
        incomingKind: 'direct',
        storedSource: 'arrivals_departures',
        storedKind: 'relay',
        storedValue: 'x@guest.booking.com',
      })
    ).toBe(true)
    expect(
      mayReplaceContactField({
        incomingSource: 'stay_at',
        incomingKind: 'direct',
        storedSource: 'arrivals_departures',
        storedKind: 'direct',
        storedValue: 'booker@example.com',
      })
    ).toBe(false)
  })

  it('never lets a lower rank overwrite a higher one', () => {
    expect(
      mayReplaceContactField({
        incomingSource: 'client_report',
        storedSource: 'arrivals_departures',
        storedValue: '+27820000001',
      })
    ).toBe(false)
    expect(
      mayReplaceContactField({
        incomingSource: 'guest',
        storedSource: 'staff',
        storedValue: '+27820000001',
      })
    ).toBe(false)
  })

  it('treats a stored value with no source as A&D', () => {
    expect(
      mayReplaceContactField({
        incomingSource: 'client_report',
        storedSource: null,
        storedValue: '+27820000001',
      })
    ).toBe(false)
    expect(
      mayReplaceContactField({
        incomingSource: 'stay_at',
        incomingKind: 'direct',
        storedSource: null,
        storedKind: 'relay',
        storedValue: 'x@guest.booking.com',
      })
    ).toBe(true)
  })

  it('treats BLOCK rows as non-guests', () => {
    expect(isBlockGuestName('BLOCK')).toBe(true)
    expect(isBlockGuestName('BLOCK Garden')).toBe(true)
    expect(isBlockGuestName('Alex Fixture')).toBe(false)
  })
})
