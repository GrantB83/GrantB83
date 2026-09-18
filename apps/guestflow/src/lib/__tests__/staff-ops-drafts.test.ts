import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import {
  enqueueStaffOpsDraft,
  ensureStaffOpsDraftsTable,
  approveStaffOpsDraft,
  rejectStaffOpsDraft,
  staffOpsDraftsTableExists,
  STAFF_OPS_DRAFTS_DDL,
} from '../staff-ops-drafts'
import { resolveStaffOpsEnqueueGate } from '../daily-brief-enqueue'

const TEST_DB_PATH = path.join(__dirname, '../../data/test-staff-ops-drafts.db')

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

describe('staff_ops_drafts', () => {
  let sqlite: Database.Database
  let db: ReturnType<typeof createTestDbClient>

  beforeAll(() => {
    const dbDir = path.dirname(TEST_DB_PATH)
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
    sqlite = new Database(TEST_DB_PATH)
    sqlite.exec(`CREATE TABLE tenants (id INTEGER PRIMARY KEY, name TEXT NOT NULL)`)
    sqlite.prepare('INSERT INTO tenants (id, name) VALUES (?, ?)').run(1, 'Browns Dullstroom')
    db = createTestDbClient(sqlite)
  })

  afterAll(() => {
    sqlite.close()
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
  })

  it('creates staff_ops_drafts table via ensure', async () => {
    expect(await staffOpsDraftsTableExists(db)).toBe(false)
    await ensureStaffOpsDraftsTable(db)
    expect(await staffOpsDraftsTableExists(db)).toBe(true)
  })

  it('enqueues idempotently per tenant+date', async () => {
    sqlite.exec(STAFF_OPS_DRAFTS_DDL)
    const first = await enqueueStaffOpsDraft(db, {
      tenantId: 1,
      briefDate: '2026-09-18',
      draftContent: 'Brief line 1',
      actor: 'Staff',
    })
    expect(first.existing).toBe(false)
    expect(first.status).toBe('pending_approval')

    const second = await enqueueStaffOpsDraft(db, {
      tenantId: 1,
      briefDate: '2026-09-18',
      draftContent: 'Brief line 1',
    })
    expect(second.existing).toBe(true)
    expect(second.draftId).toBe(first.draftId)
  })

  it('force updates pending draft content', async () => {
    const result = await enqueueStaffOpsDraft(db, {
      tenantId: 1,
      briefDate: '2026-09-19',
      draftContent: 'Updated brief',
      force: true,
    })
    expect(result.existing).toBe(false)
    const row = sqlite
      .prepare('SELECT draft_content FROM staff_ops_drafts WHERE id = ?')
      .get(result.draftId) as { draft_content: string }
    expect(row.draft_content).toBe('Updated brief')
  })

  it('approve returns copy content without send semantics', async () => {
    const pending = await enqueueStaffOpsDraft(db, {
      tenantId: 1,
      briefDate: '2026-09-20',
      draftContent: 'Copy me',
    })
    const approved = await approveStaffOpsDraft(db, pending.draftId, 'Grant')
    expect(approved?.copyContent).toBe('Copy me')
    expect(approved?.status).toBe('approved')
  })

  it('reject removes pending status', async () => {
    const pending = await enqueueStaffOpsDraft(db, {
      tenantId: 1,
      briefDate: '2026-09-21',
      draftContent: 'Reject me',
    })
    const ok = await rejectStaffOpsDraft(db, pending.draftId, 'Grant')
    expect(ok).toBe(true)
    const row = sqlite
      .prepare('SELECT status FROM staff_ops_drafts WHERE id = ?')
      .get(pending.draftId) as { status: string }
    expect(row.status).toBe('rejected')
  })
})

describe('resolveStaffOpsEnqueueGate', () => {
  let sqlite: Database.Database
  let db: ReturnType<typeof createTestDbClient>

  beforeAll(() => {
    const gateDbPath = path.join(__dirname, '../../data/test-staff-ops-gate.db')
    const dbDir = path.dirname(gateDbPath)
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
    if (fs.existsSync(gateDbPath)) fs.unlinkSync(gateDbPath)
    sqlite = new Database(gateDbPath)
    db = createTestDbClient(sqlite)
  })

  afterAll(() => {
    sqlite.close()
  })

  it('reports supported after table ensure', async () => {
    await ensureStaffOpsDraftsTable(db)
    const gate = await resolveStaffOpsEnqueueGate(db)
    expect(gate.enqueueSupported).toBe(true)
    expect(gate.enqueueBlocker).toBeNull()
    expect(gate.approvalQueuePath).toBe('/needs-approval')
  })
})
