import { createClient } from '@libsql/client/web'
import { isWellFormedSessionToken } from '@/lib/staff-session-cookie'

/**
 * Edge-safe Turso session lookup for middleware.
 * Does not import better-sqlite3 or bcryptjs.
 */
export async function sha256HexEdge(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function lookupStaffSessionEdge(rawToken: string): Promise<{ email: string } | null> {
  const url = process.env.DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url || !authToken || !isWellFormedSessionToken(rawToken)) {
    return null
  }

  const tokenHash = await sha256HexEdge(rawToken)
  const client = createClient({ url, authToken })
  try {
    const result = await client.execute({
      sql: `SELECT s.user_id, s.email, s.expires_at
            FROM staff_sessions s
            WHERE s.token_hash = ?`,
      args: [tokenHash],
    })
    const row = result.rows[0] as
      | { user_id: number | null; email: string; expires_at: string }
      | undefined
    if (!row) return null

    const expiresMs = Date.parse(String(row.expires_at))
    if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) {
      return null
    }

    if (row.user_id != null) {
      const user = await client.execute({
        sql: `SELECT id FROM staff_users WHERE id = ?`,
        args: [row.user_id],
      })
      if (!user.rows[0]) return null
    }

    return { email: String(row.email) }
  } catch {
    return null
  } finally {
    try {
      client.close()
    } catch {
      // ignore
    }
  }
}
