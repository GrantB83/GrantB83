import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseDatabaseUrlHost } from '@/lib/health-deep-diagnostics'

const selectOneGet = vi.fn(async () => ({ ok: 1 }))
const maxThreadGet = vi.fn(async () => ({ max_id: 47 }))
const maxMessageGet = vi.fn(async () => ({ max_id: 120 }))

const getDbAsync = vi.fn(async () => ({
  type: 'turso',
  prepare: (sql: string) => {
    if (sql.includes('SELECT 1')) {
      return { get: selectOneGet }
    }
    if (sql.includes('inbound_threads')) {
      return { get: maxThreadGet }
    }
    if (sql.includes('inbound_messages')) {
      return { get: maxMessageGet }
    }
    return { get: vi.fn(async () => undefined) }
  },
}))

vi.mock('@/lib/db', () => ({
  getDbAsync,
}))

describe('parseDatabaseUrlHost', () => {
  it('returns hostname only for libsql Turso URLs', () => {
    expect(
      parseDatabaseUrlHost('libsql://browns-guestflow-grantb83.aws-us-west-2.turso.io')
    ).toBe('browns-guestflow-grantb83.aws-us-west-2.turso.io')
  })

  it('strips credentials and path from https URLs', () => {
    expect(
      parseDatabaseUrlHost('https://user:secret@my-db.turso.io/some/path?authToken=eyJhbGci')
    ).toBe('my-db.turso.io')
  })

  it('returns null when unset', () => {
    expect(parseDatabaseUrlHost(undefined)).toBeNull()
    expect(parseDatabaseUrlHost('')).toBeNull()
  })
})

describe('GET /api/health/deep', () => {
  const envBackup = { ...process.env }

  beforeEach(() => {
    selectOneGet.mockClear()
    maxThreadGet.mockClear()
    maxMessageGet.mockClear()
    getDbAsync.mockClear()
    process.env.DATABASE_URL =
      'libsql://browns-guestflow-grantb83.aws-us-west-2.turso.io'
    process.env.TURSO_AUTH_TOKEN = 'test-token-not-echoed'
    vi.resetModules()
  })

  afterEach(() => {
    process.env = { ...envBackup }
  })

  it('touches the database, reports max inbound ids and safe host, and is uncached', async () => {
    const { GET } = await import('@/app/api/health/deep/route')
    const response = await GET()
    const body = await response.json()
    const serialized = JSON.stringify(body)

    expect(response.status).toBe(200)
    expect(body.touched).toBe(true)
    expect(body.check).toBe('deep')
    expect(body.maxInboundThreadId).toBe(47)
    expect(body.maxInboundMessageId).toBe(120)
    expect(body.databaseUrlHost).toBe('browns-guestflow-grantb83.aws-us-west-2.turso.io')
    expect(body.hasTursoAuthToken).toBe(true)
    expect(response.headers.get('cache-control')).toMatch(/no-store/)
    expect(selectOneGet).toHaveBeenCalled()
    expect(maxThreadGet).toHaveBeenCalled()
    expect(maxMessageGet).toHaveBeenCalled()

    expect(serialized).not.toMatch(/eyJ/)
    expect(serialized).not.toMatch(/libsql:\/\//)
    expect(serialized).not.toContain('test-token-not-echoed')
    expect(serialized).not.toContain('secret')
  })

  it('does not echo Turso token when only auth env is set', async () => {
    delete process.env.DATABASE_URL
    process.env.TURSO_AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.fake'
    vi.resetModules()

    const { GET } = await import('@/app/api/health/deep/route')
    const response = await GET()
    const serialized = JSON.stringify(await response.json())

    expect(serialized).not.toMatch(/eyJ/)
    expect(serialized).not.toContain('fake')
  })
})
