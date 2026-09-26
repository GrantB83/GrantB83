import { describe, expect, it } from 'vitest'
import {
  dueJourneyStages,
  journeyDueDate,
  JOURNEY_STAGES,
  nightsBetween,
} from '../journey-config'

describe('journey-config', () => {
  it('counts nights from date-only stay bounds', () => {
    expect(nightsBetween('2026-09-26', '2026-09-27')).toBe(1)
    expect(nightsBetween('2026-09-26', '2026-09-29')).toBe(3)
  })

  it('places 4b on T−7 and 4c on arrival day', () => {
    expect(journeyDueDate(JOURNEY_STAGES['4b'], '2026-09-27', '2026-09-29')).toBe('2026-09-20')
    expect(journeyDueDate(JOURNEY_STAGES['4c'], '2026-09-27', '2026-09-29')).toBe('2026-09-27')
    expect(journeyDueDate(JOURNEY_STAGES['4e'], '2026-09-27', '2026-09-29')).toBe('2026-09-29')
  })

  it('emits 4a after the 06:00 floor for current/upcoming stays', () => {
    expect(
      dueJourneyStages({
        checkIn: '2026-10-10',
        checkOut: '2026-10-12',
        todaySast: '2026-09-26',
        hourSast: 6,
      })
    ).toEqual(['4a_email', '4a_wa'])
  })

  it('holds 4c until 08:00 SAST and skips 4d for one-night stays', () => {
    expect(
      dueJourneyStages({
        checkIn: '2026-09-27',
        checkOut: '2026-09-28',
        todaySast: '2026-09-27',
        hourSast: 7,
      })
    ).toEqual(['4a_email', '4a_wa'])
    expect(
      dueJourneyStages({
        checkIn: '2026-09-27',
        checkOut: '2026-09-28',
        todaySast: '2026-09-27',
        hourSast: 8,
      })
    ).toEqual(['4a_email', '4a_wa', '4c'])
    expect(
      dueJourneyStages({
        checkIn: '2026-09-27',
        checkOut: '2026-09-28',
        todaySast: '2026-09-28',
        hourSast: 8,
      })
    ).not.toContain('4d')
  })

  it('emits comfort 4d the morning after first night when nights > 1', () => {
    expect(
      dueJourneyStages({
        checkIn: '2026-09-26',
        checkOut: '2026-09-29',
        todaySast: '2026-09-27',
        hourSast: 8,
      })
    ).toContain('4d')
  })

  it('holds 4g until 17:00 SAST on departure day', () => {
    const morning = dueJourneyStages({
      checkIn: '2026-09-26',
      checkOut: '2026-09-29',
      todaySast: '2026-09-29',
      hourSast: 8,
    })
    expect(morning).toContain('4e')
    expect(morning).not.toContain('4g')
    expect(
      dueJourneyStages({
        checkIn: '2026-09-26',
        checkOut: '2026-09-29',
        todaySast: '2026-09-29',
        hourSast: 17,
      })
    ).toContain('4g')
  })
})
