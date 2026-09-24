import { beforeEach, describe, expect, it, vi } from 'vitest'

const ingestInboundMessage = vi.fn()

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => ({ prepare: vi.fn(), exec: vi.fn(), batch: vi.fn() })),
  getDefaultTenantIdAsync: vi.fn(async () => 1),
}))

vi.mock('@/lib/inbound-ingest', () => ({
  ingestInboundMessage: (...args: unknown[]) => ingestInboundMessage(...args),
  verifySharedSecret: () => true,
}))

describe('POST /api/umi/backfill/wa-web', () => {
  beforeEach(() => {
    process.env.INBOUND_WEBHOOK_SECRET = 'whsec'
    ingestInboundMessage.mockReset()
    ingestInboundMessage
      .mockResolvedValueOnce({
        success: true,
        messageId: 1,
        threadId: 4,
        queuedForApproval: true,
        status: 'drafted',
      })
      .mockResolvedValueOnce({
        success: true,
        duplicate: true,
        messageId: 1,
        threadId: 4,
        queuedForApproval: false,
        status: 'duplicate',
      })
  })

  it('accepts in-window messages and counts replay as duplicate', async () => {
    const { POST } = await import('@/app/api/umi/backfill/wa-web/route')
    const now = new Date().toISOString()
    const response = await POST(
      new Request('http://localhost:3100/api/umi/backfill/wa-web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer whsec' },
        body: JSON.stringify({
          messages: [
            {
              from: '+27821234567',
              text: 'Old but in window',
              timestamp: now,
              externalMessageId: 'wamid-a',
            },
            {
              from: '+27821234567',
              text: 'Old but in window',
              timestamp: now,
              externalMessageId: 'wamid-a',
            },
            {
              from: '+27821234567',
              text: 'Too old',
              timestamp: '2020-01-01T00:00:00.000Z',
              externalMessageId: 'wamid-old',
            },
          ],
        }),
      }) as any
    )
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.accepted).toBe(1)
    expect(data.duplicates).toBe(1)
    expect(data.ignoredTooOld).toBe(1)
    expect(data.windowDays).toBe(14)
  })
})
