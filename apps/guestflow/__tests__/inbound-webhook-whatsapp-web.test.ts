import { describe, expect, it, vi, beforeEach } from 'vitest'

let mockGuestContact: any = null
let mockBookings: any[] = []
let mockTwilioThread: any = null
let mockDuplicateMessage: { id: number | bigint } | null = null
let lastMessageInsert: any = null

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => ({
    prepare: vi.fn((query: string) => {
      // Allowlist checks
      if (query.includes('SELECT id FROM guest_contacts')) {
        return { get: vi.fn(() => mockGuestContact) }
      }
      if (query.includes('SELECT id, guest_phone FROM bookings')) {
        return { all: vi.fn(() => mockBookings) }
      }
      if (query.includes('SELECT id FROM inbound_threads') && query.includes('twilio_whatsapp')) {
        return { get: vi.fn(() => mockTwilioThread) }
      }
      // Duplicate check
      if (query.includes('SELECT id FROM inbound_messages') && query.includes('external_message_id')) {
        return { get: vi.fn(() => mockDuplicateMessage) }
      }
      // Thread lookup
      if (query.includes('SELECT * FROM inbound_threads')) {
        return {
          get: vi.fn(() => mockTwilioThread || {
            id: 7,
            source: 'whatsapp_web',
            from_number: '+27821234567',
            status: 'new',
          }),
        }
      }
      // Triage ticket insert
      if (query.includes('INSERT INTO guest_tickets')) {
        return { run: vi.fn(() => ({ lastInsertRowid: 99 })) }
      }
      // Message insert - capture the arguments
      if (query.includes('INSERT INTO inbound_messages')) {
        return {
          run: vi.fn((...args: any[]) => {
            lastMessageInsert = { args }
            return { lastInsertRowid: 21 }
          }),
        }
      }
      return {
        run: vi.fn(() => ({ lastInsertRowid: 21 })),
        get: vi.fn(() => ({ id: 7, status: 'drafted' })),
        all: vi.fn(() => []),
      }
    }),
    exec: vi.fn(),
  })),
  getDefaultTenantIdAsync: vi.fn(async () => 1),
}))

vi.mock('@/lib/ticket-playbooks', () => ({
  generateTicketDrafts: vi.fn(() => ({
    guestReply: 'Mock',
    staffBrief: 'Mock',
    staffBriefReady: true,
    priority: 'medium',
    askStaffFlags: [],
  })),
}))

vi.mock('@/lib/checkin-inference', () => ({
  processCheckinEvent: vi.fn(() => ({
    event: {},
    matchedBooking: null,
    confidence: 0,
  })),
}))

describe('POST /api/inbound/webhook source=whatsapp_web', () => {
  beforeEach(() => {
    process.env.INBOUND_WEBHOOK_SECRET = 'whsec'
    mockGuestContact = null
    mockBookings = []
    mockTwilioThread = null
    mockDuplicateMessage = null
    lastMessageInsert = null
    vi.resetModules()
  })

  it('accepts message from known guest in guest_contacts (allowlist tier 1)', async () => {
    mockGuestContact = { id: 123 }
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
          externalMessageId: 'waweb-1',
          metadata: { observedOn: '+27836458313' }
        }),
      }) as any
    )
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.allowlisted).toBe(true)
    expect(data.metadataOnly).toBe(true)
  })

  it('accepts message from guest with booking (allowlist tier 2)', async () => {
    mockBookings = [{ id: 456, guest_phone: '+27829876543' }]
    const { POST } = await import('@/app/api/inbound/webhook/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer whsec',
        },
        body: JSON.stringify({
          from: '+27829876543',
          timestamp: '2026-09-20T12:00:00.000Z',
          source: 'whatsapp_web',
          externalMessageId: 'waweb-2',
        }),
      }) as any
    )
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.allowlisted).toBe(true)
  })

  it('accepts message from NB booking with non-E.164 phone (tier 2 + normalize)', async () => {
    // NightsBridge often stores phones as 0821234567 instead of +27821234567
    mockBookings = [{ id: 789, guest_phone: '0821234567' }]
    const { POST } = await import('@/app/api/inbound/webhook/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer whsec',
        },
        body: JSON.stringify({
          from: '+27821234567',  // Incoming is normalized E.164
          timestamp: '2026-09-20T12:00:00.000Z',
          source: 'whatsapp_web',
          externalMessageId: 'waweb-nb1',
        }),
      }) as any
    )
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.allowlisted).toBe(true)
  })

  it('returns 200 JSON when Turso returns BigInt thread and message ids', async () => {
    mockGuestContact = { id: BigInt(123) }
    mockTwilioThread = {
      id: BigInt(88),
      source: 'twilio_whatsapp',
      from_number: '+27821234567',
      status: 'new',
    }
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
          externalMessageId: 'waweb-bigint-ids',
        }),
      }) as any
    )
    expect(response.status).toBe(200)
    const raw = await response.text()
    expect(raw).not.toContain('serialize a BigInt')
    const data = JSON.parse(raw)
    expect(data.success).toBe(true)
    expect(data.threadId).toBe(88)
    expect(typeof data.messageId).toBe('number')
  })

  it('returns 200 on duplicate when existing message id is BigInt', async () => {
    mockGuestContact = { id: 123 }
    mockDuplicateMessage = { id: BigInt(999) }

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
          text: 'ignored for whatsapp_web',
          timestamp: '2026-09-20T12:00:00.000Z',
          source: 'whatsapp_web',
          externalMessageId: 'dup-bigint',
        }),
      }) as any
    )
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.duplicate).toBe(true)
    expect(data.messageId).toBe(999)
  })

  it('merges into existing Twilio thread (allowlist tier 3 + dedup)', async () => {
    mockTwilioThread = { id: 88 }
    const { POST } = await import('@/app/api/inbound/webhook/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer whsec',
        },
        body: JSON.stringify({
          from: '+27827777777',
          timestamp: '2026-09-20T12:00:00.000Z',
          source: 'whatsapp_web',
          externalMessageId: 'waweb-3',
        }),
      }) as any
    )
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.allowlisted).toBe(true)
    expect(data.deduped).toBe(true)
    expect(data.threadId).toBe(88)
  })

  it('routes unknown sender to triage queue', async () => {
    // No allowlist matches
    const { POST } = await import('@/app/api/inbound/webhook/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer whsec',
        },
        body: JSON.stringify({
          from: '+27821111111',
          timestamp: '2026-09-20T12:00:00.000Z',
          source: 'whatsapp_web',
          externalMessageId: 'waweb-4',
        }),
      }) as any
    )
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.triaged).toBe(true)
    expect(data.ticketId).toBe(99)
    expect(data.reason).toContain('not in allowlist')
  })

  it('rejects payload missing externalMessageId', async () => {
    mockGuestContact = { id: 123 }
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
          // Missing externalMessageId
        }),
      }) as any
    )
    const data = await response.json()
    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('externalMessageId')
  })

  it('enforces authentication', async () => {
    mockGuestContact = { id: 123 }
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
          timestamp: '2026-09-20T12:00:00.000Z',
          source: 'whatsapp_web',
          externalMessageId: 'waweb-5',
        }),
      }) as any
    )
    const data = await response.json()
    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('stores [metadata-only] sentinel in message_text (NOT NULL constraint)', async () => {
    mockGuestContact = { id: 123 }
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
          externalMessageId: 'waweb-sentinel-test',
          metadata: { observedOn: '+27836458313' }
        }),
      }) as any
    )
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    
    // Verify the message_text is '[metadata-only]' (not null or empty)
    expect(lastMessageInsert).toBeTruthy()
    expect(lastMessageInsert.args).toBeTruthy()
    // Args order: thread_id, tenant_id, from_number, message_text, media_refs, timestamp, external_message_id, metadata
    const messageTextArg = lastMessageInsert.args[3] // 4th argument (0-indexed position 3)
    expect(messageTextArg).toBe('[metadata-only]')
  })
})
