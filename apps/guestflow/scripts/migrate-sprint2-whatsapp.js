/**
 * Additive Sprint 2 WhatsApp tables (templates + property knowledge).
 *
 * NOT run against Production Turso in this package.
 * Preview/dev: ensureSprint2WhatsappSchema() also creates these on first read.
 *
 * Usage (local SQLite only):
 *   node scripts/migrate-sprint2-whatsapp.js
 */

const path = require('path')
const fs = require('fs')

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../data/guestflow.db')
const useTurso = String(dbPath).startsWith('libsql://') || String(dbPath).startsWith('https://')

if (useTurso) {
  console.error('Refusing to run migrate-sprint2-whatsapp.js against Turso / remote libsql.')
  console.error('This package must not write Production Turso. Use local SQLite or Preview ensure-schema.')
  process.exit(1)
}

const statements = [
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

function migrate() {
  const Database = require('better-sqlite3')
  const actualPath = String(dbPath).replace('file:', '')
  const dir = path.dirname(actualPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const db = new Database(actualPath)
  for (const sql of statements) db.exec(sql)
  db.close()
  console.log('✓ Local Sprint 2 WhatsApp tables ready (not Production Turso)')
}

migrate()
