import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fillTemplateVariables } from '@/lib/wa-templates'
import { GRANT_APPROVED_TEMPLATES } from '@/lib/wa-templates-seed'
import { ACCESS_CODE_PLACEHOLDER } from '@/lib/access-codes-schema'

const TEST_DB_PATH = path.join(__dirname, '../../../data/test-wa-template-fill.db')

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

describe('template variable fill from lockbox property', () => {
  let sqlite: Database.Database
  let db: ReturnType<typeof createTestDbClient>

  beforeAll(() => {
    const dir = path.dirname(TEST_DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
    sqlite = new Database(TEST_DB_PATH)
    db = createTestDbClient(sqlite)
    db.exec(`
      CREATE TABLE property_access_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL DEFAULT 1,
        property TEXT NOT NULL,
        code_type TEXT NOT NULL,
        suite TEXT NOT NULL DEFAULT '',
        code_value TEXT NOT NULL,
        last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_updated_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    db.exec(`
      CREATE UNIQUE INDEX idx_property_access_codes_unique
      ON property_access_codes(tenant_id, property, code_type, suite)
    `)
    db.exec(`
      CREATE TABLE wa_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL DEFAULT 1,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'en',
        body TEXT NOT NULL,
        variable_mapping TEXT NOT NULL DEFAULT '{}',
        content_sid TEXT,
        approval_status TEXT NOT NULL DEFAULT 'approved_by_grant_unsubmitted',
        whatsapp_approval_status TEXT NOT NULL DEFAULT 'unsubmitted',
        last_synced_at TEXT
      )
    `)
  })

  afterAll(() => {
    sqlite.close()
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
  })

  beforeEach(() => {
    db.exec('DELETE FROM property_access_codes')
  })

  it('uses lockbox.property even when the suite name contains cottage', async () => {
    db.prepare(
      `INSERT INTO property_access_codes (tenant_id, property, code_type, suite, code_value)
       VALUES (1, 'main-house', 'lockbox', 'Cottage View', 'MAINBOX'),
              (1, 'main-house', 'gate_pinpad', '', 'MAINGATE'),
              (1, 'cottage', 'gate_pinpad', '', 'COTTAGEGATE')`
    ).run()

    const seed = GRANT_APPROVED_TEMPLATES.find((item) => item.name === 'browns_access_codes')!
    const fill = await fillTemplateVariables(db as any, 1, {
      id: 1,
      tenant_id: 1,
      name: seed.name,
      category: seed.category,
      language: seed.language,
      body: seed.body,
      variable_mapping: JSON.stringify(seed.variableMapping),
      content_sid: null,
      approval_status: 'approved_by_grant_unsubmitted',
      whatsapp_approval_status: 'unsubmitted',
      last_synced_at: null,
    }, {
      guestName: 'Alex',
      suite: 'Cottage View',
    })

    expect(fill.propertyResolved).toBe(true)
    expect(fill.property).toBe('main-house')
    expect(fill.variables['4']).toBe('MAINGATE')
    expect(fill.variables['4']).not.toBe('COTTAGEGATE')
  })

  it('includes no codes when lockbox property is missing', async () => {
    const seed = GRANT_APPROVED_TEMPLATES.find((item) => item.name === 'browns_access_codes')!
    const fill = await fillTemplateVariables(db as any, 1, {
      id: 1,
      tenant_id: 1,
      name: seed.name,
      category: seed.category,
      language: seed.language,
      body: seed.body,
      variable_mapping: JSON.stringify(seed.variableMapping),
      content_sid: null,
      approval_status: 'approved_by_grant_unsubmitted',
      whatsapp_approval_status: 'unsubmitted',
      last_synced_at: null,
    }, {
      guestName: 'Alex',
      suite: 'Falcon',
    })

    expect(fill.propertyResolved).toBe(false)
    expect(fill.codesIncluded).toBe(false)
    expect(fill.variables['4']).toBe(ACCESS_CODE_PLACEHOLDER)
    expect(fill.variables['5']).toBe(ACCESS_CODE_PLACEHOLDER)
  })
})
