import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import {
  isWithinBatchWindow,
  getTodayBatchCount,
  isWorkerInFlight,
  claimPendingJobs,
  generateDraftWithCursorUltra,
  runBatch,
  type BatchWorkerConfig
} from '../src/lib/batch-worker'
import { enqueueDraftJob } from '../src/lib/draft-jobs'
import { ensurePhase0Schema } from '../src/lib/phase0-schema'

const TEST_DB_PATH = path.join(__dirname, '../data/test-batch-worker.db')

function createTestDbClient(db: Database.Database) {
  return {
    prepare: (sql: string) => {
      const stmt = db.prepare(sql)
      return {
        run: (...params: any[]) => stmt.run(...params),
        get: (...params: any[]) => stmt.get(...params),
        all: (...params: any[]) => stmt.all(...params),
      }
    },
    exec: (sql: string) => db.exec(sql),
    batch: () => {},
    type: 'sqlite' as const,
  }
}

describe('Phase 1 Batch Worker (Cursor Ultra)', () => {
  let sqlite: Database.Database
  let db: ReturnType<typeof createTestDbClient>

  beforeAll(async () => {
    const dir = path.dirname(TEST_DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
    sqlite = new Database(TEST_DB_PATH)
    db = createTestDbClient(sqlite)
    
    // Create full schema (Phase 0 only includes new tables, not all existing tables)
    db.exec(`
      CREATE TABLE IF NOT EXISTS inbound_threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL DEFAULT 1,
        source TEXT NOT NULL,
        from_number TEXT NOT NULL,
        status TEXT DEFAULT 'new',
        intent TEXT,
        confidence REAL,
        guest_name TEXT,
        metadata TEXT,
        first_message_at DATETIME,
        last_message_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS inbound_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id INTEGER NOT NULL,
        tenant_id INTEGER NOT NULL DEFAULT 1,
        direction TEXT NOT NULL,
        from_number TEXT NOT NULL,
        message_text TEXT NOT NULL,
        media_refs TEXT,
        message_timestamp DATETIME NOT NULL,
        external_message_id TEXT,
        is_classified INTEGER DEFAULT 0,
        classification_result TEXT,
        draft_reply TEXT,
        draft_source TEXT DEFAULT 'heuristic',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (thread_id) REFERENCES inbound_threads(id)
      );

      CREATE TABLE IF NOT EXISTS message_classifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER NOT NULL,
        thread_id INTEGER NOT NULL,
        intent TEXT NOT NULL,
        confidence REAL NOT NULL,
        extracted_data TEXT,
        missing_fields TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES inbound_messages(id),
        FOREIGN KEY (thread_id) REFERENCES inbound_threads(id)
      );
    `)
    
    await ensurePhase0Schema(db)
  })

  afterAll(() => {
    sqlite.close()
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
  })

  describe('isWithinBatchWindow', () => {
    it('returns boolean for current time', () => {
      const result = isWithinBatchWindow()
      expect(typeof result).toBe('boolean')
      // Actual result depends on current SAST time, so we just check type
    })
  })

  describe('generateDraftWithCursorUltra', () => {
    it('fails closed with instructions when not run by Cursor Ultra CA', async () => {
      const context = {
        fromNumber: '+27821234567',
        messageText: 'Hello, I have a question',
        guestName: 'Test Guest',
        intent: 'general_question',
        confidence: 0.8
      }

      const config: BatchWorkerConfig = {
        guestflowApiUrl: 'https://test.example.com',
        draftWorkerSecret: 'test-secret',
        dryRun: false
      }

      await expect(generateDraftWithCursorUltra(context, config)).rejects.toThrow(
        /Cursor Ultra Cloud Agent/
      )
    })

    it('returns placeholder in dry-run mode', async () => {
      const context = {
        fromNumber: '+27821234567',
        messageText: 'Hello, I have a question',
        guestName: 'Test Guest',
        intent: 'general_question',
        confidence: 0.8
      }

      const config: BatchWorkerConfig = {
        guestflowApiUrl: 'https://test.example.com',
        draftWorkerSecret: 'test-secret',
        dryRun: true
      }

      const result = await generateDraftWithCursorUltra(context, config)
      expect(result).toContain('[DRY RUN]')
      expect(result).toContain('Hello, I have a question')
    })
  })

  describe('draft_jobs enqueue and claim with Cursor Ultra', () => {
    it('enqueues a draft_job for general_question intent', async () => {
      // Clean slate for this test
      db.exec(`DELETE FROM draft_jobs`)
      db.exec(`DELETE FROM inbound_messages`)
      db.exec(`DELETE FROM inbound_threads`)

      const threadRes = await db
        .prepare(
          `INSERT INTO inbound_threads (tenant_id, source, from_number, status, first_message_at, last_message_at)
           VALUES (1, 'twilio_whatsapp', '+27821234567', 'new', datetime('now'), datetime('now'))`
        )
        .run()
      const threadId = Number(threadRes.lastInsertRowid)

      const msgRes = await db
        .prepare(
          `INSERT INTO inbound_messages (thread_id, tenant_id, direction, from_number, message_text, message_timestamp)
           VALUES (?, 1, 'inbound', '+27821234567', 'Hello, I have a question', datetime('now'))`
        )
        .run(threadId)
      const messageId = Number(msgRes.lastInsertRowid)

      // Enqueue draft_job
      const result = await enqueueDraftJob(db, {
        tenantId: 1,
        threadId,
        messageId,
        intent: 'general_question'
      })

      expect(result).toBeTruthy()
      expect(result?.job.status).toBe('pending')
      expect(result?.job.intent).toBe('general_question')
      expect(result?.existing).toBe(false)
    })

    it('does not enqueue duplicate pending jobs for same message', async () => {
      // Clean slate for this test
      db.exec(`DELETE FROM draft_jobs`)
      db.exec(`DELETE FROM inbound_messages`)
      db.exec(`DELETE FROM inbound_threads`)

      const threadRes = await db
        .prepare(
          `INSERT INTO inbound_threads (tenant_id, source, from_number, status, first_message_at, last_message_at)
           VALUES (1, 'twilio_whatsapp', '+27821234567', 'new', datetime('now'), datetime('now'))`
        )
        .run()
      const threadId = Number(threadRes.lastInsertRowid)

      const msgRes = await db
        .prepare(
          `INSERT INTO inbound_messages (thread_id, tenant_id, direction, from_number, message_text, message_timestamp)
           VALUES (?, 1, 'inbound', '+27821234567', 'Hello, I have a question', datetime('now'))`
        )
        .run(threadId)
      const messageId = Number(msgRes.lastInsertRowid)

      // Enqueue first time
      const first = await enqueueDraftJob(db, {
        tenantId: 1,
        threadId,
        messageId,
        intent: 'general_question'
      })

      // Enqueue second time - should return existing
      const second = await enqueueDraftJob(db, {
        tenantId: 1,
        threadId,
        messageId,
        intent: 'general_question'
      })

      expect(first?.existing).toBe(false)
      expect(second?.existing).toBe(true)
      expect(second?.job.id).toBe(first?.job.id)
    })

    it('claims pending jobs when ≥5 exist', async () => {
      // Clean slate for this test
      db.exec(`DELETE FROM draft_jobs`)
      db.exec(`DELETE FROM inbound_messages`)
      db.exec(`DELETE FROM inbound_threads`)

      const threadRes = await db
        .prepare(
          `INSERT INTO inbound_threads (tenant_id, source, from_number, status, first_message_at, last_message_at)
           VALUES (1, 'twilio_whatsapp', '+27821234567', 'new', datetime('now'), datetime('now'))`
        )
        .run()
      const threadId = Number(threadRes.lastInsertRowid)

      // Insert 5 messages and enqueue jobs
      for (let i = 0; i < 5; i++) {
        const msgRes = await db
          .prepare(
            `INSERT INTO inbound_messages (thread_id, tenant_id, direction, from_number, message_text, message_timestamp)
             VALUES (?, 1, 'inbound', '+27821234567', 'Message ${i}', datetime('now'))`
          )
          .run(threadId)
        const messageId = Number(msgRes.lastInsertRowid)

        await enqueueDraftJob(db, {
          tenantId: 1,
          threadId,
          messageId,
          intent: 'general_question'
        })
      }

      // Claim jobs
      const claimed = await claimPendingJobs(db, 5)

      expect(claimed.length).toBe(5)
      expect(claimed.every((j) => j.intent === 'general_question')).toBe(true)

      // Verify status updated
      const updated = (await db
        .prepare(`SELECT * FROM draft_jobs WHERE status = 'claimed'`)
        .all()) as any[]
      expect(updated.length).toBe(5)
    })

    it('does not claim jobs when fewer than minJobs exist', async () => {
      // Clean slate for this test
      db.exec(`DELETE FROM draft_jobs`)
      db.exec(`DELETE FROM inbound_messages`)
      db.exec(`DELETE FROM inbound_threads`)

      const threadRes = await db
        .prepare(
          `INSERT INTO inbound_threads (tenant_id, source, from_number, status, first_message_at, last_message_at)
           VALUES (1, 'twilio_whatsapp', '+27821234567', 'new', datetime('now'), datetime('now'))`
        )
        .run()
      const threadId = Number(threadRes.lastInsertRowid)

      // Insert only 3 messages and enqueue jobs
      for (let i = 0; i < 3; i++) {
        const msgRes = await db
          .prepare(
            `INSERT INTO inbound_messages (thread_id, tenant_id, direction, from_number, message_text, message_timestamp)
             VALUES (?, 1, 'inbound', '+27821234567', 'Message ${i}', datetime('now'))`
          )
          .run(threadId)
        const messageId = Number(msgRes.lastInsertRowid)

        await enqueueDraftJob(db, {
          tenantId: 1,
          threadId,
          messageId,
          intent: 'general_question'
        })
      }

      // Try to claim with minJobs=5
      const claimed = await claimPendingJobs(db, 5)

      expect(claimed.length).toBe(0)

      // Verify no status updated
      const updated = (await db
        .prepare(`SELECT * FROM draft_jobs WHERE status = 'claimed'`)
        .all()) as any[]
      expect(updated.length).toBe(0)
    })
  })

  describe('runBatch with test draft generator', () => {
    it('processes jobs with provided draft generator in dry-run', async () => {
      // Clean slate
      db.exec(`DELETE FROM draft_jobs`)
      db.exec(`DELETE FROM inbound_messages`)
      db.exec(`DELETE FROM inbound_threads`)

      const threadRes = await db
        .prepare(
          `INSERT INTO inbound_threads (tenant_id, source, from_number, status, first_message_at, last_message_at)
           VALUES (1, 'twilio_whatsapp', '+27821234567', 'new', datetime('now'), datetime('now'))`
        )
        .run()
      const threadId = Number(threadRes.lastInsertRowid)

      // Insert 5 messages and enqueue jobs
      for (let i = 0; i < 5; i++) {
        const msgRes = await db
          .prepare(
            `INSERT INTO inbound_messages (thread_id, tenant_id, direction, from_number, message_text, message_timestamp)
             VALUES (?, 1, 'inbound', '+27821234567', 'Message ${i}', datetime('now'))`
          )
          .run(threadId)
        const messageId = Number(msgRes.lastInsertRowid)

        await enqueueDraftJob(db, {
          tenantId: 1,
          threadId,
          messageId,
          intent: 'general_question'
        })
      }

      // Mock draft generator for testing
      const testDraftGenerator = async (context: any, config: BatchWorkerConfig) => {
        return `[TEST DRAFT] Reply to: ${context.messageText}`
      }

      const config: BatchWorkerConfig = {
        guestflowApiUrl: 'https://test.example.com',
        draftWorkerSecret: 'test-secret',
        dryRun: true  // Dry-run so no actual upsert
      }

      const result = await runBatch(db, config, testDraftGenerator)

      // In dry-run, should claim and process but not actually upsert
      expect(result.jobsClaimed).toBeGreaterThan(0)
      expect(result.jobsProcessed).toBe(result.jobsClaimed)
    })
  })

  describe('getTodayBatchCount', () => {
    it('returns 0 when no batches run today', async () => {
      // Clean slate
      db.exec(`DELETE FROM draft_jobs`)
      const count = await getTodayBatchCount(db)
      expect(count).toBe(0)
    })
  })

  describe('isWorkerInFlight', () => {
    it('returns false when no claimed jobs exist', async () => {
      // Clean slate
      db.exec(`DELETE FROM draft_jobs`)
      const inFlight = await isWorkerInFlight(db)
      expect(inFlight).toBe(false)
    })
  })
})
