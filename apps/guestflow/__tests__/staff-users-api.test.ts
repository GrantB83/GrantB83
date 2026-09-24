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

const TEST_DB_PATH = path.join(__dirname, '../../../data/test-staff-users-api.db')

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

function authedRequest(url: string, token: string, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  headers.set('cookie', `${STAFF_SESSION_COOKIE}=${token}`)
  if (init?.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  return new NextRequest(url, { ...init, headers } as ConstructorParameters<typeof NextRequest>[1])
}

describe('staff users API', () => {
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
    sqlite.exec('DELETE FROM staff_login_attempts')
    sqlite.exec('DELETE FROM staff_users')
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
      email: 'liana@thebrowns.co.za',
      displayName: 'Liana',
    })
    return { user: added.user, token }
  }

  it('GET lists users without hashes', async () => {
    const { token } = await seedActor()
    const { GET } = await import('@/app/api/staff/users/route')
    const response = await GET(authedRequest('http://localhost:3100/api/staff/users', token))
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.email).toBe('liana@thebrowns.co.za')
    expect(data.users[0].email).toBe('liana@thebrowns.co.za')
    expect(JSON.stringify(data)).not.toMatch(/password_hash|\$2[aby]\$/)
  })

  it('POST adds a user by email', async () => {
    const { token } = await seedActor()
    const { POST } = await import('@/app/api/staff/users/route')
    const response = await POST(
      authedRequest('http://localhost:3100/api/staff/users', token, {
        method: 'POST',
        body: JSON.stringify({
          email: 'Grant@TheBrowns.co.za',
          password: 'pw-grant',
          display_name: 'Grant',
        }),
      })
    )
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.user.email).toBe('grant@thebrowns.co.za')
    expect(data.user.display_name).toBe('Grant')
    expect(data.user.created_by).toBe('liana@thebrowns.co.za')
  })

  it('POST rejects invalid email', async () => {
    const { token } = await seedActor()
    const { POST } = await import('@/app/api/staff/users/route')
    const response = await POST(
      authedRequest('http://localhost:3100/api/staff/users', token, {
        method: 'POST',
        body: JSON.stringify({ email: 'not-an-email', password: 'pw' }),
      })
    )
    expect(response.status).toBe(400)
  })

  it('DELETE refuses self-remove', async () => {
    const { user, token } = await seedActor()
    const { DELETE } = await import('@/app/api/staff/users/[id]/route')
    const response = await DELETE(
      authedRequest(`http://localhost:3100/api/staff/users/${user.id}`, token, { method: 'DELETE' }),
      { params: { id: String(user.id) } }
    )
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toMatch(/yourself/)
  })
})
