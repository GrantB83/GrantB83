import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { DbClient } from '@/lib/db'
import {
  closeTestSqlite,
  createTestDbClient,
  openTestSqlite,
  seedStaff,
} from './sprint2-test-db'
import {
  dispatchAlerts,
  resolveAlertRecipients,
  shouldSendAlert,
} from '@/lib/staff-alerts'
import { removeStaffUser } from '@/lib/staff-auth'
import { ensureSprint2Schema } from '@/lib/sprint2-schema'

describe('staff alert recipients and cooldown', () => {
  const filename = 'test-sprint2-recipients.db'
  let sqlite: ReturnType<typeof openTestSqlite>
  let db: DbClient
  const sent: string[] = []

  beforeAll(async () => {
    sqlite = openTestSqlite(filename)
    db = createTestDbClient(sqlite)
    await seedStaff(db, ['alex@thebrowns.co.za', 'blair@thebrowns.co.za'])
  })

  afterAll(() => closeTestSqlite(sqlite, filename))

  beforeEach(async () => {
    sent.length = 0
    sqlite.exec('DELETE FROM staff_alerts')
    process.env.ALERT_FALLBACK_EMAIL = 'fallback@thebrowns.co.za'
  })

  it('emails all active users and not the fallback when users exist', async () => {
    const recipients = await resolveAlertRecipients(db, { mode: 'all_active' })
    expect(recipients.sort()).toEqual(['alex@thebrowns.co.za', 'blair@thebrowns.co.za'])
  })

  it('uses ALERT_FALLBACK_EMAIL only when no users exist', async () => {
    const emptyFile = 'test-sprint2-fallback.db'
    const emptySqlite = openTestSqlite(emptyFile)
    const emptyDb = createTestDbClient(emptySqlite)
    await ensureSprint2Schema(emptyDb)
    await seedStaff(emptyDb, [])
    process.env.ALERT_FALLBACK_EMAIL = 'fallback@thebrowns.co.za'
    const recipients = await resolveAlertRecipients(emptyDb, { mode: 'all_active' })
    expect(recipients).toEqual(['fallback@thebrowns.co.za'])
    closeTestSqlite(emptySqlite, emptyFile)
  })

  it('stops emailing a removed user', async () => {
    const listed = await db.prepare(`SELECT id, email FROM staff_users WHERE email = ?`).get('blair@thebrowns.co.za') as {
      id: number
    }
    await removeStaffUser(db, { id: listed.id, actorEmail: 'alex@thebrowns.co.za', actorUserId: 1 })
    const recipients = await resolveAlertRecipients(db, { mode: 'all_active' })
    expect(recipients).toEqual(['alex@thebrowns.co.za'])
    expect(recipients).not.toContain('blair@thebrowns.co.za')
  })

  it('dedupes the same recipient for the same issue inside the 2h cooldown', async () => {
    const now = new Date('2026-09-25T10:00:00.000Z')
    const send = async (input: { to: string }) => {
      sent.push(input.to)
      return { success: true, timestamp: now.toISOString() }
    }
    const first = await dispatchAlerts(db, {
      dedupeKey: 'nb-missed-import',
      kind: 'nb_missed',
      recipients: ['alex@thebrowns.co.za'],
      payload: { guestFirstName: 'Nightsbridge', bookingRef: 'batch' },
      now,
      send: send as any,
    })
    const second = await dispatchAlerts(db, {
      dedupeKey: 'nb-missed-import',
      kind: 'nb_missed',
      recipients: ['alex@thebrowns.co.za'],
      payload: { guestFirstName: 'Nightsbridge', bookingRef: 'batch' },
      now: new Date(now.getTime() + 60 * 60 * 1000),
      send: send as any,
    })
    expect(first.sent).toBe(1)
    expect(second.sent).toBe(0)
    expect(second.skipped).toBe(1)
    expect(await shouldSendAlert(db, { dedupeKey: 'nb-missed-import', recipientEmail: 'alex@thebrowns.co.za', now: new Date(now.getTime() + 2 * 60 * 60 * 1000) })).toBe(true)
  })
})
