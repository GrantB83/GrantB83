#!/usr/bin/env node

/**
 * Migration: Phase 17 - Incremental Nightsbridge Bookings with UPSERT
 * 
 * Adds: nightsbridge_booking_id, guest_name_norm, suite_or_unit_norm,
 *       last_import_at, import_batch_id, source, last_seen_import_at
 * 
 * Creates: Partial unique index on (tenant_id, nightsbridge_booking_id)
 *          Unique index on natural key (tenant_id, guest_name_norm, check_in, check_out, suite_or_unit_norm)
 * 
 * Backfills: Normalized guest/suite names
 * Deduplicates: Existing bookings by natural key (keeps newest)
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

console.log('🔧 Running Phase 17 migration: Incremental Nightsbridge bookings with UPSERT...')

try {
  // Check if columns already exist
  const columns = db.pragma('table_info(bookings)')
  const existingCols = columns.map(c => c.name)

  const migrations = []

  // Add new columns
  if (!existingCols.includes('nightsbridge_booking_id')) {
    migrations.push('ALTER TABLE bookings ADD COLUMN nightsbridge_booking_id TEXT')
  }

  if (!existingCols.includes('guest_name_norm')) {
    migrations.push('ALTER TABLE bookings ADD COLUMN guest_name_norm TEXT')
  }

  if (!existingCols.includes('suite_or_unit_norm')) {
    migrations.push('ALTER TABLE bookings ADD COLUMN suite_or_unit_norm TEXT')
  }

  if (!existingCols.includes('last_import_at')) {
    migrations.push('ALTER TABLE bookings ADD COLUMN last_import_at DATETIME')
  }

  if (!existingCols.includes('import_batch_id')) {
    migrations.push('ALTER TABLE bookings ADD COLUMN import_batch_id TEXT')
  }

  if (!existingCols.includes('source')) {
    migrations.push("ALTER TABLE bookings ADD COLUMN source TEXT DEFAULT 'nb'")
  }

  if (!existingCols.includes('last_seen_import_at')) {
    migrations.push('ALTER TABLE bookings ADD COLUMN last_seen_import_at DATETIME')
  }

  if (migrations.length === 0) {
    console.log('✅ All columns already exist.')
  } else {
    migrations.forEach(sql => {
      db.exec(sql)
      console.log(`  ✓ ${sql}`)
    })
    console.log('✅ Columns added successfully!')
  }

  // Create partial unique index on nightsbridge_booking_id
  try {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_nbid 
      ON bookings(tenant_id, nightsbridge_booking_id) 
      WHERE nightsbridge_booking_id IS NOT NULL
    `)
    console.log('  ✓ Created partial unique index on (tenant_id, nightsbridge_booking_id)')
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('  ✓ Partial unique index on (tenant_id, nightsbridge_booking_id) already exists')
    } else {
      throw err
    }
  }

  // Create unique index on natural key
  try {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_natural_key 
      ON bookings(tenant_id, guest_name_norm, check_in, check_out, suite_or_unit_norm)
    `)
    console.log('  ✓ Created unique index on natural key (tenant_id, guest_name_norm, check_in, check_out, suite_or_unit_norm)')
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('  ✓ Unique index on natural key already exists')
    } else {
      throw err
    }
  }

  // Backfill normalization for existing bookings
  console.log('📝 Backfilling normalized fields...')
  const backfillResult = db.prepare(`
    UPDATE bookings 
    SET guest_name_norm = LOWER(TRIM(REPLACE(REPLACE(REPLACE(guest_name, '  ', ' '), '  ', ' '), '  ', ' '))),
        suite_or_unit_norm = LOWER(TRIM(REPLACE(REPLACE(REPLACE(IFNULL(suite_or_unit, ''), '  ', ' '), '  ', ' '), '  ', ' ')))
    WHERE guest_name_norm IS NULL OR suite_or_unit_norm IS NULL
  `).run()
  console.log(`  ✓ Backfilled ${backfillResult.changes} rows`)

  // Deduplicate existing bookings by natural key (keep newest)
  console.log('🔍 Checking for duplicates...')
  
  const dupes = db.prepare(`
    SELECT 
      tenant_id, 
      guest_name_norm, 
      check_in, 
      check_out, 
      suite_or_unit_norm, 
      COUNT(*) as cnt
    FROM bookings
    WHERE guest_name_norm IS NOT NULL 
      AND guest_name_norm != ''
      AND suite_or_unit_norm IS NOT NULL
    GROUP BY tenant_id, guest_name_norm, check_in, check_out, suite_or_unit_norm
    HAVING cnt > 1
  `).all()

  if (dupes.length > 0) {
    console.log(`  ⚠️  Found ${dupes.length} duplicate groups. Deduplicating...`)
    
    // For each duplicate group, keep the newest (highest id) and delete the rest
    let totalDeleted = 0
    for (const dupe of dupes) {
      const { tenant_id, guest_name_norm, check_in, check_out, suite_or_unit_norm } = dupe
      
      // Get all ids for this duplicate group, sorted newest first
      const ids = db.prepare(`
        SELECT id FROM bookings
        WHERE tenant_id = ? 
          AND guest_name_norm = ? 
          AND check_in = ? 
          AND check_out = ? 
          AND suite_or_unit_norm = ?
        ORDER BY id DESC
      `).all(tenant_id, guest_name_norm, check_in, check_out, suite_or_unit_norm)
      
      // Keep the first (newest) id, delete the rest
      const keepId = ids[0].id
      const deleteIds = ids.slice(1).map(row => row.id)
      
      if (deleteIds.length > 0) {
        const placeholders = deleteIds.map(() => '?').join(',')
        const deleteResult = db.prepare(`DELETE FROM bookings WHERE id IN (${placeholders})`).run(...deleteIds)
        totalDeleted += deleteResult.changes
        console.log(`    ✓ Kept id=${keepId}, deleted ${deleteResult.changes} duplicates for "${guest_name_norm}" (${check_in} to ${check_out})`)
      }
    }
    
    console.log(`  ✅ Deleted ${totalDeleted} duplicate bookings`)
  } else {
    console.log('  ✅ No duplicates found')
  }

  console.log('✅ Phase 17 migration complete!')

} catch (error) {
  console.error('❌ Migration failed:', error.message)
  console.error(error.stack)
  process.exit(1)
} finally {
  db.close()
}
