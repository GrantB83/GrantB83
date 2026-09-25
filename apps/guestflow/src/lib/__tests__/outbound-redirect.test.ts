import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import type { DbClient } from '@/lib/db'
import {
  ensureOutboundSettingsSchema,
  getOutboundStatus,
  isOutboundRedirectOn,
  parseOutboundRedirectOn,
  resolveOutboundRecipient,
  setOutboundRedirect,
} from '@/lib/outbound-redirect'
import { ensureStaffUsersSchema } from '@/lib/staff-users-schema'

const TEST_DB_PATH = path.join(__dirname, '../../../data/test-outbound-redirect.db')

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
  } as unknown as DbClient
}

function throwingDb(): DbClient {
  return {
    prepare: () => {
      throw new Error('db exploded')
    },
    exec: () => {
      throw new Error('db exploded')
    },
    batch: () => {
      throw new Error('db exploded')
    },
    type: 'sqlite',
  }
}

describe('Decision L outbound redirect', () => {
  let sqlite: Database.Database
  let db: ReturnType<typeof createTestDbClient>

  beforeAll(async () => {
    process.env.OUTBOUND_REDIRECT_TO_WA = '+15124064300'
    process.env.OUTBOUND_REDIRECT_TO_EMAIL = 'grant830318@gmail.com'
    delete process.env.OUTBOUND_MODE
    const dir = path.dirname(TEST_DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
    sqlite = new Database(TEST_DB_PATH)
    db = createTestDbClient(sqlite)
    await ensureStaffUsersSchema(db)
  })

  afterAll(() => {
    sqlite?.close()
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
  })

  beforeEach(async () => {
    sqlite.exec('DELETE FROM app_settings')
    sqlite.exec('DELETE FROM staff_user_audit')
    await ensureOutboundSettingsSchema(db)
  })

  it('ON resolves WhatsApp and email to sinks', async () => {
    await setOutboundRedirect(db, true, 'grant@thebrowns.co.za')
    const wa = await resolveOutboundRecipient({
      channel: 'whatsapp',
      intendedTo: '+27836458313',
      db,
    })
    const email = await resolveOutboundRecipient({
      channel: 'email',
      intendedTo: 'guest@example.com',
      db,
    })
    expect(wa).toMatchObject({
      to: '+15124064300',
      redirected: true,
      intendedTo: '+27836458313',
      mode: 'redirect',
    })
    expect(email).toMatchObject({
      to: 'grant830318@gmail.com',
      redirected: true,
      intendedTo: 'guest@example.com',
      mode: 'redirect',
    })
  })

  it('OFF resolves to the real recipients', async () => {
    await setOutboundRedirect(db, false, 'grant@thebrowns.co.za')
    const wa = await resolveOutboundRecipient({
      channel: 'whatsapp',
      intendedTo: '+27836458313',
      db,
    })
    expect(wa).toMatchObject({
      to: '+27836458313',
      redirected: false,
      mode: 'live',
    })
    const status = await getOutboundStatus(db)
    expect(status).toEqual({ mode: 'live', redirectStatus: 'off' })
  })

  it('missing row fails closed to ON', async () => {
    sqlite.exec('DELETE FROM app_settings')
    expect(await isOutboundRedirectOn(db)).toBe(true)
    const wa = await resolveOutboundRecipient({
      channel: 'whatsapp',
      intendedTo: '+27836458313',
      db,
    })
    expect(wa.redirected).toBe(true)
    expect(wa.to).toBe('+15124064300')
  })

  it('DB throw fails closed to ON', async () => {
    expect(await isOutboundRedirectOn(throwingDb())).toBe(true)
    const wa = await resolveOutboundRecipient({
      channel: 'whatsapp',
      intendedTo: '+27836458313',
      db: throwingDb(),
    })
    expect(wa.redirected).toBe(true)
    expect(wa.mode).toBe('redirect')
  })

  it('garbage value fails closed to ON', async () => {
    expect(parseOutboundRedirectOn('live')).toBe(true)
    expect(parseOutboundRedirectOn('redirect')).toBe(true)
    expect(parseOutboundRedirectOn('')).toBe(true)
    expect(parseOutboundRedirectOn('garbage')).toBe(true)
    expect(parseOutboundRedirectOn(null)).toBe(true)
    expect(parseOutboundRedirectOn('OFF')).toBe(false)
    sqlite.exec(`UPDATE app_settings SET value = 'nonsense' WHERE key = 'outbound_redirect'`)
    expect(await isOutboundRedirectOn(db)).toBe(true)
  })

  it('writes an audit row on each flip with actor, time, old and new', async () => {
    const first = await setOutboundRedirect(db, false, 'liana@thebrowns.co.za')
    expect(first).toEqual({ old: 'on', next: 'off' })
    const second = await setOutboundRedirect(db, true, 'liana@thebrowns.co.za')
    expect(second).toEqual({ old: 'off', next: 'on' })
    const rows = sqlite
      .prepare(`SELECT actor, action, target, created_at FROM staff_user_audit ORDER BY id`)
      .all() as Array<{ actor: string; action: string; target: string; created_at: string }>
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      actor: 'liana@thebrowns.co.za',
      action: 'outbound_redirect_flip',
      target: 'on->off',
    })
    expect(rows[1].target).toBe('off->on')
    expect(rows[0].created_at).toBeTruthy()
  })
})
