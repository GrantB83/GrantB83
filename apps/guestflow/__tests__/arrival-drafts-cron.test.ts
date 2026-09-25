import { beforeEach, describe, expect, it, vi } from 'vitest'

const runArrivalDraftsJob = vi.fn()

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => ({ prepare: vi.fn(), exec: vi.fn(), batch: vi.fn() })),
}))

vi.mock('@/lib/arrival-drafts', () => ({
  runArrivalDraftsJob: (...args: unknown[]) => runArrivalDraftsJob(...args),
}))

describe('GET /api/cron/arrival-drafts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-cron-secret'
    runArrivalDraftsJob.mockResolvedValue({
      ok: true,
      timezone: 'Africa/Johannesburg',
      todaySast: '2026-09-24',
      hourSast: 6,
      created: 0,
      updated: 0,
      discarded: 0,
      skipped: 0,
      noContact: 0,
      unresolvedCodes: 0,
    })
  })

  it('returns 500 when CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET
    const { GET } = await import('@/app/api/cron/arrival-drafts/route')
    const response = await GET(new Request('http://localhost:3100/api/cron/arrival-drafts') as any)
    expect(response.status).toBe(500)
    expect(runArrivalDraftsJob).not.toHaveBeenCalled()
  })

  it('returns 401 without a matching secret', async () => {
    const { GET } = await import('@/app/api/cron/arrival-drafts/route')
    const response = await GET(new Request('http://localhost:3100/api/cron/arrival-drafts') as any)
    expect(response.status).toBe(401)
    expect(runArrivalDraftsJob).not.toHaveBeenCalled()
  })

  it('runs the idempotent job when authorized and never implies a send', async () => {
    const { GET } = await import('@/app/api/cron/arrival-drafts/route')
    const response = await GET(
      new Request('http://localhost:3100/api/cron/arrival-drafts?now=2026-09-24T04:00:00.000Z', {
        headers: { authorization: 'Bearer test-cron-secret' },
      }) as any
    )
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.ok).toBe(true)
    expect(runArrivalDraftsJob).toHaveBeenCalledTimes(1)
    const source = await import('fs').then((fs) =>
      fs.readFileSync(require('path').join(__dirname, '../src/app/api/cron/arrival-drafts/route.ts'), 'utf8')
    )
    expect(source).not.toMatch(/sendWhatsAppMessage|sendEmail|sendSms/)
  })
})
