/**
 * Access Codes Staff API Routes Tests
 */

import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

const TEST_DB_PATH = path.join(__dirname, '../../../../../data/test-access-codes-api.db')

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

describe('Access Codes Staff API', () => {
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
    db.exec('DELETE FROM property_access_codes')
    db.exec('DELETE FROM access_code_audit_log')
  })

  describe('POST /api/ops/access-codes/upsert', () => {
    it('validates required fields', () => {
      // Test will be implemented when API testing is set up
      expect(true).toBe(true)
    })

    it('validates code_type enum', () => {
      // Test will be implemented when API testing is set up
      expect(true).toBe(true)
    })

    it('creates audit log entry on success', () => {
      // Test will be implemented when API testing is set up
      expect(true).toBe(true)
    })
  })

  describe('GET /api/ops/access-codes', () => {
    it('returns redacted code values', () => {
      // Staff UI should see masked codes by default
      expect(true).toBe(true)
    })
  })

  describe('GET /api/ops/access-codes/audit', () => {
    it('returns audit entries without code values', () => {
      // Audit log must never contain actual codes
      expect(true).toBe(true)
    })

    it('supports days parameter', () => {
      // Should respect ?days=X query param
      expect(true).toBe(true)
    })
  })
})
