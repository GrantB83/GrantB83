import { describe, expect, it } from 'vitest'
import {
  isPortalSecurityOpen,
  PORTAL_POST_SECURITY_COPY,
  PORTAL_PRE_SECURITY_COPY,
  portalSecurityCopy,
} from '../portal-security'

describe('portal-security', () => {
  it('stays closed before check-in day 14:00 SAST', () => {
    const before = new Date('2026-09-26T11:59:00.000Z') // 13:59 SAST 26 Sep
    expect(isPortalSecurityOpen('2026-09-26', '2026-09-28', before)).toBe(false)
    expect(portalSecurityCopy('2026-09-26', '2026-09-28', before).message).toBe(
      PORTAL_PRE_SECURITY_COPY
    )
  })

  it('opens at check-in 14:00 SAST', () => {
    const open = new Date('2026-09-26T12:00:00.000Z') // 14:00 SAST 26 Sep
    expect(isPortalSecurityOpen('2026-09-26', '2026-09-28', open)).toBe(true)
  })

  it('closes at departure 12:00 SAST', () => {
    const stillOpen = new Date('2026-09-28T09:59:00.000Z') // 11:59 SAST 28 Sep
    const closed = new Date('2026-09-28T10:00:00.000Z') // 12:00 SAST 28 Sep
    expect(isPortalSecurityOpen('2026-09-26', '2026-09-28', stillOpen)).toBe(true)
    expect(isPortalSecurityOpen('2026-09-26', '2026-09-28', closed)).toBe(false)
    expect(portalSecurityCopy('2026-09-26', '2026-09-28', closed).message).toBe(
      PORTAL_POST_SECURITY_COPY
    )
  })
})
