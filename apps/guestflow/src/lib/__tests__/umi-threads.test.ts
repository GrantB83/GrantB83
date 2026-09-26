import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { ingestInboundMessage } from '@/lib/inbound-ingest'
import {
  applyTempHygiene,
  ensureArrivingBookingThreads,
  getThreadDetail,
  linkTempToBooking,
  listInboxPage,
  listInboxThreads,
  listLinkCandidates,
  listWaWebSentinelTargets,
  markThreadOutbound,
} from '@/lib/umi-threads'
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
         VALUES (10, 1, 'Ada Booker', '+27821234567', '2026-09-26', '2026-09-28', 'Trout', 'NB-10')`
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

  it('does not create an arriving thread for a BLOCK booking', async () => {
    sqlite
      .prepare(
        `INSERT INTO bookings (id, tenant_id, guest_name, guest_phone, check_in, check_out, suite_or_unit, status)
         VALUES (99, 1, 'BLOCK', NULL, '2026-09-25', '2026-09-27', 'Owner hold', 'confirmed')`
      )
      .run()
    await ensureArrivingBookingThreads(db, 1, new Date('2026-09-25T08:00:00.000Z'))
    const thread = sqlite.prepare(`SELECT * FROM inbound_threads WHERE booking_id = 99`).get()
    expect(thread).toBeUndefined()
    const candidates = await listLinkCandidates(db, 1, 'unknown')
    expect(candidates.some((row) => row.guestName === 'BLOCK')).toBe(false)
  })

  it('never flags an empty thread as needsAttention', async () => {
    sqlite
      .prepare(
        `INSERT INTO inbound_threads (tenant_id, source, from_number, status, thread_kind, booking_id, pending_reply)
         VALUES (1, 'nb', 'booking:10', 'new', 'booking', 10, 1)`
      )
      .run()
    const inbox = await listInboxThreads(db, 1)
    const empty = inbox.find((thread) => thread.bookingId === 10)
    expect(empty).toBeDefined()
    expect(empty?.needsAttention).toBe(false)
    expect(empty?.pendingReply).toBe(false)
  })

  it('flags a real unanswered inbound and not an answered thread', async () => {
    const inbound = await ingestInboundMessage(db, 1, {
      from: '+27821234567',
      text: 'What time is check-in?',
      timestamp: '2026-09-24T12:00:00.000Z',
      source: 'twilio_whatsapp',
      externalMessageId: 'unanswered-1',
    })
    const inbox = await listInboxThreads(db, 1)
    const flagged = inbox.find((thread) => Number(thread.id) === Number(inbound.threadId))
    expect(flagged?.needsAttention).toBe(true)

    sqlite
      .prepare(
        `INSERT INTO inbound_messages (thread_id, tenant_id, direction, from_number, message_text, message_timestamp)
         VALUES (?, 1, 'outbound', 'stay@thebrowns.co.za', 'From 14:00', '2026-09-24T12:10:00.000Z')`
      )
      .run(inbound.threadId)
    const after = await listInboxThreads(db, 1)
    const answered = after.find((thread) => Number(thread.id) === Number(inbound.threadId))
    expect(answered?.needsAttention).toBe(false)
  })

  it('opening the inbox makes zero DB writes', async () => {
    await ingestInboundMessage(db, 1, {
      from: '+27821234567',
      text: 'Hi',
      timestamp: '2026-09-24T12:00:00.000Z',
      source: 'twilio_whatsapp',
      externalMessageId: 'write-check-1',
    })
    let writes = 0
    const original = db.prepare
    db.prepare = ((sql: string) => {
      if (/^\s*(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|REPLACE)\b/i.test(sql)) {
        writes += 1
      }
      return original(sql)
    }) as typeof db.prepare
    await listInboxThreads(db, 1)
    expect(writes).toBe(0)
  })

  it('includes drafted temp and booking threads in inbox list', async () => {
    // Create temp thread 48 with status='drafted' (ops@)
    sqlite
      .prepare(
        `INSERT INTO inbound_threads (id, tenant_id, source, from_number, status, thread_kind, first_message_at, last_message_at, guest_name)
         VALUES (48, 1, 'email', 'ops@example.com', 'drafted', 'temp', '2026-09-24T10:00:00.000Z', '2026-09-24T10:00:00.000Z', 'Ops Team')`
      )
      .run()
    sqlite
      .prepare(
        `INSERT INTO inbound_messages (thread_id, tenant_id, from_number, message_text, message_timestamp)
         VALUES (48, 1, 'ops@example.com', 'Test message from ops', '2026-09-24T10:00:00.000Z')`
      )
      .run()

    // Create temp thread 49 with status='drafted' (grant830318@ with DIRECT2 marker)
    sqlite
      .prepare(
        `INSERT INTO inbound_threads (id, tenant_id, source, from_number, status, thread_kind, first_message_at, last_message_at, guest_name, metadata)
         VALUES (49, 1, 'email', 'grant830318@gmail.com', 'drafted', 'temp', '2026-09-24T10:05:00.000Z', '2026-09-24T10:05:00.000Z', 'Grant Brown', '{"subject":"DIRECT2"}')`
      )
      .run()
    sqlite
      .prepare(
        `INSERT INTO inbound_messages (thread_id, tenant_id, from_number, message_text, message_timestamp)
         VALUES (49, 1, 'grant830318@gmail.com', 'DIRECT2 test message', '2026-09-24T10:05:00.000Z')`
      )
      .run()

    // Create booking thread 50 with status='drafted'
    sqlite
      .prepare(
        `INSERT INTO inbound_threads (id, tenant_id, source, from_number, status, thread_kind, booking_id, first_message_at, last_message_at)
         VALUES (50, 1, 'twilio_whatsapp', '+27821234567', 'drafted', 'booking', 10, '2026-09-24T10:10:00.000Z', '2026-09-24T10:10:00.000Z')`
      )
      .run()
    sqlite
      .prepare(
        `INSERT INTO inbound_messages (thread_id, tenant_id, from_number, message_text, message_timestamp)
         VALUES (50, 1, '+27821234567', 'Booking inquiry', '2026-09-24T10:10:00.000Z')`
      )
      .run()

    const inbox = await listInboxThreads(db, 1)
    const ids = inbox.map((t) => t.id)

    expect(ids).toContain(48)
    expect(ids).toContain(49)
    expect(ids).toContain(50)

    const thread48 = inbox.find((t) => t.id === 48)
    const thread49 = inbox.find((t) => t.id === 49)
    const thread50 = inbox.find((t) => t.id === 50)

    expect(thread48).toBeDefined()
    expect(thread48?.threadKind).toBe('temp')
    expect(thread48?.fromNumber).toBe('ops@example.com')

    expect(thread49).toBeDefined()
    expect(thread49?.threadKind).toBe('temp')
    expect(thread49?.fromNumber).toBe('grant830318@gmail.com')

    expect(thread50).toBeDefined()
    expect(thread50?.threadKind).toBe('booking')
    expect(thread50?.bookingId).toBe(10)
  })

  it('does not insert a WhatsApp Web row when the body is a sentinel', async () => {
    const result = await ingestInboundMessage(db, 1, {
      from: '+27829990001',
      text: '[metadata-only]',
      timestamp: '2026-09-24T12:00:00.000Z',
      source: 'whatsapp_web',
      externalMessageId: 'waweb-sentinel-skip',
    })
    expect(result.skipped).toBe(true)
    const count = sqlite.prepare('SELECT COUNT(*) as n FROM inbound_messages').get() as { n: number }
    expect(count.n).toBe(0)
  })

  it('replaces a metadata-only WhatsApp Web row in place and persists the source name', async () => {
    sqlite
      .prepare(
        `INSERT INTO inbound_threads (id, tenant_id, source, from_number, guest_name, status, thread_kind, first_message_at, last_message_at, metadata)
         VALUES (28, 1, 'whatsapp_web', '+27829990002', '+27829990002', 'new', 'temp', '2026-09-24T12:00:00.000Z', '2026-09-24T12:00:00.000Z', '{"metadataOnly":true}')`
      )
      .run()
    try {
      sqlite.exec(`ALTER TABLE inbound_messages ADD COLUMN metadata TEXT`)
    } catch {
      // column may already exist
    }
    sqlite
      .prepare(
        `INSERT INTO inbound_messages (id, thread_id, tenant_id, from_number, message_text, message_timestamp, external_message_id, channel, body_unavailable, metadata)
         VALUES (280, 28, 1, '+27829990002', '[metadata-only]', '2026-09-24T12:00:00.000Z', 'waweb-28-1', 'whatsapp_web', 1, '{"metadataOnly":true}')`
      )
      .run()

    const result = await ingestInboundMessage(db, 1, {
      from: '+27829990002',
      text: 'We land at 16:00 — is late check-in OK?',
      timestamp: '2026-09-24T12:00:00.000Z',
      source: 'whatsapp_web',
      externalMessageId: 'waweb-28-1',
      chatTitle: 'Sam Guest',
    })
    expect(result.replaced).toBe(true)
    expect(Number(result.messageId)).toBe(280)
    const count = sqlite.prepare('SELECT COUNT(*) as n FROM inbound_messages').get() as { n: number }
    expect(count.n).toBe(1)
    const message = sqlite.prepare('SELECT * FROM inbound_messages WHERE id = 280').get() as any
    expect(message.message_text).toBe('We land at 16:00 — is late check-in OK?')
    expect(Number(message.body_unavailable || 0)).toBe(0)
    expect(JSON.parse(String(message.metadata || '{}')).metadataOnly).toBe(false)
    const threadMeta = sqlite.prepare('SELECT metadata FROM inbound_threads WHERE id = 28').get() as { metadata: string }
    expect(JSON.parse(threadMeta.metadata).metadataOnly).toBe(false)
    const detail = await getThreadDetail(db, 1, 28)
    expect(detail?.messages.find((row) => row.id === 280)?.body).toBe('We land at 16:00 — is late check-in OK?')
    const inbox = await listInboxThreads(db, 1)
    const thread = inbox.find((row) => row.id === 28)
    expect(thread?.bookerName).toBe('Sam Guest')
    expect(thread?.preview).toContain('We land at 16:00')
  })

  it('does not invent a name when WhatsApp Web only has the raw number', async () => {
    const result = await ingestInboundMessage(db, 1, {
      from: '+27829990003',
      text: 'Do you have a cottage this weekend?',
      timestamp: '2026-09-24T12:00:00.000Z',
      source: 'whatsapp_web',
      externalMessageId: 'waweb-phone-only',
      displayName: '+27829990003',
      chatTitle: '27829990003',
    })
    const thread = sqlite.prepare('SELECT * FROM inbound_threads WHERE id = ?').get(result.threadId) as any
    expect(thread.thread_kind).toBe('temp')
    expect(thread.guest_name == null || thread.guest_name === '+27829990003').toBe(true)
    const inbox = await listInboxThreads(db, 1)
    const row = inbox.find((item) => Number(item.id) === Number(result.threadId))
    expect(row?.bookerName).toBe('+27829990003')
  })

  it('drops a leftover WhatsApp Web sentinel when Cloud already has the real body', async () => {
    const first = await ingestInboundMessage(db, 1, {
      from: '+27821234567',
      text: 'ETA 15 minutes',
      timestamp: '2026-09-24T12:00:00.000Z',
      source: 'twilio_whatsapp',
      externalMessageId: 'wamid-cloud-eta',
    })
    sqlite
      .prepare(
        `INSERT INTO inbound_messages (thread_id, tenant_id, from_number, message_text, message_timestamp, external_message_id, channel, body_unavailable)
         VALUES (?, 1, '+27821234567', '[body unavailable]', '2026-09-24T12:00:00.000Z', 'waweb-eta', 'whatsapp_web', 1)`
      )
      .run(first.threadId)

    const second = await ingestInboundMessage(db, 1, {
      from: '+27821234567',
      text: 'ETA 15 minutes',
      timestamp: '2026-09-24T12:00:00.000Z',
      source: 'whatsapp_web',
      externalMessageId: 'waweb-eta',
    })
    expect(second.duplicate).toBe(true)
    const rows = sqlite.prepare('SELECT message_text FROM inbound_messages WHERE thread_id = ?').all(first.threadId) as Array<{
      message_text: string
    }>
    expect(rows).toHaveLength(1)
    expect(rows[0].message_text).toBe('ETA 15 minutes')
  })

  it('honors inbox limit and keyset cursor after sort', async () => {
    for (let i = 0; i < 4; i += 1) {
      await ingestInboundMessage(db, 1, {
        from: `+2782999001${i}`,
        text: `Ping ${i}`,
        timestamp: `2026-09-24T12:0${i}:00.000Z`,
        source: 'twilio_sms',
        externalMessageId: `limit-${i}`,
      })
    }
    const first = await listInboxPage(db, 1, { limit: 2 })
    expect(first.threads).toHaveLength(2)
    expect(first.limit).toBe(2)
    expect(first.hasMore).toBe(true)
    expect(first.nextCursor).toBeTruthy()
    const second = await listInboxPage(db, 1, { limit: 2, cursor: first.nextCursor })
    expect(second.threads).toHaveLength(2)
    expect(second.threads[0].id).not.toBe(first.threads[0].id)
    const all = await listInboxThreads(db, 1)
    expect(all.length).toBeGreaterThan(2)
  })

  it('lists exact WA Web staff sentinels without inventing bodies', async () => {
    sqlite
      .prepare(
        `INSERT INTO inbound_threads (id, tenant_id, source, from_number, guest_name, status, thread_kind, booking_id, last_message_at)
         VALUES (46, 1, 'whatsapp_web', '+27821235665', 'Ada Booker', 'new', 'booking', 10, '2026-09-26T00:23:00.000Z')`
      )
      .run()
    sqlite
      .prepare(
        `INSERT INTO inbound_messages (id, thread_id, tenant_id, from_number, message_text, message_timestamp, channel)
         VALUES (248, 46, 1, '+27821235665', '[body unavailable]', '2026-09-26T00:23:00.000Z', 'whatsapp_web')`
      )
      .run()
    sqlite
      .prepare(
        `INSERT INTO inbound_messages (id, thread_id, tenant_id, from_number, message_text, message_timestamp, channel)
         VALUES (249, 46, 1, '+27821235665', '[observe-probe]', '2026-09-26T00:24:00.000Z', 'whatsapp_web')`
      )
      .run()
    const targets = await listWaWebSentinelTargets(db, 1, { days: 14, threadId: 46 })
    expect(targets).toHaveLength(1)
    expect(targets[0].messageId).toBe(248)
    expect(targets[0].sentinel).toBe('[body unavailable]')
    expect(targets[0].last4).toBe('5665')
    expect(targets[0].bookingLinked).toBe(true)
    expect(targets.every((row) => row.sentinel !== '[observe-probe]')).toBe(true)
  })
})
