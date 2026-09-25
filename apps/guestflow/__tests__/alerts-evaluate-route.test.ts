import { beforeEach, describe, expect, it, vi } from 'vitest'

const evaluateStaffAlerts = vi.fn(async () => ({ sent: 0, skipped: 0, resolved: 0, kinds: {} }))

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => ({ prepare: vi.fn(), exec: vi.fn(), batch: vi.fn() })),
}))
vi.mock('@/lib/staff-alerts', () => ({ evaluateStaffAlerts }))
vi.mock('@/lib/sprint2-schema', () => ({ ensureSprint2Schema: vi.fn() }))
vi.mock('@/lib/umi-schema', () => ({ ensureUmiSchema: vi.fn() }))
vi.mock('@/lib/staff-users-schema', () => ({ ensureStaffUsersSchema: vi.fn() }))

describe('POST /api/cron/alerts-evaluate', () => {
  beforeEach(() => {
    evaluateStaffAlerts.mockClear()
    process.env.CRON_SECRET = 'test-cron'
    process.env.NODE_ENV = 'test'
  })

  it('rejects a missing secret and evaluates when authorized', async () => {
    const { POST } = await import('@/app/api/cron/alerts-evaluate/route')
    const denied = await POST(new Request('http://localhost:3100/api/cron/alerts-evaluate') as any)
    expect(denied.status).toBe(401)
    const allowed = await POST(
      new Request('http://localhost:3100/api/cron/alerts-evaluate', {
        headers: { 'x-cron-secret': 'test-cron' },
      }) as any
    )
    expect(allowed.status).toBe(200)
    expect(evaluateStaffAlerts).toHaveBeenCalled()
  })
})
