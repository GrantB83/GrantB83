import { describe, expect, it } from 'vitest'
import {
  OPS_SETTINGS,
  classifyUnanswered,
  isDigestWindow,
  isWithinStaffHours,
  toSastParts,
} from '@/lib/ops-settings'

function sast(isoUtc: string): Date {
  return new Date(isoUtc)
}

describe('ops-settings', () => {
  it('exposes the shared Sprint 2 thresholds once', () => {
    expect(OPS_SETTINGS.unansweredMinutes).toBe(30)
    expect(OPS_SETTINGS.staffHoursStartHour).toBe(7)
    expect(OPS_SETTINGS.staffHoursEndHour).toBe(21)
    expect(OPS_SETTINGS.nbMissedImportHours).toBe(14)
    expect(OPS_SETTINGS.alertCooldownHours).toBe(2)
    expect(OPS_SETTINGS.healthFailThreshold).toBe(2)
    expect(OPS_SETTINGS.massCancelDropRatio).toBe(0.5)
    expect(OPS_SETTINGS.timezone).toBe('Africa/Johannesburg')
  })

  it('treats 07:00 SAST as inside staff hours and 21:00 SAST as outside', () => {
    // 05:00 UTC = 07:00 SAST
    expect(isWithinStaffHours(sast('2026-09-25T05:00:00.000Z'))).toBe(true)
    expect(toSastParts(sast('2026-09-25T05:00:00.000Z')).hour).toBe(7)
    // 19:00 UTC = 21:00 SAST
    expect(isWithinStaffHours(sast('2026-09-25T19:00:00.000Z'))).toBe(false)
    expect(toSastParts(sast('2026-09-25T19:00:00.000Z')).hour).toBe(21)
  })

  it('waits before 30 minutes and alerts at 30 minutes during staff hours', () => {
    const inbound = sast('2026-09-25T08:00:00.000Z') // 10:00 SAST
    expect(classifyUnanswered({ inboundAt: inbound, now: sast('2026-09-25T08:29:00.000Z') })).toBe('wait')
    expect(classifyUnanswered({ inboundAt: inbound, now: sast('2026-09-25T08:30:00.000Z') })).toBe('alert')
  })

  it('holds overnight and after-hours 30-minute crossings for the digest', () => {
    const overnight = sast('2026-09-24T20:05:00.000Z') // 22:05 SAST
    expect(classifyUnanswered({ inboundAt: overnight, now: sast('2026-09-25T04:40:00.000Z') })).toBe('digest')
    const lateAfternoon = sast('2026-09-25T18:45:00.000Z') // 20:45 SAST; +30m = 21:15
    expect(classifyUnanswered({ inboundAt: lateAfternoon, now: sast('2026-09-25T19:20:00.000Z') })).toBe('digest')
  })

  it('opens the digest window at 07:00 SAST', () => {
    expect(isDigestWindow(sast('2026-09-25T05:00:00.000Z'))).toBe(true)
    expect(isDigestWindow(sast('2026-09-25T04:59:00.000Z'))).toBe(false)
  })
})
