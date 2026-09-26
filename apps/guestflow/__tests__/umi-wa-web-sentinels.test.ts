import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isStaffWaWebSentinelBody, last4Identity } from '@/lib/wa-web-body'
import { shouldClearFilteredForRecoveredStay } from '@/lib/umi-spam'

const listWaWebSentinelTargets = vi.fn()
const applyRecoveredStayHygiene = vi.fn()
const ingestInboundMessage = vi.fn()

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => ({ prepare: vi.fn(), exec: vi.fn(), batch: vi.fn() })),
  getDefaultTenantIdAsync: vi.fn(async () => 1),
}))

vi.mock('@/lib/umi-threads', async () => {
  const actual = await vi.importActual<typeof import('@/lib/umi-threads')>('@/lib/umi-threads')
  return {
    ...actual,
    listWaWebSentinelTargets: (...args: unknown[]) => listWaWebSentinelTargets(...args),
    applyRecoveredStayHygiene: (...args: unknown[]) => applyRecoveredStayHygiene(...args),
  }
})

vi.mock('@/lib/inbound-ingest', () => ({
  ingestInboundMessage: (...args: unknown[]) => ingestInboundMessage(...args),
}))

describe('WA Web cheap bodies', () => {
  beforeEach(() => {
    listWaWebSentinelTargets.mockReset()
    applyRecoveredStayHygiene.mockReset()
    ingestInboundMessage.mockReset()
    listWaWebSentinelTargets.mockResolvedValue([
      {
        threadId: 46,
        messageId: 248,
        sentinel: '[body unavailable]',
        bookerName: 'Ada Booker',
        last4: '4567',
        bookingLinked: true,
      },
    ])
    applyRecoveredStayHygiene.mockResolvedValue(0)
  })

  it('lists only exact staff sentinels and last4 identity', async () => {
    expect(isStaffWaWebSentinelBody('[body unavailable]')).toBe(true)
    expect(isStaffWaWebSentinelBody('[metadata-only]')).toBe(true)
    expect(isStaffWaWebSentinelBody('[observe-probe]')).toBe(false)
    expect(last4Identity('+27821234567')).toBe('4567')
    const { GET } = await import('@/app/api/umi/wa-web/sentinels/route')
    const response = await GET(new Request('http://localhost:3100/api/umi/wa-web/sentinels') as any)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.sentinels[0].threadId).toBe(46)
    expect(data.sentinels[0].sentinel).toBe('[body unavailable]')
    expect(data.sentinels[0].last4).toBe('4567')
  })

  it('refresh without source text leaves sentinels and returns next action', async () => {
    const { POST } = await import('@/app/api/umi/threads/[id]/refresh-bodies/route')
    const response = await POST(
      new Request('http://localhost:3100/api/umi/threads/46/refresh-bodies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }) as any,
      { params: { id: '46' } }
    )
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.remainingSentinels).toBe(1)
    expect(data.nextAction).toMatch(/one-shot observe/i)
    expect(data.nextAction).toMatch(/Do not invent/)
    expect(ingestInboundMessage).not.toHaveBeenCalled()
  })

  it('refresh with real text uses Ship B ingest and reports replaced', async () => {
    ingestInboundMessage.mockResolvedValue({
      success: true,
      replaced: true,
      messageId: 248,
      threadId: 46,
    })
    listWaWebSentinelTargets.mockResolvedValue([])
    applyRecoveredStayHygiene.mockResolvedValue(2)
    const { POST } = await import('@/app/api/umi/threads/[id]/refresh-bodies/route')
    const response = await POST(
      new Request('http://localhost:3100/api/umi/threads/46/refresh-bodies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              from: '+27821234567',
              text: 'What time is garden check-in?',
              timestamp: '2026-09-26T00:23:00.000Z',
              externalMessageId: 'waweb-248',
            },
          ],
        }),
      }) as any,
      { params: { id: '46' } }
    )
    const data = await response.json()
    expect(ingestInboundMessage).toHaveBeenCalled()
    expect(data.success).toBe(true)
    expect(data.replaced).toBe(1)
    expect(data.filteredCleared).toBe(2)
    expect(data.remainingSentinels).toBe(0)
  })

  it('clears Filtered only for recovered booking-linked stay text', () => {
    expect(
      shouldClearFilteredForRecoveredStay({
        recoveredBody: 'Can we check in after 14:00?',
        bookingLinked: true,
      })
    ).toBe(true)
    expect(
      shouldClearFilteredForRecoveredStay({
        recoveredBody: '[body unavailable]',
        bookingLinked: true,
      })
    ).toBe(false)
    expect(
      shouldClearFilteredForRecoveredStay({
        recoveredBody: 'Can we check in after 14:00?',
        bookingLinked: false,
      })
    ).toBe(false)
    expect(
      shouldClearFilteredForRecoveredStay({
        recoveredBody: 'Congratulations you are a winner claim your prize bitcoin',
        bookingLinked: true,
      })
    ).toBe(false)
  })
})
