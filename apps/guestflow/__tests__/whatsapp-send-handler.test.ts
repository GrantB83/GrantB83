/**
 * POST /api/whatsapp/send is retired (410).
 * CoS bounce: any channel send must use approve + one-time confirmToken on /api/inbound/send.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendWhatsAppMessage = vi.fn()

vi.mock('@/lib/whatsapp', () => ({
  sendWhatsAppMessage,
  isWhatsAppConfigured: vi.fn(() => true),
  getWhatsAppMode: vi.fn(() => 'live'),
  isWhatsAppSandboxMode: vi.fn(() => false),
  getWhatsAppProvider: vi.fn(() => 'twilio'),
}))

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => {
    throw new Error('whatsapp/send must not touch the database')
  }),
}))

describe('POST /api/whatsapp/send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 410 without confirmToken and never sends', async () => {
    const { POST } = await import('@/app/api/whatsapp/send/route')
    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(410)
    expect(data.success).toBe(false)
    expect(data.retired).toBe(true)
    expect(data.error).toMatch(/retired/i)
    expect(data.error).toContain('/api/inbound/send')
    expect(data.error).toContain('confirmToken')
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
  })

  it('returns 410 even when a confirmToken body is supplied and never sends', async () => {
    const { POST } = await import('@/app/api/whatsapp/send/route')
    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(410)
    expect(data.retired).toBe(true)
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
  })

  it('GET remains status-only and reports sendRetired', async () => {
    const { GET } = await import('@/app/api/whatsapp/send/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.sendRetired).toBe(true)
    expect(data.sendVia).toBe('/api/inbound/send')
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
  })
})
