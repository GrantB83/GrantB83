#!/usr/bin/env node

/**
 * Migration: WhatsApp Web Inbound Allowlist + Message Status Column
 * 
 * Adds:
 * 1. inbound_messages.status column for durable message state
 * 2. inbound_messages.metadata column for WhatsApp Web observedOn tracking
 * 
 * Phase: Phase 0 extension (WhatsApp Web bridge)
 * Date: 2026-09-20
 */

import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const dbUrl = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!dbUrl) {
  console.error('❌ TURSO_DATABASE_URL not set')
  process.exit(1)
}

const db = createClient({
  url: dbUrl,
  authToken: authToken || undefined,
})

async function hasColumn(table, column) {
  const rows = await db.execute(`PRAGMA table_info(${table})`)
  return rows.rows.some((row) => row.name === column)
}

async function migrate() {
  console.log('🚀 Starting WhatsApp Web Allowlist migration...\n')

  try {
    // Add inbound_messages.status column (durable message state)
    if (!(await hasColumn('inbound_messages', 'status'))) {
      console.log('📝 Adding inbound_messages.status column...')
      await db.execute(`
        ALTER TABLE inbound_messages 
        ADD COLUMN status TEXT DEFAULT 'new' 
        CHECK(status IN ('new', 'seen', 'archived'))
      `)
      console.log('✅ Added inbound_messages.status column')
    } else {
      console.log('⏭️  inbound_messages.status column already exists')
    }

    // Add inbound_messages.metadata column (for WhatsApp Web observedOn, etc.)
    if (!(await hasColumn('inbound_messages', 'metadata'))) {
      console.log('📝 Adding inbound_messages.metadata column...')
      await db.execute(`
        ALTER TABLE inbound_messages 
        ADD COLUMN metadata TEXT
      `)
      console.log('✅ Added inbound_messages.metadata column')
    } else {
      console.log('⏭️  inbound_messages.metadata column already exists')
    }

    // Backfill status for existing messages
    console.log('📝 Backfilling status for existing messages...')
    const result = await db.execute(`
      UPDATE inbound_messages 
      SET status = 'new' 
      WHERE status IS NULL
    `)
    console.log(`✅ Updated ${result.rowsAffected} existing messages\n`)

    console.log('✅ Migration complete!\n')
    console.log('Schema changes:')
    console.log('  • inbound_messages.status (new, seen, archived)')
    console.log('  • inbound_messages.metadata (JSON for WhatsApp Web tracking)')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

migrate().then(() => process.exit(0))
