const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const dbDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const dbPath = path.join(dbDir, 'guestflow.db')
const db = new Database(dbPath)

console.log('Initializing GuestFlow database...')

db.exec(`
  CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    timezone TEXT DEFAULT 'Africa/Johannesburg',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    status TEXT DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'qualified', 'won', 'lost')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
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
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (inquiry_id) REFERENCES inquiries(id),
    FOREIGN KEY (property_id) REFERENCES properties(id)
  );
`)

const tenantCount = db.prepare('SELECT COUNT(*) as count FROM tenants').get()

if (tenantCount.count === 0) {
  console.log('Inserting demo tenant...')
  const insertTenant = db.prepare('INSERT INTO tenants (name, location, timezone) VALUES (?, ?, ?)')
  insertTenant.run('The Browns Luxury Guest Suites (Dullstroom)', 'Dullstroom, Mpumalanga, South Africa', 'Africa/Johannesburg')
  console.log('✓ Demo tenant created')
}

const demoTenantId = db.prepare('SELECT id FROM tenants WHERE name LIKE ? LIMIT 1').get('%Browns%').id

const propertyCount = db.prepare('SELECT COUNT(*) as count FROM properties').get()

if (propertyCount.count === 0) {
  console.log('Inserting sample properties...')
  const insert = db.prepare('INSERT INTO properties (tenant_id, name, location, room_count) VALUES (?, ?, ?, ?)')
  insert.run(demoTenantId, 'Riverside Lodge', 'Dullstroom, SA', 5)
  insert.run(demoTenantId, 'Mountain View Suites', 'Clarens, SA', 3)
  insert.run(demoTenantId, 'Coastal Retreat', 'Hermanus, SA', 4)
  console.log('✓ Sample properties created')
}

console.log('✓ Database initialized successfully')
console.log(`Database location: ${dbPath}`)

db.close()
