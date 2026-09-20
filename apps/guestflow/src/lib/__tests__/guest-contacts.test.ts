import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { computeRetentionDeleteAfter, upsertGuestContact } from '@/lib/guest-contacts'
import { ensurePhase0Schema } from '@/lib/phase0-schema'

const TEST_DB_PATH = path.join(__dirname, '../../../data/test-guest-contacts.db')

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

describe('guest_contacts upsert', () => {
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

  it('upserts phone+email and computes 5-year delete-after', async () => {
    const row = await upsertGuestContact(db, {
      tenantId: 1,
      phone: '0821234567',
      email: 'sam@example.com',
      displayName: 'Sam Guest',
      lastStayAt: '2026-09-20',
      lastSuite: 'Riverside',
      source: 'nb',
      nbid: 'NB-1',
    })
    expect(row?.normalized_phone).toBe('+27821234567')
    expect(row?.email).toBe('sam@example.com')
    expect(row?.retention_years).toBe(5)
    expect(row?.retention_delete_after).toBe(computeRetentionDeleteAfter('2026-09-20'))
  })

  it('does not invent a phone for name-only rows', async () => {
    const row = await upsertGuestContact(db, {
      tenantId: 1,
      displayName: 'No Phone Guest',
      lastStayAt: '2026-09-01',
      lastSuite: 'Mountain',
      source: 'nb',
    })
    expect(row?.normalized_phone).toBeNull()
    expect(row?.display_name).toBe('No Phone Guest')
  })

  it('updates the same phone instead of duplicating', async () => {
    await upsertGuestContact(db, {
      tenantId: 1,
      phone: '+27829990000',
      displayName: 'First',
      source: 'nb',
    })
    const second = await upsertGuestContact(db, {
      tenantId: 1,
      phone: '0829990000',
      displayName: 'Second',
      lastSuite: 'Cottage',
      source: 'nb',
    })
    const count = sqlite
      .prepare(`SELECT COUNT(*) as c FROM guest_contacts WHERE normalized_phone = '+27829990000'`)
      .get() as { c: number }
    expect(count.c).toBe(1)
    expect(second?.display_name).toBe('Second')
    expect(second?.last_suite).toBe('Cottage')
  })
})
