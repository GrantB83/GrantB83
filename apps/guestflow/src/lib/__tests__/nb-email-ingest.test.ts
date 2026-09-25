import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { DbClient } from '@/lib/db'
import { closeTestSqlite, createTestDbClient, ensureThreadTables, openTestSqlite } from './sprint2-test-db'
import { ensureSprint2Schema } from '@/lib/sprint2-schema'
import { ingestNbEmail } from '@/lib/nb-email-ingest'

const NEW_SUBJECT = 'Booking for The Browns (24299) - Booking.com, Friday, 25 Sep 2026'
const NEW_BODY = `Guest name: Lerato Guest\nEmail: guest@example.com\nTel: 0821234567\nArrive: Friday, 25 Sep 2026\nDepart: Sunday, 27 Sep 2026\nNB-12345678\nNotes: hi`

describe('NB email ingest', () => {
  const filename = 'test-sprint2-nb-ingest.db'
  let sqlite: ReturnType<typeof openTestSqlite>
  let db: DbClient

  beforeAll(async () => {
    sqlite = openTestSqlite(filename)
    db = createTestDbClient(sqlite)
    ensureThreadTables(sqlite)
    await ensureSprint2Schema(db)
  })
  afterAll(() => closeTestSqlite(sqlite, filename))
  beforeEach(() => {
    sqlite.exec('DELETE FROM bookings')
    sqlite.exec('DELETE FROM nb_email_events')
    sqlite.exec('DELETE FROM nb_gaps')
    sqlite.exec('DELETE FROM booking_payments')
  })

  it('upserts by nb_ref and does not create a guest thread', async () => {
    const first = await ingestNbEmail(db, {
      from: 'booking@nightsbridge.co.za',
      subject: NEW_SUBJECT,
      text: NEW_BODY,
      messageId: 'm1',
      emailDate: '2026-09-25T08:00:00.000Z',
    })
    expect(first.eventStatus).toBe('applied')
    expect(first.bookingId).toBeTruthy()
    const threads = sqlite.prepare('SELECT COUNT(*) AS c FROM inbound_threads').get() as { c: number }
    expect(threads.c).toBe(0)
    const bookings = sqlite.prepare('SELECT COUNT(*) AS c FROM bookings').get() as { c: number }
    expect(bookings.c).toBe(1)
  })

  it('drops duplicate message ids and content hashes', async () => {
    await ingestNbEmail(db, { from: 'booking@nightsbridge.co.za', subject: NEW_SUBJECT, text: NEW_BODY, messageId: 'm2' })
    const dupId = await ingestNbEmail(db, { from: 'booking@nightsbridge.co.za', subject: NEW_SUBJECT, text: NEW_BODY, messageId: 'm2' })
    expect(dupId.eventStatus).toBe('duplicate')
    const dupHash = await ingestNbEmail(db, { from: 'booking@nightsbridge.co.za', subject: NEW_SUBJECT, text: NEW_BODY, messageId: 'm3' })
    expect(dupHash.eventStatus).toBe('duplicate')
  })

  it('marks older events stale and lets cancellation win over an older NEW', async () => {
    await ingestNbEmail(db, {
      from: 'booking@nightsbridge.co.za',
      subject: NEW_SUBJECT,
      text: NEW_BODY,
      messageId: 'm4',
      emailDate: '2026-09-25T10:00:00.000Z',
    })
    const stale = await ingestNbEmail(db, {
      from: 'booking@nightsbridge.co.za',
      subject: NEW_SUBJECT,
      text: NEW_BODY.replace('NB-12345678', 'NB-12345678') + '\nRoom type: Extra',
      messageId: 'm5',
      emailDate: '2026-09-25T09:00:00.000Z',
    })
    expect(stale.eventStatus).toBe('stale')
    const cancel = await ingestNbEmail(db, {
      from: 'noreply@nightsbridge.co.za',
      subject: 'Cancellation of Booking ID - 12345678',
      text: 'Guest: Lerato',
      messageId: 'm6',
      emailDate: '2026-09-25T08:00:00.000Z',
    })
    expect(cancel.eventStatus).toBe('applied')
    const row = sqlite.prepare(`SELECT status, cancelled_source FROM bookings WHERE nightsbridge_booking_id = '12345678'`).get() as {
      status: string
      cancelled_source: string
    }
    expect(row.status).toBe('cancelled')
    expect(row.cancelled_source).toBe('nb_email')
  })
})
