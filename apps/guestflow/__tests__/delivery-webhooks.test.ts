import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { buildTwilioSignature, verifyTwilioSignature } from '@/lib/twilio-signature'
import {
  parseResendDeliveryEvent,
  verifyResendDeliveryRequest,
  verifyResendSvixSignature,
} from '@/lib/resend-delivery-webhook'
import { POST as twilioStatus } from '@/app/api/webhooks/twilio/status/route'
import { POST as resendDelivery } from '@/app/api/webhooks/resend/route'

const applyProviderReceipt = vi.fn()

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => ({})),
}))

vi.mock('@/lib/delivery-status', async () => {
  const actual = await vi.importActual<typeof import('@/lib/delivery-status')>('@/lib/delivery-status')
  return {
    ...actual,
    applyProviderReceipt: (...args: unknown[]) => applyProviderReceipt(...args),
  }
})

function formBody(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}

describe('Twilio StatusCallback signatures', () => {
  const token = 'test_auth_token_12345'
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, TWILIO_AUTH_TOKEN: token, NODE_ENV: 'test' }
    applyProviderReceipt.mockReset()
    applyProviderReceipt.mockResolvedValue({ updated: true })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('accepts a valid HMAC-SHA1 signature', () => {
    const url = 'https://guestflow.example/api/webhooks/twilio/status'
    const params = { MessageSid: 'SM1', MessageStatus: 'delivered' }
    const signature = buildTwilioSignature(url, params, token)
    expect(verifyTwilioSignature(signature, url, params, token)).toBe(true)
  })

  it('rejects a tampered signature', () => {
    const url = 'https://guestflow.example/api/webhooks/twilio/status'
    const params = { MessageSid: 'SM1', MessageStatus: 'delivered' }
    expect(verifyTwilioSignature('not-valid', url, params, token)).toBe(false)
  })

  it('returns 401 and does not apply a bad signature', async () => {
    const url = 'https://guestflow.example/api/webhooks/twilio/status'
    const params = { MessageSid: 'SM1', MessageStatus: 'delivered' }
    const request = new NextRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Twilio-Signature': 'bad',
      },
      body: formBody(params),
    })
    const response = await twilioStatus(request)
    expect(response.status).toBe(401)
    expect(applyProviderReceipt).not.toHaveBeenCalled()
  })

  it('applies a valid StatusCallback', async () => {
    const url = 'https://guestflow.example/api/webhooks/twilio/status'
    const params = { MessageSid: 'SM99', MessageStatus: 'failed', ErrorCode: '21211' }
    const signature = buildTwilioSignature(url, params, token)
    const request = new NextRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Twilio-Signature': signature,
      },
      body: formBody(params),
    })
    const response = await twilioStatus(request)
    expect(response.status).toBe(200)
    expect(applyProviderReceipt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        providerMessageId: 'SM99',
        providerStatus: 'failed',
        errorCode: '21211',
      })
    )
  })
})

describe('Resend delivery webhook secret', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, RESEND_WEBHOOK_SECRET: 'resend-secret', NODE_ENV: 'test' }
    applyProviderReceipt.mockReset()
    applyProviderReceipt.mockResolvedValue({ updated: true })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('parses email.delivered events', () => {
    expect(
      parseResendDeliveryEvent({ type: 'email.delivered', data: { email_id: 're_123' } })
    ).toEqual({ providerMessageId: 're_123', providerStatus: 'email.delivered' })
  })

  it('accepts Bearer secret and rejects a bad one', () => {
    const ok = verifyResendDeliveryRequest(
      { headers: { get: (name: string) => (name === 'authorization' ? 'Bearer resend-secret' : null) } },
      '{}'
    )
    const bad = verifyResendDeliveryRequest(
      { headers: { get: (name: string) => (name === 'authorization' ? 'Bearer nope' : null) } },
      '{}'
    )
    expect(ok).toBe(true)
    expect(bad).toBe(false)
  })

  it('verifies a Svix-style signature', () => {
    const payload = '{"type":"email.delivered"}'
    const secret = 'whsec_dGVzdHNlY3JldA=='
    const signature = verifyResendSvixSignature({
      payload,
      svixId: 'msg_1',
      svixTimestamp: '100',
      svixSignature: 'placeholder',
      secret,
    })
    // Build a real signature and re-check
    const crypto = require('crypto') as typeof import('crypto')
    const expected = crypto
      .createHmac('sha256', Buffer.from('testsecret'))
      .update('msg_1.100.{"type":"email.delivered"}')
      .digest('base64')
    expect(
      verifyResendSvixSignature({
        payload,
        svixId: 'msg_1',
        svixTimestamp: '100',
        svixSignature: `v1,${expected}`,
        secret,
      })
    ).toBe(true)
    expect(signature).toBe(false)
  })

  it('returns 401 without a valid secret', async () => {
    const request = new NextRequest('https://guestflow.example/api/webhooks/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: 'Bearer wrong' },
      body: JSON.stringify({ type: 'email.delivered', data: { email_id: 're_1' } }),
    })
    const response = await resendDelivery(request)
    expect(response.status).toBe(401)
    expect(applyProviderReceipt).not.toHaveBeenCalled()
  })

  it('applies a secret-verified delivery event', async () => {
    const request = new NextRequest('https://guestflow.example/api/webhooks/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: 'Bearer resend-secret' },
      body: JSON.stringify({ type: 'email.bounced', data: { email_id: 're_9' } }),
    })
    const response = await resendDelivery(request)
    expect(response.status).toBe(200)
    expect(applyProviderReceipt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ providerMessageId: 're_9', providerStatus: 'email.bounced' })
    )
  })
})
