import type { DbClient } from '@/lib/db'
import { tableHasColumn } from '@/lib/phase0-schema'

/**
 * Additive contact columns + booking_contacts.
 * Runtime ALTER so Preview boots without a Production migration.
 * The companion scripts default to --dry-run and must not be executed
 * against Production Turso by this package.
 */

export const BOOKING_CONTACT_COLUMNS: Array<{ column: string; sql: string }> = [
  { column: 'guest_email', sql: 'ALTER TABLE bookings ADD COLUMN guest_email TEXT' },
  { column: 'guest_phone_source', sql: 'ALTER TABLE bookings ADD COLUMN guest_phone_source TEXT' },
  { column: 'guest_email_source', sql: 'ALTER TABLE bookings ADD COLUMN guest_email_source TEXT' },
  { column: 'guest_email_kind', sql: 'ALTER TABLE bookings ADD COLUMN guest_email_kind TEXT' },
  { column: 'extra_rooms', sql: 'ALTER TABLE bookings ADD COLUMN extra_rooms TEXT' },
]

export const BOOKING_CONTACTS_TABLE = `
  CREATE TABLE IF NOT EXISTS booking_contacts (
    booking_id INTEGER PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    phone TEXT,
    phone_source TEXT,
    phone_source_ref TEXT,
    email TEXT,
    email_source TEXT,
    email_kind TEXT,
    email_source_ref TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`

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

export async function ensureContactSchema(db: DbClient): Promise<void> {
  await addMissingColumns(db, 'bookings', BOOKING_CONTACT_COLUMNS)
  try {
    await db.exec(BOOKING_CONTACTS_TABLE)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!/already exists/i.test(message)) throw error
  }
}
