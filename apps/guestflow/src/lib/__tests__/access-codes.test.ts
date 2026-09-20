/**
 * Access Codes Resolution Logic Tests
 *
 * Tests DB-first with env fallback, fail-closed to [ASK STAFF].
 * Never use real-looking codes in tests - use obvious test patterns.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import {
  getAccessCode,
  resolveAccessCodes,
  upsertAccessCode,
  getAuditLog,
  getAllAccessCodes,
} from '@/lib/access-codes'
import { ACCESS_CODE_PLACEHOLDER } from '@/lib/access-codes-schema'

const TEST_DB_PATH = path.join(__dirname, '../../../data/test-access-codes.db')

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

describe('Access Codes Resolution Logic', () => {
  let sqlite: Database.Database
  let db: ReturnType<typeof createTestDbClient>

  beforeAll(async () => {
    const dir = path.dirname(TEST_DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
    sqlite = new Database(TEST_DB_PATH)
    db = createTestDbClient(sqlite)

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS property_access_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL DEFAULT 1,
        property TEXT NOT NULL,
        code_type TEXT NOT NULL CHECK(code_type IN ('gate_pinpad', 'lockbox')),
        suite TEXT NOT NULL DEFAULT '',
        code_value TEXT NOT NULL,
        last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_updated_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_property_access_codes_unique
      ON property_access_codes(tenant_id, property, code_type, suite)
    `)
    db.exec(`
      CREATE TABLE IF NOT EXISTS access_code_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL DEFAULT 1,
        property TEXT NOT NULL,
        code_type TEXT NOT NULL,
        suite TEXT NOT NULL DEFAULT '',
        action TEXT NOT NULL CHECK(action IN ('create', 'update')),
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        changed_by TEXT,
        notes TEXT
      )
    `)
  })

  afterAll(() => {
    sqlite.close()
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
  })

  beforeEach(() => {
    // Clear tables between tests
    db.exec('DELETE FROM property_access_codes')
    db.exec('DELETE FROM access_code_audit_log')
    
    // Clear env vars
    delete process.env.PROPERTY_GATE_CODE
    delete process.env.PROPERTY_DOOR_CODE
  })

  describe('getAccessCode', () => {
    it('returns DB code value when DB row exists', async () => {
      // Insert test code (obviously fake pattern)
      db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value) 
         VALUES (?, ?, ?, ?, ?)`
      ).run(1, 'cottage', 'gate_pinpad', '', 'TEST_GATE_9876')

      const code = await getAccessCode(db, 1, 'cottage', 'gate_pinpad', '')
      
      expect(code).toBe('TEST_GATE_9876')
    })

    it('returns null when NO DB row exists (for env fallback)', async () => {
      const code = await getAccessCode(db, 1, 'main-house', 'gate_pinpad', '')
      
      expect(code).toBeNull()
    })

    it('returns empty code_value when DB row exists but code is empty', async () => {
      db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value) 
         VALUES (?, ?, ?, ?, ?)`
      ).run(1, 'cottage', 'gate_pinpad', '', '')

      const code = await getAccessCode(db, 1, 'cottage', 'gate_pinpad', '')
      
      // Empty string is stored, so return null for fail-closed behavior
      expect(code).toBeNull()
    })

    it('scopes correctly by property (cottage vs main-house)', async () => {
      db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value) 
         VALUES (?, ?, ?, ?, ?)`
      ).run(1, 'cottage', 'gate_pinpad', '', 'TEST_COTTAGE_1111')
      
      db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value) 
         VALUES (?, ?, ?, ?, ?)`
      ).run(1, 'main-house', 'gate_pinpad', '', 'TEST_MAIN_2222')

      const cottageCode = await getAccessCode(db, 1, 'cottage', 'gate_pinpad', '')
      const mainCode = await getAccessCode(db, 1, 'main-house', 'gate_pinpad', '')
      
      expect(cottageCode).toBe('TEST_COTTAGE_1111')
      expect(mainCode).toBe('TEST_MAIN_2222')
    })

    it('scopes correctly by suite for lockboxes', async () => {
      db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value) 
         VALUES (?, ?, ?, ?, ?)`
      ).run(1, 'cottage', 'lockbox', 'Suite 1', 'TEST_LOCKBOX_S1_3333')
      
      db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value) 
         VALUES (?, ?, ?, ?, ?)`
      ).run(1, 'cottage', 'lockbox', 'Suite 2', 'TEST_LOCKBOX_S2_4444')

      const suite1Code = await getAccessCode(db, 1, 'cottage', 'lockbox', 'Suite 1')
      const suite2Code = await getAccessCode(db, 1, 'cottage', 'lockbox', 'Suite 2')
      const suite3Code = await getAccessCode(db, 1, 'cottage', 'lockbox', 'Suite 3')
      
      expect(suite1Code).toBe('TEST_LOCKBOX_S1_3333')
      expect(suite2Code).toBe('TEST_LOCKBOX_S2_4444')
      expect(suite3Code).toBeNull() // NO DB row for Suite 3
    })
  })

  describe('resolveAccessCodes', () => {
    it('DB row exists → returns DB code_value (ignores env)', async () => {
      db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value) 
         VALUES (?, ?, ?, ?, ?)`
      ).run(1, 'cottage', 'gate_pinpad', '', 'TEST_DB_CODE_5555')

      process.env.PROPERTY_GATE_CODE = 'TEST_ENV_CODE_6666'

      const codes = await resolveAccessCodes(db, 1, 'cottage')
      
      expect(codes.gateCode).toBe('TEST_DB_CODE_5555')
      expect(codes.doorCode).toBe('TEST_DB_CODE_5555')
      // Env var should be ignored because DB row exists
    })

    it('NO DB row, env set → returns env value (fallback)', async () => {
      process.env.PROPERTY_GATE_CODE = 'TEST_ENV_FALLBACK_7777'

      const codes = await resolveAccessCodes(db, 1, 'main-house')
      
      expect(codes.gateCode).toBe('TEST_ENV_FALLBACK_7777')
      expect(codes.doorCode).toBe('TEST_ENV_FALLBACK_7777')
    })

    it('NO DB row, NO env → returns [ASK STAFF] (fail-closed)', async () => {
      const codes = await resolveAccessCodes(db, 1, 'cottage')
      
      expect(codes.gateCode).toBe(ACCESS_CODE_PLACEHOLDER)
      expect(codes.doorCode).toBe(ACCESS_CODE_PLACEHOLDER)
    })

    it('Multiple properties → correct scoping (cottage with DB row uses DB, main-house without uses env)', async () => {
      // Cottage has DB row
      db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value) 
         VALUES (?, ?, ?, ?, ?)`
      ).run(1, 'cottage', 'gate_pinpad', '', 'TEST_COTTAGE_DB_8888')

      // Main-house has NO DB row, will use env
      process.env.PROPERTY_GATE_CODE = 'TEST_GLOBAL_ENV_9999'

      const cottageCodes = await resolveAccessCodes(db, 1, 'cottage')
      const mainCodes = await resolveAccessCodes(db, 1, 'main-house')
      
      expect(cottageCodes.gateCode).toBe('TEST_COTTAGE_DB_8888')
      expect(mainCodes.gateCode).toBe('TEST_GLOBAL_ENV_9999')
      // NO cross-property bleed: cottage uses DB, main-house uses env
    })

    it('Suite-specific lockbox code included when suite provided', async () => {
      db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value) 
         VALUES (?, ?, ?, ?, ?)`
      ).run(1, 'cottage', 'lockbox', 'Suite A', 'TEST_LOCKBOX_A_1010')

      process.env.PROPERTY_GATE_CODE = 'TEST_GATE_1111'

      const codes = await resolveAccessCodes(db, 1, 'cottage', 'Suite A')
      
      expect(codes.gateCode).toBe('TEST_GATE_1111')
      expect(codes.lockboxCode).toBe('TEST_LOCKBOX_A_1010')
    })

    it('Suite lockbox not found → [ASK STAFF] (no env fallback for lockboxes)', async () => {
      process.env.PROPERTY_GATE_CODE = 'TEST_GATE_2222'

      const codes = await resolveAccessCodes(db, 1, 'cottage', 'Suite Z')
      
      expect(codes.lockboxCode).toBe(ACCESS_CODE_PLACEHOLDER)
    })

    it('Redaction: test fixtures never contain real-looking codes', async () => {
      // All test codes use TEST_ prefix - never use patterns like 1234, 5678 alone
      db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value) 
         VALUES (?, ?, ?, ?, ?)`
      ).run(1, 'cottage', 'gate_pinpad', '', 'TEST_OBVIOUS_FAKE')

      const codes = await resolveAccessCodes(db, 1, 'cottage')
      
      expect(codes.gateCode).toContain('TEST_')
      expect(codes.gateCode).not.toMatch(/^\d{4}$/) // Never 4 digits alone
    })
  })

  describe('upsertAccessCode', () => {
    it('inserts new code and creates audit log entry', async () => {
      const result = await upsertAccessCode(
        db,
        1,
        'cottage',
        'gate_pinpad',
        '',
        'TEST_NEW_CODE_3333',
        'staff-alice'
      )

      expect(result.success).toBe(true)
      expect(result.updated_at).toBeTruthy()

      const code = await getAccessCode(db, 1, 'cottage', 'gate_pinpad', '')
      expect(code).toBe('TEST_NEW_CODE_3333')

      const auditLogs = await getAuditLog(db, 1)
      expect(auditLogs.length).toBe(1)
      expect(auditLogs[0].property).toBe('cottage')
      expect(auditLogs[0].code_type).toBe('gate_pinpad')
      expect(auditLogs[0].changed_by).toBe('staff-alice')
    })

    it('updates existing code and logs update', async () => {
      await upsertAccessCode(db, 1, 'main-house', 'gate_pinpad', '', 'TEST_OLD_4444', 'staff-bob')
      await upsertAccessCode(db, 1, 'main-house', 'gate_pinpad', '', 'TEST_NEW_5555', 'staff-charlie')

      const code = await getAccessCode(db, 1, 'main-house', 'gate_pinpad', '')
      expect(code).toBe('TEST_NEW_5555')

      const auditLogs = await getAuditLog(db, 1)
      expect(auditLogs.length).toBe(2)
    })

    it('rejects empty code', async () => {
      const result = await upsertAccessCode(db, 1, 'cottage', 'gate_pinpad', '', '', 'staff-dan')

      expect(result.success).toBe(false)
      expect(result.error).toContain('empty')
    })

    it('trims whitespace from code value', async () => {
      await upsertAccessCode(db, 1, 'cottage', 'gate_pinpad', '', '  TEST_TRIM_6666  ', 'staff-eve')

      const code = await getAccessCode(db, 1, 'cottage', 'gate_pinpad', '')
      expect(code).toBe('TEST_TRIM_6666')
    })
  })

  describe('getAuditLog', () => {
    it('returns audit entries metadata only (no code values)', async () => {
      await upsertAccessCode(db, 1, 'cottage', 'gate_pinpad', '', 'TEST_SECRET_7777', 'staff-frank')

      const logs = await getAuditLog(db, 1)

      expect(logs.length).toBe(1)
      expect(logs[0].property).toBe('cottage')
      expect(logs[0].code_type).toBe('gate_pinpad')
      expect(logs[0].changed_by).toBe('staff-frank')
      // Audit log should NOT contain code value
      expect(JSON.stringify(logs)).not.toContain('TEST_SECRET_7777')
    })

    it('orders by changed_at DESC (most recent first)', async () => {
      await upsertAccessCode(db, 1, 'cottage', 'gate_pinpad', '', 'TEST_FIRST', 'staff-a')
      await new Promise(resolve => setTimeout(resolve, 10)) // Small delay
      await upsertAccessCode(db, 1, 'main-house', 'gate_pinpad', '', 'TEST_SECOND', 'staff-b')

      const logs = await getAuditLog(db, 1)

      expect(logs.length).toBe(2)
      expect(logs[0].changed_by).toBe('staff-b') // Most recent first
      expect(logs[1].changed_by).toBe('staff-a')
    })
  })

  describe('getAllAccessCodes', () => {
    it('returns all codes grouped by property and type', async () => {
      await upsertAccessCode(db, 1, 'cottage', 'gate_pinpad', '', 'TEST_C_GATE', 'staff-1')
      await upsertAccessCode(db, 1, 'cottage', 'lockbox', 'Suite 1', 'TEST_C_LOCK', 'staff-1')
      await upsertAccessCode(db, 1, 'main-house', 'gate_pinpad', '', 'TEST_M_GATE', 'staff-1')

      const codes = await getAllAccessCodes(db, 1)

      expect(codes.length).toBe(3)
      expect(codes[0].property).toBe('cottage')
      expect(codes[1].property).toBe('cottage')
      expect(codes[2].property).toBe('main-house')
    })
  })
})
