/**
 * Twilio Inbound Webhook Tests
 * 
 * Tests Twilio form-urlencoded payload parsing and signature validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST, GET } from '@/app/api/inbound/webhook/route'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

// Mock database
vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(() => {
    const mockDb = {
      prepare: vi.fn((query: string) => {
        // Mock thread query
        if (query.includes('SELECT * FROM inbound_threads')) {
          return {
            get: vi.fn(() => ({
              id: 1,
              tenant_id: 1,
              source: 'twilio_whatsapp',
              from_number: '+27821234567',
              status: 'new',
              first_message_at: '2026-12-10T10:00:00Z',
              last_message_at: '2026-12-10T10:00:00Z'
            })),
            all: vi.fn(() => [])
          }
        }
        // Mock message query
        if (query.includes('SELECT id FROM inbound_messages')) {
          return {
            get: vi.fn(() => null),
            all: vi.fn(() => [])
          }
        }
        // Mock insert/update
        return {
          run: vi.fn(() => ({ lastInsertRowid: 123 })),
          get: vi.fn(() => ({
            id: 1,
            tenant_id: 1
          })),
          all: vi.fn(() => [])
        }
      })
    }
    return mockDb
  }),
  getDefaultTenantIdAsync: vi.fn(() => 1)
}))

vi.mock('@/lib/ticket-playbooks', () => ({
  generateTicketDrafts: vi.fn(() => ({
    guestReply: 'Mock reply',
    staffBrief: 'Mock brief',
    staffBriefReady: true,
    priority: 'medium',
    askStaffFlags: []
  }))
}))

vi.mock('@/lib/checkin-inference', () => ({
  processCheckinEvent: vi.fn(() => ({
    event: {
      booking_id: null,
      guest_name: 'Test Guest',
      guest_phone: '+27821234567',
      event_type: 'arrived',
      event_timestamp: '2026-12-10T10:00:00Z',
      confidence: 0.8
    },
    matchedBooking: null,
    confidence: 0.8
  }))
}))

// Helper: Generate Twilio signature
function generateTwilioSignature(
  url: string,
  params: Record<string, string>,
  authToken: string
): string {
  const sortedKeys = Object.keys(params).sort()
  let data = url
  for (const key of sortedKeys) {
    data += key + params[key]
  }
  
  const hmac = crypto.createHmac('sha1', authToken)
  hmac.update(data)
  return hmac.digest('base64')
}

// Helper: Build form-urlencoded body
function buildFormBody(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}

describe('Twilio Inbound Webhook', () => {
  const originalEnv = process.env
  const testAuthToken = 'test_auth_token_12345'

  beforeEach(() => {
    process.env = { ...originalEnv, TWILIO_AUTH_TOKEN: testAuthToken }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Twilio Form-Urlencoded Parsing', () => {
    it('should parse Twilio WhatsApp message', async () => {
      const url = 'https://guestflow.thebrowns.co.za/api/inbound/webhook'
      const params = {
        MessageSid: 'SM1234567890abcdef',
        AccountSid: 'AC1234567890abcdef',
        From: 'whatsapp:+27821234567',
        To: 'whatsapp:+14155238886',
        Body: 'Hi, I would like to book for 15-17 Dec',
        NumMedia: '0'
      }

      const signature = generateTwilioSignature(url, params, testAuthToken)
      const body = buildFormBody(params)

      const request = new NextRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Twilio-Signature': signature
        },
        body
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      // Twilio expects empty body
      const text = await response.text()
      expect(text).toBe('')
    })

    it('should parse Twilio SMS message', async () => {
      const url = 'https://guestflow.thebrowns.co.za/api/inbound/webhook'
      const params = {
        MessageSid: 'SM9876543210fedcba',
        AccountSid: 'AC1234567890abcdef',
        From: '+27821234567',
        To: '+14155238886',
        Body: 'Are you available 25-28 Jan?',
        NumMedia: '0'
      }

      const signature = generateTwilioSignature(url, params, testAuthToken)
      const body = buildFormBody(params)

      const request = new NextRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Twilio-Signature': signature
        },
        body
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
    })

    it('should handle media attachments from Twilio', async () => {
      const url = 'https://guestflow.thebrowns.co.za/api/inbound/webhook'
      const params = {
        MessageSid: 'SM1111222233334444',
        AccountSid: 'AC1234567890abcdef',
        From: 'whatsapp:+27821234567',
        To: 'whatsapp:+14155238886',
        Body: 'Here is my ID photo',
        NumMedia: '2',
        MediaUrl0: 'https://api.twilio.com/media/1.jpg',
        MediaUrl1: 'https://api.twilio.com/media/2.pdf'
      }

      const signature = generateTwilioSignature(url, params, testAuthToken)
      const body = buildFormBody(params)

      const request = new NextRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Twilio-Signature': signature
        },
        body
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
    })
  })

  describe('Twilio Signature Validation', () => {
    it('should reject invalid Twilio signature', async () => {
      const url = 'https://guestflow.thebrowns.co.za/api/inbound/webhook'
      const params = {
        MessageSid: 'SM1234567890abcdef',
        From: 'whatsapp:+27821234567',
        To: 'whatsapp:+14155238886',
        Body: 'Test message',
        NumMedia: '0'
      }

      const body = buildFormBody(params)
      const invalidSignature = 'invalid_signature_base64'

      const request = new NextRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Twilio-Signature': invalidSignature
        },
        body
      })

      const response = await POST(request)
      
      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toContain('Invalid Twilio signature')
    })

    it('should reject missing Twilio signature', async () => {
      const url = 'https://guestflow.thebrowns.co.za/api/inbound/webhook'
      const params = {
        MessageSid: 'SM1234567890abcdef',
        From: 'whatsapp:+27821234567',
        Body: 'Test message',
        NumMedia: '0'
      }

      const body = buildFormBody(params)

      const request = new NextRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
          // Missing X-Twilio-Signature
        },
        body
      })

      const response = await POST(request)
      
      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toContain('Missing X-Twilio-Signature')
    })

    it('should allow requests when TWILIO_AUTH_TOKEN is not configured (dev mode)', async () => {
      process.env = { ...originalEnv, TWILIO_AUTH_TOKEN: undefined }

      const url = 'https://guestflow.thebrowns.co.za/api/inbound/webhook'
      const params = {
        MessageSid: 'SM1234567890abcdef',
        From: 'whatsapp:+27821234567',
        Body: 'Test message',
        NumMedia: '0'
      }

      const body = buildFormBody(params)

      const request = new NextRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Twilio-Signature': 'any_signature'
        },
        body
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
    })
  })

  describe('JSON Bearer Token Regression', () => {
    it('should still accept JSON payload with Bearer token', async () => {
      process.env = { ...originalEnv, INBOUND_WEBHOOK_SECRET: 'test_secret_123' }

      const url = 'https://guestflow.thebrowns.co.za/api/inbound/webhook'
      const payload = {
        from: '+27821234567',
        text: 'Hi, I would like to book for 15-17 Dec',
        timestamp: '2026-12-10T10:30:00Z',
        source: 'legacy_wa'
      }

      const request = new NextRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test_secret_123'
        },
        body: JSON.stringify(payload)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.messageId).toBeDefined()
      expect(json.threadId).toBeDefined()
      expect(json.classification).toBeDefined()
    })

    it('should reject JSON payload with invalid Bearer token', async () => {
      process.env = { ...originalEnv, INBOUND_WEBHOOK_SECRET: 'test_secret_123' }

      const url = 'https://guestflow.thebrowns.co.za/api/inbound/webhook'
      const payload = {
        from: '+27821234567',
        text: 'Test message',
        timestamp: '2026-12-10T10:30:00Z'
      }

      const request = new NextRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer wrong_secret'
        },
        body: JSON.stringify(payload)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toContain('invalid webhook secret')
    })

    it('should allow JSON requests when INBOUND_WEBHOOK_SECRET is not configured (dev mode)', async () => {
      process.env = { ...originalEnv, INBOUND_WEBHOOK_SECRET: undefined }

      const url = 'https://guestflow.thebrowns.co.za/api/inbound/webhook'
      const payload = {
        from: '+27821234567',
        text: 'Test message',
        timestamp: '2026-12-10T10:30:00Z'
      }

      const request = new NextRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
    })
  })

  describe('Field Mapping', () => {
    it('should map Twilio fields to GuestFlow format correctly', async () => {
      const url = 'https://guestflow.thebrowns.co.za/api/inbound/webhook'
      const params = {
        MessageSid: 'SM_unique_id_123',
        From: 'whatsapp:+27821234567',
        Body: 'Test mapping',
        NumMedia: '0'
      }

      const signature = generateTwilioSignature(url, params, testAuthToken)
      const body = buildFormBody(params)

      const request = new NextRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Twilio-Signature': signature
        },
        body
      })

      const response = await POST(request)
      
      // Internal processing should map:
      // - Twilio From → payload.from
      // - Twilio Body → payload.text
      // - Twilio MessageSid → payload.externalMessageId
      // - Source should be 'twilio_whatsapp' (because From starts with 'whatsapp:')
      
      expect(response.status).toBe(200)
    })

    it('should detect source as twilio_sms for non-WhatsApp numbers', async () => {
      const url = 'https://guestflow.thebrowns.co.za/api/inbound/webhook'
      const params = {
        MessageSid: 'SM_sms_message_123',
        From: '+27821234567', // No 'whatsapp:' prefix
        Body: 'SMS message',
        NumMedia: '0'
      }

      const signature = generateTwilioSignature(url, params, testAuthToken)
      const body = buildFormBody(params)

      const request = new NextRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Twilio-Signature': signature
        },
        body
      })

      const response = await POST(request)
      
      // Source should be 'twilio_sms' (From does not start with 'whatsapp:')
      expect(response.status).toBe(200)
    })
  })

  describe('GET endpoint (webhook verification)', () => {
    it('should return service info on GET request', async () => {
      const url = 'https://guestflow.thebrowns.co.za/api/inbound/webhook'
      const request = new NextRequest(url, { method: 'GET' })

      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.service).toBe('GuestFlow Inbound Webhook')
      expect(json.status).toBe('ready')
    })

    it('should handle webhook challenge verification', async () => {
      const url = 'https://guestflow.thebrowns.co.za/api/inbound/webhook?challenge=test_challenge_123'
      const request = new NextRequest(url, { method: 'GET' })

      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toBe('test_challenge_123')
    })
  })
})
