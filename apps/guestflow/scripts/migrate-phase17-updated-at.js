#!/usr/bin/env node

/**
 * Migration: Phase 17 Hotfix - Ensure updated_at column exists
 * 
 * Adds: updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
 * 
 * This is a production hotfix for the ensurePhase17Columns() runtime migration.
 * Run this manually on Turso if the column is missing and causing UPSERT failures.
 * 
 * Usage:
 *   # For Turso Production
 *   turso db shell <DB_NAME> < apps/guestflow/scripts/migrate-phase17-updated-at.sql
 * 
 *   # For local SQLite
 *   node apps/guestflow/scripts/migrate-phase17-updated-at.js
 */

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const dbDir = path.join(process.cwd(), 'data')
const dbPath = path.join(dbDir, 'guestflow.db')

if (!fs.existsSync(dbPath)) {
  console.error('❌ Database not found. Run `npm run db:init` first.')
  process.exit(1)
}

const db = new Database(dbPath)

console.log('🔧 Running Phase 17 Hotfix: Ensure updated_at column...')

try {
  // Check if columns already exist
  const columns = db.pragma('table_info(bookings)')
  const existingCols = columns.map(c => c.name)

  // Critical Phase 17 columns
  const criticalColumns = [
    { name: 'guest_name_norm', sql: 'ALTER TABLE bookings ADD COLUMN guest_name_norm TEXT' },
    { name: 'suite_or_unit_norm', sql: 'ALTER TABLE bookings ADD COLUMN suite_or_unit_norm TEXT' },
    { name: 'nightsbridge_booking_id', sql: 'ALTER TABLE bookings ADD COLUMN nightsbridge_booking_id TEXT' },
    { name: 'last_import_at', sql: 'ALTER TABLE bookings ADD COLUMN last_import_at DATETIME' },
    { name: 'import_batch_id', sql: 'ALTER TABLE bookings ADD COLUMN import_batch_id TEXT' },
    { name: 'source', sql: "ALTER TABLE bookings ADD COLUMN source TEXT DEFAULT 'nb'" },
    { name: 'last_seen_import_at', sql: 'ALTER TABLE bookings ADD COLUMN last_seen_import_at DATETIME' },
    { name: 'updated_at', sql: 'ALTER TABLE bookings ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP' },
  ]

  const migrations = []
  const missing = []

  for (const col of criticalColumns) {
    if (!existingCols.includes(col.name)) {
      migrations.push(col.sql)
      missing.push(col.name)
    }
  }

  if (migrations.length === 0) {
    console.log('✅ All Phase 17 columns already exist. No migration needed.')
  } else {
    console.log(`⚠️  Missing critical columns: ${missing.join(', ')}`)
    console.log('')
    
    migrations.forEach(sql => {
      db.exec(sql)
      console.log(`  ✓ ${sql}`)
    })
    
    // Create indexes
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_nbid 
      ON bookings(tenant_id, nightsbridge_booking_id) 
      WHERE nightsbridge_booking_id IS NOT NULL
    `)
    console.log('  ✓ Created index: idx_bookings_nbid')
    
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_natural_key 
      ON bookings(tenant_id, guest_name_norm, check_in, check_out, suite_or_unit_norm)
    `)
    console.log('  ✓ Created index: idx_bookings_natural_key')
    
    console.log('')
    console.log('✅ Migration complete!')
    console.log('   All Phase 17 UPSERT operations should now work correctly.')
  }

} catch (error) {
  console.error('❌ Migration failed:', error.message)
  console.error('   Stack:', error.stack)
  process.exit(1)
} finally {
  db.close()
}
