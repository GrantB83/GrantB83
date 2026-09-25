import { beforeEach, describe, expect, it, vi } from 'vitest'

const all = vi.fn()
const get = vi.fn()
const run = vi.fn()

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => ({
    prepare: () => ({
      all,
      get,
      run,
    }),
  })),
  getDefaultTenantIdAsync: vi.fn(async () => 1),
}))

describe('GET/POST /api/tenants', () => {
  beforeEach(() => {
    all.mockReset()
    get.mockReset()
    run.mockReset()
    all.mockResolvedValue([{ id: 1, name: 'Browns', location: 'Dullstroom', timezone: 'Africa/Johannesburg' }])
    get.mockResolvedValue({ id: 2, name: 'New', location: 'X', timezone: 'Africa/Johannesburg' })
    run.mockResolvedValue({ lastInsertRowid: 2 })
  })

  it('uses async db APIs (Turso-safe)', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const source = fs.readFileSync(
      path.join(__dirname, '../src/app/api/tenants/route.ts'),
      'utf8'
    )
    expect(source).toContain('getDbAsync')
    expect(source).toContain('getDefaultTenantIdAsync')
    expect(source).not.toMatch(/\bgetDb\(\)/)
    expect(source).not.toMatch(/\bgetDefaultTenantId\(\)/)
  })

  it('GET returns tenants with no-store cache control', async () => {
    const { GET } = await import('@/app/api/tenants/route')
    const response = await GET()
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.tenants).toHaveLength(1)
    expect(data.defaultTenantId).toBe(1)
    expect(response.headers.get('cache-control')).toMatch(/no-store/)
    expect(all).toHaveBeenCalled()
  })
})
