/**
 * Additive Sprint 2 contact columns + booking_contacts.
 *
 * DEFAULT: --dry-run (prints SQL, writes nothing).
 * Refuses Turso / libsql URLs unless ALLOW_TURSO_WRITE=1
 * (this package must NEVER set that or run against Production).
 *
 * Usage:
 *   node scripts/migrate-sprint2-contacts.js --dry-run
 *   node scripts/migrate-sprint2-contacts.js --apply   # local SQLite only
 */

const path = require('path')

const args = process.argv.slice(2)
const dryRun = !args.includes('--apply')
const dbUrl = process.env.DATABASE_URL || path.join(__dirname, '../data/guestflow.db')
const looksRemote =
  String(dbUrl).startsWith('libsql://') ||
  String(dbUrl).startsWith('https://') ||
  String(dbUrl).startsWith('http://')

const statements = [
  'ALTER TABLE bookings ADD COLUMN guest_email TEXT',
  'ALTER TABLE bookings ADD COLUMN guest_phone_source TEXT',
  'ALTER TABLE bookings ADD COLUMN guest_email_source TEXT',
  'ALTER TABLE bookings ADD COLUMN guest_email_kind TEXT',
  'ALTER TABLE bookings ADD COLUMN extra_rooms TEXT',
  `CREATE TABLE IF NOT EXISTS booking_contacts (
    booking_id INTEGER PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    phone TEXT,
    phone_source TEXT,
    phone_source_ref TEXT,
    email TEXT,
    email_source TEXT,
    email_kind TEXT,
    email_source_ref TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
]

console.log('migrate-sprint2-contacts')
console.log('mode:', dryRun ? 'DRY-RUN (no writes)' : 'APPLY')
console.log('target:', looksRemote ? 'remote/Turso URL (redacted)' : dbUrl)

if (looksRemote && process.env.ALLOW_TURSO_WRITE !== '1') {
  console.error('Refusing Turso/remote write. Leave --dry-run. Do not set ALLOW_TURSO_WRITE.')
  process.exit(dryRun ? 0 : 2)
}

if (dryRun) {
  console.log('SQL that would run:')
  for (const sql of statements) console.log(' --', sql.replace(/\s+/g, ' ').trim())
  console.log('No changes written.')
  process.exit(0)
}

if (looksRemote) {
  console.error('Apply against Turso is out of scope for this package.')
  process.exit(2)
}

const Database = require('better-sqlite3')
const actualPath = String(dbUrl).replace('file:', '')
const db = new Database(actualPath)
for (const sql of statements) {
  try {
    db.exec(sql)
    console.log('applied:', sql.split('\n')[0])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/duplicate column|already exists/i.test(message)) {
      console.log('skip:', sql.split('\n')[0])
    } else {
      throw error
    }
  }
}
db.close()
console.log('Local apply complete.')
