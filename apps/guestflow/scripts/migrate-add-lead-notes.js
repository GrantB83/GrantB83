const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const dbDir = path.join(__dirname, '..', 'data')
const dbPath = path.join(dbDir, 'guestflow.db')

if (!fs.existsSync(dbPath)) {
  console.log('❌ Database file not found. Run npm run db:init first.')
  process.exit(1)
}

const db = new Database(dbPath)

console.log('Running Phase 12 migration: Adding lead_notes table...')

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lead_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      tenant_id INTEGER NOT NULL,
      note_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES waitlist(id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON lead_notes(lead_id);
    CREATE INDEX IF NOT EXISTS idx_lead_notes_tenant ON lead_notes(tenant_id);
  `)

  console.log('✓ lead_notes table created successfully')
  console.log('✓ Indexes created')
} catch (err) {
  console.error('❌ Migration failed:', err.message)
  process.exit(1)
}

db.close()
console.log('✓ Migration complete')
