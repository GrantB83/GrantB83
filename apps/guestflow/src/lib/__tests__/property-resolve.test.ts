import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import {
  CODES_UNRESOLVED_REASON,
  resolveAccessCodesForSuite,
  resolvePropertyForSuite,
} from '../property-resolve'
import {
  LOCKBOX_MISMATCH_COTTAGE_NAME_MAIN_HOUSE,
  LOCKBOX_SOR_SUITES,
} from './lockbox-sor-suites.fixture'

function wrapDb(sqlite: Database.Database) {
  return {
    prepare: (sql: string) => {
      const stmt = sqlite.prepare(sql)
      return {
        run: (...params: unknown[]) => stmt.run(...params),
        get: (...params: unknown[]) => stmt.get(...params),
        all: (...params: unknown[]) => stmt.all(...params),
      }
    },
    exec: (sql: string) => sqlite.exec(sql),
    batch: () => {},
    type: 'sqlite' as const,
  }
}

function seedLockbox(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE property_access_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      property TEXT NOT NULL,
      code_type TEXT NOT NULL,
      suite TEXT NOT NULL DEFAULT '',
      code_value TEXT NOT NULL
    );
  `)
  const insert = sqlite.prepare(
    `INSERT INTO property_access_codes (tenant_id, property, code_type, suite, code_value)
     VALUES (1, ?, 'lockbox', ?, ?)`
  )
  for (const row of LOCKBOX_SOR_SUITES) {
    insert.run(row.property, row.suite, `TEST_LOCK_${row.suite.replace(/\s+/g, '_')}`)
  }
  insert.run(
    LOCKBOX_MISMATCH_COTTAGE_NAME_MAIN_HOUSE.property,
    LOCKBOX_MISMATCH_COTTAGE_NAME_MAIN_HOUSE.suite,
    'TEST_LOCK_MISMATCH'
  )
  sqlite
    .prepare(
      `INSERT INTO property_access_codes (tenant_id, property, code_type, suite, code_value)
       VALUES (1, 'cottage', 'gate_pinpad', '', 'TEST_GATE_COTTAGE')`
    )
    .run()
  sqlite
    .prepare(
      `INSERT INTO property_access_codes (tenant_id, property, code_type, suite, code_value)
       VALUES (1, 'main-house', 'gate_pinpad', '', 'TEST_GATE_MAIN')`
    )
    .run()
}

describe('resolvePropertyForSuite / resolveAccessCodesForSuite', () => {
  let sqlite: Database.Database
  let db: ReturnType<typeof wrapDb>

  beforeEach(() => {
    sqlite = new Database(':memory:')
    db = wrapDb(sqlite)
    seedLockbox(sqlite)
  })

  afterEach(() => sqlite.close())

  it('resolves every live SoR fixture suite to its lockbox property', async () => {
    for (const row of LOCKBOX_SOR_SUITES) {
      const key = await resolvePropertyForSuite(db, 1, row.suite)
      expect(key, row.suite).toBe(row.property)
      const codes = await resolveAccessCodesForSuite(db, 1, row.suite)
      expect(codes.ok, row.suite).toBe(true)
      if (codes.ok) {
        expect(codes.property).toBe(row.property)
        expect(codes.codes.gateCode).toBe(
          row.property === 'cottage' ? 'TEST_GATE_COTTAGE' : 'TEST_GATE_MAIN'
        )
      }
    }
  })

  it('resolves a prefixed NightsBridge suite name via suiteMatches, not property guess', async () => {
    const key = await resolvePropertyForSuite(db, 1, 'Cottage Suites - Falcon')
    expect(key).toBe('cottage')
  })

  it('returns Main House codes when the suite name contains cottage but lockbox property is main-house', async () => {
    const suite = LOCKBOX_MISMATCH_COTTAGE_NAME_MAIN_HOUSE.suite
    expect(suite.toLowerCase()).toContain('cottage')
    const key = await resolvePropertyForSuite(db, 1, suite)
    expect(key).toBe('main-house')
    const codes = await resolveAccessCodesForSuite(db, 1, suite)
    expect(codes.ok).toBe(true)
    if (codes.ok) {
      expect(codes.property).toBe('main-house')
      expect(codes.codes.gateCode).toBe('TEST_GATE_MAIN')
    }
  })

  it('fails closed when the lockbox row is missing', async () => {
    const key = await resolvePropertyForSuite(db, 1, 'No Such Suite')
    expect(key).toBeNull()
    const codes = await resolveAccessCodesForSuite(db, 1, 'No Such Suite')
    expect(codes).toEqual({
      ok: false,
      property: null,
      codes: null,
      reason: CODES_UNRESOLVED_REASON,
    })
  })

  it('fails closed when lockbox rows for the same suite disagree on property', async () => {
    sqlite
      .prepare(
        `INSERT INTO property_access_codes (tenant_id, property, code_type, suite, code_value)
         VALUES (1, 'cottage', 'lockbox', 'Ambiguous Suite', 'TEST_A')`
      )
      .run()
    sqlite
      .prepare(
        `INSERT INTO property_access_codes (tenant_id, property, code_type, suite, code_value)
         VALUES (1, 'main-house', 'lockbox', 'Ambiguous Suite', 'TEST_B')`
      )
      .run()
    expect(await resolvePropertyForSuite(db, 1, 'Ambiguous Suite')).toBeNull()
  })

  it('fails closed when suite is blank', async () => {
    expect(await resolvePropertyForSuite(db, 1, '')).toBeNull()
    expect(await resolvePropertyForSuite(db, 1, null)).toBeNull()
  })
})
