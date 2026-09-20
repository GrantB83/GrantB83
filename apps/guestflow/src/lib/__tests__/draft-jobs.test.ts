import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { enqueueDraftJob } from '@/lib/draft-jobs'
import { ensurePhase0Schema } from '@/lib/phase0-schema'

const TEST_DB_PATH = path.join(__dirname, '../../../data/test-draft-jobs.db')

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

describe('draft_jobs enqueue', () => {
  let sqlite: Database.Database
  let db: ReturnType<typeof createTestDbClient>

  beforeAll(async () => {
    const dir = path.dirname(TEST_DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
    sqlite = new Database(TEST_DB_PATH)
    db = createTestDbClient(sqlite)
    await ensurePhase0Schema(db)
  })

  afterAll(() => {
    sqlite.close()
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
  })

  it('enqueues pending and skips duplicate in-flight jobs', async () => {
    const first = await enqueueDraftJob(db, {
      tenantId: 1,
      threadId: 9,
      messageId: 44,
      intent: 'general_question',
    })
    const second = await enqueueDraftJob(db, {
      tenantId: 1,
      threadId: 9,
      messageId: 44,
      intent: 'general_question',
    })
    expect(first?.existing).toBe(false)
    expect(second?.existing).toBe(true)
    expect(second?.job.id).toBe(first?.job.id)
    expect(first?.job.status).toBe('pending')
  })
})
