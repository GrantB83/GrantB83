import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sortInboxThreads } from '@/lib/umi-sort'

const listInboxThreads = vi.fn()

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => ({ prepare: vi.fn(), exec: vi.fn(), batch: vi.fn() })),
  getDefaultTenantIdAsync: vi.fn(async () => 1),
}))

vi.mock('@/lib/umi-threads', async () => {
  const actual = await vi.importActual<typeof import('@/lib/umi-threads')>('@/lib/umi-threads')
  return {
    ...actual,
    listInboxThreads: (...args: unknown[]) => listInboxThreads(...args),
  }
})

describe('GET /api/umi/inbox', () => {
  beforeEach(() => {
    listInboxThreads.mockReset()
    listInboxThreads.mockResolvedValue(
      sortInboxThreads([
        {
          id: 1,
          threadKind: 'booking',
          bookingId: 10,
          bookerName: 'Ada',
          suite: 'Trout',
          checkIn: '2026-09-25',
          checkOut: '2026-09-27',
          nightsbridgeBookingId: 'NB-10',
          lastChannel: 'whatsapp_cloud',
          lastInboundChannel: 'whatsapp_cloud',
          lastMessageAt: '2026-09-24T10:00:00.000Z',
          preview: 'Hi',
          pendingReply: false,
          hasOpenDraft: false,
          needsAttention: false,
          sortBucket: 0,
          hygieneStatus: null,
          fromNumber: '+27821234567',
        },
      ])
    )
  })

  it('returns sorted threads', async () => {
    const { GET } = await import('@/app/api/umi/inbox/route')
    const response = await GET(new Request('http://localhost:3100/api/umi/inbox') as any)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.threads[0].sortBucket).toBe(0)
    expect(listInboxThreads).toHaveBeenCalled()
  })
})
