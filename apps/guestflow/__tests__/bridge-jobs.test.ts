import { beforeEach, describe, expect, it, vi } from 'vitest'

const job = {
  id: 44,
  channel: 'whatsapp_web' as const,
  status: 'queued' as const,
  thread_id: 12,
  to_address: '+27821234567',
  body_text: 'Hi Sam,\n\nSee you Friday.',
  subject: null,
  claim_token: null,
  claimed_at: null,
  completed_at: null,
  error_code: null,
  created_at: '2026-09-20T12:00:00.000Z',
  updated_at: '2026-09-20T12:00:00.000Z',
}

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => ({
    prepare: vi.fn(),
    batch: vi.fn(),
    exec: vi.fn(),
  })),
}))

vi.mock('@/lib/send-jobs', async () => {
  const actual = await vi.importActual<typeof import('@/lib/send-jobs')>('@/lib/send-jobs')
  return {
    ...actual,
    listJobs: vi.fn(),
    claimJob: vi.fn(),
    completeJob: vi.fn(),
    getJob: vi.fn(),
  }
})

describe('bridge job API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BRIDGE_JOB_SECRET = 'bridge-secret'
  })

  it('rejects list without secret', async () => {
    const { GET } = await import('@/app/api/bridge/jobs/route')
    const response = await GET(
      new Request('http://localhost:3100/api/bridge/jobs?status=queued') as any
    )
    expect(response.status).toBe(401)
  })

  it('lists queued jobs for the clicker', async () => {
    const { listJobs, publicJob } = await import('@/lib/send-jobs')
    vi.mocked(listJobs).mockResolvedValue([job])
    const { GET } = await import('@/app/api/bridge/jobs/route')
    const request = new Request('http://localhost:3100/api/bridge/jobs?status=queued', {
      headers: { Authorization: 'Bearer bridge-secret' },
    })
    const response = await GET(request as any)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.jobs[0]).toEqual(publicJob(job))
    expect(data.jobs[0].body).toContain('\n')
  })

  it('claims a queued job', async () => {
    const { claimJob } = await import('@/lib/send-jobs')
    vi.mocked(claimJob).mockResolvedValue({ ...job, status: 'claimed', claim_token: 'tok' })
    const { POST } = await import('@/app/api/bridge/jobs/[id]/claim/route')
    const response = await POST(
      new Request('http://localhost:3100/api/bridge/jobs/44/claim', {
        method: 'POST',
        headers: { Authorization: 'Bearer bridge-secret' },
      }) as any,
      { params: { id: '44' } }
    )
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.job.status).toBe('claimed')
  })

  it('completes sent only from the bridge route', async () => {
    const { completeJob, getJob } = await import('@/lib/send-jobs')
    vi.mocked(getJob).mockResolvedValue({ ...job, status: 'claimed' })
    vi.mocked(completeJob).mockResolvedValue({
      ...job,
      status: 'sent',
      completed_at: '2026-09-20T12:05:00.000Z',
    })
    const { POST } = await import('@/app/api/bridge/jobs/[id]/complete/route')
    const response = await POST(
      new Request('http://localhost:3100/api/bridge/jobs/44/complete', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer bridge-secret',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'sent' }),
      }) as any,
      { params: { id: '44' } }
    )
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.job.status).toBe('sent')
    expect(completeJob).toHaveBeenCalledWith(expect.anything(), 44, 'sent', null)
  })
})
