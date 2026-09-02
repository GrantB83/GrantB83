const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const dbDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const dbPath = path.join(dbDir, 'guestflow.db')
const db = new Database(dbPath)

console.log('Running Phase 4 migration: rate_cards table...')

db.exec(`
  CREATE TABLE IF NOT EXISTS rate_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    property_id INTEGER,
    room_type TEXT NOT NULL,
    season TEXT DEFAULT 'standard',
    rate_per_night REAL NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    min_nights INTEGER DEFAULT 1,
    valid_from DATE,
    valid_to DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (property_id) REFERENCES properties(id)
  );

  CREATE INDEX IF NOT EXISTS idx_rate_cards_tenant ON rate_cards(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_rate_cards_property ON rate_cards(property_id);
  CREATE INDEX IF NOT EXISTS idx_rate_cards_dates ON rate_cards(valid_from, valid_to);
`)

console.log('✓ rate_cards table created')
console.log('✓ Migration complete')

db.close()
