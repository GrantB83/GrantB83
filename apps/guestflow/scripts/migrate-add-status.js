const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const dbDir = path.join(__dirname, '..', 'data')
const dbPath = path.join(dbDir, 'guestflow.db')

if (!fs.existsSync(dbPath)) {
  console.log('❌ Database not found. Run npm run db:init first.')
  process.exit(1)
}

const db = new Database(dbPath)

console.log('Adding status column to waitlist table...')

try {
  const columns = db.pragma('table_info(waitlist)')
  const hasStatus = columns.some(col => col.name === 'status')

  if (hasStatus) {
    console.log('✓ Status column already exists')
  } else {
    db.exec(`
      ALTER TABLE waitlist ADD COLUMN status TEXT DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'qualified', 'won', 'lost'));
    `)
    console.log('✓ Status column added successfully')
  }
} catch (error) {
  console.error('Migration error:', error)
  process.exit(1)
}

db.close()
console.log('✓ Migration complete')
