/**
 * Migration: Access Codes Source of Record.
 *
 * Creates:
 * - property_access_codes (suite NOT NULL DEFAULT '' — empty string for gates, actual name for lockboxes)
 * - access_code_audit_log (metadata only, no code values)
 *
 * Security:
 *   - Code values encrypted at rest (Turso)
 *   - Audit log stores metadata only (no code values)
 *   - Never log actual codes in console
 *   - UNIQUE constraint on (tenant_id, property, code_type, suite)
 *
 * Turso-safe: one statement at a time. Idempotent.
 *
 * Usage:
 *   node scripts/migrate-access-codes-sor.js
 */

const path = require('path')
const fs = require('fs')

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../data/guestflow.db')
const useTurso = String(dbPath).startsWith('libsql://') || String(dbPath).startsWith('https://')

const statements = [
  `CREATE TABLE IF NOT EXISTS property_access_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    property TEXT NOT NULL,
    code_type TEXT NOT NULL CHECK(code_type IN ('gate_pinpad', 'lockbox', 'wifi_network', 'wifi_password')),
    suite TEXT NOT NULL DEFAULT '',
    code_value TEXT NOT NULL,
    last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_updated_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_property_access_codes_unique
    ON property_access_codes(tenant_id, property, code_type, suite)`,
  `CREATE INDEX IF NOT EXISTS idx_property_access_codes_property_type
    ON property_access_codes(tenant_id, property, code_type)`,
  `CREATE TABLE IF NOT EXISTS access_code_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    property TEXT NOT NULL,
    code_type TEXT NOT NULL,
    suite TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL CHECK(action IN ('create', 'update')),
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    changed_by TEXT,
    notes TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_access_code_audit_log_property
    ON access_code_audit_log(tenant_id, property, changed_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_access_code_audit_log_changed_at
    ON access_code_audit_log(changed_at DESC)`,
]

async function migrate() {
  console.log('Migration: Access Codes Source of Record')
  console.log('Database:', useTurso ? 'Turso (libsql)' : 'Local SQLite')
  console.log('Policy: DB-first with env fallback. Never invent codes. Audit metadata only.')

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

  console.log('✓ Access codes tables and indexes ready (idempotent)')
  console.log('⚠ Prefer empty tables + staff entry. Do NOT seed both gates from one env var.')
  console.log('⚠ Never log actual code values. Use REDACTED/**** in examples.')
}

migrate().catch((error) => {
  console.error('Migration failed:', error.message)
  process.exit(1)
})
