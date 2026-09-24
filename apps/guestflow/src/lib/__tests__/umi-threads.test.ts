import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { ingestInboundMessage } from '@/lib/inbound-ingest'
import { applyTempHygiene, linkTempToBooking, listInboxThreads, markThreadOutbound } from '@/lib/umi-threads'
import { ensureUmiSchema } from '@/lib/umi-schema'
import { ensurePhase0Schema } from '@/lib/phase0-schema'

function createDb() {
  const sqlite = new Database(':memory:')
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
      nightsbridge_booking_id TEXT,
      status TEXT DEFAULT 'confirmed'
    );
    CREATE TABLE inbound_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      source TEXT NOT NULL,
      from_number TEXT NOT NULL,
      guest_name TEXT,
      intent TEXT,
      confidence REAL,
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
      media_refs TEXT,
      message_timestamp DATETIME NOT NULL,
      external_message_id TEXT,
      is_classified INTEGER DEFAULT 0,
      classification_result TEXT,
      draft_reply TEXT,
      draft_source TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  const db = {
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
  return { sqlite, db }
}

describe('umi threads', () => {
  let sqlite: Database.Database
  let db: ReturnType<typeof createDb>['db']

  beforeEach(async () => {
    const created = createDb()
    sqlite = created.sqlite
    db = created.db
    await ensurePhase0Schema(db)
    await ensureUmiSchema(db)
    sqlite
      .prepare(
        `INSERT INTO bookings (id, tenant_id, guest_name, guest_phone, check_in, check_out, suite_or_unit, nightsbridge_booking_id)
         VALUES (10, 1, 'Ada Booker', '+27821234567', '2026-09-25', '2026-09-27', 'Trout', 'NB-10')`
      )
      .run()
    sqlite
      .prepare(
        `INSERT INTO bookings (id, tenant_id, guest_name, guest_phone, check_in, check_out, suite_or_unit)
         VALUES (11, 1, 'Ada Booker', '+27821234567', '2026-07-01', '2026-07-03', 'Falcon')`
      )
      .run()
  })

  afterEach(() => sqlite.close())

  it('puts a unique current booker inbound on the booking thread', async () => {
    const result = await ingestInboundMessage(db, 1, {
      from: '+27821234567',
      text: 'What time is check-in tomorrow?',
      timestamp: '2026-09-24T12:00:00.000Z',
      source: 'twilio_whatsapp',
      externalMessageId: 'cloud-1',
    })
    expect(result.duplicate).toBeUndefined()
    expect(result.spam).toBe(false)
    expect(result.draftReply?.text).toBeTruthy()
    const thread = sqlite.prepare('SELECT * FROM inbound_threads WHERE id = ?').get(result.threadId) as any
    expect(thread.thread_kind).toBe('booking')
    expect(thread.booking_id).toBe(10)
  })

  it('creates a temp thread for an unknown number', async () => {
    const result = await ingestInboundMessage(db, 1, {
      from: '+27829990000',
      text: 'Do you have space next month?',
      timestamp: '2026-09-24T12:00:00.000Z',
      source: 'twilio_sms',
    })
    const thread = sqlite.prepare('SELECT * FROM inbound_threads WHERE id = ?').get(result.threadId) as any
    expect(thread.thread_kind).toBe('temp')
    expect(thread.booking_id).toBeNull()
    expect(result.channel).toBe('sms')
  })

  it('dedups Cloud and Web copies', async () => {
    const first = await ingestInboundMessage(db, 1, {
      from: '+27821234567',
      text: 'Gate code please',
      timestamp: '2026-09-24T12:00:00.000Z',
      source: 'twilio_whatsapp',
      externalMessageId: 'wamid-1',
    })
    const second = await ingestInboundMessage(db, 1, {
      from: '+27821234567',
      text: 'Gate code please',
      timestamp: '2026-09-24T12:01:00.000Z',
      source: 'whatsapp_web',
      externalMessageId: 'waweb-1',
    })
    expect(second.duplicate).toBe(true)
    expect(Number(second.threadId)).toBe(Number(first.threadId))
    const count = sqlite.prepare('SELECT COUNT(*) as n FROM inbound_messages').get() as { n: number }
    expect(count.n).toBe(1)
  })

  it('skips auto-draft on spam', async () => {
    const result = await ingestInboundMessage(db, 1, {
      from: '+27821234567',
      text: 'Congratulations you are a winner click here to claim your prize bitcoin',
      timestamp: '2026-09-24T12:00:00.000Z',
      source: 'email',
      senderAddress: 'spam@example.com',
      sourceTag: 'email',
    })
    expect(result.spam).toBe(true)
    expect(result.draftReply).toBeNull()
    const message = sqlite.prepare('SELECT * FROM inbound_messages WHERE id = ?').get(result.messageId) as any
    expect(message.is_spam).toBe(1)
    expect(message.draft_reply).toBeNull()
  })

  it('links a temp into the booking thread', async () => {
    const temp = await ingestInboundMessage(db, 1, {
      from: '+27828880000',
      text: 'Booking for Trout next week',
      timestamp: '2026-09-24T12:00:00.000Z',
      source: 'twilio_whatsapp',
    })
    const linked = await linkTempToBooking(db, 1, Number(temp.threadId), 10)
    expect(linked.threadId).toBeTruthy()
    const surviving = sqlite.prepare('SELECT * FROM inbound_threads WHERE id = ?').get(linked.threadId) as any
    expect(surviving.thread_kind).toBe('booking')
    expect(surviving.booking_id).toBe(10)
  })

  it('nudges and expires stale temps', async () => {
    const created = new Date('2026-09-01T00:00:00.000Z').toISOString()
    sqlite
      .prepare(
        `INSERT INTO inbound_threads (tenant_id, source, from_number, status, thread_kind, first_message_at, last_message_at, created_at)
         VALUES (1, 'sms', '+27820001111', 'new', 'temp', ?, ?, ?)`
      )
      .run(created, created, created)
    const result = await applyTempHygiene(db, 1, new Date('2026-09-20T00:00:00.000Z'))
    expect(result.expired).toBe(1)
  })

  it('matches inbound email to booking.guest_email when phone is missing', async () => {
    sqlite
      .prepare(
        `INSERT INTO bookings (id, tenant_id, guest_name, guest_phone, guest_email, check_in, check_out, suite_or_unit, nightsbridge_booking_id)
         VALUES (12, 1, 'Eve Email', NULL, 'eve@example.com', '2026-10-01', '2026-10-03', 'Robin', 'NB-12')`
      )
      .run()
    const result = await ingestInboundMessage(db, 1, {
      from: 'eve@example.com',
      text: 'Can I add a late dinner?',
      timestamp: '2026-09-24T12:00:00.000Z',
      source: 'email',
      senderAddress: 'eve@example.com',
      sourceTag: 'email',
    })
    const thread = sqlite.prepare('SELECT * FROM inbound_threads WHERE id = ?').get(result.threadId) as any
    expect(thread.thread_kind).toBe('booking')
    expect(thread.booking_id).toBe(12)
    expect(result.channel).toBe('email')
  })

  it('clears pending_reply after outbound', async () => {
    const result = await ingestInboundMessage(db, 1, {
      from: 'eve2@example.com',
      text: 'Is breakfast included?',
      timestamp: '2026-09-24T12:00:00.000Z',
      source: 'email',
    })
    sqlite
      .prepare(
        `INSERT INTO inbound_messages (thread_id, tenant_id, direction, from_number, message_text, message_timestamp, channel)
         VALUES (?, 1, 'outbound', 'stay@thebrowns.co.za', 'Yes — see your confirmation.', '2026-09-24T12:05:00.000Z', 'email')`
      )
      .run(result.threadId)
    await markThreadOutbound(db, Number(result.threadId), {
      timestamp: '2026-09-24T12:05:00.000Z',
      channel: 'email',
    })
    const inbox = await listInboxThreads(db, 1)
    const row = inbox.find((thread) => Number(thread.id) === Number(result.threadId))
    expect(row?.pendingReply).toBe(false)
  })

  it('sorts arriving threads first in the inbox', async () => {
    await ingestInboundMessage(db, 1, {
      from: '+27821234567',
      text: 'See you tomorrow',
      timestamp: '2026-09-24T12:00:00.000Z',
      source: 'twilio_whatsapp',
      externalMessageId: 'arriving-1',
    })
    const inbox = await listInboxThreads(db, 1)
    expect(inbox[0].bookingId).toBe(10)
    expect(inbox[0].sortBucket).toBe(0)
  })
})
