/**
 * Migration: Add inbound_messages.status column (durable message state)
 *
 * Adds status column to track message lifecycle (new → seen → archived).
 * Required for Phase 0 Approve&Send workflow.
 *
 * Production hotfix: Grant manually ALTER'd Production Turso 20 Sep 2026
 * after SQL_INPUT_ERROR (no such column: status) in Approve&Send.
 * This script makes it durable for dev/staging/new environments.
 *
 * Turso-safe: idempotent, one statement at a time.
 *
 * Usage:
 *   npm run db:migrate:inbound-status
 *   OR: node scripts/migrate-add-inbound-message-status.js
 */

const path = require('path')
const fs = require('fs')

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../data/guestflow.db')
const useTurso = String(dbPath).startsWith('libsql://') || String(dbPath).startsWith('https://')

async function hasColumn(db, table, column) {
  try {
    const rows = await db.execute(`PRAGMA table_info(${table})`)
    return rows.rows.some((row) => row.name === column)
  } catch (error) {
    console.error(`Error checking column ${table}.${column}:`, error)
    return false
  }
}

async function migrate() {
  console.log('🚀 Starting inbound_messages.status migration...\n')

  if (useTurso) {
    console.log('📡 Using Turso (libSQL remote)...')
    const { createClient } = require('@libsql/client')
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL || dbPath,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    })

    try {
      // Check if column already exists
      if (await hasColumn(db, 'inbound_messages', 'status')) {
        console.log('⏭️  Column inbound_messages.status already exists (skip)')
      } else {
        console.log('📝 Adding inbound_messages.status column...')
        await db.execute(`
          ALTER TABLE inbound_messages 
          ADD COLUMN status TEXT DEFAULT 'new'
        `)
        console.log('✅ Added inbound_messages.status column')

        // Backfill existing messages
        console.log('📝 Backfilling status for existing messages...')
        const result = await db.execute(`
          UPDATE inbound_messages 
          SET status = 'new' 
          WHERE status IS NULL
        `)
        console.log(`✅ Updated ${result.rowsAffected} existing messages`)
      }

      console.log('\n✅ Migration complete!\n')
    } catch (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
  } else {
    console.log('💾 Using local SQLite...')
    const Database = require('better-sqlite3')
    const db = new Database(dbPath)

    try {
      // Check if column already exists
      const tableInfo = db.pragma(`table_info(inbound_messages)`)
      const hasStatus = tableInfo.some((col) => col.name === 'status')

      if (hasStatus) {
        console.log('⏭️  Column inbound_messages.status already exists (skip)')
      } else {
        console.log('📝 Adding inbound_messages.status column...')
        db.exec(`
          ALTER TABLE inbound_messages 
          ADD COLUMN status TEXT DEFAULT 'new'
        `)
        console.log('✅ Added inbound_messages.status column')

        // Backfill existing messages
        console.log('📝 Backfilling status for existing messages...')
        const stmt = db.prepare(`
          UPDATE inbound_messages 
          SET status = 'new' 
          WHERE status IS NULL
        `)
        const result = stmt.run()
        console.log(`✅ Updated ${result.changes} existing messages`)
      }

      console.log('\n✅ Migration complete!\n')
      db.close()
    } catch (error) {
      console.error('❌ Migration failed:', error)
      db.close()
      process.exit(1)
    }
  }
}

migrate().then(() => process.exit(0))
