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
        code_type TEXT NOT NULL CHECK(code_type IN ('gate_pinpad', 'lockbox', 'wifi_network', 'wifi_password')),
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
    delete process.env.WIFI_NETWORK
    delete process.env.WIFI_PASSWORD
  })

  describe('getAccessCode', () => {
    it('returns {found:true, value:code} when DB row exists', async () => {
      // Insert test code (obviously fake pattern)
      db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value) 
         VALUES (?, ?, ?, ?, ?)`
      ).run(1, 'cottage', 'gate_pinpad', '', 'TEST_GATE_9876')

      const result = await getAccessCode(db, 1, 'cottage', 'gate_pinpad', '')
      
      expect(result.found).toBe(true)
      expect(result.value).toBe('TEST_GATE_9876')
    })

    it('returns {found:false, value:null} when NO DB row exists (for env fallback)', async () => {
      const result = await getAccessCode(db, 1, 'main-house', 'gate_pinpad', '')
      
      expect(result.found).toBe(false)
      expect(result.value).toBeNull()
    })

    it('returns {found:true, value:null} when DB row exists but code_value is empty', async () => {
      db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value) 
         VALUES (?, ?, ?, ?, ?)`
      ).run(1, 'cottage', 'gate_pinpad', '', '')

      const result = await getAccessCode(db, 1, 'cottage', 'gate_pinpad', '')
      
      // Empty string stored → found=true, value=null (will resolve to [ASK STAFF])
      expect(result.found).toBe(true)
      expect(result.value).toBeNull()
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

      const cottageResult = await getAccessCode(db, 1, 'cottage', 'gate_pinpad', '')
      const mainResult = await getAccessCode(db, 1, 'main-house', 'gate_pinpad', '')
      
      expect(cottageResult.found).toBe(true)
      expect(cottageResult.value).toBe('TEST_COTTAGE_1111')
      expect(mainResult.found).toBe(true)
      expect(mainResult.value).toBe('TEST_MAIN_2222')
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

      const suite1Result = await getAccessCode(db, 1, 'cottage', 'lockbox', 'Suite 1')
      const suite2Result = await getAccessCode(db, 1, 'cottage', 'lockbox', 'Suite 2')
      const suite3Result = await getAccessCode(db, 1, 'cottage', 'lockbox', 'Suite 3')
      
      expect(suite1Result.found).toBe(true)
      expect(suite1Result.value).toBe('TEST_LOCKBOX_S1_3333')
      expect(suite2Result.found).toBe(true)
      expect(suite2Result.value).toBe('TEST_LOCKBOX_S2_4444')
      expect(suite3Result.found).toBe(false)
      expect(suite3Result.value).toBeNull() // NO DB row for Suite 3
    })
  })

  describe('resolveAccessCodes', () => {
    it('DB row exists → returns DB code_value (ignores env)', async () => {
      db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value) 
         VALUES (?, ?, ?, ?, ?)`
      ).run(1, 'cottage', 'gate_pinpad', '', 'TEST_DB_GATE_5555')

      process.env.PROPERTY_GATE_CODE = 'TEST_ENV_GATE_6666'
      process.env.PROPERTY_DOOR_CODE = 'TEST_ENV_DOOR_6666'

      const codes = await resolveAccessCodes(db, 1, 'cottage')
      
      expect(codes.gateCode).toBe('TEST_DB_GATE_5555')
      // doorCode reads lockbox (suite=''), not gate_pinpad - no DB row so uses env
      expect(codes.doorCode).toBe('TEST_ENV_DOOR_6666')
      // Env var for gate should be ignored because DB row exists for gate_pinpad
    })

    it('DB row empty (found=true, value=null) → returns [ASK STAFF] (no env fallback)', async () => {
      // Insert gate with empty code_value
      db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value) 
         VALUES (?, ?, ?, ?, ?)`
      ).run(1, 'cottage', 'gate_pinpad', '', '')

      process.env.PROPERTY_GATE_CODE = 'TEST_ENV_SHOULD_NOT_USE'

      const codes = await resolveAccessCodes(db, 1, 'cottage')
      
      // DB row exists (even though empty) → use [ASK STAFF], NOT env
      expect(codes.gateCode).toBe(ACCESS_CODE_PLACEHOLDER)
      // doorCode still tries lockbox path (no row) → falls back to env
      expect(codes.doorCode).toBe(ACCESS_CODE_PLACEHOLDER) // No PROPERTY_DOOR_CODE set
    })

    it('NO DB row, env set → returns env value (fallback)', async () => {
      process.env.PROPERTY_GATE_CODE = 'TEST_ENV_GATE_7777'
      process.env.PROPERTY_DOOR_CODE = 'TEST_ENV_DOOR_8888'

      const codes = await resolveAccessCodes(db, 1, 'main-house')
      
      expect(codes.gateCode).toBe('TEST_ENV_GATE_7777')
      expect(codes.doorCode).toBe('TEST_ENV_DOOR_8888')
    })

    it('NO DB row, NO env → returns [ASK STAFF] (fail-closed)', async () => {
      const codes = await resolveAccessCodes(db, 1, 'cottage')
      
      expect(codes.gateCode).toBe(ACCESS_CODE_PLACEHOLDER)
      expect(codes.doorCode).toBe(ACCESS_CODE_PLACEHOLDER)
    })

    it('doorCode reads lockbox (suite=""), NOT gate_pinpad', async () => {
      // Insert gate code
      db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value) 
         VALUES (?, ?, ?, ?, ?)`
      ).run(1, 'cottage', 'gate_pinpad', '', 'TEST_GATE_9999')

      // Insert separate lockbox (suite='') for door
      db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value) 
         VALUES (?, ?, ?, ?, ?)`
      ).run(1, 'cottage', 'lockbox', '', 'TEST_DOOR_LOCK_1010')

      const codes = await resolveAccessCodes(db, 1, 'cottage')
      
      expect(codes.gateCode).toBe('TEST_GATE_9999')
      expect(codes.doorCode).toBe('TEST_DOOR_LOCK_1010')
      // doorCode should NOT duplicate gateCode
    })

    it('doorCode fallback: PROPERTY_DOOR_CODE only (no gate bleed)', async () => {
      // NO lockbox row for door
      process.env.PROPERTY_GATE_CODE = 'TEST_GATE_WRONG'
      process.env.PROPERTY_DOOR_CODE = 'TEST_DOOR_RIGHT'

      const codes = await resolveAccessCodes(db, 1, 'cottage')
      
      expect(codes.gateCode).toBe('TEST_GATE_WRONG')
      expect(codes.doorCode).toBe('TEST_DOOR_RIGHT')
      // doorCode should use PROPERTY_DOOR_CODE, NOT fall back to PROPERTY_GATE_CODE
    })

    it('Multiple properties → correct scoping (cottage with DB row uses DB, main-house without uses env)', async () => {
      // Cottage has DB row for gate
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

      const codeResult = await getAccessCode(db, 1, 'cottage', 'gate_pinpad', '')
      expect(codeResult.found).toBe(true)
      expect(codeResult.value).toBe('TEST_NEW_CODE_3333')

      const auditLogs = await getAuditLog(db, 1)
      expect(auditLogs.length).toBe(1)
      expect(auditLogs[0].property).toBe('cottage')
      expect(auditLogs[0].code_type).toBe('gate_pinpad')
      expect(auditLogs[0].changed_by).toBe('staff-alice')
    })

    it('updates existing code and logs update', async () => {
      await upsertAccessCode(db, 1, 'main-house', 'gate_pinpad', '', 'TEST_OLD_4444', 'staff-bob')
      await upsertAccessCode(db, 1, 'main-house', 'gate_pinpad', '', 'TEST_NEW_5555', 'staff-charlie')

      const codeResult = await getAccessCode(db, 1, 'main-house', 'gate_pinpad', '')
      expect(codeResult.found).toBe(true)
      expect(codeResult.value).toBe('TEST_NEW_5555')

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

      const codeResult = await getAccessCode(db, 1, 'cottage', 'gate_pinpad', '')
      expect(codeResult.found).toBe(true)
      expect(codeResult.value).toBe('TEST_TRIM_6666')
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

  describe('WiFi SoR Resolution', () => {
    it('returns DB WiFi when rows exist', async () => {
      // Insert WiFi credentials in DB
      await db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value, last_updated_at, last_updated_by)
         VALUES (?, ?, ?, ?, ?, datetime('now'), ?)`
      ).run(1, 'cottage', 'wifi_network', '', 'CottageTestNet', 'staff-1')

      await db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value, last_updated_at, last_updated_by)
         VALUES (?, ?, ?, ?, ?, datetime('now'), ?)`
      ).run(1, 'cottage', 'wifi_password', '', '[REDACTED]', 'staff-1')

      const result = await resolveAccessCodes(db, 1, 'cottage')

      expect(result.wifi.network).toBe('CottageTestNet')
      expect(result.wifi.password).toBe('[REDACTED]')
    })

    it('returns empty DB row as [ASK STAFF] (not env fallback)', async () => {
      // Insert empty WiFi password in DB
      await db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value, last_updated_at, last_updated_by)
         VALUES (?, ?, ?, ?, ?, datetime('now'), ?)`
      ).run(1, 'cottage', 'wifi_password', '', '', 'staff-1')

      // Set env var (should be ignored because DB row exists)
      process.env.WIFI_PASSWORD = 'EnvShouldBeIgnored'

      const result = await resolveAccessCodes(db, 1, 'cottage')

      // Empty DB row → [ASK STAFF], NOT env fallback
      expect(result.wifi.password).toBe(ACCESS_CODE_PLACEHOLDER)
    })

    it('returns env fallback when NO DB row exists', async () => {
      // NO DB row for WiFi
      // Set env vars
      process.env.WIFI_NETWORK = 'EnvFallbackNet'
      process.env.WIFI_PASSWORD = '[REDACTED]'

      const result = await resolveAccessCodes(db, 1, 'cottage')

      expect(result.wifi.network).toBe('EnvFallbackNet')
      expect(result.wifi.password).toBe('[REDACTED]')
    })

    it('returns [ASK STAFF] when both DB and env are empty', async () => {
      // NO DB row, NO env vars
      const result = await resolveAccessCodes(db, 1, 'cottage')

      expect(result.wifi.network).toBe(ACCESS_CODE_PLACEHOLDER)
      expect(result.wifi.password).toBe(ACCESS_CODE_PLACEHOLDER)
    })

    it('handles multiple properties independently', async () => {
      // Cottage has DB WiFi
      await db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value, last_updated_at, last_updated_by)
         VALUES (?, ?, ?, ?, ?, datetime('now'), ?)`
      ).run(1, 'cottage', 'wifi_network', '', 'CottageNet', 'staff-1')

      await db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value, last_updated_at, last_updated_by)
         VALUES (?, ?, ?, ?, ?, datetime('now'), ?)`
      ).run(1, 'cottage', 'wifi_password', '', '[REDACTED]', 'staff-1')

      // Main-house has NO DB WiFi, set env fallback
      process.env.WIFI_NETWORK = 'MainEnvNet'
      process.env.WIFI_PASSWORD = '[REDACTED]'

      const cottageResult = await resolveAccessCodes(db, 1, 'cottage')
      const mainResult = await resolveAccessCodes(db, 1, 'main-house')

      // Cottage uses DB (env ignored)
      expect(cottageResult.wifi.network).toBe('CottageNet')
      
      // Main-house uses env fallback (no DB row)
      expect(mainResult.wifi.network).toBe('MainEnvNet')
    })

    it('never prints plaintext passwords in test output', async () => {
      // All password fixtures use [REDACTED] or ****
      await db.prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value, last_updated_at, last_updated_by)
         VALUES (?, ?, ?, ?, ?, datetime('now'), ?)`
      ).run(1, 'cottage', 'wifi_password', '', '[REDACTED]', 'staff-1')

      const result = await resolveAccessCodes(db, 1, 'cottage')

      // Test output never contains real-looking passwords
      expect(result.wifi.password).toMatch(/\[REDACTED\]|\*\*\*\*|\[ASK STAFF\]/)
      
      // Verify no accidental plaintext leaks
      const resultStr = JSON.stringify(result)
      expect(resultStr).not.toMatch(/password123|secret|admin/i)
    })

    it('upserts WiFi credentials and creates audit log', async () => {
      const result = await upsertAccessCode(
        db, 1, 'cottage', 'wifi_password', '', '[REDACTED]', 'staff-wifi'
      )

      expect(result.success).toBe(true)

      // Verify audit log entry (metadata only, no password)
      const logs = await getAuditLog(db, 1)
      expect(logs.length).toBe(1)
      expect(logs[0].code_type).toBe('wifi_password')
      expect(logs[0].changed_by).toBe('staff-wifi')
      
      // Audit log must NOT contain plaintext password
      const logsStr = JSON.stringify(logs)
      expect(logsStr).not.toContain('[REDACTED]')
    })
  })
})
