import type { DbClient } from '@/lib/db'
import { tableHasColumn } from '@/lib/phase0-schema'

/**
 * Additive delivery-status columns on inbound_messages.
 * Prefer ALTER over a parallel deliveries table.
 */

export const DELIVERY_MESSAGE_COLUMNS: Array<{ column: string; sql: string }> = [
  { column: 'provider_message_id', sql: 'ALTER TABLE inbound_messages ADD COLUMN provider_message_id TEXT' },
  { column: 'delivery_status', sql: "ALTER TABLE inbound_messages ADD COLUMN delivery_status TEXT" },
  {
    column: 'delivery_read',
    sql: 'ALTER TABLE inbound_messages ADD COLUMN delivery_read INTEGER NOT NULL DEFAULT 0',
  },
  { column: 'delivery_error_code', sql: 'ALTER TABLE inbound_messages ADD COLUMN delivery_error_code TEXT' },
  { column: 'delivery_error_plain', sql: 'ALTER TABLE inbound_messages ADD COLUMN delivery_error_plain TEXT' },
  { column: 'delivery_updated_at', sql: 'ALTER TABLE inbound_messages ADD COLUMN delivery_updated_at DATETIME' },
  { column: 'queued_at', sql: 'ALTER TABLE inbound_messages ADD COLUMN queued_at DATETIME' },
  {
    column: 'sent_to_test_sink',
    sql: 'ALTER TABLE inbound_messages ADD COLUMN sent_to_test_sink INTEGER NOT NULL DEFAULT 0',
  },
  { column: 'resend_of', sql: 'ALTER TABLE inbound_messages ADD COLUMN resend_of INTEGER' },
  { column: 'resent_by', sql: 'ALTER TABLE inbound_messages ADD COLUMN resent_by TEXT' },
  {
    column: 'resend_in_flight',
    sql: 'ALTER TABLE inbound_messages ADD COLUMN resend_in_flight INTEGER NOT NULL DEFAULT 0',
  },
]

export const DELIVERY_INDEX_STATEMENTS: string[] = [
  `CREATE INDEX IF NOT EXISTS idx_inbound_msg_provider_id
    ON inbound_messages(provider_message_id)
    WHERE provider_message_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_inbound_msg_delivery_pending
    ON inbound_messages(delivery_status, queued_at)
    WHERE direction = 'outbound'`,
]

export async function ensureDeliverySchema(db: DbClient): Promise<void> {
  for (const col of DELIVERY_MESSAGE_COLUMNS) {
    if (await tableHasColumn(db, 'inbound_messages', col.column)) continue
    try {
      await db.exec(col.sql)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!/duplicate column|no such table/i.test(message)) throw error
    }
  }
  for (const sql of DELIVERY_INDEX_STATEMENTS) {
    try {
      await db.exec(sql)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!/already exists|duplicate|no such table/i.test(message)) throw error
    }
  }
}
