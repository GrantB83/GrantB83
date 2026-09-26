import { describe, expect, it, vi, beforeEach } from 'vitest'

const ingestInboundMessage = vi.fn()

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => ({
    prepare: vi.fn((query: string) => {
      if (query.includes('SELECT id FROM guest_contacts')) {
        return { get: vi.fn(() => ({ id: 123 })) }
      }
      if (query.includes('SELECT id, guest_phone FROM bookings')) {
        return { all: vi.fn(() => []) }
      }
      if (query.includes('SELECT id FROM inbound_threads') && query.includes('twilio_whatsapp')) {
        return { get: vi.fn(() => ({ id: 88 })) }
      }
      if (query.includes('SELECT * FROM inbound_threads WHERE id')) {
        return {
          get: vi.fn(() => ({
            id: 7,
            source: 'whatsapp_web',
            from_number: '+27821234567',
            status: 'drafted',
            thread_kind: 'booking',
          })),
        }
      }
      return {
        run: vi.fn(() => ({ lastInsertRowid: 21 })),
        get: vi.fn(() => ({ id: 7, status: 'drafted', thread_kind: 'booking' })),
        all: vi.fn(() => []),
      }
    }),
    exec: vi.fn(),
  })),
  getDefaultTenantIdAsync: vi.fn(async () => 1),
}))

vi.mock('@/lib/inbound-ingest', () => ({
  ingestInboundMessage: (...args: unknown[]) => ingestInboundMessage(...args),
  verifySharedSecret: vi.fn(),
}))

describe('POST /api/inbound/webhook source=whatsapp_web', () => {
  beforeEach(() => {
    process.env.INBOUND_WEBHOOK_SECRET = 'whsec'
    ingestInboundMessage.mockReset()
    ingestInboundMessage.mockResolvedValue({
      success: true,
      messageId: 21,
      threadId: 7,
      queuedForApproval: true,
      status: 'drafted',
      spam: false,
    })
    vi.resetModules()
  })

  it('persists a full body instead of metadata-only', async () => {
    const { POST } = await import('@/app/api/inbound/webhook/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer whsec',
        },
        body: JSON.stringify({
          from: '+27821234567',
          text: 'What time is check-in?',
          timestamp: '2026-09-20T12:00:00.000Z',
          source: 'whatsapp_web',
          externalMessageId: 'waweb-full-1',
          metadata: { observedOn: '+27836458313' },
        }),
      }) as any
    )
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.metadataOnly).toBe(false)
    expect(ingestInboundMessage).toHaveBeenCalledWith(
      expect.anything(),
      1,
      expect.objectContaining({
        text: 'What time is check-in?',
        source: 'whatsapp_web',
      })
    )
  })

  it('does not rewrite empty WA Web bodies to a sentinel', async () => {
    ingestInboundMessage.mockResolvedValue({
      success: true,
      skipped: true,
      skipReason: 'empty_or_sentinel_body',
      messageId: 0,
      threadId: 0,
      queuedForApproval: false,
      status: 'skipped',
    })
    const { POST } = await import('@/app/api/inbound/webhook/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer whsec',
        },
        body: JSON.stringify({
          from: '+27821234567',
          timestamp: '2026-09-20T12:00:00.000Z',
          source: 'whatsapp_web',
          externalMessageId: 'waweb-empty',
        }),
      }) as any
    )
    const data = await response.json()
    expect(data.skipped).toBe(true)
    expect(data.reason).toBe('empty_or_sentinel_body')
    expect(ingestInboundMessage).toHaveBeenCalledWith(
      expect.anything(),
      1,
      expect.objectContaining({ text: '' })
    )
    const passed = ingestInboundMessage.mock.calls[0][2] as { text: string }
    expect(passed.text).not.toBe('[body unavailable]')
    expect(passed.text).not.toBe('[metadata-only]')
  })

  it('returns 200 JSON when ids are numeric', async () => {
    ingestInboundMessage.mockResolvedValue({
      success: true,
      messageId: 21,
      threadId: 88,
      queuedForApproval: false,
      status: 'drafted',
    })
    const { POST } = await import('@/app/api/inbound/webhook/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer whsec',
        },
        body: JSON.stringify({
          from: '+27821234567',
          text: 'Hi',
          timestamp: '2026-09-20T12:00:00.000Z',
          source: 'whatsapp_web',
          externalMessageId: 'waweb-bigint-ids',
        }),
      }) as any
    )
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.threadId).toBe(7)
    expect(typeof data.messageId).toBe('number')
  })

  it('returns duplicate from ingest', async () => {
    ingestInboundMessage.mockResolvedValue({
      success: true,
      duplicate: true,
      messageId: 999,
      threadId: 7,
      queuedForApproval: false,
      status: 'duplicate',
    })
    const { POST } = await import('@/app/api/inbound/webhook/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer whsec',
        },
        body: JSON.stringify({
          from: '+27821234567',
          text: 'Hi',
          timestamp: '2026-09-20T12:00:00.000Z',
          source: 'whatsapp_web',
          externalMessageId: 'dup-1',
        }),
      }) as any
    )
    const data = await response.json()
    expect(data.duplicate).toBe(true)
    expect(data.messageId).toBe(999)
  })

  it('rejects payload missing externalMessageId', async () => {
    const { POST } = await import('@/app/api/inbound/webhook/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer whsec',
        },
        body: JSON.stringify({
          from: '+27821234567',
          timestamp: '2026-09-20T12:00:00.000Z',
          source: 'whatsapp_web',
        }),
      }) as any
    )
    const data = await response.json()
    expect(response.status).toBe(400)
    expect(data.error).toContain('externalMessageId')
  })

  it('enforces authentication', async () => {
    const { POST } = await import('@/app/api/inbound/webhook/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer wrong-secret',
        },
        body: JSON.stringify({
          from: '+27821234567',
          text: 'Hi',
          timestamp: '2026-09-20T12:00:00.000Z',
          source: 'whatsapp_web',
          externalMessageId: 'waweb-5',
        }),
      }) as any
    )
    expect(response.status).toBe(401)
  })
})
