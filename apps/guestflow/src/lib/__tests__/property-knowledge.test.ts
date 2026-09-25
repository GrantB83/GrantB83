import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { ensureSprint2WhatsappSchema } from '@/lib/sprint2-schema'
import {
  formatKnowledgeForPrompt,
  listPropertyKnowledge,
  NO_FACT_OUTSIDE_KB_INSTRUCTION,
  upsertPropertyKnowledge,
} from '@/lib/property-knowledge'

const TEST_DB_PATH = path.join(__dirname, '../../../data/test-property-knowledge.db')

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

describe('property knowledge', () => {
  let sqlite: Database.Database
  let db: ReturnType<typeof createTestDbClient>

  beforeAll(async () => {
    const dir = path.dirname(TEST_DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
    sqlite = new Database(TEST_DB_PATH)
    db = createTestDbClient(sqlite)
    await ensureSprint2WhatsappSchema(db as any, 1)
  })

  afterAll(() => {
    sqlite.close()
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
  })

  it('seeds sourced check-in time and leaves restaurants as ask staff', async () => {
    const rows = await listPropertyKnowledge(db as any, 1)
    const checkIn = rows.find((row) => row.key === 'check_in_from')
    const restaurants = rows.find((row) => row.key === 'restaurants')
    expect(checkIn?.value).toBe('From 14:00')
    expect(restaurants?.value).toBe('ask staff')
  })

  it('upserts a staff edit and formats the prompt block', async () => {
    const result = await upsertPropertyKnowledge(db as any, 1, {
      property: 'shared',
      section: 'local_recommendations',
      key: 'restaurants',
      value: 'ask staff',
    })
    expect(result.success).toBe(true)
    const rows = await listPropertyKnowledge(db as any, 1)
    const block = formatKnowledgeForPrompt(rows)
    expect(block).toContain(NO_FACT_OUTSIDE_KB_INSTRUCTION)
    expect(block).toContain('restaurants')
    expect(block).not.toContain('The Magical Trout Bistro')
  })
})
