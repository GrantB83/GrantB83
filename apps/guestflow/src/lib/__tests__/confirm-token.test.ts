import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { consumeConfirmToken, isSendEligible, issueConfirmToken } from '@/lib/confirm-token'
import { ensurePhase0Schema } from '@/lib/phase0-schema'

const TEST_DB_PATH = path.join(__dirname, '../../../data/test-confirm-token.db')

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

describe('confirmToken issue/consume', () => {
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

  it('accepts approved/ready only', () => {
    expect(isSendEligible('approved', 'drafted')).toBe(true)
    expect(isSendEligible('drafted', 'ready')).toBe(true)
    expect(isSendEligible('drafted', 'drafted')).toBe(false)
  })

  it('issues a token, consumes once, rejects reuse', async () => {
    const issued = await issueConfirmToken(db, { threadId: 7, tenantId: 1 })
    expect(issued.confirmToken).toBeTruthy()
    const first = await consumeConfirmToken(db, { threadId: 7, confirmToken: issued.confirmToken })
    expect(first.ok).toBe(true)
    const second = await consumeConfirmToken(db, { threadId: 7, confirmToken: issued.confirmToken })
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.error).toContain('confirmToken')
  })
})
