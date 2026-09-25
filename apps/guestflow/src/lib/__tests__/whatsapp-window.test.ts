import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getWindowState } from '@/lib/wa-window'

const getCareWindowForThread = vi.fn()

vi.mock('@/lib/whatsapp-care-window', () => ({
  getCareWindowForThread: (...args: unknown[]) => getCareWindowForThread(...args),
}))

describe('getWindowState (wa-window port)', () => {
  beforeEach(() => {
    getCareWindowForThread.mockReset()
  })

  it('returns open when care window is not closed', async () => {
    getCareWindowForThread.mockResolvedValue({
      state: 'open',
      windowExpiresAt: '2026-09-25T12:00:00.000Z',
    })
    const state = await getWindowState({} as any, 42)
    expect(state.open).toBe(true)
    expect(state.closesAt).toBe('2026-09-25T12:00:00.000Z')
  })

  it('returns closed when care window is closed', async () => {
    getCareWindowForThread.mockResolvedValue({
      state: 'closed',
      windowExpiresAt: null,
    })
    const state = await getWindowState({} as any, 42)
    expect(state.open).toBe(false)
  })
})
