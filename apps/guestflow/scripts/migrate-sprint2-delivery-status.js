#!/usr/bin/env node
/**
 * Additive delivery-status columns on inbound_messages.
 * Turso-safe: ALTER one column at a time.
 * Do NOT run against Production without APPROVE APPLY MIGRATION.
 */

const { createClient } = require('@libsql/client')
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const MESSAGE_COLUMNS = [
  ['provider_message_id', 'TEXT'],
  ['delivery_status', 'TEXT'],
  ['delivery_read', 'INTEGER NOT NULL DEFAULT 0'],
  ['delivery_error_code', 'TEXT'],
  ['delivery_error_plain', 'TEXT'],
  ['delivery_updated_at', 'DATETIME'],
  ['queued_at', 'DATETIME'],
  ['sent_to_test_sink', 'INTEGER NOT NULL DEFAULT 0'],
  ['resend_of', 'INTEGER'],
  ['resent_by', 'TEXT'],
  ['resend_in_flight', 'INTEGER NOT NULL DEFAULT 0'],
]

async function columnNames(exec, table) {
  const rows = await exec(`PRAGMA table_info(${table})`)
  return new Set((rows || []).map((row) => row.name))
}

async function addColumns(exec, table, columns) {
  const existing = await columnNames(exec, table)
  for (const [name, type] of columns) {
    if (existing.has(name)) continue
    await exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`)
    console.log(`  + ${table}.${name}`)
  }
}

async function main() {
  const url = process.env.DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN
  if (url && token) {
    const client = createClient({ url, authToken: token })
    const exec = async (sql) => {
      const result = await client.execute(sql)
      return result.rows
    }
    console.log('Sprint 2 delivery-status migrate (Turso)')
    await addColumns(exec, 'inbound_messages', MESSAGE_COLUMNS)
    return
  }

  const dbDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
  const db = new Database(path.join(dbDir, 'guestflow.db'))
  const exec = async (sql) => db.prepare(sql).all()
  console.log('Sprint 2 delivery-status migrate (local sqlite)')
  await addColumns(exec, 'inbound_messages', MESSAGE_COLUMNS)
  db.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
