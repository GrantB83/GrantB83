#!/usr/bin/env node

/**
 * Migration: Phase 19 - Add guest_phone to bookings table
 * 
 * Adds: guest_phone, property_name
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

console.log('🔧 Running Phase 19 migration: Add guest_phone and property_name to bookings...')

try {
  // Check if columns already exist
  const columns = db.pragma('table_info(bookings)')
  const existingCols = columns.map(c => c.name)

  const migrations = []

  if (!existingCols.includes('guest_phone')) {
    migrations.push('ALTER TABLE bookings ADD COLUMN guest_phone TEXT')
  }

  if (!existingCols.includes('property_name')) {
    migrations.push('ALTER TABLE bookings ADD COLUMN property_name TEXT')
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
