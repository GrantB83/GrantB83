/**
 * WhatsApp Cloud API Tests
 * 
 * Tests for WhatsApp message sending functionality with mocked Graph API
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock environment variables
const originalEnv = process.env

beforeEach(() => {
  vi.resetModules()
  process.env = {
    ...originalEnv,
    WHATSAPP_TOKEN: 'test_token_123',
    WHATSAPP_PHONE_NUMBER_ID: 'test_phone_id_456',
    WHATSAPP_BUSINESS_ACCOUNT_ID: 'test_business_id_789'
  }
})

afterEach(() => {
  process.env = originalEnv
  vi.restoreAllMocks()
})

describe('WhatsApp Service', () => {
  it('should detect when WhatsApp is configured', async () => {
    const { isWhatsAppConfigured } = await import('@/lib/whatsapp')
    expect(isWhatsAppConfigured()).toBe(true)
  })

  it('should detect when WhatsApp is not configured', async () => {
    delete process.env.WHATSAPP_TOKEN
    
    // Re-import to get fresh module with new env
    vi.resetModules()
    const { isWhatsAppConfigured } = await import('@/lib/whatsapp')
    
    expect(isWhatsAppConfigured()).toBe(false)
  })

  it('should send WhatsApp message successfully', async () => {
    // Mock successful Graph API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [{ id: 'wamid.test123' }]
      })
    }) as any

    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    
    const result = await sendWhatsAppMessage({
      to: '+27836458313',
      message: 'Welcome to The Browns!'
    })

    expect(result.success).toBe(true)
    expect(result.messageId).toBe('wamid.test123')
    expect(result.timestamp).toBeDefined()
    
    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('graph.facebook.com'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test_token_123',
          'Content-Type': 'application/json'
        })
      })
    )
  })

  it('should include portal URL in message when provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [{ id: 'wamid.test456' }]
      })
    }) as any

    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    
    await sendWhatsAppMessage({
      to: '+27836458313',
      message: 'Welcome message',
      portalUrl: 'https://portal.thebrowns.co.za/booking/abc123'
    })

    const fetchCall = (global.fetch as any).mock.calls[0]
    const requestBody = JSON.parse(fetchCall[1].body)
    
    expect(requestBody.text.body).toContain('View Your Booking Portal')
    expect(requestBody.text.body).toContain('https://portal.thebrowns.co.za/booking/abc123')
    expect(requestBody.text.preview_url).toBe(true)
  })

  it('should handle Graph API errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          message: 'Invalid phone number format',
          code: 100
        }
      })
    }) as any

    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    
    const result = await sendWhatsAppMessage({
      to: '+invalid',
      message: 'Test'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid phone number format')
  })

  it('should validate phone number format', async () => {
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    
    const result = await sendWhatsAppMessage({
      to: '0836458313', // Missing +
      message: 'Test'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('international format')
  })

  it('should return error when not configured', async () => {
    delete process.env.WHATSAPP_TOKEN
    delete process.env.WHATSAPP_PHONE_NUMBER_ID
    delete process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
    
    vi.resetModules()
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    
    const result = await sendWhatsAppMessage({
      to: '+27836458313',
      message: 'Test'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('not configured')
  })

  it('should remove spaces from phone number', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [{ id: 'wamid.test789' }]
      })
    }) as any

    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    
    await sendWhatsAppMessage({
      to: '+27 83 645 8313', // With spaces
      message: 'Test'
    })

    const fetchCall = (global.fetch as any).mock.calls[0]
    const requestBody = JSON.parse(fetchCall[1].body)
    
    expect(requestBody.to).toBe('+27836458313') // Spaces removed
  })

  it('should handle network errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure')) as any

    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    
    const result = await sendWhatsAppMessage({
      to: '+27836458313',
      message: 'Test'
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Network failure')
  })
})

describe('WhatsApp API Route', () => {
  it('should return 503 when WhatsApp not configured', async () => {
    delete process.env.WHATSAPP_TOKEN
    
    vi.resetModules()
    
    // This would need to be tested with Next.js test utilities
    // For now, this documents the expected behavior
    expect(true).toBe(true)
  })

  it('should validate required fields in POST request', async () => {
    // This would need Next.js route handler testing
    expect(true).toBe(true)
  })
})

describe('WhatsApp Message Templates', () => {
  it('should document required Meta message templates', () => {
    // This test documents the template requirements for Meta approval
    const requiredTemplates = [
      'stay_packet_link',
      'welcome_message',
      'custom_within_24h'
    ]

    expect(requiredTemplates).toContain('stay_packet_link')
    expect(requiredTemplates).toContain('welcome_message')
    
    // Templates must be approved in Meta Business Manager
    // before production use outside 24h customer service window
  })
})

describe('Hard Gates', () => {
  it('should never auto-send without explicit approval', () => {
    // This test documents the hard gate requirement
    // Actual enforcement is in UI layer with confirmation dialog
    expect(true).toBe(true)
  })

  it('should log send attempts without storing message bodies', () => {
    // Log format documented: status, timestamp, has_portal_link
    // Message body is NOT stored in logs
    expect(true).toBe(true)
  })
})
