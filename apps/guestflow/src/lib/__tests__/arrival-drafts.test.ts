import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { ensurePhase0Schema } from '../phase0-schema'
import { ensureUmiSchema } from '../umi-schema'
import { listInboxThreads } from '../umi-threads'
import {
  dueStagesForCheckIn,
  refreshArrivalDraftCodesAtSend,
  runArrivalDraftsJob,
  sastHour,
  stageDueDate,
} from '../arrival-drafts'
import { sastDateString } from '../umi-sort'
import { CODES_UNRESOLVED_REASON } from '../booking-filters'
import { CODE_MISSING_PLACEHOLDER, NO_CONTACT_REASON } from '../arrival-drafts-config'
import { ACCESS_CODES_BLOCK_START } from '../arrival-drafts-config'

const T3_NOW = new Date('2026-09-24T04:00:00.000Z') // 06:00 SAST 24 Sep
const BEFORE_HOUR = new Date('2026-09-23T22:00:00.000Z') // 00:00 SAST 24 Sep
const T1_NOW = new Date('2026-09-26T04:00:00.000Z') // 06:00 SAST 26 Sep
const DAY_OF_NOW = new Date('2026-09-27T04:00:00.000Z') // 06:00 SAST 27 Sep
const DAY_OF_08 = new Date('2026-09-27T06:00:00.000Z') // 08:00 SAST 27 Sep

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

function seed(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE tenants (id INTEGER PRIMARY KEY, name TEXT);
    INSERT INTO tenants (id, name) VALUES (1, 'Browns');
    CREATE TABLE bookings (
      id INTEGER PRIMARY KEY,
      tenant_id INTEGER,
      guest_name TEXT,
      guest_phone TEXT,
      guest_email TEXT,
      check_in DATE,
      check_out DATE,
      suite_or_unit TEXT,
      room_number TEXT,
      nightsbridge_booking_id TEXT,
      status TEXT DEFAULT 'confirmed'
    );
    CREATE TABLE inbound_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      source TEXT NOT NULL,
      from_number TEXT NOT NULL,
      guest_name TEXT,
      status TEXT DEFAULT 'new',
      first_message_at DATETIME,
      last_message_at DATETIME,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE inbound_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER NOT NULL,
      tenant_id INTEGER NOT NULL,
      direction TEXT DEFAULT 'inbound',
      from_number TEXT NOT NULL,
      message_text TEXT NOT NULL,
      message_timestamp DATETIME NOT NULL,
      external_message_id TEXT,
      draft_reply TEXT,
      draft_source TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE property_access_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      property TEXT NOT NULL,
      code_type TEXT NOT NULL,
      suite TEXT NOT NULL DEFAULT '',
      code_value TEXT NOT NULL
    );
    CREATE TABLE guest_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      revoked INTEGER DEFAULT 0
    );
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
  `)
}

function insertBooking(
  sqlite: Database.Database,
  row: {
    id: number
    name?: string
    phone?: string | null
    email?: string | null
    checkIn?: string
    checkOut?: string
    suite?: string
    status?: string
  }
) {
  sqlite
    .prepare(
      `INSERT INTO bookings (id, tenant_id, guest_name, guest_phone, guest_email, check_in, check_out, suite_or_unit, status)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      row.id,
      row.name ?? 'Ada Booker',
      row.phone === undefined ? '+27821234567' : row.phone,
      row.email ?? null,
      row.checkIn ?? '2026-09-27',
      row.checkOut ?? '2026-09-29',
      row.suite ?? 'Falcon',
      row.status ?? 'confirmed'
    )
}

function insertApprovedWaTemplate(
  sqlite: Database.Database,
  name: string,
  contentSid = 'HX_TEST_ONLY'
) {
  sqlite
    .prepare(
      `INSERT INTO wa_templates (
         tenant_id, name, category, language, body, variable_mapping,
         content_sid, whatsapp_approval_status
       ) VALUES (1, ?, 'utility', 'en', 'seed body', '{}', ?, 'approved')`
    )
    .run(name, contentSid)
}

function seedLockbox(sqlite: Database.Database, suite = 'Falcon', property = 'cottage', lock = 'TEST_LOCK_A') {
  sqlite
    .prepare(
      `INSERT INTO property_access_codes (tenant_id, property, code_type, suite, code_value)
       VALUES (1, ?, 'lockbox', ?, ?)`
    )
    .run(property, suite, lock)
  sqlite
    .prepare(
      `INSERT INTO property_access_codes (tenant_id, property, code_type, suite, code_value)
       VALUES (1, ?, 'gate_pinpad', '', 'TEST_GATE_A')`
    )
    .run(property)
}

describe('arrival draft timing', () => {
  it('maps 4a gate plus calendar stages from stay dates', () => {
    expect(stageDueDate('2026-09-27', -7)).toBe('2026-09-20')
    expect(dueStagesForCheckIn('2026-09-27', '2026-09-24', '2026-09-29', 6)).toEqual([
      '4a_email',
      '4a_wa',
    ])
    expect(dueStagesForCheckIn('2026-09-27', '2026-09-27', '2026-09-29', 8)).toEqual([
      '4a_email',
      '4a_wa',
      '4c',
    ])
    expect(dueStagesForCheckIn('2026-09-27', '2026-09-20', '2026-09-29', 8)).toEqual([
      '4a_email',
      '4a_wa',
      '4b',
    ])
  })

  it('uses Johannesburg midnight, not UTC date', () => {
    expect(sastDateString(BEFORE_HOUR)).toBe('2026-09-24')
    expect(sastHour(BEFORE_HOUR)).toBe(0)
    expect(sastDateString(T3_NOW)).toBe('2026-09-24')
    expect(sastHour(T3_NOW)).toBe(6)
    expect(sastDateString(new Date('2026-09-23T21:59:00.000Z'))).toBe('2026-09-23')
  })
})

describe('runArrivalDraftsJob', () => {
  let sqlite: Database.Database
  let db: ReturnType<typeof wrapDb>

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = wrapDb(sqlite)
    seed(sqlite)
    await ensurePhase0Schema(db)
    await ensureUmiSchema(db)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('no-ops before the configured Johannesburg run hour', async () => {
    insertBooking(sqlite, { id: 1 })
    const result = await runArrivalDraftsJob(db, { now: BEFORE_HOUR })
    expect(result.skipped).toBe('before_run_hour')
    expect(sqlite.prepare('SELECT COUNT(*) as c FROM arrival_drafts').get() as { c: number }).toEqual({
      c: 0,
    })
  })

  it('creates 4a gate drafts and is idempotent; 4c waits for 08:00 SAST', async () => {
    insertBooking(sqlite, { id: 10, checkIn: '2026-09-27', suite: 'Falcon' })
    insertBooking(sqlite, { id: 11, checkIn: '2026-09-27', name: 'Bea', phone: '+27820000011' })
    seedLockbox(sqlite)

    const first = await runArrivalDraftsJob(db, { now: T3_NOW })
    expect(first.created).toBe(2)
    const second = await runArrivalDraftsJob(db, { now: T3_NOW })
    expect(second.created).toBe(0)

    const dayTooEarly = await runArrivalDraftsJob(db, { now: DAY_OF_NOW })
    expect(dayTooEarly.created).toBe(0)
    const day = await runArrivalDraftsJob(db, { now: DAY_OF_08 })
    expect(day.created).toBe(2)

    const stages = sqlite
      .prepare('SELECT booking_id, stage FROM arrival_drafts ORDER BY booking_id, stage')
      .all() as Array<{ booking_id: number; stage: string }>
    expect(new Set(stages.map((row) => `${row.booking_id}:${row.stage}`)).size).toBe(4)

    const gate = sqlite
      .prepare(`SELECT draft_body, stage_label FROM arrival_drafts WHERE booking_id = 10 AND stage = '4a_wa'`)
      .get() as { draft_body: string; stage_label: string }
    expect(gate.stage_label).toBe('Gate WA')
    expect(gate.draft_body).toMatch(/official WhatsApp/i)
    expect(gate.draft_body).toMatch(/\+27600200825/)
  })

  it('skips cancelled and BLOCK; late bookings only get stages still due', async () => {
    insertBooking(sqlite, { id: 1, name: 'Live', checkIn: '2026-09-27' })
    insertBooking(sqlite, { id: 2, name: 'Gone', checkIn: '2026-09-27', status: 'cancelled' })
    insertBooking(sqlite, { id: 3, name: 'BLOCK', checkIn: '2026-09-27' })
    const result = await runArrivalDraftsJob(db, { now: T3_NOW })
    expect(result.created).toBe(1)
    const rows = sqlite.prepare('SELECT booking_id FROM arrival_drafts').all() as Array<{ booking_id: number }>
    expect(rows.map((row) => row.booking_id)).toEqual([1])

    const late = await runArrivalDraftsJob(db, { now: T1_NOW })
    expect(late.created).toBe(0)
    const stages = sqlite
      .prepare('SELECT stage FROM arrival_drafts WHERE booking_id = 1 ORDER BY stage')
      .all() as Array<{ stage: string }>
    expect(stages.map((row) => row.stage)).toEqual(['4a_wa'])
  })

  it('still writes 4a when the booking first appears mid-horizon', async () => {
    insertBooking(sqlite, { id: 5, checkIn: '2026-09-27' })
    const result = await runArrivalDraftsJob(db, { now: T1_NOW })
    expect(result.created).toBe(1)
    const stages = sqlite.prepare('SELECT stage FROM arrival_drafts').all() as Array<{ stage: string }>
    expect(stages).toEqual([{ stage: '4a_wa' }])
  })

  it('discards unsent drafts when the booking is cancelled', async () => {
    insertBooking(sqlite, { id: 8, checkIn: '2026-09-27' })
    await runArrivalDraftsJob(db, { now: T3_NOW })
    sqlite.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = 8`).run()
    const result = await runArrivalDraftsJob(db, { now: T3_NOW })
    expect(result.discarded).toBe(1)
    const row = sqlite.prepare('SELECT status, draft_body FROM arrival_drafts WHERE booking_id = 8').get() as {
      status: string
      draft_body: string | null
    }
    expect(row.status).toBe('discarded')
    expect(row.draft_body).toBeNull()
  })

  it('regenerates unsent drafts when dates or suite change', async () => {
    insertBooking(sqlite, { id: 9, checkIn: '2026-09-27', suite: 'Falcon' })
    await runArrivalDraftsJob(db, { now: T3_NOW })
    sqlite.prepare(`UPDATE bookings SET suite_or_unit = 'Trout' WHERE id = 9`).run()
    const result = await runArrivalDraftsJob(db, { now: T3_NOW })
    expect(result.updated).toBe(1)
    const row = sqlite.prepare(`SELECT draft_body, fingerprint FROM arrival_drafts WHERE booking_id = 9`).get() as {
      draft_body: string
      fingerprint: string
    }
    expect(row.draft_body).toMatch(/official WhatsApp/)
    expect(row.fingerprint).toContain('Trout')
  })

  it('creates a no-contact Needs-attention item and no guest draft', async () => {
    insertBooking(sqlite, { id: 12, phone: null, email: null, checkIn: '2026-09-27' })
    const result = await runArrivalDraftsJob(db, { now: T3_NOW })
    expect(result.noContact).toBe(1)
    const row = sqlite.prepare('SELECT * FROM arrival_drafts WHERE booking_id = 12').get() as {
      draft_body: string | null
      attention_reason: string
      status: string
      thread_id: number
    }
    expect(row.draft_body).toBeNull()
    expect(row.attention_reason).toBe(NO_CONTACT_REASON)
    expect(row.status).toBe('needs_attention')
    const inbox = await listInboxThreads(db, 1)
    expect(inbox[0].needsAttention).toBe(true)
    expect(inbox[0].attentionReason).toBe(NO_CONTACT_REASON)
    expect(inbox[0].hasOpenDraft).toBe(false)
  })

  it('does not invent codes in 4c drafts when lockbox property is unresolved', async () => {
    insertBooking(sqlite, { id: 13, checkIn: '2026-09-27', suite: 'Unknown Suite' })
    const result = await runArrivalDraftsJob(db, { now: DAY_OF_08 })
    expect(result.unresolvedCodes).toBeGreaterThan(0)
    const row = sqlite.prepare(`SELECT draft_body, attention_reason, status FROM arrival_drafts WHERE stage = '4c'`).get() as {
      draft_body: string
      attention_reason: string | null
      status: string
    }
    expect(['needs_attention', 'template_pending_approval']).toContain(row.status)
    expect(row.attention_reason).toBe(CODES_UNRESOLVED_REASON)
    expect(row.draft_body).toMatch(/portal/)
    expect(row.draft_body).not.toContain(ACCESS_CODES_BLOCK_START)
    expect(row.draft_body).not.toContain(CODE_MISSING_PLACEHOLDER)
    expect(row.draft_body).not.toMatch(/\b\d{4,6}\b/)
  })

  it('re-reads leftover T-1 lockbox snapshots at Approve&Send', async () => {
    insertBooking(sqlite, { id: 14, checkIn: '2026-09-27', suite: 'Falcon' })
    seedLockbox(sqlite, 'Falcon', 'cottage', 'TEST_LOCK_A')
    await runArrivalDraftsJob(db, { now: T3_NOW })
    const thread = sqlite.prepare(`SELECT thread_id FROM arrival_drafts WHERE booking_id = 14`).get() as {
      thread_id: number
    }
    sqlite
      .prepare(
        `INSERT INTO arrival_drafts (
           tenant_id, booking_id, stage, stage_label, status, thread_id, draft_body
         ) VALUES (1, 14, 't-1', 'T-1', 'drafted', ?, '--- access-codes:start ---
Gate: x
Lockbox: TEST_LOCK_A
--- access-codes:end ---')`
      )
      .run(thread.thread_id)
    const drafted = sqlite.prepare(`SELECT thread_id, draft_body FROM arrival_drafts WHERE stage = 't-1'`).get() as {
      thread_id: number
      draft_body: string
    }
    sqlite.prepare(`UPDATE property_access_codes SET code_value = 'TEST_LOCK_B' WHERE suite = 'Falcon'`).run()
    const refreshed = await refreshArrivalDraftCodesAtSend(db, {
      threadId: drafted.thread_id,
      body: drafted.draft_body,
    })
    expect(refreshed.refreshed).toBe(true)
    expect(refreshed.body).toContain('TEST_LOCK_B')
    expect(refreshed.body).not.toContain('TEST_LOCK_A')
  })

  it('marks template pending approval when the WhatsApp window is closed and ContentSid is missing', async () => {
    insertBooking(sqlite, { id: 15, checkIn: '2026-09-27' })
    const result = await runArrivalDraftsJob(db, { now: T3_NOW })
    expect(result.created).toBe(1)
    const row = sqlite.prepare('SELECT status, attention_reason, window_state FROM arrival_drafts').get() as {
      status: string
      attention_reason: string
      window_state: string
    }
    expect(row.window_state).toBe('closed')
    expect(row.status).toBe('template_pending_approval')
    expect(row.attention_reason).toBe('template pending approval')
  })

  it('stays drafted when wa_templates marks the stage template WhatsApp-approved (#218)', async () => {
    insertApprovedWaTemplate(sqlite, 'official_channel_notice')
    insertBooking(sqlite, { id: 16, checkIn: '2026-09-27', suite: 'Falcon' })
    await runArrivalDraftsJob(db, { now: T3_NOW })
    const row = sqlite.prepare(`SELECT status, draft_body FROM arrival_drafts WHERE stage = '4a_wa'`).get() as {
      status: string
      draft_body: string
    }
    expect(row.status).toBe('drafted')
    expect(row.draft_body).toMatch(/Hi Ada/)
  })

  it('uses email when there is no phone', async () => {
    insertBooking(sqlite, { id: 17, phone: null, email: 'ada@thebrowns.co.za', checkIn: '2026-09-27' })
    await runArrivalDraftsJob(db, { now: T3_NOW })
    const row = sqlite.prepare(`SELECT channel FROM arrival_drafts WHERE stage = '4a_email'`).get() as {
      channel: string
    }
    expect(row.channel).toBe('email')
  })

  it('sets Inbox Needs attention and stage label for an open arrival draft', async () => {
    insertBooking(sqlite, { id: 18, checkIn: '2026-09-27', suite: 'Falcon' })
    await runArrivalDraftsJob(db, { now: T3_NOW })
    const inbox = await listInboxThreads(db, 1)
    expect(inbox[0].needsAttention).toBe(true)
    expect(inbox[0].arrivalStage).toBe('Gate WA')
    expect(inbox[0].hasOpenDraft).toBe(true)
  })
})
