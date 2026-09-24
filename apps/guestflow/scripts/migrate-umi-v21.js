#!/usr/bin/env node
/**
 * Additive UMI v2.1 columns on inbound_threads / inbound_messages.
 * Turso-safe: ALTER one column at a time. Do not run against Production
 * without APPROVE APPLY MIGRATION.
 */

const { createClient } = require('@libsql/client')
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const THREAD_COLUMNS = [
  ['booking_id', 'INTEGER'],
  ['thread_kind', "TEXT NOT NULL DEFAULT 'temp'"],
  ['guest_contact_id', 'INTEGER'],
  ['last_channel', 'TEXT'],
  ['last_inbound_channel', 'TEXT'],
  ['last_outbound_at', 'DATETIME'],
  ['last_inbound_at', 'DATETIME'],
  ['pending_reply', 'INTEGER NOT NULL DEFAULT 0'],
  ['expires_at', 'DATETIME'],
  ['nudged_at', 'DATETIME'],
  ['hygiene_status', 'TEXT'],
  ['linked_at', 'DATETIME'],
  ['linked_from_thread_id', 'INTEGER'],
]

const MESSAGE_COLUMNS = [
  ['channel', 'TEXT'],
  ['sender_address', 'TEXT'],
  ['source_tag', 'TEXT'],
  ['dedup_key', 'TEXT'],
  ['is_spam', 'INTEGER NOT NULL DEFAULT 0'],
  ['body_unavailable', 'INTEGER NOT NULL DEFAULT 0'],
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
    console.log('UMI v2.1 migrate (Turso)')
    await addColumns(exec, 'inbound_threads', THREAD_COLUMNS)
    await addColumns(exec, 'inbound_messages', MESSAGE_COLUMNS)
    return
  }

  const dbDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
  const db = new Database(path.join(dbDir, 'guestflow.db'))
  const exec = async (sql) => db.prepare(sql).all()
  console.log('UMI v2.1 migrate (local sqlite)')
  await addColumns(exec, 'inbound_threads', THREAD_COLUMNS)
  await addColumns(exec, 'inbound_messages', MESSAGE_COLUMNS)
  db.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
