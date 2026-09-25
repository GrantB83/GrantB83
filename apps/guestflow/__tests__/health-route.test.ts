import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => ({
    type: 'turso',
    prepare: () => ({ get: vi.fn(async () => ({ ok: 1 })) }),
  })),
}))

vi.mock('@/lib/outbound-redirect', () => ({
  getOutboundStatus: vi.fn(async () => ({
    mode: 'live',
    redirectStatus: 'off',
  })),
}))

describe('GET /api/health', () => {
  it('is force-dynamic and sends no-store cache control', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const source = fs.readFileSync(
      path.join(__dirname, '../src/app/api/health/route.ts'),
      'utf8'
    )
    expect(source).toContain("export const dynamic = 'force-dynamic'")

    const { GET } = await import('@/app/api/health/route')
    const response = await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toMatch(/no-store/)
    const body = await response.json()
    expect(body.status).toBe('ok')
    expect(body.timestamp).toBeTruthy()
  })
})
