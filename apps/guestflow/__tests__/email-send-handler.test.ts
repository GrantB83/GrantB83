import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SendMessageResponse } from '@/types/inbound'

const { mockDb, sendEmail, createQueuedJob, consumeConfirmToken } = vi.hoisted(() => ({
  mockDb: {
    prepare: vi.fn(),
    batch: vi.fn(),
    exec: vi.fn(),
  },
  sendEmail: vi.fn(),
  createQueuedJob: vi.fn(),
  consumeConfirmToken: vi.fn(),
}))

vi.mock('@/lib/whatsapp', () => ({
  sendWhatsAppMessage: vi.fn(),
}))

vi.mock('@/lib/email', () => ({
  sendEmail,
  isEmailAddress: (value: string) => Boolean(value && value.includes('@')),
  extractEmailAddress: (value: string) => value.replace(/^.*<|>.*$/g, '').trim() || value,
}))

vi.mock('@/lib/send-jobs', () => ({
  createQueuedJob,
}))

vi.mock('@/lib/confirm-token', () => ({
  consumeConfirmToken,
  isSendEligible: (thread?: string | null, message?: string | null) =>
    thread === 'approved' || thread === 'ready' || message === 'approved' || message === 'ready',
}))

vi.mock('@/lib/phase0-schema', () => ({
  ensurePhase0Schema: vi.fn(async () => {}),
}))

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => mockDb),
}))

function stubThreadAndDraft(thread: Record<string, unknown>, message: Record<string, unknown>) {
  let call = 0
  mockDb.prepare.mockReturnValue({
    get: vi.fn(() => {
      call += 1
      return call === 1 ? thread : message
    }),
    run: vi.fn(),
    all: vi.fn(),
  })
  mockDb.batch.mockResolvedValue(undefined)
}

describe('POST /api/inbound/send email + whatsapp_web', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    consumeConfirmToken.mockResolvedValue({ ok: true })
  })

  it('rejects email send without confirmToken and does not call Resend', async () => {
    stubThreadAndDraft(
      { id: 1, from_number: 'guest@example.com', status: 'approved', metadata: '{}' },
      { id: 9, draft_reply: 'Hi guest', status: 'approved' }
    )

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: 1,
          channel: 'email',
          to: 'grant830318@gmail.com',
          subject: 'Test',
          body: 'Hello from GuestFlow',
        }),
      }) as any
    )
    const data = (await response.json()) as SendMessageResponse
    expect(response.status).toBe(400)
    expect(data.error).toContain('confirmToken')
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('sends email via mocked Resend after approved + token', async () => {
    sendEmail.mockResolvedValue({
      success: true,
      messageId: 're_abc',
      timestamp: '2026-09-20T12:00:00.000Z',
    })
    stubThreadAndDraft(
      { id: 1, from_number: 'guest@example.com', status: 'approved', metadata: '{}' },
      { id: 9, draft_reply: 'Hi guest', status: 'approved' }
    )

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: 1,
          confirmToken: 'email-token',
          channel: 'email',
          to: 'grant830318@gmail.com',
          subject: 'Test',
          body: 'Hello from GuestFlow',
        }),
      }) as any
    )
    const data = (await response.json()) as SendMessageResponse

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data?.channel).toBe('email')
    expect(data.data?.threadStatus).toBe('sent')
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'grant830318@gmail.com',
      subject: 'Test',
      text: 'Hello from GuestFlow',
    })
  })

  it('queues WhatsApp Web only after token consume', async () => {
    createQueuedJob.mockResolvedValue({
      id: 44,
      channel: 'whatsapp_web',
      status: 'queued',
      thread_id: 2,
      to_address: '+27821234567',
      body_text: 'Hi',
      subject: null,
      claim_token: null,
      claimed_at: null,
      completed_at: null,
      error_code: null,
      created_at: '2026-09-20T12:00:00.000Z',
      updated_at: '2026-09-20T12:00:00.000Z',
    })
    stubThreadAndDraft(
      { id: 2, from_number: '+27821234567', status: 'approved', metadata: '{}' },
      { id: 10, draft_reply: 'Hi', status: 'approved' }
    )

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: 2, channel: 'whatsapp_web', confirmToken: 'wa-web-token' }),
      }) as any
    )
    const data = (await response.json()) as SendMessageResponse

    expect(data.success).toBe(true)
    expect(data.queued).toBe(true)
    expect(data.data?.jobStatus).toBe('queued')
    expect(data.data?.threadStatus).toBe('queued')
    expect(createQueuedJob).toHaveBeenCalled()
  })

  it('does not queue WhatsApp Web when token is reused', async () => {
    consumeConfirmToken.mockResolvedValue({
      ok: false,
      error: 'confirmToken is missing, invalid, expired, or already used',
    })
    stubThreadAndDraft(
      { id: 2, from_number: '+27821234567', status: 'approved', metadata: '{}' },
      { id: 10, draft_reply: 'Hi', status: 'approved' }
    )

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: 2, channel: 'whatsapp_web', confirmToken: 'used' }),
      }) as any
    )
    expect(response.status).toBe(400)
    expect(createQueuedJob).not.toHaveBeenCalled()
  })

  it('rejects email send without a To address', async () => {
    stubThreadAndDraft(
      { id: 3, from_number: '+27821234567', status: 'approved', metadata: '{}' },
      { id: 11, draft_reply: 'Hi', status: 'approved' }
    )

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: 3, channel: 'email', body: 'Hi', confirmToken: 'tok' }),
      }) as any
    )
    const data = (await response.json()) as SendMessageResponse
    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toMatch(/To email/i)
  })
})
