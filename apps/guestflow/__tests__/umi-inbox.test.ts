import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sastDateString, sortInboxThreads } from '@/lib/umi-sort'

const listInboxPage = vi.fn()

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => ({ prepare: vi.fn(), exec: vi.fn(), batch: vi.fn() })),
  getDefaultTenantIdAsync: vi.fn(async () => 1),
}))

vi.mock('@/lib/umi-threads', async () => {
  const actual = await vi.importActual<typeof import('@/lib/umi-threads')>('@/lib/umi-threads')
  return {
    ...actual,
    listInboxPage: (...args: unknown[]) => listInboxPage(...args),
  }
})

const sampleThread = {
  id: 1,
  threadKind: 'booking' as const,
  bookingId: 10,
  bookerName: 'Ada',
  suite: 'Trout',
  checkIn: sastDateString(),
  checkOut: '2026-09-27',
  nightsbridgeBookingId: 'NB-10',
  lastChannel: 'whatsapp_cloud',
  lastInboundChannel: 'whatsapp_cloud',
  lastMessageAt: '2026-09-24T10:00:00.000Z',
  preview: 'Hi',
  pendingReply: false,
  hasOpenDraft: false,
  needsAttention: false,
  sortBucket: 0 as const,
  hygieneStatus: null,
  fromNumber: '+27821234567',
}

describe('GET /api/umi/inbox', () => {
  beforeEach(() => {
    listInboxPage.mockReset()
    listInboxPage.mockResolvedValue({
      threads: sortInboxThreads([sampleThread]),
      limit: 25,
      cursor: null,
      nextCursor: null,
      hasMore: false,
    })
  })

  it('returns sorted threads', async () => {
    const { GET } = await import('@/app/api/umi/inbox/route')
    const response = await GET(new Request('http://localhost:3100/api/umi/inbox') as any)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.threads[0].sortBucket).toBe(0)
    expect(data.limit).toBe(25)
    expect(listInboxPage).toHaveBeenCalled()
    expect(response.headers.get('cache-control')).toMatch(/no-store/)
  })

  it('honors limit and returns nextCursor metadata', async () => {
    listInboxPage.mockResolvedValue({
      threads: sortInboxThreads([sampleThread]),
      limit: 10,
      cursor: null,
      nextCursor: '2026-09-24T10:00:00.000Z:1',
      hasMore: true,
    })
    const { GET } = await import('@/app/api/umi/inbox/route')
    const response = await GET(new Request('http://localhost:3100/api/umi/inbox?limit=10') as any)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.limit).toBe(10)
    expect(data.threads).toHaveLength(1)
    expect(data.hasMore).toBe(true)
    expect(data.nextCursor).toBeTruthy()
    expect(listInboxPage.mock.calls[0][2]).toMatchObject({ limit: 10 })
  })

  it('GET /api/umi/inbox is a read-only list (no ensureArriving write hook)', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const source = fs.readFileSync(
      path.join(__dirname, '../src/app/api/umi/inbox/route.ts'),
      'utf8'
    )
    expect(source).not.toContain('ensureArrivingBookingThreads')
    expect(source).not.toContain('applyTempHygiene')
    expect(source).not.toContain('ensureUmiSchema')
    expect(source).toContain('parseInboxLimit')
    expect(source).toContain('listInboxPage')
  })
})
