#!/usr/bin/env node

/**
 * Migration: Phase 16 - Add Nightsbridge fields to bookings table
 * 
 * Adds: adults, children, notes, late_check_in, suite_or_unit
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

console.log('🔧 Running Phase 16 migration: Add Nightsbridge booking fields...')

try {
  // Check if columns already exist
  const columns = db.pragma('table_info(bookings)')
  const existingCols = columns.map(c => c.name)

  const migrations = []

  if (!existingCols.includes('adults')) {
    migrations.push('ALTER TABLE bookings ADD COLUMN adults INTEGER DEFAULT 2')
  }

  if (!existingCols.includes('children')) {
    migrations.push('ALTER TABLE bookings ADD COLUMN children INTEGER DEFAULT 0')
  }

  if (!existingCols.includes('notes')) {
    migrations.push('ALTER TABLE bookings ADD COLUMN notes TEXT')
  }

  if (!existingCols.includes('late_check_in')) {
    migrations.push('ALTER TABLE bookings ADD COLUMN late_check_in BOOLEAN DEFAULT 0')
  }

  if (!existingCols.includes('suite_or_unit')) {
    migrations.push('ALTER TABLE bookings ADD COLUMN suite_or_unit TEXT')
  }

  if (migrations.length === 0) {
    console.log('✅ All columns already exist. No migration needed.')
  } else {
    migrations.forEach(sql => {
      db.exec(sql)
      console.log(`  ✓ ${sql}`)
    })
    console.log('✅ Migration complete!')
  }

} catch (error) {
  console.error('❌ Migration failed:', error.message)
  process.exit(1)
} finally {
  db.close()
}
