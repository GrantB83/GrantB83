import crypto from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => ({ prepare: vi.fn(), exec: vi.fn(), batch: vi.fn() })),
  getDefaultTenantIdAsync: vi.fn(async () => 1),
}))

vi.mock('@/lib/email', async () => {
  const actual = await vi.importActual<typeof import('@/lib/email')>('@/lib/email')
  return {
    ...actual,
    fetchReceivedEmail: vi.fn(),
  }
})

vi.mock('@/lib/inbound-ingest', async () => {
  const actual = await vi.importActual<typeof import('@/lib/inbound-ingest')>('@/lib/inbound-ingest')
  return {
    ...actual,
    ingestInboundMessage: vi.fn(),
  }
})

describe('POST /api/inbound/email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.INBOUND_WEBHOOK_SECRET = 'test-secret'
    delete process.env.RESEND_WEBHOOK_SECRET
  })

  it('rejects missing secret', async () => {
    const { POST } = await import('@/app/api/inbound/email/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'guest@example.com',
          text: 'Hi',
          timestamp: '2026-09-20T12:00:00.000Z',
        }),
      }) as any
    )
    expect(response.status).toBe(401)
  })

  it('ingests a normalized email fixture', async () => {
    const { ingestInboundMessage } = await import('@/lib/inbound-ingest')
    vi.mocked(ingestInboundMessage).mockResolvedValue({
      success: true,
      messageId: 9,
      threadId: 3,
      queuedForApproval: true,
      status: 'drafted',
      classification: {
        intent: 'booking_inquiry',
        confidence: 0.8,
        extractedData: {},
        missingFields: [],
      },
      draftReply: { text: 'Draft', requiresApproval: true, missingInfo: [] },
    })

    const { POST } = await import('@/app/api/inbound/email/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-secret',
        },
        body: JSON.stringify({
          from: 'guest@example.com',
          text: 'Is 12 October available?',
          timestamp: '2026-09-20T12:00:00.000Z',
          source: 'email',
          subject: 'Dates',
          externalMessageId: 'fix-1',
        }),
      }) as any
    )
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.threadId).toBe(3)
    expect(ingestInboundMessage).toHaveBeenCalledWith(
      expect.anything(),
      1,
      expect.objectContaining({
        from: 'guest@example.com',
        source: 'email',
        text: 'Is 12 October available?',
      })
    )
  })

  it('fetches Resend body for email.received metadata', async () => {
    const { fetchReceivedEmail } = await import('@/lib/email')
    const { ingestInboundMessage } = await import('@/lib/inbound-ingest')
    vi.mocked(fetchReceivedEmail).mockResolvedValue({
      text: 'We would like 12-14 Oct',
      subject: 'Dates in October',
    })
    vi.mocked(ingestInboundMessage).mockResolvedValue({
      success: true,
      messageId: 10,
      threadId: 4,
      queuedForApproval: true,
      status: 'drafted',
    })

    const { POST } = await import('@/app/api/inbound/email/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': 'test-secret',
        },
        body: JSON.stringify({
          type: 'email.received',
          created_at: '2026-09-20T12:00:00.000Z',
          data: {
            email_id: 'em_99',
            from: 'guest@example.com',
            subject: 'Dates in October',
          },
        }),
      }) as any
    )
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(fetchReceivedEmail).toHaveBeenCalledWith('em_99')
    expect(ingestInboundMessage).toHaveBeenCalledWith(
      expect.anything(),
      1,
      expect.objectContaining({
        text: 'We would like 12-14 Oct',
        source: 'email',
        externalMessageId: 'em_99',
      })
    )
  })

  it('accepts Resend email.received with valid Svix signature', async () => {
    const svixSecret = 'whsec_dGVzdHNlY3JldA=='
    const svixKey = Buffer.from('testsecret')
    delete process.env.INBOUND_WEBHOOK_SECRET
    process.env.RESEND_INBOUND_WEBHOOK_SECRET = svixSecret

    const { ingestInboundMessage } = await import('@/lib/inbound-ingest')
    vi.mocked(ingestInboundMessage).mockResolvedValue({
      success: true,
      messageId: 11,
      threadId: 5,
      queuedForApproval: true,
      status: 'drafted',
    })

    const body = JSON.stringify({
      from: 'guest@example.com',
      text: 'Svix signed inbound',
      timestamp: '2026-09-20T12:00:00.000Z',
      source: 'email',
    })
    const svixId = 'msg_inbound_1'
    const svixTimestamp = '1726833600'
    const expected = crypto
      .createHmac('sha256', svixKey)
      .update(`${svixId}.${svixTimestamp}.${body}`)
      .digest('base64')

    const { POST } = await import('@/app/api/inbound/email/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': `v1,${expected}`,
        },
        body,
      }) as any
    )
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(ingestInboundMessage).toHaveBeenCalled()
  })

  it('rejects Svix headers with invalid signature', async () => {
    process.env.RESEND_INBOUND_WEBHOOK_SECRET = 'whsec_dGVzdHNlY3JldA=='
    delete process.env.INBOUND_WEBHOOK_SECRET

    const body = JSON.stringify({
      from: 'guest@example.com',
      text: 'Bad sig',
      timestamp: '2026-09-20T12:00:00.000Z',
    })

    const { POST } = await import('@/app/api/inbound/email/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'svix-id': 'msg_bad',
          'svix-timestamp': '100',
          'svix-signature': 'v1,invalidsignature',
        },
        body,
      }) as any
    )
    expect(response.status).toBe(401)
  })
})
