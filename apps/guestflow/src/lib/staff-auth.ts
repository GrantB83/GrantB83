import type { DbClient } from '@/lib/db'
import {
  hashPassword,
  looksLikePasswordHash,
  RATE_LIMIT_MAX_FAILURES,
  RATE_LIMIT_WINDOW_MS,
  verifyPassword,
} from '@/lib/staff-auth-crypto'
import { createStaffSession, deleteSessionsForUser, type StaffSession } from '@/lib/staff-session'
import {
  ensureStaffUsersSchema,
  isReservedStaffEmail,
  isValidEmail,
  LEGACY_STAFF_EMAIL,
  normalizeDisplayName,
  normalizeEmail,
} from '@/lib/staff-users-schema'

export type StaffUserPublic = {
  id: number
  email: string
  display_name: string | null
  created_at: string
  created_by: string
  last_login_at: string | null
}

export type AuthFailure = {
  ok: false
  status: number
  error: string
}

export type AuthSuccess = {
  ok: true
  email: string
  displayName: string | null
  userId: number | null
  rawToken: string
}

function asPublicUser(row: {
  id: number | bigint
  email: string
  display_name: string | null
  created_at: string
  created_by: string
  last_login_at: string | null
}): StaffUserPublic {
  return {
    id: Number(row.id),
    email: row.email,
    display_name: row.display_name || null,
    created_at: row.created_at,
    created_by: row.created_by,
    last_login_at: row.last_login_at,
  }
}

export function isLegacyLoginEnabled(env = process.env): boolean {
  const raw = String(env.GUESTFLOW_LEGACY_LOGIN ?? '1').trim().toLowerCase()
  return raw !== '0' && raw !== 'false' && raw !== 'off'
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim() || 'unknown'
  }
  return headers.get('x-real-ip')?.trim() || 'unknown'
}

export async function recordLoginFailure(db: DbClient, ip: string, email: string): Promise<void> {
  await db
    .prepare(`INSERT INTO staff_login_attempts (ip, email, attempted_at) VALUES (?, ?, ?)`)
    .run(ip, normalizeEmail(email), new Date().toISOString())
}

export async function clearLoginFailures(db: DbClient, ip: string, email: string): Promise<void> {
  await db
    .prepare(`DELETE FROM staff_login_attempts WHERE ip = ? AND email = ?`)
    .run(ip, normalizeEmail(email))
}

export async function isRateLimited(
  db: DbClient,
  ip: string,
  email: string,
  nowMs = Date.now()
): Promise<boolean> {
  const since = new Date(nowMs - RATE_LIMIT_WINDOW_MS).toISOString()
  const row = (await db
    .prepare(
      `SELECT COUNT(*) AS c FROM staff_login_attempts
       WHERE ip = ? AND email = ? AND attempted_at > ?`
    )
    .get(ip, normalizeEmail(email), since)) as { c: number | bigint } | undefined
  return Number(row?.c || 0) >= RATE_LIMIT_MAX_FAILURES
}

export async function writeStaffUserAudit(
  db: DbClient,
  actor: string,
  action: 'add' | 'remove' | 'password_change',
  target: string
): Promise<void> {
  await db
    .prepare(`INSERT INTO staff_user_audit (actor, action, target, created_at) VALUES (?, ?, ?, ?)`)
    .run(actor, action, target, new Date().toISOString())
}

export async function listStaffUsers(db: DbClient): Promise<StaffUserPublic[]> {
  const rows = (await db
    .prepare(
      `SELECT id, email, display_name, created_at, created_by, last_login_at
       FROM staff_users
       ORDER BY email`
    )
    .all()) as Array<{
    id: number | bigint
    email: string
    display_name: string | null
    created_at: string
    created_by: string
    last_login_at: string | null
  }>
  return rows.map(asPublicUser)
}

export async function addStaffUser(
  db: DbClient,
  input: { email: string; password: string; displayName?: string | null; actorEmail: string }
): Promise<{ ok: true; user: StaffUserPublic } | AuthFailure> {
  const email = normalizeEmail(input.email)
  const password = input.password || ''
  const displayName = normalizeDisplayName(input.displayName)
  if (!email) {
    return { ok: false, status: 400, error: 'Email is required' }
  }
  if (!isValidEmail(email)) {
    return { ok: false, status: 400, error: 'Invalid email' }
  }
  if (isReservedStaffEmail(email)) {
    return { ok: false, status: 400, error: 'That email is reserved' }
  }
  if (!password) {
    return { ok: false, status: 400, error: 'Password is required' }
  }

  const existing = (await db
    .prepare(`SELECT id FROM staff_users WHERE email = ?`)
    .get(email)) as { id: number } | undefined
  if (existing) {
    return { ok: false, status: 400, error: 'Email already exists' }
  }

  const passwordHash = await hashPassword(password)
  const createdAt = new Date().toISOString()
  const result = await db
    .prepare(
      `INSERT INTO staff_users (email, display_name, password_hash, created_at, created_by)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(email, displayName, passwordHash, createdAt, input.actorEmail)
  const id = Number(result.lastInsertRowid)
  await writeStaffUserAudit(db, input.actorEmail, 'add', email)
  return {
    ok: true,
    user: {
      id,
      email,
      display_name: displayName,
      created_at: createdAt,
      created_by: input.actorEmail,
      last_login_at: null,
    },
  }
}

export async function removeStaffUser(
  db: DbClient,
  input: { id: number; actorEmail: string; actorUserId: number | null }
): Promise<{ ok: true; email: string } | AuthFailure> {
  const id = Number(input.id)
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, status: 404, error: 'User not found' }
  }
  if (input.actorUserId != null && Number(input.actorUserId) === id) {
    return { ok: false, status: 400, error: 'Cannot remove yourself' }
  }

  const existing = (await db
    .prepare(`SELECT id, email FROM staff_users WHERE id = ?`)
    .get(id)) as { id: number; email: string } | undefined
  if (!existing) {
    return { ok: false, status: 404, error: 'User not found' }
  }

  const deleted = await db
    .prepare(
      `DELETE FROM staff_users
       WHERE id = ?
         AND (SELECT COUNT(*) FROM staff_users) > 1`
    )
    .run(id)

  if (!deleted || Number(deleted.changes || 0) === 0) {
    const stillThere = (await db
      .prepare(`SELECT id FROM staff_users WHERE id = ?`)
      .get(id)) as { id: number } | undefined
    if (!stillThere) {
      return { ok: false, status: 404, error: 'User not found' }
    }
    return { ok: false, status: 400, error: 'Cannot remove the last remaining user' }
  }

  await deleteSessionsForUser(db, id)
  await writeStaffUserAudit(db, input.actorEmail, 'remove', existing.email)
  return { ok: true, email: existing.email }
}

export async function changeOwnPassword(
  db: DbClient,
  input: {
    session: StaffSession
    currentPassword: string
    newPassword: string
  }
): Promise<{ ok: true } | AuthFailure> {
  if (input.session.userId == null) {
    return { ok: false, status: 400, error: 'Legacy sessions cannot change a password here' }
  }
  if (!input.newPassword) {
    return { ok: false, status: 400, error: 'New password is required' }
  }

  const row = (await db
    .prepare(`SELECT id, email, password_hash FROM staff_users WHERE id = ?`)
    .get(input.session.userId)) as { id: number; email: string; password_hash: string } | undefined
  if (!row) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  const matches = await verifyPassword(input.currentPassword, row.password_hash)
  if (!matches) {
    return { ok: false, status: 401, error: 'Current password is incorrect' }
  }

  const passwordHash = await hashPassword(input.newPassword)
  await db.prepare(`UPDATE staff_users SET password_hash = ? WHERE id = ?`).run(passwordHash, row.id)
  await writeStaffUserAudit(db, input.session.email, 'password_change', row.email)
  return { ok: true }
}

async function loginNamedUser(
  db: DbClient,
  email: string,
  password: string
): Promise<{ userId: number; email: string; displayName: string | null } | null> {
  const row = (await db
    .prepare(`SELECT id, email, display_name, password_hash FROM staff_users WHERE email = ?`)
    .get(email)) as
    | { id: number | bigint; email: string; display_name: string | null; password_hash: string }
    | undefined
  if (!row) return null
  const matches = await verifyPassword(password, row.password_hash)
  if (!matches) return null
  return { userId: Number(row.id), email: row.email, displayName: row.display_name || null }
}

function loginLegacy(email: string, password: string): boolean {
  if (!isLegacyLoginEnabled()) return false
  if (!isReservedStaffEmail(email)) return false
  const staffPassword = process.env.STAFF_PASSWORD || ''
  return Boolean(staffPassword) && password === staffPassword
}

export async function authenticateStaff(
  db: DbClient,
  input: { email: string; password: string; ip: string }
): Promise<AuthSuccess | AuthFailure> {
  await ensureStaffUsersSchema(db)
  const email = normalizeEmail(input.email)
  const password = input.password || ''
  if (!email || !password) {
    return { ok: false, status: 401, error: 'Invalid email or password' }
  }
  if (!isValidEmail(email)) {
    return { ok: false, status: 401, error: 'Invalid email or password' }
  }

  if (await isRateLimited(db, input.ip, email)) {
    return { ok: false, status: 429, error: 'Too many login attempts. Try again later.' }
  }

  const named = await loginNamedUser(db, email, password)
  if (named) {
    const now = new Date().toISOString()
    await db.prepare(`UPDATE staff_users SET last_login_at = ? WHERE id = ?`).run(now, named.userId)
    await clearLoginFailures(db, input.ip, email)
    const rawToken = await createStaffSession(db, {
      userId: named.userId,
      email: named.email,
      displayName: named.displayName,
    })
    return {
      ok: true,
      email: named.email,
      displayName: named.displayName,
      userId: named.userId,
      rawToken,
    }
  }

  if (loginLegacy(email, password)) {
    await clearLoginFailures(db, input.ip, email)
    const rawToken = await createStaffSession(db, {
      userId: null,
      email: LEGACY_STAFF_EMAIL,
      displayName: null,
    })
    return { ok: true, email: LEGACY_STAFF_EMAIL, displayName: null, userId: null, rawToken }
  }

  await recordLoginFailure(db, input.ip, email)
  return { ok: false, status: 401, error: 'Invalid email or password' }
}

export function assertNoSecretLeak(payload: unknown): void {
  const text = JSON.stringify(payload)
  if (!text) return
  if (looksLikePasswordHash(text) || /"password"\s*:/.test(text)) {
    throw new Error('Refusing to return a password or hash')
  }
}
