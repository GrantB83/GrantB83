import type { NextRequest, NextResponse } from 'next/server'
import type { DbClient } from '@/lib/db'
import {
  STAFF_SESSION_COOKIE,
  SESSION_SLIDE_AFTER_MS,
  createSessionToken,
  hashSessionToken,
  sessionExpiryIso,
  staffSessionCookieOptions,
} from '@/lib/staff-auth-crypto'
import { ensureStaffUsersSchema } from '@/lib/staff-users-schema'

export type StaffSession = {
  userId: number | null
  email: string
  displayName: string | null
  tokenHash: string
}

export function actorStamp(session: StaffSession | null | undefined, fallback: string): string {
  if (!session?.email) return fallback
  if (session.displayName) return `${session.displayName} <${session.email}>`
  return session.email
}

export function applyStaffSessionCookie(response: NextResponse, rawToken: string): void {
  response.cookies.set(STAFF_SESSION_COOKIE, rawToken, staffSessionCookieOptions())
}

export function clearStaffSessionCookie(response: NextResponse): void {
  response.cookies.set(STAFF_SESSION_COOKIE, '', {
    ...staffSessionCookieOptions(),
    maxAge: 0,
  })
}

export async function createStaffSession(
  db: DbClient,
  input: { userId: number | null; email: string; displayName?: string | null }
): Promise<string> {
  const rawToken = createSessionToken()
  const tokenHash = hashSessionToken(rawToken)
  const now = new Date().toISOString()
  const expiresAt = sessionExpiryIso()
  await db
    .prepare(
      `INSERT INTO staff_sessions (user_id, email, display_name, token_hash, created_at, last_seen_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(input.userId, input.email, input.displayName || null, tokenHash, now, now, expiresAt)
  return rawToken
}

export async function lookupStaffSession(
  db: DbClient,
  rawToken: string | undefined | null
): Promise<StaffSession | null> {
  if (!rawToken) return null
  const tokenHash = hashSessionToken(rawToken)
  const row = (await db
    .prepare(
      `SELECT id, user_id, email, display_name, token_hash, expires_at, last_seen_at
       FROM staff_sessions
       WHERE token_hash = ?`
    )
    .get(tokenHash)) as
    | {
        id: number
        user_id: number | null
        email: string
        display_name: string | null
        token_hash: string
        expires_at: string
        last_seen_at: string
      }
    | undefined

  if (!row) return null

  const expiresMs = Date.parse(row.expires_at)
  if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) {
    await db.prepare(`DELETE FROM staff_sessions WHERE id = ?`).run(row.id)
    return null
  }

  if (row.user_id != null) {
    const user = (await db
      .prepare(`SELECT id FROM staff_users WHERE id = ?`)
      .get(row.user_id)) as { id: number } | undefined
    if (!user) {
      await db.prepare(`DELETE FROM staff_sessions WHERE id = ?`).run(row.id)
      return null
    }
  }

  const lastSeenMs = Date.parse(row.last_seen_at)
  if (!Number.isFinite(lastSeenMs) || Date.now() - lastSeenMs >= SESSION_SLIDE_AFTER_MS) {
    const now = new Date().toISOString()
    await db
      .prepare(`UPDATE staff_sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?`)
      .run(now, sessionExpiryIso(), row.id)
  }

  return {
    userId: row.user_id == null ? null : Number(row.user_id),
    email: row.email,
    displayName: row.display_name || null,
    tokenHash: row.token_hash,
  }
}

export async function deleteStaffSessionByToken(
  db: DbClient,
  rawToken: string | undefined | null
): Promise<void> {
  if (!rawToken) return
  await db.prepare(`DELETE FROM staff_sessions WHERE token_hash = ?`).run(hashSessionToken(rawToken))
}

export async function deleteSessionsForUser(db: DbClient, userId: number): Promise<void> {
  await db.prepare(`DELETE FROM staff_sessions WHERE user_id = ?`).run(userId)
}

export function readSessionTokenFromRequest(request: NextRequest): string | undefined {
  return request.cookies.get(STAFF_SESSION_COOKIE)?.value
}

export async function getStaffSessionFromRequest(
  request: NextRequest,
  db?: DbClient
): Promise<StaffSession | null> {
  const token = readSessionTokenFromRequest(request)
  if (!token) return null
  const resolved = db || (await (await import('@/lib/db')).getDbAsync())
  await ensureStaffUsersSchema(resolved)
  return lookupStaffSession(resolved, token)
}
