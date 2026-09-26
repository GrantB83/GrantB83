import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { GRANT_APPROVED_TEMPLATES } from '@/lib/wa-templates-seed'
import {
  indexContentByFriendlyName,
  resolveContentForCatalogName,
  syncWaTemplatesFromTwilio,
  type TwilioSyncClient,
} from '@/lib/wa-templates-twilio-sync'
import { filterPickerTemplates, listWaTemplates } from '@/lib/wa-templates'

const TEST_DB_PATH = path.join(__dirname, '../../../data/test-wa-templates-sync.db')

const FIXTURE_CONTENTS = [
  {
    sid: 'HX69e7c1a0231e3abd37752b8483668ee9',
    friendly_name: 'browns_checkin_instructions_v2',
  },
  {
    sid: 'HXecc82bbed0dd8c68d464127b05bd3c2d',
    friendly_name: 'browns_checkin_instructions',
  },
  {
    sid: 'HXda3bdaf1370bbd827c74f41d3e241551',
    friendly_name: 'browns_pre_arrival_welcome',
  },
  {
    sid: 'HXc1d4f92bb4edcb51c136b7da2fea3c47',
    friendly_name: 'official_channel_notice',
  },
  {
    sid: 'HX8d62bbd3f290f08440370e9a3ff599da',
    friendly_name: 'browns_ops_smoke',
  },
]

function createTestDbClient(db: Database.Database) {
  return {
    prepare: (sql: string) => {
      const stmt = db.prepare(sql)
      return {
        run: (...params: unknown[]) => stmt.run(...params),
        get: (...params: unknown[]) => stmt.get(...params),
        all: (...params: unknown[]) => stmt.all(...params),
      }
    },
    exec: (sql: string) => db.exec(sql),
    batch: () => {},
    type: 'sqlite' as const,
  }
}

function mockClient(approvals: Record<string, string>): TwilioSyncClient {
  return {
    listAllContent: async () => FIXTURE_CONTENTS,
    fetchApproval: async (sid: string) => ({
      status: approvals[sid] || 'pending',
    }),
  }
}

describe('wa_templates Twilio sync', () => {
  let sqlite: Database.Database
  let db: ReturnType<typeof createTestDbClient>

  beforeAll(() => {
    const dir = path.dirname(TEST_DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
    sqlite = new Database(TEST_DB_PATH)
    db = createTestDbClient(sqlite)
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
        last_synced_at TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX idx_wa_templates_name ON wa_templates(tenant_id, name);
      CREATE TABLE property_knowledge (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL DEFAULT 1,
        property TEXT NOT NULL,
        section TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL DEFAULT 'ask staff',
        last_updated_at TEXT,
        last_updated_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX idx_property_knowledge_unique
        ON property_knowledge(tenant_id, property, section, key);
    `)
    for (const tpl of GRANT_APPROVED_TEMPLATES) {
      db.prepare(
        `INSERT INTO wa_templates (tenant_id, name, category, language, body, variable_mapping, content_sid, whatsapp_approval_status)
         VALUES (1, ?, ?, ?, ?, ?, NULL, 'pending')`
      ).run(
        tpl.name,
        tpl.category,
        tpl.language,
        tpl.body,
        JSON.stringify(tpl.variableMapping)
      )
    }
  })

  afterAll(() => {
    sqlite.close()
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
  })

  it('maps check-in catalogue row to approved v2 SID', () => {
    const byFriendly = indexContentByFriendlyName(FIXTURE_CONTENTS)
    const hit = resolveContentForCatalogName('browns_checkin_instructions', byFriendly)
    expect(hit?.sid).toBe('HX69e7c1a0231e3abd37752b8483668ee9')
  })

  it('sync updates approvals and seeds ops templates', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC_test'
    process.env.TWILIO_AUTH_TOKEN = 'test_token'
    const approvals: Record<string, string> = {
      HX69e7c1a0231e3abd37752b8483668ee9: 'approved',
      HXecc82bbed0dd8c68d464127b05bd3c2d: 'rejected',
      HXda3bdaf1370bbd827c74f41d3e241551: 'approved',
      HXc1d4f92bb4edcb51c136b7da2fea3c47: 'approved',
      HX8d62bbd3f290f08440370e9a3ff599da: 'approved',
    }
    const result = await syncWaTemplatesFromTwilio(db, 1, mockClient(approvals))
    expect(result.skipped).toBe(false)
    expect(result.updated).toBeGreaterThan(0)

    const rows = await listWaTemplates(db, 1, false)
    const checkin = rows.find((r) => r.name === 'browns_checkin_instructions')
    expect(checkin?.content_sid).toBe('HX69e7c1a0231e3abd37752b8483668ee9')
    expect(checkin?.whatsapp_approval_status).toBe('approved')

    const v1 = rows.find((r) => r.name === 'browns_checkin_instructions_v1_rejected')
    expect(v1?.content_sid).toBe('HXecc82bbed0dd8c68d464127b05bd3c2d')
    expect(v1?.whatsapp_approval_status).toBe('rejected')

    expect(rows.some((r) => r.name === 'official_channel_notice')).toBe(true)
    expect(rows.some((r) => r.name === 'browns_ops_smoke')).toBe(true)

    const picker = filterPickerTemplates(rows)
    expect(picker.some((r) => r.name === 'browns_checkin_instructions_v1_rejected')).toBe(false)
    expect(picker.some((r) => r.name === 'official_channel_notice')).toBe(true)
  })

  it('no-ops when Twilio content list fails', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC_test'
    process.env.TWILIO_AUTH_TOKEN = 'test_token'
    const failing: TwilioSyncClient = {
      listAllContent: async () => {
        throw new Error('content_list_503')
      },
      fetchApproval: async () => ({ status: 'approved' }),
    }
    const before = await listWaTemplates(db, 1, false)
    const checkinBefore = before.find((r) => r.name === 'browns_checkin_instructions')
    const result = await syncWaTemplatesFromTwilio(db, 1, failing)
    expect(result.skipped).toBe(true)
    expect(result.error).toBe('twilio_unreachable')
    const after = await listWaTemplates(db, 1, false)
    const checkinAfter = after.find((r) => r.name === 'browns_checkin_instructions')
    expect(checkinAfter?.last_synced_at).toBe(checkinBefore?.last_synced_at)
  })
})
