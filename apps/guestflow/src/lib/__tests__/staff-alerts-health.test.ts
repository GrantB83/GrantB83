import { describe, expect, it } from 'vitest'
import { healthAlertAction, nextHealthStreak } from '@/lib/staff-alerts'

describe('site-down health streak', () => {
  it('does not alert after a single failure', () => {
    expect(nextHealthStreak(0, false)).toBe(1)
    expect(
      healthAlertAction({ previousStreak: 0, ok: false, alreadyAlerted: false })
    ).toBe('none')
  })

  it('alerts after two consecutive failures', () => {
    expect(nextHealthStreak(1, false)).toBe(2)
    expect(
      healthAlertAction({ previousStreak: 1, ok: false, alreadyAlerted: false })
    ).toBe('site_down')
  })

  it('sends recovery after an alerted-down success', () => {
    expect(nextHealthStreak(2, true)).toBe(0)
    expect(
      healthAlertAction({ previousStreak: 2, ok: true, alreadyAlerted: true })
    ).toBe('site_recovery')
  })

  it('does not alert if a single failure is followed by success', () => {
    expect(
      healthAlertAction({ previousStreak: 1, ok: true, alreadyAlerted: false })
    ).toBe('none')
  })
})
