#!/usr/bin/env node
/**
 * Sprint 2 staff alerts + Nightsbridge layered-sync tables.
 * Turso-safe CREATE IF NOT EXISTS. Do not run against Production
 * without APPROVE APPLY MIGRATION.
 */

const { createClient } = require('@libsql/client')
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const STATEMENTS = [
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

async function main() {
  const url = process.env.DATABASE_URL
  if (url) {
    const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })
    for (const sql of STATEMENTS) {
      await client.execute(sql)
    }
    console.log('sprint2 alerts/nb schema applied (libsql)')
    return
  }
  const dbDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
  const db = new Database(path.join(dbDir, 'guestflow.db'))
  for (const sql of STATEMENTS) db.exec(sql)
  console.log('sprint2 alerts/nb schema applied (sqlite)')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
