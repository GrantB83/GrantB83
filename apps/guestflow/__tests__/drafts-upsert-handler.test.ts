import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    prepare: vi.fn(),
    exec: vi.fn(),
    batch: vi.fn(),
  },
}))

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => mockDb),
}))

vi.mock('@/lib/phase0-schema', () => ({
  ensurePhase0Schema: vi.fn(async () => {}),
}))

describe('POST /api/drafts/upsert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DRAFT_WORKER_SECRET = 'draft-secret-abc'
    process.env.CRON_SECRET = 'cron-secret-xyz'
    mockDb.prepare.mockReturnValue({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
    })
  })

  it('rejects missing secret', async () => {
    const { POST } = await import('@/app/api/drafts/upsert/route')
    const response = await POST(
      new Request('http://localhost:3100/api/drafts/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: 1, draftReply: 'Hi' }),
      }) as any
    )
    expect(response.status).toBe(401)
  })

  it('rejects CRON_SECRET even when it is valid for ingest', async () => {
    const { POST } = await import('@/app/api/drafts/upsert/route')
    const response = await POST(
      new Request('http://localhost:3100/api/drafts/upsert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer cron-secret-xyz',
        },
        body: JSON.stringify({ threadId: 1, draftReply: 'Hi' }),
      }) as any
    )
    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toMatch(/CRON_SECRET/)
  })

  it('accepts DRAFT_WORKER_SECRET and stores llm draft without calling a model', async () => {
    const run = vi.fn()
    mockDb.prepare.mockReturnValue({ run, get: vi.fn(), all: vi.fn() })
    const { POST } = await import('@/app/api/drafts/upsert/route')
    const response = await POST(
      new Request('http://localhost:3100/api/drafts/upsert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-draft-worker-secret': 'draft-secret-abc',
        },
        body: JSON.stringify({ threadId: 3, messageId: 9, draftReply: 'LLM draft text' }),
      }) as any
    )
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.draftSource).toBe('llm')
    expect(run).toHaveBeenCalled()
  })

  it('rejects when DRAFT_WORKER_SECRET is unset', async () => {
    delete process.env.DRAFT_WORKER_SECRET
    const { POST } = await import('@/app/api/drafts/upsert/route')
    const response = await POST(
      new Request('http://localhost:3100/api/drafts/upsert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer anything',
        },
        body: JSON.stringify({ threadId: 1, draftReply: 'Hi' }),
      }) as any
    )
    expect(response.status).toBe(401)
  })
})
