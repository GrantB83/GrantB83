#!/usr/bin/env node
/**
 * Staff users / sessions / audit / login-attempt / app_settings tables.
 * Turso-safe CREATE IF NOT EXISTS. Do not run against Production
 * without APPROVE APPLY MIGRATION.
 *
 * Optional bootstrap: when staff_users is empty and
 * GUESTFLOW_BOOTSTRAP_EMAIL + GUESTFLOW_BOOTSTRAP_PASSWORD are set,
 * inserts the first hashed user (created_by = bootstrap).
 */

const { createClient } = require('@libsql/client')
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const path = require('path')
const fs = require('fs')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LEGACY_EMAIL = 'legacy@guestflow.local'

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS staff_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    display_name TEXT,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,
    last_login_at DATETIME
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_users_email
    ON staff_users(email)`,
  `CREATE TABLE IF NOT EXISTS staff_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    email TEXT NOT NULL,
    display_name TEXT,
    token_hash TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_sessions_token_hash
    ON staff_sessions(token_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_staff_sessions_user_id
    ON staff_sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_staff_sessions_expires
    ON staff_sessions(expires_at)`,
  `CREATE TABLE IF NOT EXISTS staff_user_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_staff_user_audit_created
    ON staff_user_audit(created_at)`,
  `CREATE TABLE IF NOT EXISTS staff_login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    email TEXT NOT NULL,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_staff_login_attempts_pair_time
    ON staff_login_attempts(ip, email, attempted_at)`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT NOT NULL
  )`,
]

async function seedOutboundRedirect(exec) {
  const seed = String(process.env.OUTBOUND_MODE || '').toLowerCase().trim() === 'live' ? 'off' : 'on'
  await exec(
    `INSERT OR IGNORE INTO app_settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, 'seed')`,
    ['outbound_redirect', seed, new Date().toISOString()]
  )
  console.log(`  outbound_redirect seed=${seed} (OUTBOUND_MODE is seed default only)`)
}

async function maybeBootstrap(exec, get) {
  const email = String(process.env.GUESTFLOW_BOOTSTRAP_EMAIL || '').trim().toLowerCase()
  const password = process.env.GUESTFLOW_BOOTSTRAP_PASSWORD || ''
  if (!email || !password) return
  if (!EMAIL_RE.test(email) || email === LEGACY_EMAIL) {
    console.log('  skip bootstrap: invalid or reserved email')
    return
  }
  const row = await get(`SELECT COUNT(*) AS c FROM staff_users`)
  const count = Number(row?.c || 0)
  if (count > 0) {
    console.log('  skip bootstrap: staff_users already has rows')
    return
  }
  const hash = bcrypt.hashSync(password, 10)
  await exec(
    `INSERT INTO staff_users (email, display_name, password_hash, created_by) VALUES (?, NULL, ?, 'bootstrap')`,
    [email, hash]
  )
  console.log('  bootstrapped first user (hash stored, password not logged)')
}

async function main() {
  const url = process.env.DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN
  if (url && token) {
    const client = createClient({ url, authToken: token })
    const exec = async (sql, args = []) => {
      await client.execute({ sql, args })
    }
    const get = async (sql, args = []) => {
      const result = await client.execute({ sql, args })
      return result.rows[0]
    }
    console.log('Staff users migrate (Turso)')
    for (const sql of STATEMENTS) {
      await exec(sql)
    }
    await seedOutboundRedirect(exec)
    await maybeBootstrap(exec, get)
    return
  }

  const dbDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
  const db = new Database(path.join(dbDir, 'guestflow.db'))
  const exec = async (sql, args = []) => {
    db.prepare(sql).run(...args)
  }
  const get = async (sql, args = []) => db.prepare(sql).get(...args)
  console.log('Staff users migrate (local sqlite)')
  for (const sql of STATEMENTS) {
    db.exec(sql)
  }
  await seedOutboundRedirect(exec)
  await maybeBootstrap(exec, get)
  db.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
