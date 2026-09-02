import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) {
    return db
  }

  const dbDir = path.join(process.cwd(), 'data')
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  const dbPath = path.join(dbDir, 'guestflow.db')
  db = new Database(dbPath)
  
  initializeDb(db)
  
  return db
}

function initializeDb(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      timezone TEXT DEFAULT 'Africa/Johannesburg',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invite_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      code TEXT NOT NULL UNIQUE,
      max_uses INTEGER DEFAULT 1,
      uses_count INTEGER DEFAULT 0,
      expires_at DATETIME,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS waitlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      property_name TEXT NOT NULL,
      room_count TEXT NOT NULL,
      current_system TEXT,
      phone TEXT,
      notes TEXT,
      invite_code_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (invite_code_id) REFERENCES invite_codes(id)
    );

    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      location TEXT,
      room_count INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      property_id INTEGER,
      guest_name TEXT NOT NULL,
      guest_email TEXT,
      guest_phone TEXT,
      check_in DATE,
      check_out DATE,
      adults INTEGER DEFAULT 2,
      children INTEGER DEFAULT 0,
      pets BOOLEAN DEFAULT 0,
      special_requests TEXT,
      raw_inquiry TEXT,
      confidence REAL DEFAULT 1.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (property_id) REFERENCES properties(id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      inquiry_id INTEGER,
      property_id INTEGER,
      guest_name TEXT NOT NULL,
      check_in DATE NOT NULL,
      check_out DATE NOT NULL,
      room_number TEXT,
      suite_or_unit TEXT,
      adults INTEGER DEFAULT 2,
      children INTEGER DEFAULT 0,
      notes TEXT,
      late_check_in BOOLEAN DEFAULT 0,
      guest_phone TEXT,
      property_name TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (inquiry_id) REFERENCES inquiries(id),
      FOREIGN KEY (property_id) REFERENCES properties(id)
    );

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
    
    CREATE INDEX IF NOT EXISTS idx_invite_codes_tenant ON invite_codes(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
    CREATE INDEX IF NOT EXISTS idx_waitlist_invite_code ON waitlist(invite_code_id);
  `)
  
  const tenantCount = database.prepare('SELECT COUNT(*) as count FROM tenants').get() as { count: number }
  
  if (tenantCount.count === 0) {
    const insertTenant = database.prepare('INSERT INTO tenants (name, location, timezone) VALUES (?, ?, ?)')
    insertTenant.run('The Browns Luxury Guest Suites (Dullstroom)', 'Dullstroom, Mpumalanga, South Africa', 'Africa/Johannesburg')
  }

  const demoTenant = database.prepare('SELECT id FROM tenants WHERE name LIKE ? LIMIT 1').get('%Browns%') as { id: number } | undefined
  const demoTenantId = demoTenant?.id || 1
  
  const propertyCount = database.prepare('SELECT COUNT(*) as count FROM properties').get() as { count: number }
  
  if (propertyCount.count === 0) {
    const insert = database.prepare('INSERT INTO properties (tenant_id, name, location, room_count) VALUES (?, ?, ?, ?)')
    insert.run(demoTenantId, 'Riverside Lodge', 'Dullstroom, SA', 5)
    insert.run(demoTenantId, 'Mountain View Suites', 'Clarens, SA', 3)
    insert.run(demoTenantId, 'Coastal Retreat', 'Hermanus, SA', 4)
  }
}

export function getDefaultTenantId(): number {
  const db = getDb()
  const tenant = db.prepare('SELECT id FROM tenants WHERE name LIKE ? LIMIT 1').get('%Browns%') as { id: number } | undefined
  return tenant?.id || 1
}
