import type { DbClient } from '@/lib/db'
import { tableHasColumn } from '@/lib/phase0-schema'
import { GRANT_APPROVED_TEMPLATES } from '@/lib/wa-templates-seed'
import { PROPERTY_KNOWLEDGE_SEEDS } from '@/lib/property-knowledge-seed'

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

const WHATSAPP_TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS wa_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    body TEXT NOT NULL,
    variable_mapping TEXT NOT NULL DEFAULT '{}',
    content_sid TEXT,
    approval_status TEXT NOT NULL DEFAULT 'approved_by_grant_unsubmitted',
    whatsapp_approval_status TEXT NOT NULL DEFAULT 'unsubmitted',
    last_synced_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_templates_name
    ON wa_templates(tenant_id, name)`,
  `CREATE TABLE IF NOT EXISTS property_knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    property TEXT NOT NULL,
    section TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'ask staff',
    last_updated_at TEXT,
    last_updated_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_property_knowledge_unique
    ON property_knowledge(tenant_id, property, section, key)`,
]

async function execIgnoreDup(db: DbClient, sql: string): Promise<void> {
  try {
    await db.exec(sql)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!/already exists|duplicate/i.test(message)) throw error
  }
}

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

export async function ensureSprint2WhatsappSchema(db: DbClient, tenantId = 1): Promise<void> {
  for (const sql of WHATSAPP_TABLE_STATEMENTS) {
    await execIgnoreDup(db, sql)
  }
  await seedTemplatesIfEmpty(db, tenantId)
  await seedKnowledgeIfEmpty(db, tenantId)
}

async function seedTemplatesIfEmpty(db: DbClient, tenantId: number): Promise<void> {
  const countRow = (await db
    .prepare('SELECT COUNT(*) as n FROM wa_templates WHERE tenant_id = ?')
    .get(tenantId)) as { n?: number } | undefined
  if (Number(countRow?.n || 0) > 0) return

  for (const template of GRANT_APPROVED_TEMPLATES) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO wa_templates (
          tenant_id, name, category, language, body, variable_mapping,
          content_sid, approval_status, whatsapp_approval_status
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`
      )
      .run(
        tenantId,
        template.name,
        template.category,
        template.language,
        template.body,
        JSON.stringify(template.variableMapping),
        'approved_by_grant_unsubmitted',
        'unsubmitted'
      )
  }
}

async function seedKnowledgeIfEmpty(db: DbClient, tenantId: number): Promise<void> {
  const countRow = (await db
    .prepare('SELECT COUNT(*) as n FROM property_knowledge WHERE tenant_id = ?')
    .get(tenantId)) as { n?: number } | undefined
  if (Number(countRow?.n || 0) > 0) return

  const now = new Date().toISOString()
  for (const row of PROPERTY_KNOWLEDGE_SEEDS) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO property_knowledge (
          tenant_id, property, section, key, value, source, last_updated_at, last_updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'seed')`
      )
      .run(tenantId, row.property, row.section, row.key, row.value, row.source, now)
  }
}
