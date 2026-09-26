import { describe, expect, it } from 'vitest'
import {
  buildPortalClockFixture,
  isPortalClockFixtureCode,
  PORTAL_CLOCK_FIXTURE_PATHS,
} from '../portal-clock-fixture'
import { PORTAL_POST_SECURITY_COPY, PORTAL_PRE_SECURITY_COPY, PORTAL_SSID } from '../portal-security'
import { THEBROWNS_HOME_URL } from '../room-catalog'

describe('portal-clock-fixture', () => {
  it('recognizes documented clock codes only', () => {
    expect(isPortalClockFixtureCode('fixture-pre')).toBe(true)
    expect(isPortalClockFixtureCode('fixture-in')).toBe(true)
    expect(isPortalClockFixtureCode('fixture-post')).toBe(true)
    expect(isPortalClockFixtureCode('abcdefghijklmnopqrstuvwxyz0123456789')).toBe(false)
  })

  it('pre-window shows rooms and clock copy without secrets', () => {
    const data = buildPortalClockFixture('fixture-pre')
    expect(data.stayPacket.securityOpen).toBe(false)
    expect(data.stayPacket.accessCodes.message).toBe(PORTAL_PRE_SECURITY_COPY)
    expect(data.stayPacket.wifi.network).toBe('')
    expect(data.stayPacket.wifi.password).toBe('')
    expect(data.stayPacket.accessCodes.gateCode).toBe('')
    expect(data.rooms[0].publicUrl).toBe(THEBROWNS_HOME_URL)
    expect(PORTAL_CLOCK_FIXTURE_PATHS['fixture-pre']).toBe('/guest/fixture-pre')
  })

  it('in-window shows SSID only and invents no codes or password', () => {
    const data = buildPortalClockFixture('fixture-in')
    expect(data.stayPacket.securityOpen).toBe(true)
    expect(data.stayPacket.wifi.network).toBe(PORTAL_SSID)
    expect(data.stayPacket.wifi.password).toBe('')
    expect(data.stayPacket.accessCodes.available).toBe(false)
    expect(data.stayPacket.accessCodes.lockboxCode).toBe('')
  })

  it('post-departure rescinds security', () => {
    const data = buildPortalClockFixture('fixture-post')
    expect(data.stayPacket.securityOpen).toBe(false)
    expect(data.stayPacket.accessCodes.message).toBe(PORTAL_POST_SECURITY_COPY)
    expect(data.stayPacket.wifi.network).toBe('')
    expect(data.stayPacket.wifi.password).toBe('')
    expect(data.nextStay?.enabled).toBe(true)
  })
})
