import { describe, expect, it, vi } from 'vitest'
import { queryMaxInboundId } from '@/lib/health-deep-diagnostics'

describe('queryMaxInboundId', () => {
  it('returns null with note when table is missing', async () => {
    const db = {
      prepare: () => ({
        get: vi.fn(async () => {
          throw new Error('SQLite error: no such table: inbound_threads')
        }),
      }),
    }
    const result = await queryMaxInboundId(db, 'inbound_threads')
    expect(result.value).toBeNull()
    expect(result.note).toMatch(/not found/)
  })
})
