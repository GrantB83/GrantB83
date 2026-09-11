/**
 * Migration: Add Outbound Message Support to inbound_messages Table
 * 
 * Adds fields to support WhatsApp send functionality:
 * - direction: 'inbound' (existing messages) or 'outbound' (sent replies)
 * - whatsapp_provider: 'meta', 'twilio', or 'sandbox'
 * - whatsapp_message_id: Message ID from WhatsApp API
 * - send_error: Error message if send failed
 * 
 * Run: npm run db:migrate:send
 */

const path = require('path')
const fs = require('fs')

// Load database connection
const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../guestflow.db')
const useTurso = dbPath.startsWith('libsql://') || dbPath.startsWith('https://')

async function migrate() {
  console.log('Migration: Add outbound message support to inbound_messages')
  console.log('Database:', useTurso ? 'Turso (libsql)' : 'Local SQLite')

  let db

  if (useTurso) {
    // Turso client
    const { createClient } = require('@libsql/client')
    const authToken = process.env.DATABASE_AUTH_TOKEN
    if (!authToken) {
      throw new Error('DATABASE_AUTH_TOKEN required for Turso database')
    }
    db = createClient({ url: dbPath, authToken })
  } else {
    // Local SQLite
    const Database = require('better-sqlite3')
    const actualPath = dbPath.replace('file:', '')
    db = new Database(actualPath)
  }

  const execute = async (sql) => {
    if (useTurso) {
      await db.execute(sql)
    } else {
      db.exec(sql)
    }
  }

  try {
    // Check if columns already exist (migration idempotency)
    const checkColumn = async (table, column) => {
      if (useTurso) {
        const result = await db.execute(`PRAGMA table_info(${table})`)
        return result.rows.some(row => row.name === column)
      } else {
        const columns = db.pragma(`table_info(${table})`)
        return columns.some(col => col.name === column)
      }
    }

    // Add direction column
    if (!(await checkColumn('inbound_messages', 'direction'))) {
      console.log('✓ Adding direction column...')
      await execute(`
        ALTER TABLE inbound_messages 
        ADD COLUMN direction TEXT DEFAULT 'inbound' 
        CHECK (direction IN ('inbound', 'outbound'))
      `)
    } else {
      console.log('⊘ direction column already exists, skipping')
    }

    // Add whatsapp_provider column
    if (!(await checkColumn('inbound_messages', 'whatsapp_provider'))) {
      console.log('✓ Adding whatsapp_provider column...')
      await execute(`
        ALTER TABLE inbound_messages 
        ADD COLUMN whatsapp_provider TEXT 
        CHECK (whatsapp_provider IN ('meta', 'twilio', 'sandbox'))
      `)
    } else {
      console.log('⊘ whatsapp_provider column already exists, skipping')
    }

    // Add whatsapp_message_id column
    if (!(await checkColumn('inbound_messages', 'whatsapp_message_id'))) {
      console.log('✓ Adding whatsapp_message_id column...')
      await execute(`
        ALTER TABLE inbound_messages 
        ADD COLUMN whatsapp_message_id TEXT
      `)
    } else {
      console.log('⊘ whatsapp_message_id column already exists, skipping')
    }

    // Add send_error column
    if (!(await checkColumn('inbound_messages', 'send_error'))) {
      console.log('✓ Adding send_error column...')
      await execute(`
        ALTER TABLE inbound_messages 
        ADD COLUMN send_error TEXT
      `)
    } else {
      console.log('⊘ send_error column already exists, skipping')
    }

    console.log('\nMigration complete! ✓')
    console.log('\nVerify with:')
    console.log(useTurso 
      ? '  turso db shell <db-name> ".schema inbound_messages"'
      : '  sqlite3 guestflow.db ".schema inbound_messages"'
    )

  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    if (useTurso) {
      db.close()
    } else {
      db.close()
    }
  }
}

migrate().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
