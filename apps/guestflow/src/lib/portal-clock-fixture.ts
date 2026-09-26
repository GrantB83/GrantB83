/**
 * Documented Guest Portal clock fixtures for QA VERIFY steps 7–9.
 * No live Turso token. No invented gate/lockbox codes or Wi-Fi password.
 */

import { PORTAL_POST_SECURITY_COPY, PORTAL_PRE_SECURITY_COPY, PORTAL_SSID } from './portal-security'
import { roomDisplay, THEBROWNS_HOME_URL } from './room-catalog'

export const PORTAL_CLOCK_FIXTURE_CODES = ['fixture-pre', 'fixture-in', 'fixture-post'] as const

export type PortalClockFixtureCode = (typeof PORTAL_CLOCK_FIXTURE_CODES)[number]

export const PORTAL_CLOCK_FIXTURE_PATHS: Record<PortalClockFixtureCode, string> = {
  'fixture-pre': '/guest/fixture-pre',
  'fixture-in': '/guest/fixture-in',
  'fixture-post': '/guest/fixture-post',
}

export function isPortalClockFixtureCode(value: string | null | undefined): value is PortalClockFixtureCode {
  return PORTAL_CLOCK_FIXTURE_CODES.includes(value as PortalClockFixtureCode)
}

/** Preview + local/dev only. Production (`VERCEL_ENV === 'production'`) must refuse. */
export function portalClockFixturesAllowed(
  env: { VERCEL_ENV?: string | undefined } | NodeJS.ProcessEnv = process.env
): boolean {
  return env.VERCEL_ENV !== 'production'
}

export function buildPortalClockFixture(clock: PortalClockFixtureCode) {
  const room = roomDisplay('Cottage A')
  const securityOpen = clock === 'fixture-in'
  const post = clock === 'fixture-post'

  return {
    fixtureClock: clock,
    booking: {
      id: 101,
      guestName: 'Alex Guest',
      checkInDate: '2026-10-01',
      checkOutDate: '2026-10-04',
      suiteOrUnit: room.displayName,
      propertyName: 'The Browns Dullstroom',
      adults: 2,
      children: 0,
      notes: '',
      guestPhone: '',
      guestEmail: '',
    },
    property: {
      name: 'The Browns Dullstroom',
      displayName: 'The Browns Dullstroom',
      location: 'Dullstroom, Mpumalanga, South Africa',
      address: '',
      mapsUrl: '',
      contact: {
        phone: '',
        email: 'stay@thebrowns.co.za',
        whatsapp: '+27600200825',
      },
    },
    rooms: [
      {
        ...room,
        publicUrl: THEBROWNS_HOME_URL,
      },
    ],
    stayPacket: {
      securityOpen,
      wifi: {
        network: securityOpen ? PORTAL_SSID : '',
        password: '',
      },
      accessCodes: {
        available: false,
        gateCode: '',
        doorCode: '',
        lockboxCode: '',
        message: securityOpen
          ? ''
          : post
            ? PORTAL_POST_SECURITY_COPY
            : PORTAL_PRE_SECURITY_COPY,
      },
      checkIn: { from: '14:00', to: '' },
      checkOut: { by: '10:00' },
      parking: {
        instructions: 'Parking details will be provided upon arrival',
      },
      directions:
        'Directions to The Browns will be provided closer to your arrival date.\n\nPlease contact us if you need specific directions or have any questions about finding the property.',
      houseRules: [
        'Check-in: From 14:00 | Check-out: 10:00',
        'Housekeepers available at 279 Blue Crane Drive until 5 PM',
        'Quiet hours: 22:00 - 07:00',
        'No smoking inside the suites',
        'Please respect the property and fellow guests',
      ],
      emergencyContact: '',
    },
    nextStay: post
      ? {
          enabled: true,
          title: 'Book Your Next Stay',
          url: 'https://book.nightsbridge.com/24299?promocode=WEBDIRECT',
          message: 'Enjoyed your stay? Book direct and save on your next visit!',
        }
      : null,
  }
}
