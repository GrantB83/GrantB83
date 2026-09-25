import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn(async () => ({ ok: 1 }))

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => ({
    type: 'turso',
    prepare: () => ({ get }),
  })),
}))

describe('GET /api/health/deep', () => {
  beforeEach(() => {
    get.mockClear()
  })

  it('touches the database and is uncached', async () => {
    const { GET } = await import('@/app/api/health/deep/route')
    const response = await GET()
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.touched).toBe(true)
    expect(body.check).toBe('deep')
    expect(response.headers.get('cache-control')).toMatch(/no-store/)
    expect(get).toHaveBeenCalled()
  })
})
