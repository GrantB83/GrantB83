import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { parseArrivalsDeparturesGrid, pickAdEmail, pickAdPhone } from '@/lib/arrivals-departures-parse'
import { applyBookingContact } from '@/lib/contact-apply'
import { ensureContactSchema } from '@/lib/contact-schema'
import { ensurePhase0Schema } from '@/lib/phase0-schema'
import { upsertBooking } from '@/lib/nightsbridge-upsert'
import { ensureUmiSchema } from '@/lib/umi-schema'
import { resolveUmiThread } from '@/lib/umi-threads'

function createDb() {
  const sqlite = new Database(':memory:')
  sqlite.exec(`
    CREATE TABLE tenants (id INTEGER PRIMARY KEY, name TEXT);
    INSERT INTO tenants (id, name) VALUES (1, 'Browns Dullstroom');
    CREATE TABLE bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      guest_name TEXT NOT NULL,
      guest_name_norm TEXT,
      suite_or_unit TEXT,
      suite_or_unit_norm TEXT,
      check_in DATE NOT NULL,
      check_out DATE NOT NULL,
      adults INTEGER DEFAULT 2,
      children INTEGER DEFAULT 0,
      notes TEXT,
      late_check_in BOOLEAN DEFAULT 0,
      guest_phone TEXT,
      status TEXT,
      nightsbridge_booking_id TEXT,
      last_import_at DATETIME,
      import_batch_id TEXT,
      source TEXT DEFAULT 'nb',
      last_seen_import_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      media_refs TEXT,
      message_timestamp DATETIME NOT NULL,
      external_message_id TEXT,
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

const HEADERS = [
  'Room Name',
  'Guest Name',
  'Guest 2',
  'Number of Guests',
  'Booking ID',
  'Notes',
  'Nights',
  'Additional',
  'Phone Number',
  'Email',
]

describe('multi-room booking 5667', () => {
  let sqlite: Database.Database
  let db: ReturnType<typeof createDb>['db']

  beforeEach(async () => {
    const created = createDb()
    sqlite = created.sqlite
    db = created.db
    await ensurePhase0Schema(db)
    await ensureContactSchema(db)
    await ensureUmiSchema(db)
  })

  afterEach(() => sqlite.close())

  it('keeps one booking, both rooms, one thread, and one contact set', async () => {
    const parsed = parseArrivalsDeparturesGrid(
      [
        ['Arrival: 10/02/2026'],
        HEADERS,
        ['Garden', 'Alex Fixture', '', '2', '5667', 'Booking.com', '2', '', '+27821115667', 'alex.5667@guest.test'],
        ['Cove', 'Alex Fixture', '', '2', '5667', 'Booking.com', '2', '', '+27821115667', 'alex.5667@guest.test'],
      ],
      '2026-10-02'
    )
    expect(parsed.bookings).toHaveLength(1)
    const booking = parsed.bookings[0]
    expect(booking.suiteOrUnit).toContain('Garden')
    expect(booking.suiteOrUnit).toContain('Cove')
    expect(pickAdPhone(booking)).toBe('+27821115667')
    expect(pickAdEmail(booking)).toBe('alex.5667@guest.test')

    const first = await upsertBooking(db, booking, 1, 'batch-5667')
    const second = await upsertBooking(db, booking, 1, 'batch-5667')
    expect(first.action).toBe('inserted')
    expect(second.id).toBe(first.id)

    await applyBookingContact(db, {
      tenantId: 1,
      bookingId: first.id,
      phone: pickAdPhone(booking),
      email: pickAdEmail(booking),
      source: 'arrivals_departures',
      displayName: booking.guestName,
      nbid: '5667',
    })

    const rows = sqlite.prepare('SELECT * FROM bookings').all() as any[]
    expect(rows).toHaveLength(1)
    expect(rows[0].suite_or_unit).toMatch(/Garden/)
    expect(rows[0].suite_or_unit).toMatch(/Cove/)
    expect(rows[0].guest_phone).toBe('+27821115667')
    expect(rows[0].guest_email).toBe('alex.5667@guest.test')

    const contacts = sqlite.prepare('SELECT * FROM guest_contacts').all() as any[]
    expect(contacts).toHaveLength(1)

    const inbound1 = await resolveUmiThread(db, 1, {
      from: '+27821115667',
      source: 'email',
      timestamp: '2026-09-25T10:00:00.000Z',
      text: 'Hello from Garden',
      externalMessageId: '5667-a',
    })
    const inbound2 = await resolveUmiThread(db, 1, {
      from: 'alex.5667@guest.test',
      source: 'email',
      timestamp: '2026-09-25T10:05:00.000Z',
      text: 'Hello from Cove',
      externalMessageId: '5667-b',
    })
    expect(inbound1.thread.booking_id).toBe(first.id)
    expect(inbound2.thread.id).toBe(inbound1.thread.id)
    expect(inbound1.thread.thread_kind).toBe('booking')

    const threadCount = sqlite
      .prepare(`SELECT COUNT(*) as c FROM inbound_threads WHERE thread_kind = 'booking'`)
      .get() as { c: number }
    expect(threadCount.c).toBe(1)
  })
})
