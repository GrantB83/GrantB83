import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { NextRequest } from 'next/server'
import type { DbClient } from '@/lib/db'
import { addStaffUser } from '@/lib/staff-auth'
import { createStaffSession } from '@/lib/staff-session'
import { ensureStaffUsersSchema } from '@/lib/staff-users-schema'
import { STAFF_SESSION_COOKIE } from '@/lib/staff-session-cookie'

const TEST_DB_PATH = path.join(__dirname, '../../../data/test-outbound-redirect-api.db')

function createTestDbClient(db: Database.Database) {
  return {
    prepare: (sql: string) => {
      const stmt = db.prepare(sql)
      return {
        run: (...params: any[]) => stmt.run(...params),
        get: (...params: any[]) => stmt.get(...params),
        all: (...params: any[]) => stmt.all(...params),
      }
    },
    exec: (sql: string) => {
      db.exec(sql)
    },
    batch: () => {},
    type: 'sqlite' as const,
  } as unknown as DbClient
}

let sqlite: Database.Database
let testDb: ReturnType<typeof createTestDbClient>

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => testDb),
}))

function request(url: string, init?: RequestInit, token?: string) {
  const headers = new Headers(init?.headers)
  if (token) headers.set('cookie', `${STAFF_SESSION_COOKIE}=${token}`)
  if (init?.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  return new NextRequest(url, { ...init, headers } as ConstructorParameters<typeof NextRequest>[1])
}

describe('outbound redirect API', () => {
  beforeAll(async () => {
    process.env.STAFF_BCRYPT_ROUNDS = '4'
    const dir = path.dirname(TEST_DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
    sqlite = new Database(TEST_DB_PATH)
    testDb = createTestDbClient(sqlite)
    await ensureStaffUsersSchema(testDb)
  })

  afterAll(() => {
    sqlite?.close()
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
  })

  beforeEach(() => {
    sqlite.exec('DELETE FROM staff_sessions')
    sqlite.exec('DELETE FROM staff_user_audit')
    sqlite.exec('DELETE FROM staff_users')
    sqlite.exec('DELETE FROM app_settings')
  })

  async function seedActor() {
    const added = await addStaffUser(testDb, {
      email: 'liana@thebrowns.co.za',
      password: 'pw-liana',
      displayName: 'Liana',
      actorEmail: 'bootstrap',
    })
    if (!added.ok) throw new Error('seed failed')
    const token = await createStaffSession(testDb, {
      userId: added.user.id,
      email: added.user.email,
      displayName: added.user.display_name,
    })
    return token
  }

  it('unauthenticated GET and POST get 401', async () => {
    const { GET, POST } = await import('@/app/api/staff/outbound-redirect/route')
    const getRes = await GET(request('http://localhost/api/staff/outbound-redirect'))
    const postRes = await POST(
      request('http://localhost/api/staff/outbound-redirect', {
        method: 'POST',
        body: JSON.stringify({ on: false }),
      })
    )
    expect(getRes.status).toBe(401)
    expect(postRes.status).toBe(401)
  })

  it('authenticated flip writes audit and returns old/new', async () => {
    const token = await seedActor()
    const { GET, POST } = await import('@/app/api/staff/outbound-redirect/route')
    const before = await GET(request('http://localhost/api/staff/outbound-redirect', undefined, token))
    expect(before.status).toBe(200)
    const beforeBody = await before.json()
    expect(beforeBody.on).toBe(true)

    const flipped = await POST(
      request(
        'http://localhost/api/staff/outbound-redirect',
        { method: 'POST', body: JSON.stringify({ on: false }) },
        token
      )
    )
    expect(flipped.status).toBe(200)
    expect(await flipped.json()).toMatchObject({ on: false, old: 'on', next: 'off' })

    const row = sqlite
      .prepare(`SELECT actor, action, target FROM staff_user_audit WHERE action = 'outbound_redirect_flip'`)
      .get() as { actor: string; action: string; target: string }
    expect(row).toMatchObject({
      actor: 'liana@thebrowns.co.za',
      action: 'outbound_redirect_flip',
      target: 'on->off',
    })
  })
})
