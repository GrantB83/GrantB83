import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SendMessageResponse } from '@/types/inbound'

vi.mock('@/lib/whatsapp', () => ({
  sendWhatsAppMessage: vi.fn(),
}))

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
  isEmailAddress: (value: string) => Boolean(value && value.includes('@')),
  extractEmailAddress: (value: string) => value.replace(/^.*<|>.*$/g, '').trim() || value,
}))

vi.mock('@/lib/send-jobs', () => ({
  createQueuedJob: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => ({
    prepare: vi.fn(() => ({
      get: vi.fn(),
      all: vi.fn(),
      run: vi.fn(),
    })),
    batch: vi.fn(),
    exec: vi.fn(),
  })),
}))

describe('POST /api/inbound/send email + whatsapp_web', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('sends email via mocked Resend and writes sent status', async () => {
    const { sendEmail } = await import('@/lib/email')
    const { getDbAsync } = await import('@/lib/db')
    const mockDb = await getDbAsync()

    vi.mocked(sendEmail).mockResolvedValue({
      success: true,
      messageId: 're_abc',
      timestamp: '2026-09-20T12:00:00.000Z',
    })

    let call = 0
    vi.mocked(mockDb.prepare).mockReturnValue({
      get: vi.fn(() => {
        call += 1
        if (call === 1) {
          return { id: 1, from_number: 'guest@example.com', status: 'drafted', metadata: '{}' }
        }
        return { id: 9, draft_reply: 'Hi guest' }
      }),
      run: vi.fn(),
      all: vi.fn(),
    } as any)
    vi.mocked(mockDb.batch).mockResolvedValue(undefined as any)

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

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.queued).toBeUndefined()
    expect(data.data?.channel).toBe('email')
    expect(data.data?.threadStatus).toBe('sent')
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'grant830318@gmail.com',
      subject: 'Test',
      text: 'Hello from GuestFlow',
    })
  })

  it('queues WhatsApp Web and does not report delivered', async () => {
    const { createQueuedJob } = await import('@/lib/send-jobs')
    const { getDbAsync } = await import('@/lib/db')
    const mockDb = await getDbAsync()

    vi.mocked(createQueuedJob).mockResolvedValue({
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

    let call = 0
    vi.mocked(mockDb.prepare).mockReturnValue({
      get: vi.fn(() => {
        call += 1
        if (call === 1) {
          return { id: 2, from_number: '+27821234567', status: 'drafted', metadata: '{}' }
        }
        return { id: 10, draft_reply: 'Hi' }
      }),
      run: vi.fn(),
      all: vi.fn(),
    } as any)

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: 2, channel: 'whatsapp_web' }),
      }) as any
    )
    const data = (await response.json()) as SendMessageResponse

    expect(data.success).toBe(true)
    expect(data.queued).toBe(true)
    expect(data.data?.jobStatus).toBe('queued')
    expect(data.data?.threadStatus).toBe('queued')
    expect(data.data?.threadStatus).not.toBe('sent')
  })

  it('rejects email send without a To address', async () => {
    const { getDbAsync } = await import('@/lib/db')
    const mockDb = await getDbAsync()
    let call = 0
    vi.mocked(mockDb.prepare).mockReturnValue({
      get: vi.fn(() => {
        call += 1
        if (call === 1) {
          return { id: 3, from_number: '+27821234567', status: 'drafted', metadata: '{}' }
        }
        return { id: 11, draft_reply: 'Hi' }
      }),
      run: vi.fn(),
      all: vi.fn(),
    } as any)

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(
      new Request('http://localhost:3100/api/inbound/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: 3, channel: 'email', body: 'Hi' }),
      }) as any
    )
    const data = (await response.json()) as SendMessageResponse
    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toMatch(/To email/i)
  })
})
