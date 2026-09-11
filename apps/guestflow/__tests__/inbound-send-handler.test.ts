/**
 * Tests for Inbound Send API Handler
 * 
 * Tests the POST /api/inbound/send endpoint that sends WhatsApp messages
 * All tests mock the sendWhatsAppMessage function to avoid calling live API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SendMessageRequest, SendMessageResponse } from '@/types/inbound'

// Mock the WhatsApp send library
vi.mock('@/lib/whatsapp', () => ({
  sendWhatsAppMessage: vi.fn(),
  getWhatsAppProvider: vi.fn(() => 'sandbox'),
  isWhatsAppSandboxMode: vi.fn(() => true)
}))

// Mock the database
vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => ({
    prepare: vi.fn((query: string) => ({
      get: vi.fn(),
      all: vi.fn(),
      run: vi.fn(),
      bind: vi.fn(function(this: any, ...args: any[]) {
        return this
      })
    })),
    batch: vi.fn()
  }))
}))

describe('POST /api/inbound/send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when threadId is missing', async () => {
    // Test case T006: Validate request body
    const requestBody = {}
    
    // Mock request
    const request = new Request('http://localhost:3100/api/inbound/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    // Import route handler dynamically to avoid top-level imports during mock setup
    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(request as any)
    const data = await response.json() as SendMessageResponse

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('threadId')
  })

  it('returns 400 when thread not found', async () => {
    // Test case T007: Validate thread existence
    const { getDbAsync } = await import('@/lib/db')
    const mockDb = await getDbAsync()
    
    // Mock database to return no thread
    vi.mocked(mockDb.prepare).mockReturnValue({
      get: vi.fn(() => null),
      all: vi.fn(),
      run: vi.fn(),
      bind: vi.fn(function(this: any) { return this })
    } as any)

    const requestBody: SendMessageRequest = { threadId: 999 }
    const request = new Request('http://localhost:3100/api/inbound/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(request as any)
    const data = await response.json() as SendMessageResponse

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Thread not found')
  })

  it('returns 400 when thread has no draft reply', async () => {
    // Test case T008: Validate draft exists
    const { getDbAsync } = await import('@/lib/db')
    const mockDb = await getDbAsync()
    
    // Mock database to return thread without draft reply
    const mockThread = {
      id: 1,
      from_number: '+27821234567',
      status: 'drafted'
    }
    const mockMessage = {
      id: 1,
      draft_reply: null // No draft reply
    }
    
    let callCount = 0
    vi.mocked(mockDb.prepare).mockReturnValue({
      get: vi.fn(() => {
        callCount++
        if (callCount === 1) return mockThread
        return mockMessage
      }),
      all: vi.fn(),
      run: vi.fn(),
      bind: vi.fn(function(this: any) { return this })
    } as any)

    const requestBody: SendMessageRequest = { threadId: 1 }
    const request = new Request('http://localhost:3100/api/inbound/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(request as any)
    const data = await response.json() as SendMessageResponse

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('no draft reply')
  })

  it('successfully sends message in sandbox mode', async () => {
    // Test case T009: Mock sendWhatsAppMessage to return sandbox result
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    const { getDbAsync } = await import('@/lib/db')
    const mockDb = await getDbAsync()

    // Mock successful sandbox send
    vi.mocked(sendWhatsAppMessage).mockResolvedValue({
      success: true,
      messageId: 'sandbox_123_abc',
      timestamp: '2026-09-11T14:30:00.000Z',
      sandboxMode: true,
      provider: 'sandbox'
    })

    // Mock database responses
    const mockThread = {
      id: 1,
      from_number: '+27821234567',
      status: 'drafted'
    }
    const mockMessage = {
      id: 1,
      draft_reply: 'Hi there, thank you for your inquiry...'
    }
    
    let callCount = 0
    vi.mocked(mockDb.prepare).mockReturnValue({
      get: vi.fn(() => {
        callCount++
        if (callCount === 1) return mockThread
        return mockMessage
      }),
      all: vi.fn(),
      run: vi.fn(),
      bind: vi.fn(function(this: any) { return this })
    } as any)

    // Mock batch transaction
    vi.mocked(mockDb.batch).mockResolvedValue(undefined as any)

    const requestBody: SendMessageRequest = { threadId: 1 }
    const request = new Request('http://localhost:3100/api/inbound/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(request as any)
    const data = await response.json() as SendMessageResponse

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data?.provider).toBe('sandbox')
    expect(data.data?.sandboxMode).toBe(true)
    expect(data.data?.messageId).toBe('sandbox_123_abc')
    expect(data.data?.threadStatus).toBe('sent')
    expect(sendWhatsAppMessage).toHaveBeenCalledWith({
      to: '+27821234567',
      message: 'Hi there, thank you for your inquiry...'
    })
  })

  it('handles WhatsApp API errors gracefully', async () => {
    // Test case T010: Mock sendWhatsAppMessage to throw error
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    const { getDbAsync } = await import('@/lib/db')
    const mockDb = await getDbAsync()

    // Mock failed send
    vi.mocked(sendWhatsAppMessage).mockResolvedValue({
      success: false,
      error: 'Twilio API error: Invalid phone number',
      timestamp: '2026-09-11T14:30:00.000Z',
      sandboxMode: false,
      provider: 'twilio'
    })

    // Mock database responses
    const mockThread = {
      id: 1,
      from_number: '+27821234567',
      status: 'drafted'
    }
    const mockMessage = {
      id: 1,
      draft_reply: 'Hi there, thank you for your inquiry...'
    }
    
    let callCount = 0
    vi.mocked(mockDb.prepare).mockReturnValue({
      get: vi.fn(() => {
        callCount++
        if (callCount === 1) return mockThread
        return mockMessage
      }),
      all: vi.fn(),
      run: vi.fn(),
      bind: vi.fn(function(this: any) { return this })
    } as any)

    // Mock batch transaction
    vi.mocked(mockDb.batch).mockResolvedValue(undefined as any)

    const requestBody: SendMessageRequest = { threadId: 1 }
    const request = new Request('http://localhost:3100/api/inbound/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    const { POST } = await import('@/app/api/inbound/send/route')
    const response = await POST(request as any)
    const data = await response.json() as SendMessageResponse

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Failed to send')
    expect(data.details).toContain('Invalid phone number')
  })
})
