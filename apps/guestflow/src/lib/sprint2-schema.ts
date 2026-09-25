import type { DbClient } from '@/lib/db'
import { tableHasColumn } from '@/lib/phase0-schema'

export const SPRINT2_TABLE_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS staff_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    dedupe_key TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    last_sent_at DATETIME,
    resolved_at DATETIME,
    resolved_notified_at DATETIME,
    payload_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_alerts_dedupe_recipient
    ON staff_alerts(dedupe_key, recipient_email)`,
  `CREATE INDEX IF NOT EXISTS idx_staff_alerts_status
    ON staff_alerts(status, kind)`,
  `CREATE TABLE IF NOT EXISTS nb_email_raw (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sender TEXT,
    subject TEXT,
    message_id TEXT,
    body_text TEXT,
    headers_json TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS nb_email_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT,
    received_at DATETIME,
    email_date DATETIME,
    sender TEXT,
    type TEXT NOT NULL,
    nb_ref TEXT,
    content_hash TEXT,
    parsed_json TEXT,
    status TEXT NOT NULL,
    applied_at DATETIME
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_nb_email_events_message_id
    ON nb_email_events(message_id)
    WHERE message_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_nb_email_events_hash
    ON nb_email_events(nb_ref, type, content_hash)`,
  `CREATE TABLE IF NOT EXISTS nb_gaps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    booking_id INTEGER,
    nb_ref TEXT,
    field TEXT NOT NULL,
    gap_kind TEXT NOT NULL,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    detected_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    filled_value_source TEXT,
    filled_at DATETIME,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at DATETIME,
    note TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS nb_sync_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    layer TEXT NOT NULL,
    started_at DATETIME,
    finished_at DATETIME,
    ok INTEGER NOT NULL DEFAULT 0,
    code TEXT,
    rows INTEGER,
    message TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_nb_sync_runs_layer_ok
    ON nb_sync_runs(layer, ok, finished_at)`,
  `CREATE TABLE IF NOT EXISTS booking_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    booking_id INTEGER,
    nb_ref TEXT,
    amount REAL,
    currency TEXT DEFAULT 'ZAR',
    status TEXT,
    source TEXT DEFAULT 'nb_email',
    raw_masked TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS health_probes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ok INTEGER NOT NULL,
    source TEXT,
    streak INTEGER NOT NULL DEFAULT 0
  )`,
]

export const SPRINT2_BOOKING_COLUMNS: Array<{ column: string; sql: string }> = [
  { column: 'guest_email', sql: 'ALTER TABLE bookings ADD COLUMN guest_email TEXT' },
  { column: 'nb_report_id', sql: 'ALTER TABLE bookings ADD COLUMN nb_report_id TEXT' },
  { column: 'nb_last_event_at', sql: 'ALTER TABLE bookings ADD COLUMN nb_last_event_at DATETIME' },
  { column: 'last_report_at', sql: 'ALTER TABLE bookings ADD COLUMN last_report_at DATETIME' },
  { column: 'cancelled_source', sql: 'ALTER TABLE bookings ADD COLUMN cancelled_source TEXT' },
  { column: 'notes_email', sql: 'ALTER TABLE bookings ADD COLUMN notes_email TEXT' },
  { column: 'notes_report', sql: 'ALTER TABLE bookings ADD COLUMN notes_report TEXT' },
  { column: 'field_sources_json', sql: 'ALTER TABLE bookings ADD COLUMN field_sources_json TEXT' },
  { column: 'guest_phone_verified', sql: 'ALTER TABLE bookings ADD COLUMN guest_phone_verified TEXT' },
  { column: 'guest_email_verified', sql: 'ALTER TABLE bookings ADD COLUMN guest_email_verified TEXT' },
]

export async function ensureSprint2Schema(db: DbClient): Promise<void> {
  for (const sql of SPRINT2_TABLE_STATEMENTS) {
    await db.exec(sql)
  }
  for (const col of SPRINT2_BOOKING_COLUMNS) {
    if (await tableHasColumn(db, 'bookings', col.column)) continue
    try {
      await db.exec(col.sql)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!/duplicate column|no such table/i.test(message)) throw error
    }
  }
}

export async function recordNbSyncRun(
  db: DbClient,
  input: {
    layer: 'email' | 'batch' | 'targeted'
    startedAt: string
    finishedAt?: string
    ok: boolean
    code: string
    rows?: number | null
    message?: string | null
  }
): Promise<number> {
  await ensureSprint2Schema(db)
  const result = await db
    .prepare(
      `INSERT INTO nb_sync_runs (layer, started_at, finished_at, ok, code, rows, message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.layer,
      input.startedAt,
      input.finishedAt || new Date().toISOString(),
      input.ok ? 1 : 0,
      input.code,
      input.rows ?? null,
      input.message || null
    )
  return Number(result.lastInsertRowid || 0)
}
