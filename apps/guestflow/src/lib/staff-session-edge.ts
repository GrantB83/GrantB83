import { isWellFormedSessionToken } from '@/lib/staff-session-cookie'

/**
 * Edge-safe Turso session lookup for middleware.
 * Uses fetch + Web Crypto only. Do not import libsql, sqlite, or bcrypt here.
 */

type HranaValue = { type?: string; value?: string | null }

function tursoHttpUrl(url: string): string {
  if (url.startsWith('libsql://')) return `https://${url.slice('libsql://'.length)}`
  return url
}

async function tursoExecute(
  url: string,
  authToken: string,
  sql: string,
  args: Array<{ type: 'text' | 'integer'; value: string }>
): Promise<Array<Record<string, string | null>>> {
  const response = await fetch(`${tursoHttpUrl(url)}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        { type: 'execute', stmt: { sql, args } },
        { type: 'close' },
      ],
    }),
  })
  if (!response.ok) return []
  const payload = (await response.json()) as {
    results?: Array<{
      response?: {
        result?: { cols?: Array<{ name: string }>; rows?: HranaValue[][] }
      }
    }>
  }
  const result = payload.results?.[0]?.response?.result
  if (!result?.cols || !result.rows) return []
  const cols = result.cols.map((col) => col.name)
  return result.rows.map((row) => {
    const mapped: Record<string, string | null> = {}
    cols.forEach((name, index) => {
      mapped[name] = row[index]?.value ?? null
    })
    return mapped
  })
}

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
  try {
    const sessions = await tursoExecute(
      url,
      authToken,
      `SELECT user_id, email, expires_at FROM staff_sessions WHERE token_hash = ?`,
      [{ type: 'text', value: tokenHash }]
    )
    const row = sessions[0]
    if (!row?.email) return null

    const expiresMs = Date.parse(String(row.expires_at || ''))
    if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) {
      return null
    }

    if (row.user_id != null && row.user_id !== '') {
      const users = await tursoExecute(
        url,
        authToken,
        `SELECT id FROM staff_users WHERE id = ?`,
        [{ type: 'integer', value: String(row.user_id) }]
      )
      if (!users[0]) return null
    }

    return { email: String(row.email) }
  } catch {
    return null
  }
}
