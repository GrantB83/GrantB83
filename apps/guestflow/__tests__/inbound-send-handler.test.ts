/**
 * Tests for Inbound Send API Handler
 *
 * Tests the POST /api/inbound/send endpoint that sends WhatsApp messages
 * All tests mock the sendWhatsAppMessage function to avoid calling live API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SendMessageRequest, SendMessageResponse } from '@/types/inbound'

const { consumeConfirmToken } = vi.hoisted(() => ({
  consumeConfirmToken: vi.fn(),
}))

vi.mock('@/lib/whatsapp', () => ({
  sendWhatsAppMessage: vi.fn(),
  getWhatsAppProvider: vi.fn(() => 'sandbox'),
  isWhatsAppSandboxMode: vi.fn(() => true),
}))

vi.mock('@/lib/confirm-token', () => ({
  consumeConfirmToken,
  isSendEligible: (thread?: string | null, message?: string | null) =>
    thread === 'approved' || thread === 'ready' || message === 'approved' || message === 'ready',
}))

vi.mock('@/lib/phase0-schema', () => ({
  ensurePhase0Schema: vi.fn(async () => {}),
  tableHasColumn: vi.fn(async () => true),
}))

vi.mock('@/lib/umi-schema', () => ({
  ensureUmiSchema: vi.fn(async () => {}),
}))

vi.mock('@/lib/umi-threads', () => ({
  markThreadOutbound: vi.fn(async () => {}),
}))

const { getCareWindowForThread } = vi.hoisted(() => ({
  getCareWindowForThread: vi.fn(async () => ({
    state: 'open',
    label: 'Window open, closes in 12h 0m',
    remainingMs: 12 * 60 * 60 * 1000,
    closingSoon: false,
    lastWabaInboundAt: '2026-09-25T00:00:00.000Z',
    windowExpiresAt: '2026-09-26T00:00:00.000Z',
  })),
}))

vi.mock('@/lib/whatsapp-care-window', () => ({
  getCareWindowForThread,
}))

vi.mock('@/lib/delivery-schema', () => ({
  ensureDeliverySchema: vi.fn(async () => {}),
}))

vi.mock('@/lib/send-failed-hook', () => ({
  onSendFailed: vi.fn(),
}))

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    prepare: vi.fn((query: string) => ({
      get: vi.fn(),
      all: vi.fn(),
      run: vi.fn(),
      bind: vi.fn(function (this: any) {
        return this
      }),
    })),
    batch: vi.fn(),
  },
}))

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => mockDb),
}))

function stubThreadAndMessage(thread: Record<string, unknown>, message: Record<string, unknown>) {
  let callCount = 0
  vi.mocked(mockDb.prepare).mockReturnValue({
    get: vi.fn(() => {
      callCount++
      if (callCount === 1) return thread
      return message
    }),
    all: vi.fn(),
    run: vi.fn(),
    bind: vi.fn(function (this: any) {
      return this
    }),
  } as any)
}

describe('POST /api/inbound/send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    consumeConfirmToken.mockResolvedValue({ ok: true })
    getCareWindowForThread.mockResolvedValue({
      state: 'open',
      label: 'Window open, closes in 12h 0m',
      remainingMs: 12 * 60 * 60 * 1000,
      closingSoon: false,
      lastWabaInboundAt: '2026-09-25T00:00:00.000Z',
      windowExpiresAt: '2026-09-26T00:00:00.000Z',
    })
  })

  it('returns 400 when threadId is missing', async () => {
    const request = new Request('http://localhost:3100/api/inbound/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(request as any)
    const data = (await response.json()) as SendMessageResponse

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('threadId')
  })

  it('returns 400 when confirmToken is missing', async () => {
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    const request = new Request('http://localhost:3100/api/inbound/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: 1 }),
    })

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(request as any)
    const data = (await response.json()) as SendMessageResponse

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('confirmToken')
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
  })

  it('returns 400 when thread not found', async () => {
    stubThreadAndMessage(null as any, null as any)
    vi.mocked(mockDb.prepare).mockReturnValue({
      get: vi.fn(() => null),
      all: vi.fn(),
      run: vi.fn(),
      bind: vi.fn(function (this: any) {
        return this
      }),
    } as any)

    const request = new Request('http://localhost:3100/api/inbound/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: 999, confirmToken: 'tok' }),
    })

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(request as any)
    const data = (await response.json()) as SendMessageResponse

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Thread not found')
  })

  it('returns 400 when thread is not approved', async () => {
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    stubThreadAndMessage(
      { id: 1, from_number: '+27821234567', status: 'drafted' },
      { id: 1, draft_reply: 'Hi', status: 'drafted' }
    )

    const request = new Request('http://localhost:3100/api/inbound/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: 1, confirmToken: 'tok' }),
    })

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(request as any)
    const data = (await response.json()) as SendMessageResponse

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toMatch(/not approved/i)
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
    expect(consumeConfirmToken).not.toHaveBeenCalled()
  })

  it('returns 400 when thread has no draft reply', async () => {
    stubThreadAndMessage(
      { id: 1, from_number: '+27821234567', status: 'approved' },
      { id: 1, draft_reply: null, status: 'approved' }
    )

    const requestBody: SendMessageRequest = { threadId: 1, confirmToken: 'tok' }
    const request = new Request('http://localhost:3100/api/inbound/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(request as any)
    const data = (await response.json()) as SendMessageResponse

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('no draft reply')
  })

  it('successfully sends message once with a fresh confirmToken', async () => {
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    vi.mocked(sendWhatsAppMessage).mockResolvedValue({
      success: true,
      messageId: 'sandbox_123_abc',
      timestamp: '2026-09-11T14:30:00.000Z',
      sandboxMode: true,
      provider: 'sandbox',
    })

    stubThreadAndMessage(
      { id: 1, from_number: '+27821234567', status: 'approved' },
      { id: 1, draft_reply: 'Hi there, thank you for your inquiry...', status: 'approved' }
    )
    vi.mocked(mockDb.batch).mockResolvedValue(undefined as any)

    const requestBody: SendMessageRequest = { threadId: 1, confirmToken: 'fresh-token' }
    const request = new Request('http://localhost:3100/api/inbound/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(request as any)
    const data = (await response.json()) as SendMessageResponse

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data?.provider).toBe('sandbox')
    expect(data.data?.threadStatus).toBe('sent')
    expect(consumeConfirmToken).toHaveBeenCalledWith(mockDb, {
      threadId: 1,
      confirmToken: 'fresh-token',
    })
    expect(sendWhatsAppMessage).toHaveBeenCalledWith({
      to: '+27821234567',
      message: 'Hi there, thank you for your inquiry...',
    })
  })

  it('rejects confirmToken reuse and does not send again', async () => {
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    consumeConfirmToken.mockResolvedValue({
      ok: false,
      error: 'confirmToken is missing, invalid, expired, or already used',
    })
    stubThreadAndMessage(
      { id: 1, from_number: '+27821234567', status: 'approved' },
      { id: 1, draft_reply: 'Hi', status: 'approved' }
    )

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: 1, confirmToken: 'used-token' }),
      }) as any
    )
    const data = (await response.json()) as SendMessageResponse

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('confirmToken')
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
  })

  it('returns 409 for WhatsApp free-text when the Cloud window is closed and does not call Twilio', async () => {
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    getCareWindowForThread.mockResolvedValueOnce({
      state: 'closed',
      label: 'Window closed',
      remainingMs: 0,
      closingSoon: false,
      lastWabaInboundAt: '2026-09-23T00:00:00.000Z',
      windowExpiresAt: '2026-09-24T00:00:00.000Z',
    })
    stubThreadAndMessage(
      { id: 1, from_number: '+27821234567', status: 'approved' },
      { id: 1, draft_reply: 'Hi', status: 'approved' }
    )

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: 1, confirmToken: 'tok', body: 'Hi' }),
      }) as any
    )
    const data = (await response.json()) as SendMessageResponse

    expect(response.status).toBe(409)
    expect(data.success).toBe(false)
    expect(data.error).toMatch(/window is closed/i)
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
    expect(consumeConfirmToken).not.toHaveBeenCalled()
  })

  it('allows email send when the WhatsApp window is closed', async () => {
    getCareWindowForThread.mockResolvedValue({
      state: 'closed',
      label: 'Window closed',
      remainingMs: 0,
      closingSoon: false,
      lastWabaInboundAt: '',
      windowExpiresAt: '',
    })
    vi.doMock('@/lib/email', () => ({
      sendEmail: vi.fn(async () => ({
        success: true,
        messageId: 'em_1',
        timestamp: '2026-09-25T00:00:00.000Z',
      })),
      isEmailAddress: () => true,
      extractEmailAddress: (value: string) => value,
    }))
    stubThreadAndMessage(
      { id: 1, from_number: 'guest@example.com', status: 'approved' },
      { id: 1, draft_reply: 'Hi', status: 'approved' }
    )
    vi.mocked(mockDb.batch).mockResolvedValue(undefined as any)

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: 1,
          confirmToken: 'tok',
          channel: 'email',
          to: 'guest@example.com',
          body: 'Hi',
        }),
      }) as any
    )

    expect(response.status).not.toBe(409)
    expect(getCareWindowForThread).not.toHaveBeenCalled()
  })

  it('handles WhatsApp API errors gracefully', async () => {
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    vi.mocked(sendWhatsAppMessage).mockResolvedValue({
      success: false,
      error: 'Twilio API error: Invalid phone number',
      timestamp: '2026-09-11T14:30:00.000Z',
      sandboxMode: false,
      provider: 'twilio',
    })

    stubThreadAndMessage(
      { id: 1, from_number: '+27821234567', status: 'approved' },
      { id: 1, draft_reply: 'Hi there, thank you for your inquiry...', status: 'approved' }
    )
    vi.mocked(mockDb.batch).mockResolvedValue(undefined as any)

    const requestBody: SendMessageRequest = { threadId: 1, confirmToken: 'tok' }
    const request = new Request('http://localhost:3100/api/inbound/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(request as any)
    const data = (await response.json()) as SendMessageResponse

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Failed to send')
    expect(data.details).toContain('Invalid phone number')
  })
})
