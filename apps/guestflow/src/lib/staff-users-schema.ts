import type { DbClient } from '@/lib/db'
import { hashPassword } from '@/lib/staff-auth-crypto'

export const LEGACY_STAFF_EMAIL = 'legacy@guestflow.local'

export const STAFF_USERS_TABLE_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS staff_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    display_name TEXT,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,
    last_login_at DATETIME
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_users_email
    ON staff_users(email)`,
  `CREATE TABLE IF NOT EXISTS staff_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    email TEXT NOT NULL,
    display_name TEXT,
    token_hash TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_sessions_token_hash
    ON staff_sessions(token_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_staff_sessions_user_id
    ON staff_sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_staff_sessions_expires
    ON staff_sessions(expires_at)`,
  `CREATE TABLE IF NOT EXISTS staff_user_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_staff_user_audit_created
    ON staff_user_audit(created_at)`,
  `CREATE TABLE IF NOT EXISTS staff_login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    email TEXT NOT NULL,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_staff_login_attempts_pair_time
    ON staff_login_attempts(ip, email, attempted_at)`,
]

export function normalizeEmail(raw: string | null | undefined): string {
  return String(raw || '').trim().toLowerCase()
}

export function normalizeDisplayName(raw: string | null | undefined): string | null {
  const value = String(raw || '').trim()
  return value ? value : null
}

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function emailsEqual(a: string, b: string): boolean {
  return normalizeEmail(a) === normalizeEmail(b)
}

export function isReservedStaffEmail(email: string): boolean {
  return emailsEqual(email, LEGACY_STAFF_EMAIL)
}

export async function ensureStaffUsersSchema(db: DbClient): Promise<void> {
  for (const sql of STAFF_USERS_TABLE_STATEMENTS) {
    await db.exec(sql)
  }
  await maybeBootstrapFirstUser(db)
}

export async function countStaffUsers(db: DbClient): Promise<number> {
  const row = (await db.prepare(`SELECT COUNT(*) AS c FROM staff_users`).get()) as
    | { c: number | bigint }
    | undefined
  return Number(row?.c || 0)
}

export async function maybeBootstrapFirstUser(db: DbClient): Promise<{ created: boolean; email?: string }> {
  const email = normalizeEmail(process.env.GUESTFLOW_BOOTSTRAP_EMAIL)
  const password = process.env.GUESTFLOW_BOOTSTRAP_PASSWORD || ''
  if (!email || !password) {
    return { created: false }
  }
  if (!isValidEmail(email) || isReservedStaffEmail(email)) {
    return { created: false }
  }
  if ((await countStaffUsers(db)) > 0) {
    return { created: false }
  }

  const passwordHash = await hashPassword(password)
  try {
    await db
      .prepare(
        `INSERT INTO staff_users (email, display_name, password_hash, created_by)
         VALUES (?, NULL, ?, 'bootstrap')`
      )
      .run(email, passwordHash)
    return { created: true, email }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/unique|constraint/i.test(message)) {
      return { created: false }
    }
    throw error
  }
}
