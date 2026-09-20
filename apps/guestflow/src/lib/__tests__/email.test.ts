import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  composeInboundEmailText,
  extractEmailAddress,
  isEmailAddress,
  normalizeInboundEmailPayload,
  sendEmail,
} from '@/lib/email'

describe('email helpers', () => {
  it('validates and extracts addresses', () => {
    expect(isEmailAddress('guest@example.com')).toBe(true)
    expect(isEmailAddress('Guest <guest@example.com>')).toBe(true)
    expect(isEmailAddress('+27821234567')).toBe(false)
    expect(extractEmailAddress('Guest <guest@example.com>')).toBe('guest@example.com')
  })

  it('normalizes Resend email.received metadata', () => {
    const normalized = normalizeInboundEmailPayload({
      type: 'email.received',
      created_at: '2026-09-20T12:00:00.000Z',
      data: {
        email_id: 'em_123',
        from: 'guest@example.com',
        subject: 'Dates',
        message_id: '<1@x>',
      },
    })
    expect(normalized?.from).toBe('guest@example.com')
    expect(normalized?.needsBodyFetch).toBe(true)
    expect(normalized?.externalMessageId).toBe('em_123')
  })

  it('normalizes fixture payloads', () => {
    const normalized = normalizeInboundEmailPayload({
      from: 'guest@example.com',
      text: 'Is 12 Oct free?',
      timestamp: '2026-09-20T12:00:00.000Z',
      source: 'email',
      subject: 'Dates',
      externalMessageId: 'fix-1',
    })
    expect(normalized?.needsBodyFetch).toBe(false)
    expect(normalized?.text).toBe('Is 12 Oct free?')
  })

  it('composes a visible body-unavailable note', () => {
    expect(composeInboundEmailText('Hello', '')).toContain('body unavailable')
    expect(composeInboundEmailText('Hello', '')).toContain('Hello')
  })
})

describe('sendEmail', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.RESEND_API_KEY
    delete process.env.RESEND_FROM_EMAIL
  })

  it('fails closed when Resend env is missing', async () => {
    const result = await sendEmail({
      to: 'grant830318@gmail.com',
      subject: 'Test',
      text: 'Hello',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('not configured')
  })

  it('posts to Resend with existing From env', async () => {
    process.env.RESEND_API_KEY = 'test-key'
    process.env.RESEND_FROM_EMAIL = 'noreply@guestflow.thebrowns.co.za'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 're_123' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendEmail({
      to: 'grant830318@gmail.com',
      subject: 'Stay',
      text: 'See you Friday',
    })

    expect(result.success).toBe(true)
    expect(result.messageId).toBe('re_123')
    expect(fetchMock).toHaveBeenCalledOnce()
    const [, init] = fetchMock.mock.calls[0]
    const posted = JSON.parse(init.body as string)
    expect(posted.from).toBe('noreply@guestflow.thebrowns.co.za')
    expect(posted.to).toEqual(['grant830318@gmail.com'])
    expect(posted.subject).toBe('Stay')
  })
})
