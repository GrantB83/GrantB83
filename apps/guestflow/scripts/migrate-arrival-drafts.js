#!/usr/bin/env node
/**
 * Additive arrival_drafts table. Turso-safe.
 * Do NOT run against Production without APPROVE APPLY MIGRATION.
 */

const { createClient } = require('@libsql/client')
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const TABLE_SQL = `
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

const INDEX_SQL = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_arrival_drafts_booking_stage
  ON arrival_drafts(tenant_id, booking_id, stage)
`

function refuseProduction() {
  const url = process.env.DATABASE_URL || ''
  const approved = process.env.APPROVE_APPLY_MIGRATION === '1'
  if (/libsql|turso/i.test(url) && !approved) {
    console.error(
      'Refusing Production/Turso migrate. Set APPROVE_APPLY_MIGRATION=1 only after APPROVE APPLY MIGRATION.'
    )
    process.exit(2)
  }
}

async function main() {
  refuseProduction()
  const url = process.env.DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN
  if (url && token) {
    const client = createClient({ url, authToken: token })
    console.log('arrival_drafts migrate (Turso)')
    await client.execute(TABLE_SQL)
    await client.execute(INDEX_SQL)
    return
  }

  const dbDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
  const db = new Database(path.join(dbDir, 'guestflow.db'))
  console.log('arrival_drafts migrate (local sqlite)')
  db.exec(TABLE_SQL)
  db.exec(INDEX_SQL)
  db.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
