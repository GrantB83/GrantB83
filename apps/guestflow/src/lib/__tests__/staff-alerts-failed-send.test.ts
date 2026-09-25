import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { DbClient } from '@/lib/db'
import { closeTestSqlite, createTestDbClient, openTestSqlite, seedStaff } from './sprint2-test-db'
import { notifyFailedApproveSend } from '@/lib/staff-alerts'

describe('failed Approve&Send hook', () => {
  const filename = 'test-sprint2-failed-send.db'
  let sqlite: ReturnType<typeof openTestSqlite>
  let db: DbClient

  beforeAll(async () => {
    sqlite = openTestSqlite(filename)
    db = createTestDbClient(sqlite)
    await seedStaff(db, ['presser@thebrowns.co.za', 'other@thebrowns.co.za'])
  })
  afterAll(() => closeTestSqlite(sqlite, filename))

  it('emails only the user who pressed Approve&Send', async () => {
    const sent: string[] = []
    await notifyFailedApproveSend({
      db,
      actorEmail: 'presser@thebrowns.co.za',
      threadId: 44,
      guestFirstName: 'Lerato',
      bookingRef: '12345678',
      send: async (input) => {
        sent.push(input.to)
        return { success: true, timestamp: new Date().toISOString() }
      },
    })
    expect(sent).toEqual(['presser@thebrowns.co.za'])
  })
})
