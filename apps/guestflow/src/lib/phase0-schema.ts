import type { DbClient } from '@/lib/db'

/**
 * Phase 0 safety + contact foundation.
 * Retention: 5 years after last stay then DELETE (Grant CLEAR 20 Sep 2026).
 * No chat PII dumps. Never invent phones.
 */

export const PHASE0_TABLE_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS guest_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    normalized_phone TEXT,
    email TEXT,
    display_name TEXT,
    last_stay_at DATETIME,
    last_suite TEXT,
    source TEXT NOT NULL CHECK(source IN ('nb', 'inbound', 'manual')),
    nbid TEXT,
    retention_years INTEGER NOT NULL DEFAULT 5,
    retention_delete_after DATETIME,
    last_activity_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_contacts_tenant_phone
    ON guest_contacts(tenant_id, normalized_phone)
    WHERE normalized_phone IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_guest_contacts_tenant_email
    ON guest_contacts(tenant_id, email)`,
  `CREATE INDEX IF NOT EXISTS idx_guest_contacts_nbid
    ON guest_contacts(tenant_id, nbid)`,
  `CREATE INDEX IF NOT EXISTS idx_guest_contacts_retention
    ON guest_contacts(retention_delete_after)`,
  `CREATE TABLE IF NOT EXISTS draft_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    thread_id INTEGER NOT NULL,
    message_id INTEGER NOT NULL,
    intent TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK(status IN ('pending', 'claimed', 'done', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_draft_jobs_open_message
    ON draft_jobs(message_id)
    WHERE status IN ('pending', 'claimed')`,
  `CREATE INDEX IF NOT EXISTS idx_draft_jobs_status_created
    ON draft_jobs(status, created_at)`,
  `CREATE TABLE IF NOT EXISTS send_confirm_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    thread_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    consumed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_send_confirm_tokens_thread
    ON send_confirm_tokens(thread_id, consumed_at)`,
]

export const PHASE0_COLUMN_STATEMENTS: Array<{ table: string; column: string; sql: string }> = [
  {
    table: 'inbound_messages',
    column: 'draft_source',
    sql: `ALTER TABLE inbound_messages ADD COLUMN draft_source TEXT DEFAULT 'heuristic'`,
  },
  {
    table: 'inbound_messages',
    column: 'status',
    sql: `ALTER TABLE inbound_messages ADD COLUMN status TEXT DEFAULT 'new'`,
  },
]

export async function tableHasColumn(
  db: DbClient,
  table: string,
  column: string
): Promise<boolean> {
  try {
    const rows = (await db.prepare(`PRAGMA table_info(${table})`).all()) as Array<{ name: string }> | undefined
    return Boolean(rows?.some((row) => row.name === column))
  } catch {
    return false
  }
}

export async function ensurePhase0Schema(db: DbClient): Promise<void> {
  for (const sql of PHASE0_TABLE_STATEMENTS) {
    await db.exec(sql)
  }
  for (const col of PHASE0_COLUMN_STATEMENTS) {
    if (!(await tableHasColumn(db, col.table, col.column))) {
      try {
        await db.exec(col.sql)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!/duplicate column|no such table/i.test(message)) throw error
      }
    }
  }
  try {
    await db.exec(
      `UPDATE inbound_messages SET draft_source = 'heuristic' WHERE draft_source IS NULL`
    )
  } catch {
    // table may not exist in empty test DBs
  }
}
