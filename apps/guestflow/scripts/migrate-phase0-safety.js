/**
 * Migration: GuestFlow Phase 0 safety + contact foundation.
 *
 * Creates:
 * - guest_contacts (E.164 unique per tenant when phone present)
 * - draft_jobs (queue only — no LLM runner)
 * - send_confirm_tokens (one-time Approve&Send)
 * - inbound_messages.draft_source (heuristic|llm|human)
 *
 * Retention policy (Grant CLEAR 20 Sep 2026):
 *   5 years after last stay, then DELETE guest_contacts row.
 *   Store retention_years=5 and compute retention_delete_after on upsert.
 *   No chat PII dumps.
 *
 * Turso-safe: one statement at a time. Idempotent.
 *
 * Usage:
 *   node scripts/migrate-phase0-safety.js
 */

const path = require('path')
const fs = require('fs')

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../data/guestflow.db')
const useTurso = String(dbPath).startsWith('libsql://') || String(dbPath).startsWith('https://')

const statements = [
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

async function columnExists(db, table, column) {
  if (useTurso) {
    const result = await db.execute(`PRAGMA table_info(${table})`)
    return result.rows.some((row) => row.name === column)
  }
  const columns = db.pragma(`table_info(${table})`)
  return columns.some((col) => col.name === column)
}

async function migrate() {
  console.log('Migration: Phase 0 safety + guest_contacts + draft_jobs')
  console.log('Database:', useTurso ? 'Turso (libsql)' : 'Local SQLite')
  console.log('Policy: 5 years after last stay then DELETE. Never invent phones. No chat PII dumps.')

  if (useTurso) {
    const { createClient } = require('@libsql/client')
    const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN
    if (!authToken) {
      throw new Error('TURSO_AUTH_TOKEN required for Turso database')
    }
    const db = createClient({ url: dbPath, authToken })
    for (const sql of statements) {
      await db.execute(sql)
    }
    try {
      const hasDraftSource = await columnExists(db, 'inbound_messages', 'draft_source')
      if (!hasDraftSource) {
        await db.execute(
          `ALTER TABLE inbound_messages ADD COLUMN draft_source TEXT DEFAULT 'heuristic'`
        )
        console.log('✓ Added inbound_messages.draft_source')
      } else {
        console.log('⊘ inbound_messages.draft_source already exists, skipping')
      }
      await db.execute(
        `UPDATE inbound_messages SET draft_source = 'heuristic' WHERE draft_source IS NULL`
      )
    } catch (error) {
      console.log('⊘ inbound_messages.draft_source skipped:', error.message)
    }
    db.close()
  } else {
    const Database = require('better-sqlite3')
    const actualPath = String(dbPath).replace('file:', '')
    const dir = path.dirname(actualPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const db = new Database(actualPath)
    for (const sql of statements) {
      db.exec(sql)
    }
    try {
      const hasDraftSource = await columnExists(db, 'inbound_messages', 'draft_source')
      if (!hasDraftSource) {
        db.exec(`ALTER TABLE inbound_messages ADD COLUMN draft_source TEXT DEFAULT 'heuristic'`)
        console.log('✓ Added inbound_messages.draft_source')
      } else {
        console.log('⊘ inbound_messages.draft_source already exists, skipping')
      }
      try {
        db.exec(`UPDATE inbound_messages SET draft_source = 'heuristic' WHERE draft_source IS NULL`)
      } catch {
        // inbound_messages may not exist on a fresh file
      }
    } catch (error) {
      console.log('⊘ inbound_messages.draft_source skipped:', error.message)
    }
    db.close()
  }

  console.log('✓ Phase 0 tables and indexes ready (idempotent)')
}

migrate().catch((error) => {
  console.error('Migration failed:', error.message)
  process.exit(1)
})
