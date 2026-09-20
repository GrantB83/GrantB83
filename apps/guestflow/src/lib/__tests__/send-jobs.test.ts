import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import {
  claimJob,
  completeJob,
  createQueuedJob,
  ensureSendJobsTable,
  getJob,
  listJobs,
} from '@/lib/send-jobs'

const TEST_DB_PATH = path.join(__dirname, '../../data/test-send-jobs.db')

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
    exec: (sql: string) => {
      db.exec(sql)
    },
    batch: () => {},
    type: 'sqlite' as const,
  }
}

describe('send_jobs', () => {
  let sqlite: Database.Database
  let db: ReturnType<typeof createTestDbClient>

  beforeAll(async () => {
    const dbDir = path.dirname(TEST_DB_PATH)
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
    sqlite = new Database(TEST_DB_PATH)
    db = createTestDbClient(sqlite)
    await ensureSendJobsTable(db)
  })

  afterAll(() => {
    sqlite.close()
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
  })

  it('creates a queued job and does not treat it as sent', async () => {
    const job = await createQueuedJob(db, {
      channel: 'whatsapp_web',
      threadId: 12,
      toAddress: '+27821234567',
      bodyText: 'Hi Sam,\n\nSee you Friday.',
    })
    expect(job.status).toBe('queued')
    expect(job.status).not.toBe('sent')
    const listed = await listJobs(db, 'queued', 10)
    expect(listed.some((row) => row.id === job.id)).toBe(true)
  })

  it('claims then completes as sent only via completeJob', async () => {
    const job = await createQueuedJob(db, {
      channel: 'whatsapp_web',
      threadId: 13,
      toAddress: '+27820000000',
      bodyText: 'One bubble',
    })
    const claimed = await claimJob(db, job.id)
    expect(claimed?.status).toBe('claimed')
    expect(claimed?.claim_token).toBeTruthy()

    await expect(claimJob(db, job.id)).rejects.toThrow(/not queued/)

    const sent = await completeJob(db, job.id, 'sent')
    expect(sent?.status).toBe('sent')
    expect((await getJob(db, job.id))?.status).toBe('sent')
  })

  it('completes blocked for QR / Aw Snap without looking like success', async () => {
    const job = await createQueuedJob(db, {
      channel: 'whatsapp_web',
      threadId: 14,
      toAddress: '+27821111111',
      bodyText: 'Blocked path',
    })
    const blocked = await completeJob(db, job.id, 'blocked', 'qr_required')
    expect(blocked?.status).toBe('blocked')
    expect(blocked?.error_code).toBe('qr_required')
    expect(blocked?.status).not.toBe('sent')
  })
})
