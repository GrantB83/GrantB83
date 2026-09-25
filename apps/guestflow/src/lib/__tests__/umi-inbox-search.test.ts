import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { DbClient } from '@/lib/db'
import { listInboxThreads, getThreadDetail } from '@/lib/umi-threads'

const TEST_DB_PATH = path.join(__dirname, 'test-umi-inbox-search.db')

function createTestDb() {
  const dbDir = path.dirname(TEST_DB_PATH)
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)

  const sqlite = new Database(TEST_DB_PATH)

  // Create minimal schema
  sqlite.exec(`
    CREATE TABLE inbound_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL,
      from_number TEXT NOT NULL,
      guest_name TEXT,
      status TEXT DEFAULT 'new',
      thread_kind TEXT NOT NULL DEFAULT 'temp',
      booking_id INTEGER,
      guest_contact_id INTEGER,
      last_channel TEXT,
      last_inbound_channel TEXT,
      last_outbound_at DATETIME,
      last_inbound_at DATETIME,
      pending_reply INTEGER NOT NULL DEFAULT 0,
      expires_at DATETIME,
      nudged_at DATETIME,
      hygiene_status TEXT,
      linked_at DATETIME,
      linked_from_thread_id INTEGER,
      last_handler_email TEXT,
      first_message_at DATETIME,
      last_message_at DATETIME,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE inbound_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER NOT NULL,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      direction TEXT DEFAULT 'inbound',
      from_number TEXT NOT NULL,
      message_text TEXT NOT NULL,
      media_refs TEXT,
      message_timestamp DATETIME NOT NULL,
      external_message_id TEXT,
      is_classified INTEGER DEFAULT 0,
      classification_result TEXT,
      draft_reply TEXT,
      draft_source TEXT,
      status TEXT,
      channel TEXT,
      sender_address TEXT,
      source_tag TEXT,
      dedup_key TEXT,
      is_spam INTEGER NOT NULL DEFAULT 0,
      body_unavailable INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER DEFAULT 1,
      guest_name TEXT,
      check_in DATE,
      check_out DATE,
      suite_or_unit TEXT,
      nightsbridge_booking_id TEXT,
      status TEXT DEFAULT 'confirmed'
    );

    CREATE TABLE approvals_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER NOT NULL,
      message_id INTEGER NOT NULL,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE guest_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      normalized_phone TEXT,
      email TEXT,
      display_name TEXT,
      source TEXT NOT NULL
    );

    CREATE TABLE send_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER NOT NULL,
      direction TEXT DEFAULT 'outbound',
      channel TEXT NOT NULL,
      to_address TEXT NOT NULL,
      message_body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      provider_message_id TEXT,
      pending_status TEXT,
      delivered_at DATETIME,
      failed_at DATETIME,
      claimed_at DATETIME,
      completed_at DATETIME,
      error_code TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE delivery_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      send_job_id INTEGER NOT NULL,
      provider_message_id TEXT,
      status TEXT NOT NULL,
      status_timestamp DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  const db: DbClient = {
    prepare: (sql: string) => {
      const stmt = sqlite.prepare(sql)
      return {
        run: (...params: unknown[]) => stmt.run(...params),
        get: (...params: unknown[]) => stmt.get(...params),
        all: (...params: unknown[]) => stmt.all(...params),
      }
    },
    exec: (sql: string) => sqlite.exec(sql),
    batch: () => {},
    type: 'sqlite' as const,
  }

  return { sqlite, db }
}

describe('UMI Inbox Search', () => {
  let sqlite: Database.Database
  let db: DbClient

  beforeAll(() => {
    const setup = createTestDb()
    sqlite = setup.sqlite
    db = setup.db
  })

  afterAll(() => {
    sqlite.close()
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
  })

  describe('User Story 1: Full-Text Thread Search', () => {
    it('should find thread by email subject', async () => {
      // Create thread with subject in metadata
      const threadId = db.prepare(`
        INSERT INTO inbound_threads (tenant_id, from_number, source, metadata, last_message_at)
        VALUES (1, 'test@example.com', 'email', '{"subject":"Booking inquiry for Main House"}', datetime('now'))
      `).run().lastInsertRowid as number

      db.prepare(`
        INSERT INTO inbound_messages (thread_id, tenant_id, from_number, message_text, message_timestamp)
        VALUES (?, 1, 'test@example.com', 'I would like to book', datetime('now'))
      `).run(threadId)

      const results = await listInboxThreads(db, 1, { q: 'booking inquiry' })
      expect(results.some(t => t.id === Number(threadId))).toBe(true)
    })

    it('should find thread by message body marker', async () => {
      // Create thread with known marker
      const threadId = db.prepare(`
        INSERT INTO inbound_threads (tenant_id, from_number, source, last_message_at)
        VALUES (1, 'grant830318@gmail.com', 'email', datetime('now'))
      `).run().lastInsertRowid as number

      db.prepare(`
        INSERT INTO inbound_messages (thread_id, tenant_id, from_number, message_text, message_timestamp)
        VALUES (?, 1, 'grant830318@gmail.com', 'GF-INBOUND-TEST-20260925-DIRECT2', datetime('now'))
      `).run(threadId)

      const results = await listInboxThreads(db, 1, { q: 'DIRECT2' })
      expect(results.some(t => t.id === Number(threadId))).toBe(true)
    })

    it('should find threads across WhatsApp and email channels', async () => {
      // Create WhatsApp thread
      const waThreadId = db.prepare(`
        INSERT INTO inbound_threads (tenant_id, from_number, source, last_channel, last_message_at)
        VALUES (1, '+27123456789', 'whatsapp', 'whatsapp', datetime('now'))
      `).run().lastInsertRowid as number

      db.prepare(`
        INSERT INTO inbound_messages (thread_id, tenant_id, from_number, message_text, channel, message_timestamp)
        VALUES (?, 1, '+27123456789', 'Test marker for cross-channel', 'whatsapp', datetime('now'))
      `).run(waThreadId)

      // Create email thread
      const emailThreadId = db.prepare(`
        INSERT INTO inbound_threads (tenant_id, from_number, source, last_channel, last_message_at)
        VALUES (1, 'email@example.com', 'email', 'email', datetime('now'))
      `).run().lastInsertRowid as number

      db.prepare(`
        INSERT INTO inbound_messages (thread_id, tenant_id, from_number, message_text, channel, message_timestamp)
        VALUES (?, 1, 'email@example.com', 'Test marker for cross-channel', 'email', datetime('now'))
      `).run(emailThreadId)

      const results = await listInboxThreads(db, 1, { q: 'cross-channel' })
      const foundIds = results.map(t => t.id)
      expect(foundIds).toContain(Number(waThreadId))
      expect(foundIds).toContain(Number(emailThreadId))
    })

    it('should require all tokens for multi-token AND search', async () => {
      // Thread with both "INBOUND" and "TEST"
      const matchThreadId = db.prepare(`
        INSERT INTO inbound_threads (tenant_id, from_number, source, last_message_at)
        VALUES (1, 'test@example.com', 'email', datetime('now'))
      `).run().lastInsertRowid as number

      db.prepare(`
        INSERT INTO inbound_messages (thread_id, tenant_id, from_number, message_text, message_timestamp)
        VALUES (?, 1, 'test@example.com', 'GF-INBOUND-TEST-marker', datetime('now'))
      `).run(matchThreadId)

      // Thread with only "INBOUND" (no "FOOBAR")
      const noMatchThreadId = db.prepare(`
        INSERT INTO inbound_threads (tenant_id, from_number, source, last_message_at)
        VALUES (1, 'test2@example.com', 'email', datetime('now'))
      `).run().lastInsertRowid as number

      db.prepare(`
        INSERT INTO inbound_messages (thread_id, tenant_id, from_number, message_text, message_timestamp)
        VALUES (?, 1, 'test2@example.com', 'GF-INBOUND-only', datetime('now'))
      `).run(noMatchThreadId)

      // Positive: both tokens match
      const positiveResults = await listInboxThreads(db, 1, { q: 'INBOUND TEST' })
      expect(positiveResults.some(t => t.id === Number(matchThreadId))).toBe(true)

      // Negative: one token missing
      const negativeResults = await listInboxThreads(db, 1, { q: 'INBOUND FOOBAR' })
      expect(negativeResults.some(t => t.id === Number(noMatchThreadId))).toBe(false)
    })

    it('should perform case-insensitive search', async () => {
      const threadId = db.prepare(`
        INSERT INTO inbound_threads (tenant_id, from_number, source, last_message_at)
        VALUES (1, 'grant830318@gmail.com', 'email', datetime('now'))
      `).run().lastInsertRowid as number

      db.prepare(`
        INSERT INTO inbound_messages (thread_id, tenant_id, from_number, message_text, message_timestamp)
        VALUES (?, 1, 'grant830318@gmail.com', 'test message', datetime('now'))
      `).run(threadId)

      // Mixed case query
      const results = await listInboxThreads(db, 1, { q: 'GrAnT830318' })
      expect(results.some(t => t.id === Number(threadId))).toBe(true)
    })

    it('should support partial phrase matching', async () => {
      const threadId = db.prepare(`
        INSERT INTO inbound_threads (tenant_id, from_number, source, last_message_at)
        VALUES (1, 'test@example.com', 'email', datetime('now'))
      `).run().lastInsertRowid as number

      db.prepare(`
        INSERT INTO inbound_messages (thread_id, tenant_id, from_number, message_text, message_timestamp)
        VALUES (?, 1, 'test@example.com', 'Date: 20260925', datetime('now'))
      `).run(threadId)

      // Substring match
      const results = await listInboxThreads(db, 1, { q: '2026' })
      expect(results.some(t => t.id === Number(threadId))).toBe(true)
    })

    it('should preserve existing search fields (backward compatibility)', async () => {
      const threadId = db.prepare(`
        INSERT INTO inbound_threads (tenant_id, from_number, source, guest_name, last_message_at)
        VALUES (1, 'test@example.com', 'email', 'John Smith', datetime('now'))
      `).run().lastInsertRowid as number

      db.prepare(`
        INSERT INTO inbound_messages (thread_id, tenant_id, from_number, message_text, message_timestamp)
        VALUES (?, 1, 'test@example.com', 'Hello', datetime('now'))
      `).run(threadId)

      // Search by guest_name (existing functionality)
      const results = await listInboxThreads(db, 1, { q: 'John' })
      expect(results.some(t => t.id === Number(threadId))).toBe(true)
    })
  })

  describe('User Story 2: Missing Thread Surface Fix', () => {
    it('should include threads with thread_kind=temp in inbox', async () => {
      const tempThreadId = db.prepare(`
        INSERT INTO inbound_threads (tenant_id, from_number, source, thread_kind, status, last_message_at)
        VALUES (1, 'temp@example.com', 'email', 'temp', 'new', datetime('now'))
      `).run().lastInsertRowid as number

      db.prepare(`
        INSERT INTO inbound_messages (thread_id, tenant_id, from_number, message_text, message_timestamp)
        VALUES (?, 1, 'temp@example.com', 'Temp thread message', datetime('now'))
      `).run(tempThreadId)

      const results = await listInboxThreads(db, 1, {})
      expect(results.some(t => t.id === Number(tempThreadId) && t.threadKind === 'temp')).toBe(true)
    })

    it('should include threads with status=drafted in inbox', async () => {
      const draftedThreadId = db.prepare(`
        INSERT INTO inbound_threads (tenant_id, from_number, source, thread_kind, status, last_message_at)
        VALUES (1, 'drafted@example.com', 'email', 'temp', 'drafted', datetime('now'))
      `).run().lastInsertRowid as number

      db.prepare(`
        INSERT INTO inbound_messages (thread_id, tenant_id, from_number, message_text, message_timestamp)
        VALUES (?, 1, 'drafted@example.com', 'Drafted thread message', datetime('now'))
      `).run(draftedThreadId)

      const results = await listInboxThreads(db, 1, {})
      expect(results.some(t => t.id === Number(draftedThreadId))).toBe(true)
    })

    it('should return thread detail for temp/drafted thread', async () => {
      const threadId = db.prepare(`
        INSERT INTO inbound_threads (tenant_id, from_number, source, thread_kind, status, last_message_at)
        VALUES (1, 'detail@example.com', 'email', 'temp', 'drafted', datetime('now'))
      `).run().lastInsertRowid as number

      db.prepare(`
        INSERT INTO inbound_messages (thread_id, tenant_id, from_number, message_text, message_timestamp)
        VALUES (?, 1, 'detail@example.com', 'Thread detail test', datetime('now'))
      `).run(threadId)

      const result = await getThreadDetail(db, 1, Number(threadId))
      expect(result).not.toBeNull()
      expect(result?.thread.id).toBe(Number(threadId))
      expect(result?.thread.status).toBe('drafted')
      expect(result?.thread.threadKind).toBe('temp')
    })

    it('should filter threads by tenant_id correctly', async () => {
      // Thread for tenant 1
      const tenant1ThreadId = db.prepare(`
        INSERT INTO inbound_threads (tenant_id, from_number, source, last_message_at)
        VALUES (1, 'tenant1@example.com', 'email', datetime('now'))
      `).run().lastInsertRowid as number

      db.prepare(`
        INSERT INTO inbound_messages (thread_id, tenant_id, from_number, message_text, message_timestamp)
        VALUES (?, 1, 'tenant1@example.com', 'Tenant 1 message', datetime('now'))
      `).run(tenant1ThreadId)

      // Thread for tenant 2
      const tenant2ThreadId = db.prepare(`
        INSERT INTO inbound_threads (tenant_id, from_number, source, last_message_at)
        VALUES (2, 'tenant2@example.com', 'email', datetime('now'))
      `).run().lastInsertRowid as number

      db.prepare(`
        INSERT INTO inbound_messages (thread_id, tenant_id, from_number, message_text, message_timestamp)
        VALUES (?, 2, 'tenant2@example.com', 'Tenant 2 message', datetime('now'))
      `).run(tenant2ThreadId)

      // Query for tenant 1 only
      const results = await listInboxThreads(db, 1, {})
      const resultIds = results.map(t => t.id)
      
      expect(resultIds).toContain(Number(tenant1ThreadId))
      expect(resultIds).not.toContain(Number(tenant2ThreadId))
    })
  })
})
