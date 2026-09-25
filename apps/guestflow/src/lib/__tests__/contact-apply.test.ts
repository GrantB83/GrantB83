import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { applyBookingContact, validateContactInput } from '@/lib/contact-apply'
import { ensureContactSchema } from '@/lib/contact-schema'
import { ensurePhase0Schema } from '@/lib/phase0-schema'

function createDb() {
  const sqlite = new Database(':memory:')
  sqlite.exec(`
    CREATE TABLE bookings (
      id INTEGER PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      guest_name TEXT NOT NULL,
      guest_phone TEXT,
      check_in DATE,
      check_out DATE,
      suite_or_unit TEXT,
      nightsbridge_booking_id TEXT,
      status TEXT,
      updated_at DATETIME
    );
    INSERT INTO bookings (id, tenant_id, guest_name, check_in, check_out, suite_or_unit, nightsbridge_booking_id, status)
    VALUES (1, 1, 'Alex Fixture', '2026-10-02', '2026-10-04', 'Garden', '9011', 'arriving');
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

describe('contact apply + validation', () => {
  let sqlite: Database.Database
  let db: ReturnType<typeof createDb>['db']

  beforeEach(async () => {
    const created = createDb()
    sqlite = created.sqlite
    db = created.db
    await ensurePhase0Schema(db)
    await ensureContactSchema(db)
  })

  afterEach(() => sqlite.close())

  it('rejects invalid staff/self-fill input', () => {
    expect(validateContactInput({ phone: '', email: '' }).error).toMatch(/required/i)
    expect(validateContactInput({ phone: 'abc', email: '' }).error).toMatch(/invalid phone/i)
    expect(validateContactInput({ email: 'not-an-email' }).error).toMatch(/invalid email/i)
    expect(validateContactInput({ email: 'test@example.com' }).error).toMatch(/invalid email/i)
    expect(validateContactInput({ phone: '0821119011', email: 'ok.9011@guest.test' }).error).toBeUndefined()
  })

  it('lets A&D write phone and email, then Client report fills only the gap', async () => {
    await applyBookingContact(db, {
      tenantId: 1,
      bookingId: 1,
      email: 'and.9011@guest.test',
      source: 'arrivals_departures',
      sourceRef: 'ad:test',
      displayName: 'Alex Fixture',
      nbid: '9011',
    })
    const afterAd = sqlite.prepare('SELECT guest_email, guest_phone, guest_email_source FROM bookings WHERE id = 1').get() as any
    expect(afterAd.guest_email).toBe('and.9011@guest.test')
    expect(afterAd.guest_phone).toBeFalsy()

    const client = await applyBookingContact(db, {
      tenantId: 1,
      bookingId: 1,
      phone: '+27821119011',
      email: 'client-overwrite@guest.test',
      source: 'client_report',
    })
    expect(client.phoneApplied).toBe(true)
    expect(client.emailApplied).toBe(false)

    const row = sqlite.prepare('SELECT guest_email, guest_phone, guest_email_source, guest_phone_source FROM bookings WHERE id = 1').get() as any
    expect(row.guest_email).toBe('and.9011@guest.test')
    expect(row.guest_phone).toBe('+27821119011')
    expect(row.guest_email_source).toBe('arrivals_departures')
    expect(row.guest_phone_source).toBe('client_report')
  })

  it('does not let stay@ overwrite a direct A&D email', async () => {
    await applyBookingContact(db, {
      tenantId: 1,
      bookingId: 1,
      email: 'direct.9011@guest.test',
      source: 'arrivals_departures',
    })
    const stay = await applyBookingContact(db, {
      tenantId: 1,
      bookingId: 1,
      email: 'stay.sender@guest.test',
      source: 'stay_at',
    })
    expect(stay.emailApplied).toBe(false)
    const row = sqlite.prepare('SELECT guest_email FROM bookings WHERE id = 1').get() as any
    expect(row.guest_email).toBe('direct.9011@guest.test')
  })

  it('lets stay@ replace an A&D relay with a direct sender', async () => {
    await applyBookingContact(db, {
      tenantId: 1,
      bookingId: 1,
      email: 'relay.9011@guest.booking.com',
      source: 'arrivals_departures',
    })
    const stay = await applyBookingContact(db, {
      tenantId: 1,
      bookingId: 1,
      email: 'real.sender@guest.test',
      source: 'stay_at',
    })
    expect(stay.emailApplied).toBe(true)
    expect(stay.emailKind).toBe('direct')
  })

  it('accepts staff then blocks guest from overwriting staff', async () => {
    const staff = await applyBookingContact(db, {
      tenantId: 1,
      bookingId: 1,
      phone: '+27821119012',
      source: 'staff',
    })
    expect(staff.phoneApplied).toBe(true)
    const guest = await applyBookingContact(db, {
      tenantId: 1,
      bookingId: 1,
      phone: '+27821119013',
      source: 'guest',
    })
    expect(guest.phoneApplied).toBe(false)
    const row = sqlite.prepare('SELECT guest_phone, guest_phone_source FROM bookings WHERE id = 1').get() as any
    expect(row.guest_phone).toBe('+27821119012')
    expect(row.guest_phone_source).toBe('staff')
  })

  it('treats a legacy A&D phone with no source as protected', async () => {
    sqlite.prepare(`UPDATE bookings SET guest_phone = '+27821119014' WHERE id = 1`).run()
    const client = await applyBookingContact(db, {
      tenantId: 1,
      bookingId: 1,
      phone: '+27821119015',
      source: 'client_report',
    })
    expect(client.phoneApplied).toBe(false)
    const row = sqlite.prepare('SELECT guest_phone FROM bookings WHERE id = 1').get() as any
    expect(row.guest_phone).toBe('+27821119014')
  })

  it('skips BLOCK guest names', async () => {
    const result = await applyBookingContact(db, {
      tenantId: 1,
      bookingId: 1,
      phone: '+27821119999',
      source: 'arrivals_departures',
      displayName: 'BLOCK',
    })
    expect(result.skippedReason).toBe('block_row')
    expect(result.phoneApplied).toBe(false)
  })
})
