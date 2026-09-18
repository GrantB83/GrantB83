/**
 * Migration: staff_ops_drafts table for copy-only daily brief approvals.
 * Turso-safe: CREATE TABLE IF NOT EXISTS + indexes.
 *
 * Usage:
 *   node scripts/migrate-add-staff-ops-drafts.js
 *   turso db shell browns-guestflow < scripts/migrate-add-staff-ops-drafts.sql (if exported)
 */

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const dbDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'guestflow.db')
const db = new Database(dbPath)

const ddl = `
  CREATE TABLE IF NOT EXISTS staff_ops_drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    brief_date TEXT NOT NULL,
    draft_content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_approval'
      CHECK(status IN ('pending_approval', 'approved', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    approved_by TEXT,
    rejected_at DATETIME,
    rejected_by TEXT,
    actor TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  );

  CREATE INDEX IF NOT EXISTS idx_staff_ops_drafts_tenant_status
    ON staff_ops_drafts(tenant_id, status);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_ops_drafts_pending_unique
    ON staff_ops_drafts(tenant_id, brief_date)
    WHERE status = 'pending_approval';
`

db.exec(ddl)
console.log('✓ staff_ops_drafts table and indexes ready')
console.log(`  Database: ${dbPath}`)
db.close()
