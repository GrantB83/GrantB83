import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import type { DbClient } from '@/lib/db'
import {
  addStaffUser,
  authenticateStaff,
  changeOwnPassword,
  isLegacyLoginEnabled,
  isRateLimited,
  listStaffUsers,
  recordLoginFailure,
  removeStaffUser,
} from '@/lib/staff-auth'
import { looksLikePasswordHash, RATE_LIMIT_MAX_FAILURES } from '@/lib/staff-auth-crypto'
import { actorStamp, deleteStaffSessionByToken, lookupStaffSession } from '@/lib/staff-session'
import { sha256HexEdge } from '@/lib/staff-session-edge'
import { createHash } from 'crypto'
import {
  ensureStaffUsersSchema,
  LEGACY_STAFF_EMAIL,
  maybeBootstrapFirstUser,
} from '@/lib/staff-users-schema'

const TEST_DB_PATH = path.join(__dirname, '../../../data/test-staff-auth.db')

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
    batch: (statements: Array<{ sql: string; args?: any[] }>) => {
      const tx = db.transaction(() => {
        for (const statement of statements) {
          db.prepare(statement.sql).run(...(statement.args || []))
        }
      })
      tx()
    },
    type: 'sqlite' as const,
  } as unknown as DbClient
}

describe('staff auth', () => {
  let sqlite: Database.Database
  let db: ReturnType<typeof createTestDbClient>
  const prevEnv = { ...process.env }

  beforeAll(async () => {
    process.env.STAFF_BCRYPT_ROUNDS = '4'
    const dir = path.dirname(TEST_DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
    sqlite = new Database(TEST_DB_PATH)
    db = createTestDbClient(sqlite)
    await ensureStaffUsersSchema(db)
  })

  afterAll(() => {
    sqlite?.close()
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
    process.env.GUESTFLOW_BOOTSTRAP_EMAIL = prevEnv.GUESTFLOW_BOOTSTRAP_EMAIL
    process.env.GUESTFLOW_BOOTSTRAP_PASSWORD = prevEnv.GUESTFLOW_BOOTSTRAP_PASSWORD
    process.env.GUESTFLOW_LEGACY_LOGIN = prevEnv.GUESTFLOW_LEGACY_LOGIN
    process.env.STAFF_PASSWORD = prevEnv.STAFF_PASSWORD
    process.env.STAFF_BCRYPT_ROUNDS = prevEnv.STAFF_BCRYPT_ROUNDS
  })

  beforeEach(() => {
    sqlite.exec('DELETE FROM staff_sessions')
    sqlite.exec('DELETE FROM staff_user_audit')
    sqlite.exec('DELETE FROM staff_login_attempts')
    sqlite.exec('DELETE FROM staff_users')
    delete process.env.GUESTFLOW_BOOTSTRAP_EMAIL
    delete process.env.GUESTFLOW_BOOTSTRAP_PASSWORD
    process.env.GUESTFLOW_LEGACY_LOGIN = '1'
    process.env.STAFF_PASSWORD = 'shared-secret'
    process.env.STAFF_BCRYPT_ROUNDS = '4'
  })

  it('hashes session tokens the same way in Edge and Node', async () => {
    const token = 'edge-session-token-check'
    const edge = await sha256HexEdge(token)
    const node = createHash('sha256').update(token, 'utf8').digest('hex')
    expect(edge).toBe(node)
  })

  it('stores a bcrypt hash, never plaintext', async () => {
    const added = await addStaffUser(db, {
      email: 'liana@thebrowns.co.za',
      password: 'plain-secret',
      actorEmail: 'bootstrap',
    })
    expect(added.ok).toBe(true)
    const row = sqlite.prepare('SELECT email, password_hash FROM staff_users WHERE email = ?').get(
      'liana@thebrowns.co.za'
    ) as { email: string; password_hash: string }
    expect(row.password_hash).not.toBe('plain-secret')
    expect(looksLikePasswordHash(row.password_hash)).toBe(true)
    expect(JSON.stringify(added)).not.toContain('plain-secret')
    expect(JSON.stringify(added)).not.toContain(row.password_hash)
  })

  it('adds a user, logs them in case-insensitively, and lists profile fields', async () => {
    const added = await addStaffUser(db, {
      email: 'Grant@TheBrowns.co.za',
      password: 'pw-grant',
      displayName: 'Grant',
      actorEmail: 'bootstrap',
    })
    expect(added.ok).toBe(true)
    if (added.ok) expect(added.user.email).toBe('grant@thebrowns.co.za')
    const login = await authenticateStaff(db, {
      email: 'GRANT@thebrowns.co.za',
      password: 'pw-grant',
      ip: '1.1.1.1',
    })
    expect(login.ok).toBe(true)
    if (!login.ok) return
    expect(login.email).toBe('grant@thebrowns.co.za')
    const session = await lookupStaffSession(db, login.rawToken)
    expect(session?.email).toBe('grant@thebrowns.co.za')
    expect(session?.displayName).toBe('Grant')
    expect(actorStamp(session, 'staff')).toBe('Grant <grant@thebrowns.co.za>')
    const users = await listStaffUsers(db)
    expect(users[0].created_by).toBe('bootstrap')
    expect(users[0].display_name).toBe('Grant')
    expect(users[0].last_login_at).toBeTruthy()
    expect(users[0]).not.toHaveProperty('password_hash')
    await deleteStaffSessionByToken(db, login.rawToken)
    expect(await lookupStaffSession(db, login.rawToken)).toBeNull()
  })

  it('rejects invalid email on login without creating a session', async () => {
    const result = await authenticateStaff(db, {
      email: 'not-an-email',
      password: 'pw',
      ip: '4.4.4.4',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(401)
      expect(result.error).toMatch(/Invalid email or password/)
    }
    const sessions = sqlite.prepare('SELECT COUNT(*) AS c FROM staff_sessions').get() as { c: number }
    expect(Number(sessions.c)).toBe(0)
  })

  it('rejects invalid emails and case-insensitive duplicates', async () => {
    const invalid = await addStaffUser(db, {
      email: 'not-an-email',
      password: 'pw',
      actorEmail: 'sys',
    })
    expect(invalid.ok).toBe(false)
    if (!invalid.ok) expect(invalid.error).toMatch(/Invalid email/)

    const first = await addStaffUser(db, {
      email: 'a@thebrowns.co.za',
      password: 'pw-a',
      actorEmail: 'sys',
    })
    expect(first.ok).toBe(true)
    const dup = await addStaffUser(db, {
      email: 'A@TheBrowns.co.za',
      password: 'pw-b',
      actorEmail: 'sys',
    })
    expect(dup.ok).toBe(false)
    if (!dup.ok) expect(dup.error).toMatch(/already exists/)
  })

  it('refuses self-remove and last-user remove', async () => {
    const a = await addStaffUser(db, {
      email: 'a@thebrowns.co.za',
      password: 'pw-a',
      actorEmail: 'sys',
    })
    expect(a.ok).toBe(true)
    if (!a.ok) return
    const self = await removeStaffUser(db, {
      id: a.user.id,
      actorEmail: 'a@thebrowns.co.za',
      actorUserId: a.user.id,
    })
    expect(self.ok).toBe(false)
    if (!self.ok) expect(self.error).toMatch(/yourself/)

    const last = await removeStaffUser(db, {
      id: a.user.id,
      actorEmail: LEGACY_STAFF_EMAIL,
      actorUserId: null,
    })
    expect(last.ok).toBe(false)
    if (!last.ok) expect(last.error).toMatch(/last remaining/)
    expect(await listStaffUsers(db)).toHaveLength(1)
  })

  it('removes a user and revokes their sessions', async () => {
    const a = await addStaffUser(db, {
      email: 'a@thebrowns.co.za',
      password: 'pw-a',
      actorEmail: 'sys',
    })
    const b = await addStaffUser(db, {
      email: 'b@thebrowns.co.za',
      password: 'pw-b',
      actorEmail: 'a@thebrowns.co.za',
    })
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    const login = await authenticateStaff(db, {
      email: 'b@thebrowns.co.za',
      password: 'pw-b',
      ip: '2.2.2.2',
    })
    expect(login.ok).toBe(true)
    if (!login.ok) return
    expect(await lookupStaffSession(db, login.rawToken)).toBeTruthy()

    const removed = await removeStaffUser(db, {
      id: b.user.id,
      actorEmail: 'a@thebrowns.co.za',
      actorUserId: a.user.id,
    })
    expect(removed.ok).toBe(true)
    expect(await lookupStaffSession(db, login.rawToken)).toBeNull()
    expect(await listStaffUsers(db).then((rows) => rows.map((row) => row.email))).toEqual([
      'a@thebrowns.co.za',
    ])

    const audit = sqlite.prepare(`SELECT actor, action, target FROM staff_user_audit ORDER BY id`).all() as Array<{
      actor: string
      action: string
      target: string
    }>
    expect(audit.some((row) => row.action === 'add' && row.target === 'b@thebrowns.co.za' && row.actor === 'a@thebrowns.co.za')).toBe(true)
    expect(audit.some((row) => row.action === 'remove' && row.target === 'b@thebrowns.co.za' && row.actor === 'a@thebrowns.co.za')).toBe(true)
  })

  it('bootstraps only when the users table is empty', async () => {
    process.env.GUESTFLOW_BOOTSTRAP_EMAIL = 'first@thebrowns.co.za'
    process.env.GUESTFLOW_BOOTSTRAP_PASSWORD = 'first-pw'
    const first = await maybeBootstrapFirstUser(db)
    expect(first.created).toBe(true)
    const second = await maybeBootstrapFirstUser(db)
    expect(second.created).toBe(false)
    expect(await listStaffUsers(db)).toHaveLength(1)
  })

  it('legacy login works only when the flag is on', async () => {
    process.env.GUESTFLOW_LEGACY_LOGIN = '1'
    process.env.STAFF_PASSWORD = 'shared-secret'
    const on = await authenticateStaff(db, {
      email: 'legacy@guestflow.local',
      password: 'shared-secret',
      ip: '3.3.3.3',
    })
    expect(on.ok).toBe(true)
    if (on.ok) {
      expect(on.email).toBe(LEGACY_STAFF_EMAIL)
      expect(on.userId).toBeNull()
      const session = sqlite.prepare('SELECT user_id, email FROM staff_sessions WHERE email = ?').get(
        LEGACY_STAFF_EMAIL
      ) as { user_id: number | null; email: string }
      expect(session.user_id).toBeNull()
      expect(session.email).toBe(LEGACY_STAFF_EMAIL)
    }

    process.env.GUESTFLOW_LEGACY_LOGIN = '0'
    expect(isLegacyLoginEnabled()).toBe(false)
    const off = await authenticateStaff(db, {
      email: 'legacy@guestflow.local',
      password: 'shared-secret',
      ip: '3.3.3.4',
    })
    expect(off.ok).toBe(false)
  })

  it('rate-limits after 5 failures per IP+email', async () => {
    for (let i = 0; i < RATE_LIMIT_MAX_FAILURES; i += 1) {
      await recordLoginFailure(db, '9.9.9.9', 'liana@thebrowns.co.za')
    }
    expect(await isRateLimited(db, '9.9.9.9', 'liana@thebrowns.co.za')).toBe(true)
    expect(await isRateLimited(db, '9.9.9.9', 'grant@thebrowns.co.za')).toBe(false)
    const blocked = await authenticateStaff(db, {
      email: 'liana@thebrowns.co.za',
      password: 'nope',
      ip: '9.9.9.9',
    })
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.status).toBe(429)
  })

  it('changes own password and rejects a wrong current password', async () => {
    const added = await addStaffUser(db, {
      email: 'liana@thebrowns.co.za',
      password: 'old-pw',
      actorEmail: 'sys',
    })
    expect(added.ok).toBe(true)
    if (!added.ok) return
    const login = await authenticateStaff(db, {
      email: 'liana@thebrowns.co.za',
      password: 'old-pw',
      ip: '8.8.8.8',
    })
    expect(login.ok).toBe(true)
    if (!login.ok) return
    const session = await lookupStaffSession(db, login.rawToken)
    expect(session).toBeTruthy()
    if (!session) return

    const wrong = await changeOwnPassword(db, {
      session,
      currentPassword: 'bad',
      newPassword: 'new-pw',
    })
    expect(wrong.ok).toBe(false)

    const ok = await changeOwnPassword(db, {
      session,
      currentPassword: 'old-pw',
      newPassword: 'new-pw',
    })
    expect(ok.ok).toBe(true)
    const oldLogin = await authenticateStaff(db, {
      email: 'liana@thebrowns.co.za',
      password: 'old-pw',
      ip: '8.8.8.8',
    })
    expect(oldLogin.ok).toBe(false)
    const newLogin = await authenticateStaff(db, {
      email: 'liana@thebrowns.co.za',
      password: 'new-pw',
      ip: '8.8.8.8',
    })
    expect(newLogin.ok).toBe(true)
  })

  it('rejects reserved legacy email on add', async () => {
    const added = await addStaffUser(db, {
      email: LEGACY_STAFF_EMAIL,
      password: 'x',
      actorEmail: 'sys',
    })
    expect(added.ok).toBe(false)
  })
})
