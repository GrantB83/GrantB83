import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import type { DbClient } from '@/lib/db'
import { ensureSprint2Schema } from '@/lib/sprint2-schema'
import { ensureStaffUsersSchema } from '@/lib/staff-users-schema'
import { addStaffUser } from '@/lib/staff-auth'

export function createTestDbClient(db: Database.Database): DbClient {
  return {
    prepare: (sql: string) => {
      const stmt = db.prepare(sql)
      return {
        run: (...params: any[]) => stmt.run(...params),
        get: (...params: any[]) => stmt.get(...params),
        all: (...params: any[]) => stmt.all(...params),
      }
    },
    exec: (sql: string) => {
      db.exec(sql)
    },
    batch: (statements: Array<{ sql: string; args?: any[] }>) => {
      const tx = db.transaction(() => {
        for (const statement of statements) {
          db.prepare(statement.sql).run(...(statement.args || []))
        }
      })
      tx()
    },
    type: 'sqlite' as const,
  } as unknown as DbClient
}

export function openTestSqlite(filename: string): Database.Database {
  const full = path.join(__dirname, `../../../data/${filename}`)
  const dir = path.dirname(full)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (fs.existsSync(full)) fs.unlinkSync(full)
  return new Database(full)
}

export function closeTestSqlite(sqlite: Database.Database, filename: string) {
  sqlite.close()
  const full = path.join(__dirname, `../../../data/${filename}`)
  if (fs.existsSync(full)) fs.unlinkSync(full)
}

export async function seedStaff(db: DbClient, emails: string[]) {
  process.env.STAFF_BCRYPT_ROUNDS = '4'
  delete process.env.GUESTFLOW_BOOTSTRAP_EMAIL
  delete process.env.GUESTFLOW_BOOTSTRAP_PASSWORD
  await ensureStaffUsersSchema(db)
  await ensureSprint2Schema(db)
  for (const email of emails) {
    await addStaffUser(db, {
      email,
      password: 'test-pass-12',
      actorEmail: 'seed@guestflow.test',
    })
  }
}

export function ensureThreadTables(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS inbound_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER DEFAULT 1,
      from_number TEXT,
      guest_name TEXT,
      booking_id INTEGER,
      thread_kind TEXT DEFAULT 'booking',
      pending_reply INTEGER DEFAULT 0,
      last_inbound_at DATETIME,
      last_outbound_at DATETIME,
      last_handler_email TEXT,
      status TEXT,
      updated_at DATETIME
    );
    CREATE TABLE IF NOT EXISTS inbound_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER,
      direction TEXT,
      is_spam INTEGER DEFAULT 0,
      message_timestamp DATETIME
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER DEFAULT 1,
      guest_name TEXT,
      guest_name_norm TEXT,
      check_in DATE,
      check_out DATE,
      suite_or_unit TEXT,
      suite_or_unit_norm TEXT,
      guest_phone TEXT,
      guest_email TEXT,
      notes TEXT,
      notes_email TEXT,
      notes_report TEXT,
      status TEXT DEFAULT 'confirmed',
      nightsbridge_booking_id TEXT,
      source TEXT,
      nb_last_event_at DATETIME,
      last_report_at DATETIME,
      cancelled_source TEXT,
      field_sources_json TEXT,
      guest_phone_verified TEXT,
      guest_email_verified TEXT,
      created_at DATETIME,
      updated_at DATETIME
    );
  `)
}
