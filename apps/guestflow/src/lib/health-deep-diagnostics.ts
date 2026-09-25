/**
 * Safe Turso / DATABASE_URL host for deep health (no credentials, path, or tokens).
 */
export function parseDatabaseUrlHost(databaseUrl: string | undefined): string | null {
  const raw = databaseUrl?.trim()
  if (!raw) return null
  try {
    let normalized = raw
    if (normalized.startsWith('libsql://')) {
      normalized = `https://${normalized.slice('libsql://'.length)}`
    } else if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`
    }
    const parsed = new URL(normalized)
    return parsed.hostname || null
  } catch {
    return null
  }
}

type DbLike = {
  prepare: (sql: string) => { get: () => Promise<unknown> }
}

function isMissingTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /no such table/i.test(message)
}

export async function queryMaxInboundId(
  db: DbLike,
  table: 'inbound_threads' | 'inbound_messages'
): Promise<{ value: number | null; note?: string }> {
  try {
    const row = (await db.prepare(`SELECT MAX(id) AS max_id FROM ${table}`).get()) as {
      max_id?: number | null
    } | undefined
    const max = row?.max_id
    return { value: max == null ? null : Number(max) }
  } catch (error) {
    if (isMissingTableError(error)) {
      return { value: null, note: `${table} table not found` }
    }
    throw error
  }
}
