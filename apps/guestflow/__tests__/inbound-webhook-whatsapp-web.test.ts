import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => ({
    prepare: vi.fn((query: string) => {
      if (query.includes('SELECT id FROM inbound_messages')) {
        return { get: vi.fn(() => null) }
      }
      if (query.includes('SELECT * FROM inbound_threads')) {
        return {
          get: vi.fn(() => ({
            id: 7,
            source: 'whatsapp_web',
            from_number: '+27821234567',
            status: 'new',
          })),
        }
      }
      return {
        run: vi.fn(() => ({ lastInsertRowid: 21 })),
        get: vi.fn(() => ({ id: 7, status: 'drafted' })),
        all: vi.fn(() => []),
      }
    }),
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
  it('accepts the existing inbound shape with WhatsApp Web source', async () => {
    process.env.INBOUND_WEBHOOK_SECRET = 'whsec'
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
          text: 'Seen on WhatsApp Web',
          timestamp: '2026-09-20T12:00:00.000Z',
          source: 'whatsapp_web',
          externalMessageId: 'waweb-1',
        }),
      }) as any
    )
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
