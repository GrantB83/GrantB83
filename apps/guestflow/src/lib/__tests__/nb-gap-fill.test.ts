import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { DbClient } from '@/lib/db'
import { closeTestSqlite, createTestDbClient, ensureThreadTables, openTestSqlite } from './sprint2-test-db'
import { ensureSprint2Schema } from '@/lib/sprint2-schema'
import { extractContactsFromNotes, fillGapsForBooking, verbatimPresent } from '@/lib/nb-gap-fill'

describe('NB gap fill', () => {
  const filename = 'test-sprint2-gap-fill.db'
  let sqlite: ReturnType<typeof openTestSqlite>
  let db: DbClient

  beforeAll(async () => {
    sqlite = openTestSqlite(filename)
    db = createTestDbClient(sqlite)
    ensureThreadTables(sqlite)
    await ensureSprint2Schema(db)
  })
  afterAll(() => closeTestSqlite(sqlite, filename))

  it('extracts a verbatim phone from notes and rejects invented values', () => {
    const notes = 'Please call 0821234567 on arrival'
    const extracted = extractContactsFromNotes(notes)
    expect(extracted.phones[0]).toBe('+27821234567')
    expect(verbatimPresent('+27821234567', notes)).toBe(true)
    expect(verbatimPresent('+27998887777', notes)).toBe(false)
  })

  it('fills from notes and never overwrites a staff-verified phone', async () => {
    sqlite.exec('DELETE FROM bookings')
    sqlite.prepare(
      `INSERT INTO bookings (id, tenant_id, guest_name, guest_name_norm, check_in, check_out, suite_or_unit, status)
       VALUES (1, 1, 'Lerato Guest', 'lerato guest', '2026-09-25', '2026-09-27', 'Cottage', 'confirmed')`
    ).run()
    const filled = await fillGapsForBooking(db, { tenantId: 1, bookingId: 1, notes: 'Tel 0821234567' })
    expect(filled.filled).toContain('phone')
    sqlite.prepare(`UPDATE bookings SET guest_phone_verified = 'staff_verified', guest_phone = '+27820000000' WHERE id = 1`).run()
    await fillGapsForBooking(db, { tenantId: 1, bookingId: 1, notes: 'Tel 0821234567' })
    const row = sqlite.prepare(`SELECT guest_phone FROM bookings WHERE id = 1`).get() as { guest_phone: string }
    expect(row.guest_phone).toBe('+27820000000')
  })
})
