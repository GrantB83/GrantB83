/**
 * Migration: send_jobs table for Interim WhatsApp Web (and optional email) queue.
 * Turso-safe: CREATE TABLE IF NOT EXISTS + indexes, statements executed one-by-one.
 *
 * Usage:
 *   node scripts/migrate-add-send-jobs.js
 */

const path = require('path')
const fs = require('fs')

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../data/guestflow.db')
const useTurso = String(dbPath).startsWith('libsql://') || String(dbPath).startsWith('https://')

const statements = [
  `CREATE TABLE IF NOT EXISTS send_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL CHECK(channel IN ('whatsapp_web', 'email')),
    status TEXT NOT NULL DEFAULT 'queued'
      CHECK(status IN ('pending', 'queued', 'claimed', 'sent', 'failed', 'blocked')),
    thread_id INTEGER NOT NULL,
    to_address TEXT NOT NULL,
    body_text TEXT NOT NULL,
    subject TEXT,
    claim_token TEXT,
    claimed_at DATETIME,
    completed_at DATETIME,
    error_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_send_jobs_status_created ON send_jobs(status, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_send_jobs_thread ON send_jobs(thread_id)`,
  `CREATE INDEX IF NOT EXISTS idx_send_jobs_claim_token ON send_jobs(claim_token)`,
]

async function migrate() {
  console.log('Migration: add send_jobs')
  console.log('Database:', useTurso ? 'Turso (libsql)' : 'Local SQLite')

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
    db.close()
  }

  console.log('✓ send_jobs table and indexes ready')
}

migrate().catch((error) => {
  console.error('Migration failed:', error.message)
  process.exit(1)
})
