import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const inboundRows = [
  {
    id: BigInt(101),
    type: 'inbound',
    guest: '+27821234567',
    draft_content: 'Draft reply here',
    source: 'WhatsApp inbound',
    created_at: '2026-09-20T10:00:00.000Z',
    priority: 'medium',
    guest_phone: '+27821234567',
    metadata: '{"thread_id":55,"from_number":"+27821234567"}',
  },
]

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => ({
    prepare: vi.fn((query: string) => {
      if (query.includes('FROM inbound_messages')) {
        return { all: vi.fn(async () => inboundRows) }
      }
      if (query.includes('FROM guest_tickets')) {
        return { all: vi.fn(async () => []) }
      }
      if (query.includes('FROM welcome_drafts')) {
        return { all: vi.fn(async () => []) }
      }
      if (query.includes('FROM late_checkin_drafts')) {
        return { all: vi.fn(async () => []) }
      }
      return { all: vi.fn(async () => []), get: vi.fn(), run: vi.fn() }
    }),
  })),
}))

vi.mock('@/lib/staff-ops-drafts', () => ({
  staffOpsDraftsTableExists: vi.fn(async () => false),
  ensureStaffOpsDraftsTable: vi.fn(),
  approveStaffOpsDraft: vi.fn(),
  rejectStaffOpsDraft: vi.fn(),
}))

describe('GET /api/approvals', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns 200 JSON when inbound row ids are BigInt (Turso/libsql)', async () => {
    const { GET } = await import('@/app/api/approvals/route')
    const response = await GET(
      new NextRequest('http://localhost:3100/api/approvals?tenant_id=1')
    )
    expect(response.status).toBe(200)
    const raw = await response.text()
    expect(() => JSON.parse(raw)).not.toThrow()
    const data = JSON.parse(raw)
    expect(data.success).toBe(true)
    expect(data.items).toHaveLength(1)
    expect(data.items[0].id).toBe(101)
    expect(typeof data.items[0].id).toBe('number')
    expect(data.items[0].metadata.thread_id).toBe(55)
  })
})
