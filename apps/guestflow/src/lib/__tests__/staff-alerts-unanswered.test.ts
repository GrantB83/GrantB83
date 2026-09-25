import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { DbClient } from '@/lib/db'
import {
  closeTestSqlite,
  createTestDbClient,
  ensureThreadTables,
  openTestSqlite,
  seedStaff,
} from './sprint2-test-db'
import { evaluateUnanswered } from '@/lib/staff-alerts'

describe('unanswered alerts', () => {
  const filename = 'test-sprint2-unanswered.db'
  let sqlite: ReturnType<typeof openTestSqlite>
  let db: DbClient
  const sent: Array<{ to: string; kind: string }> = []

  beforeAll(async () => {
    sqlite = openTestSqlite(filename)
    db = createTestDbClient(sqlite)
    ensureThreadTables(sqlite)
    await seedStaff(db, ['handler@thebrowns.co.za', 'other@thebrowns.co.za'])
  })

  afterAll(() => closeTestSqlite(sqlite, filename))

  beforeEach(() => {
    sent.length = 0
    sqlite.exec('DELETE FROM inbound_threads')
    sqlite.exec('DELETE FROM inbound_messages')
    sqlite.exec('DELETE FROM staff_alerts')
  })

  const send = async (input: { to: string; kind: string }) => {
    sent.push({ to: input.to, kind: input.kind })
    return { success: true, timestamp: new Date().toISOString() }
  }

  it('alerts only the last handler after 30 minutes in staff hours', async () => {
    sqlite.prepare(
      `INSERT INTO inbound_threads (id, from_number, guest_name, pending_reply, last_inbound_at, last_handler_email)
       VALUES (1, '+27821234567', 'Lerato Guest', 1, ?, 'handler@thebrowns.co.za')`
    ).run('2026-09-25T08:00:00.000Z')
    const now = new Date('2026-09-25T08:30:00.000Z')
    await evaluateUnanswered(db, { now, send: send as any, tenantId: 1 })
    expect(sent.map((row) => row.to)).toEqual(['handler@thebrowns.co.za'])
    expect(sent[0].kind).toBe('unanswered')
  })

  it('emails all users when there is no last handler', async () => {
    sqlite.prepare(
      `INSERT INTO inbound_threads (id, from_number, guest_name, pending_reply, last_inbound_at)
       VALUES (2, '+27821234567', 'Lerato Guest', 1, ?)`
    ).run('2026-09-25T08:00:00.000Z')
    await evaluateUnanswered(db, { now: new Date('2026-09-25T08:30:00.000Z'), send: send as any, tenantId: 1 })
    expect(sent.map((row) => row.to).sort()).toEqual(['handler@thebrowns.co.za', 'other@thebrowns.co.za'])
  })

  it('excludes spam and staff/test peers', async () => {
    sqlite.prepare(
      `INSERT INTO inbound_threads (id, from_number, guest_name, pending_reply, last_inbound_at)
       VALUES (3, 'grant830318@gmail.com', 'Test sink', 1, ?)`
    ).run('2026-09-25T08:00:00.000Z')
    sqlite.prepare(
      `INSERT INTO inbound_threads (id, from_number, guest_name, pending_reply, last_inbound_at)
       VALUES (4, '+27829990000', 'Spam Guest', 1, ?)`
    ).run('2026-09-25T08:00:00.000Z')
    sqlite.prepare(`INSERT INTO inbound_messages (thread_id, direction, is_spam, message_timestamp) VALUES (4, 'inbound', 1, ?)`).run(
      '2026-09-25T08:00:00.000Z'
    )
    await evaluateUnanswered(db, { now: new Date('2026-09-25T08:30:00.000Z'), send: send as any, tenantId: 1 })
    expect(sent).toEqual([])
  })

  it('rolls overnight unanswered into the 07:00 SAST digest', async () => {
    sqlite.prepare(
      `INSERT INTO inbound_threads (id, from_number, guest_name, pending_reply, last_inbound_at)
       VALUES (5, '+27821234567', 'Night Guest', 1, ?)`
    ).run('2026-09-24T20:10:00.000Z')
    await evaluateUnanswered(db, { now: new Date('2026-09-25T04:30:00.000Z'), send: send as any, tenantId: 1 })
    expect(sent).toEqual([])
    await evaluateUnanswered(db, { now: new Date('2026-09-25T05:00:00.000Z'), send: send as any, tenantId: 1 })
    expect(sent.some((row) => row.kind === 'unanswered_digest')).toBe(true)
  })
})
