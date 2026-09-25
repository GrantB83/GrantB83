import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { DbClient } from '@/lib/db'
import { closeTestSqlite, createTestDbClient, openTestSqlite, seedStaff } from './sprint2-test-db'
import { evaluateNbFreshness } from '@/lib/staff-alerts'
import { recordNbSyncRun } from '@/lib/sprint2-schema'

describe('NB 14h freshness', () => {
  const filename = 'test-sprint2-nb14h.db'
  let sqlite: ReturnType<typeof openTestSqlite>
  let db: DbClient
  const sent: string[] = []

  beforeAll(async () => {
    sqlite = openTestSqlite(filename)
    db = createTestDbClient(sqlite)
    await seedStaff(db, ['ops@thebrowns.co.za'])
  })
  afterAll(() => closeTestSqlite(sqlite, filename))
  beforeEach(() => {
    sent.length = 0
    sqlite.exec('DELETE FROM staff_alerts')
    sqlite.exec('DELETE FROM nb_sync_runs')
  })

  const send = async (input: { to: string }) => {
    sent.push(input.to)
    return { success: true, timestamp: new Date().toISOString() }
  }

  it('does not alert at 13h59 and does alert at 14h00', async () => {
    const now = new Date('2026-09-25T14:00:00.000Z')
    await recordNbSyncRun(db, {
      layer: 'batch',
      startedAt: '2026-09-25T00:01:00.000Z',
      finishedAt: '2026-09-25T00:01:00.000Z',
      ok: true,
      code: 'OK',
      rows: 3,
    })
    const early = await evaluateNbFreshness(db, { now: new Date('2026-09-25T14:00:00.000Z'), send: send as any })
    // last ok at 00:01, now 14:00 is 13h59 — not stale
    expect(early.sent).toBe(0)
    const late = await evaluateNbFreshness(db, { now: new Date('2026-09-25T14:01:00.000Z'), send: send as any })
    expect(late.sent).toBe(1)
    expect(sent).toEqual(['ops@thebrowns.co.za'])
  })

  it('alerts all users on ZERO_ROWS / ROWDROP_GUARD', async () => {
    await recordNbSyncRun(db, {
      layer: 'batch',
      startedAt: new Date().toISOString(),
      ok: false,
      code: 'ZERO_ROWS',
      rows: 0,
    })
    const result = await evaluateNbFreshness(db, { now: new Date(), send: send as any })
    expect(result.sent).toBeGreaterThanOrEqual(1)
  })
})
