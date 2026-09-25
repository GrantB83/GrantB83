import { describe, expect, it } from 'vitest'
import {
  computeCareWindow,
  formatWindowLabel,
  isWabaCloudInbound,
} from '@/lib/whatsapp-care-window'

describe('WhatsApp 24h care window', () => {
  it('is open 10 hours after a Cloud inbound', () => {
    const last = new Date('2026-09-25T08:00:00.000Z')
    const now = new Date('2026-09-25T18:00:00.000Z')
    const window = computeCareWindow(last.toISOString(), now)
    expect(window.state).toBe('open')
    expect(window.label).toBe('Window open, closes in 14h 0m')
    expect(window.windowExpiresAt).toBe('2026-09-26T08:00:00.000Z')
  })

  it('closes at the exact 24h edge', () => {
    const last = new Date('2026-09-24T12:00:00.000Z')
    const now = new Date('2026-09-25T12:00:00.000Z')
    const window = computeCareWindow(last.toISOString(), now)
    expect(window.state).toBe('closed')
    expect(window.label).toBe('Window closed')
    expect(window.remainingMs).toBe(0)
  })

  it('is closed 1 minute after 24h', () => {
    const last = new Date('2026-09-24T12:00:00.000Z')
    const now = new Date('2026-09-25T12:01:00.000Z')
    expect(computeCareWindow(last.toISOString(), now).state).toBe('closed')
  })

  it('uses elapsed UTC time, not SAST calendar midnight', () => {
    const last = '2026-09-24T22:00:00.000Z'
    const nowSastMorning = new Date('2026-09-25T06:00:00.000Z')
    const window = computeCareWindow(last, nowSastMorning)
    expect(window.state).toBe('open')
    expect(window.label).toBe('Window open, closes in 16h 0m')
  })

  it('marks closing_soon at 5 minutes remaining', () => {
    const last = new Date('2026-09-24T12:00:00.000Z')
    const now = new Date('2026-09-25T11:56:00.000Z')
    const window = computeCareWindow(last.toISOString(), now)
    expect(window.state).toBe('closing_soon')
    expect(window.closingSoon).toBe(true)
    expect(window.label).toBe('Window open, closes in 0h 4m')
  })

  it('is closed when there is no Cloud inbound', () => {
    expect(computeCareWindow(null).state).toBe('closed')
  })

  it('does not treat WhatsApp Web observe as a window opener', () => {
    expect(
      isWabaCloudInbound({
        direction: 'inbound',
        channel: 'whatsapp_web',
        sourceTag: 'whatsapp_web',
      })
    ).toBe(false)
    expect(
      isWabaCloudInbound({
        direction: 'inbound',
        channel: 'whatsapp_cloud',
        sourceTag: 'twilio_whatsapp',
      })
    ).toBe(true)
    expect(
      isWabaCloudInbound({
        direction: 'outbound',
        channel: 'whatsapp_cloud',
        sourceTag: 'twilio_whatsapp',
      })
    ).toBe(false)
  })

  it('formats closed and open labels', () => {
    expect(formatWindowLabel('closed', 0)).toBe('Window closed')
    expect(formatWindowLabel('open', 90 * 60 * 1000)).toBe('Window open, closes in 1h 30m')
  })
})
