import type { DbClient } from '@/lib/db'
import { tableHasColumn } from '@/lib/phase0-schema'

/**
 * Additive UMI v2.1 columns on live inbound tables.
 * Prefer ALTER over a parallel comms schema.
 */

export const UMI_THREAD_COLUMNS: Array<{ column: string; sql: string }> = [
  { column: 'booking_id', sql: 'ALTER TABLE inbound_threads ADD COLUMN booking_id INTEGER' },
  {
    column: 'thread_kind',
    sql: "ALTER TABLE inbound_threads ADD COLUMN thread_kind TEXT NOT NULL DEFAULT 'temp'",
  },
  { column: 'guest_contact_id', sql: 'ALTER TABLE inbound_threads ADD COLUMN guest_contact_id INTEGER' },
  { column: 'last_channel', sql: 'ALTER TABLE inbound_threads ADD COLUMN last_channel TEXT' },
  {
    column: 'last_inbound_channel',
    sql: 'ALTER TABLE inbound_threads ADD COLUMN last_inbound_channel TEXT',
  },
  { column: 'last_outbound_at', sql: 'ALTER TABLE inbound_threads ADD COLUMN last_outbound_at DATETIME' },
  { column: 'last_inbound_at', sql: 'ALTER TABLE inbound_threads ADD COLUMN last_inbound_at DATETIME' },
  {
    column: 'pending_reply',
    sql: 'ALTER TABLE inbound_threads ADD COLUMN pending_reply INTEGER NOT NULL DEFAULT 0',
  },
  { column: 'expires_at', sql: 'ALTER TABLE inbound_threads ADD COLUMN expires_at DATETIME' },
  { column: 'nudged_at', sql: 'ALTER TABLE inbound_threads ADD COLUMN nudged_at DATETIME' },
  { column: 'hygiene_status', sql: 'ALTER TABLE inbound_threads ADD COLUMN hygiene_status TEXT' },
  { column: 'linked_at', sql: 'ALTER TABLE inbound_threads ADD COLUMN linked_at DATETIME' },
  {
    column: 'linked_from_thread_id',
    sql: 'ALTER TABLE inbound_threads ADD COLUMN linked_from_thread_id INTEGER',
  },
]

export const UMI_MESSAGE_COLUMNS: Array<{ column: string; sql: string }> = [
  { column: 'channel', sql: 'ALTER TABLE inbound_messages ADD COLUMN channel TEXT' },
  { column: 'sender_address', sql: 'ALTER TABLE inbound_messages ADD COLUMN sender_address TEXT' },
  { column: 'source_tag', sql: 'ALTER TABLE inbound_messages ADD COLUMN source_tag TEXT' },
  { column: 'dedup_key', sql: 'ALTER TABLE inbound_messages ADD COLUMN dedup_key TEXT' },
  {
    column: 'is_spam',
    sql: 'ALTER TABLE inbound_messages ADD COLUMN is_spam INTEGER NOT NULL DEFAULT 0',
  },
  {
    column: 'body_unavailable',
    sql: 'ALTER TABLE inbound_messages ADD COLUMN body_unavailable INTEGER NOT NULL DEFAULT 0',
  },
]

export const UMI_INDEX_STATEMENTS: string[] = [
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_umi_threads_booking
    ON inbound_threads(booking_id)
    WHERE thread_kind = 'booking' AND booking_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_umi_threads_kind_status
    ON inbound_threads(tenant_id, thread_kind, status)`,
  `CREATE INDEX IF NOT EXISTS idx_umi_threads_from
    ON inbound_threads(tenant_id, from_number)`,
  `CREATE INDEX IF NOT EXISTS idx_umi_threads_pending
    ON inbound_threads(tenant_id, pending_reply, last_message_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_umi_msg_external
    ON inbound_messages(external_message_id)
    WHERE external_message_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_umi_msg_dedup
    ON inbound_messages(dedup_key)
    WHERE dedup_key IS NOT NULL`,
]

async function addMissingColumns(
  db: DbClient,
  table: string,
  columns: Array<{ column: string; sql: string }>
): Promise<void> {
  for (const col of columns) {
    if (await tableHasColumn(db, table, col.column)) continue
    try {
      await db.exec(col.sql)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!/duplicate column|no such table/i.test(message)) throw error
    }
  }
}

export async function ensureUmiSchema(db: DbClient): Promise<void> {
  await addMissingColumns(db, 'inbound_threads', UMI_THREAD_COLUMNS)
  await addMissingColumns(db, 'inbound_messages', UMI_MESSAGE_COLUMNS)
  for (const sql of UMI_INDEX_STATEMENTS) {
    try {
      await db.exec(sql)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!/already exists|duplicate|no such table/i.test(message)) throw error
    }
  }
}
