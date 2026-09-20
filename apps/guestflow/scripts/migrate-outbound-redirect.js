/**
 * Migration: Add metadata column to send_jobs table
 * 
 * For outbound redirect feature (specs/009-outbound-redirect).
 * Adds metadata TEXT column to store redirect audit trail:
 * { intended_to, redirect_enabled, mode }
 * 
 * Idempotent: Safe to run multiple times (checks if column exists).
 * Works with both Turso (libsql) and local SQLite (better-sqlite3).
 */

const { getDbAsync } = require('../src/lib/db.js')

async function tableHasColumn(db, tableName, columnName) {
  try {
    const rows = await db.prepare(`PRAGMA table_info(${tableName})`).all()
    return rows.some(row => row.name === columnName)
  } catch (error) {
    console.error(`Error checking column existence: ${error.message}`)
    return false
  }
}

async function migrate() {
  console.log('[migrate-outbound-redirect] Starting migration...')
  
  try {
    const db = await getDbAsync()
    console.log(`[migrate-outbound-redirect] Connected to ${db.type} database`)
    
    // Check if send_jobs table exists
    const tables = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='send_jobs'
    `).all()
    
    if (tables.length === 0) {
      console.log('[migrate-outbound-redirect] send_jobs table does not exist yet. Skipping migration.')
      console.log('[migrate-outbound-redirect] (Table will be created with metadata column when first job is created)')
      return
    }
    
    // Check if metadata column already exists
    const hasMetadata = await tableHasColumn(db, 'send_jobs', 'metadata')
    
    if (hasMetadata) {
      console.log('[migrate-outbound-redirect] ✓ metadata column already exists. No migration needed.')
      return
    }
    
    // Add metadata column
    console.log('[migrate-outbound-redirect] Adding metadata column to send_jobs table...')
    await db.exec(`ALTER TABLE send_jobs ADD COLUMN metadata TEXT`)
    console.log('[migrate-outbound-redirect] ✓ metadata column added successfully')
    
    // Verify column was added
    const verified = await tableHasColumn(db, 'send_jobs', 'metadata')
    if (verified) {
      console.log('[migrate-outbound-redirect] ✓ Migration complete and verified')
    } else {
      console.error('[migrate-outbound-redirect] ✗ Migration failed: Column not found after ALTER TABLE')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('[migrate-outbound-redirect] Migration failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('[migrate-outbound-redirect] Done')
      process.exit(0)
    })
    .catch(error => {
      console.error('[migrate-outbound-redirect] Fatal error:', error)
      process.exit(1)
    })
}

module.exports = { migrate, tableHasColumn }
