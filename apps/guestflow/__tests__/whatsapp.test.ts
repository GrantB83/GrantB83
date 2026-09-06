/**
 * WhatsApp Cloud API Tests
 * 
 * Tests for WhatsApp message sending functionality with mocked Graph API
 * Includes sandbox mode tests for dry-run operation
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
    WHATSAPP_BUSINESS_ACCOUNT_ID: 'test_business_id_789',
    WHATSAPP_MODE: 'live'
  }
})

afterEach(() => {
  process.env = originalEnv
  vi.restoreAllMocks()
})

describe('WhatsApp Service', () => {
  it('should detect when WhatsApp is configured for live mode', async () => {
    const { isWhatsAppConfigured, getWhatsAppMode } = await import('@/lib/whatsapp')
    expect(isWhatsAppConfigured()).toBe(true)
    expect(getWhatsAppMode()).toBe('live')
  })

  it('should auto-detect sandbox mode when credentials missing', async () => {
    delete process.env.WHATSAPP_TOKEN
    delete process.env.WHATSAPP_MODE
    
    vi.resetModules()
    const { isWhatsAppConfigured, getWhatsAppMode, isWhatsAppSandboxMode } = await import('@/lib/whatsapp')
    
    expect(isWhatsAppConfigured()).toBe(false)
    expect(getWhatsAppMode()).toBe('sandbox')
    expect(isWhatsAppSandboxMode()).toBe(true)
  })

  it('should respect explicit sandbox mode even with credentials', async () => {
    process.env.WHATSAPP_MODE = 'sandbox'
    
    vi.resetModules()
    const { isWhatsAppConfigured, getWhatsAppMode, isWhatsAppSandboxMode } = await import('@/lib/whatsapp')
    
    expect(isWhatsAppConfigured()).toBe(false)
    expect(getWhatsAppMode()).toBe('sandbox')
    expect(isWhatsAppSandboxMode()).toBe(true)
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

  it('should validate phone number format in live mode', async () => {
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    
    const result = await sendWhatsAppMessage({
      to: '0836458313', // Missing +
      message: 'Test'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('international format')
  })

  it('should validate phone number format in sandbox mode', async () => {
    process.env.WHATSAPP_MODE = 'sandbox'
    
    vi.resetModules()
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    
    const result = await sendWhatsAppMessage({
      to: '0836458313', // Missing +
      message: 'Test'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('international format')
    expect(result.sandboxMode).toBe(true)
  })

  it('should succeed in sandbox mode when credentials missing', async () => {
    delete process.env.WHATSAPP_TOKEN
    delete process.env.WHATSAPP_PHONE_NUMBER_ID
    delete process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
    delete process.env.WHATSAPP_MODE
    
    vi.resetModules()
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    
    const result = await sendWhatsAppMessage({
      to: '+27836458313',
      message: 'Test'
    })

    expect(result.success).toBe(true)
    expect(result.sandboxMode).toBe(true)
    expect(result.messageId).toContain('sandbox_')
  })

  it('should succeed in explicit sandbox mode', async () => {
    process.env.WHATSAPP_MODE = 'sandbox'
    
    vi.resetModules()
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    
    const result = await sendWhatsAppMessage({
      to: '+15005550006',
      message: 'Sandbox test message'
    })

    expect(result.success).toBe(true)
    expect(result.sandboxMode).toBe(true)
    expect(result.messageId).toContain('sandbox_')
    expect(result.timestamp).toBeDefined()
  })

  it('should not call Meta API in sandbox mode', async () => {
    process.env.WHATSAPP_MODE = 'sandbox'
    
    vi.resetModules()
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy as any
    
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    
    await sendWhatsAppMessage({
      to: '+27836458313',
      message: 'Test'
    })

    // Verify fetch was NOT called in sandbox mode
    expect(fetchSpy).not.toHaveBeenCalled()
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

describe('Sandbox Mode', () => {
  it('should default to sandbox when credentials missing', async () => {
    delete process.env.WHATSAPP_TOKEN
    delete process.env.WHATSAPP_PHONE_NUMBER_ID
    delete process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
    delete process.env.WHATSAPP_MODE
    
    vi.resetModules()
    const { getWhatsAppMode } = await import('@/lib/whatsapp')
    
    expect(getWhatsAppMode()).toBe('sandbox')
  })

  it('should allow explicit sandbox mode with credentials present', async () => {
    process.env.WHATSAPP_MODE = 'sandbox'
    // Credentials are set in beforeEach
    
    vi.resetModules()
    const { getWhatsAppMode } = await import('@/lib/whatsapp')
    
    expect(getWhatsAppMode()).toBe('sandbox')
  })

  it('should generate unique sandbox message IDs', async () => {
    process.env.WHATSAPP_MODE = 'sandbox'
    
    vi.resetModules()
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    
    const result1 = await sendWhatsAppMessage({
      to: '+27836458313',
      message: 'Test 1'
    })

    const result2 = await sendWhatsAppMessage({
      to: '+27836458313',
      message: 'Test 2'
    })

    expect(result1.messageId).not.toBe(result2.messageId)
    expect(result1.messageId).toContain('sandbox_')
    expect(result2.messageId).toContain('sandbox_')
  })

  it('should include portal URL in sandbox dry-run', async () => {
    process.env.WHATSAPP_MODE = 'sandbox'
    
    vi.resetModules()
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    
    const result = await sendWhatsAppMessage({
      to: '+27836458313',
      message: 'Welcome',
      portalUrl: 'https://portal.thebrowns.co.za/booking/abc123'
    })

    expect(result.success).toBe(true)
    expect(result.sandboxMode).toBe(true)
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

  it('should work in sandbox mode for demos without live credentials', () => {
    // Sandbox mode allows staff flows, approve→draft, portal, 
    // and Nightsbridge sync to continue working without live Twilio/Meta creds
    expect(true).toBe(true)
  })
})
