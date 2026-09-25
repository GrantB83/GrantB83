import type { DbClient } from './db'

export const ARRIVAL_DRAFTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS arrival_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  booking_id INTEGER NOT NULL,
  stage TEXT NOT NULL,
  stage_label TEXT NOT NULL,
  status TEXT NOT NULL,
  channel TEXT,
  thread_id INTEGER,
  message_id INTEGER,
  draft_body TEXT,
  template_name TEXT,
  window_state TEXT,
  attention_reason TEXT,
  fingerprint TEXT,
  codes_snapshot TEXT,
  due_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`

export const ARRIVAL_DRAFTS_UNIQUE_SQL = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_arrival_drafts_booking_stage
  ON arrival_drafts(tenant_id, booking_id, stage)
`

export async function ensureArrivalDraftsSchema(db: DbClient): Promise<void> {
  await db.exec(ARRIVAL_DRAFTS_TABLE_SQL)
  try {
    await db.exec(ARRIVAL_DRAFTS_UNIQUE_SQL)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!/already exists|duplicate/i.test(message)) throw error
  }
}
