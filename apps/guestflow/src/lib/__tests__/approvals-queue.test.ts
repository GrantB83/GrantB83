import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import type { DbClient } from '@/lib/db'
import {
  fetchAllApprovalItems,
  fetchInboundApprovalItems,
  fetchLateCheckinApprovalItems,
  fetchTicketApprovalItems,
  fetchWelcomeApprovalItems,
  INBOUND_APPROVALS_SQL,
} from '../approvals-queue'

const TEST_DB_PATH = path.join(__dirname, '../../../data/test-approvals-queue.db')

function createTestDbClient(db: Database.Database): DbClient {
  return {
    prepare: (sql: string) => {
      const stmt = db.prepare(sql)
      return {
        run: (...params: unknown[]) => stmt.run(...params),
        get: (...params: unknown[]) => stmt.get(...params),
        all: (...params: unknown[]) => stmt.all(...params),
      }
    },
    exec: (sql: string) => {
      db.exec(sql)
    },
    batch: () => {},
    type: 'sqlite',
  }
}

/** Production-shaped inbound tables (migrate-add-inbound-whatsapp.js). */
function seedProductionInboundSchema(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE tenants (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    INSERT INTO tenants (id, name) VALUES (1, 'Browns');

    CREATE TABLE inbound_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      from_number TEXT NOT NULL,
      guest_name TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE inbound_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER NOT NULL,
      tenant_id INTEGER NOT NULL,
      direction TEXT NOT NULL DEFAULT 'inbound',
      from_number TEXT NOT NULL,
      message_text TEXT NOT NULL,
      message_timestamp DATETIME NOT NULL,
      draft_reply TEXT,
      status TEXT DEFAULT 'new',
      FOREIGN KEY (thread_id) REFERENCES inbound_threads(id)
    );
  `)
}

describe('approvals-queue', () => {
  let sqlite: Database.Database
  let db: DbClient

  beforeAll(() => {
    const dbDir = path.dirname(TEST_DB_PATH)
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
    sqlite = new Database(TEST_DB_PATH)
    seedProductionInboundSchema(sqlite)
    db = createTestDbClient(sqlite)
  })

  afterAll(() => {
    sqlite.close()
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
  })

  it('inbound SELECT uses from_number, message_timestamp, and thread guest_name', async () => {
    sqlite
      .prepare(
        `INSERT INTO inbound_threads (id, tenant_id, from_number, guest_name, status)
         VALUES (10, 1, '+27820001111', 'Jane Guest', 'drafted')`
      )
      .run()
    sqlite
      .prepare(
        `INSERT INTO inbound_messages (
           thread_id, tenant_id, from_number, message_text, message_timestamp, draft_reply, status
         ) VALUES (10, 1, '+27820001111', 'Hi', '2026-09-21 09:00:00', 'Thanks for reaching out', 'drafted')`
      )
      .run()

    const rows = await fetchInboundApprovalItems(db, 1)
    expect(rows).toHaveLength(1)
    expect(rows[0].guest).toBe('Jane Guest')
    expect(rows[0].created_at).toBe('2026-09-21 09:00:00')
    expect(INBOUND_APPROVALS_SQL).not.toMatch(/from_name/)
    expect(INBOUND_APPROVALS_SQL).not.toMatch(/\btimestamp\b/)
  })

  it('returns [] for welcome and late when optional tables are missing', async () => {
    expect(await fetchWelcomeApprovalItems(db, 1)).toEqual([])
    expect(await fetchLateCheckinApprovalItems(db, 1)).toEqual([])
  })

  it('fetchAllApprovalItems still returns inbound when tickets query throws', async () => {
    const throwingDb: DbClient = {
      ...db,
      prepare: (sql: string) => {
        if (sql.includes('FROM guest_tickets')) {
          return {
            all: async () => {
              throw new Error('guest_tickets unavailable')
            },
            get: async () => undefined,
            run: async () => undefined,
          }
        }
        return db.prepare(sql)
      },
    }

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const items = await fetchAllApprovalItems(throwingDb, 1)
    consoleSpy.mockRestore()

    expect(items.some((row) => row.type === 'inbound')).toBe(true)
    expect(items.filter((row) => row.type === 'ticket_guest' || row.type === 'ticket_staff')).toHaveLength(
      0
    )
  })

  it('isolates ticket failures via fetchTicketApprovalItems', async () => {
    const badDb: DbClient = {
      prepare: () => ({
        all: async () => {
          throw new Error('no guest_tickets')
        },
        get: async () => undefined,
        run: async () => undefined,
      }),
      exec: () => {},
      batch: () => {},
      type: 'sqlite',
    }
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await fetchTicketApprovalItems(badDb, 1)).toEqual([])
    consoleSpy.mockRestore()
  })
})
