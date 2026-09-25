import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import {
  applyProviderReceipt,
  isStuckPending,
  mapProviderStatus,
  plainDeliveryError,
  shouldApplyStatus,
} from '@/lib/delivery-status'
import { ensureDeliverySchema } from '@/lib/delivery-schema'
import type { DbClient } from '@/lib/db'

function createDb() {
  const sqlite = new Database(':memory:')
  sqlite.exec(`
    CREATE TABLE inbound_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER NOT NULL,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      direction TEXT DEFAULT 'outbound',
      from_number TEXT,
      message_text TEXT NOT NULL,
      message_timestamp DATETIME NOT NULL,
      channel TEXT,
      whatsapp_message_id TEXT,
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
    exec: (sql: string) => {
      sqlite.exec(sql)
    },
    batch: () => {},
    type: 'sqlite' as const,
  }
  return { sqlite, db: db as unknown as DbClient }
}

describe('delivery status mapping', () => {
  it('maps queued/sent/accepted to pending', () => {
    expect(mapProviderStatus('queued')?.bubble).toBe('pending')
    expect(mapProviderStatus('sent')?.bubble).toBe('pending')
    expect(mapProviderStatus('accepted')?.bubble).toBe('pending')
    expect(mapProviderStatus('email.sent')?.bubble).toBe('pending')
  })

  it('maps delivered and read', () => {
    expect(mapProviderStatus('delivered')).toEqual({ bubble: 'delivered', read: false })
    expect(mapProviderStatus('read')).toEqual({ bubble: 'delivered', read: true })
    expect(mapProviderStatus('email.opened')).toEqual({ bubble: 'delivered', read: true })
  })

  it('maps failed family including bounce/complain', () => {
    expect(mapProviderStatus('failed')?.bubble).toBe('failed')
    expect(mapProviderStatus('undelivered')?.bubble).toBe('failed')
    expect(mapProviderStatus('email.bounced')?.bubble).toBe('failed')
    expect(mapProviderStatus('email.complained')?.bubble).toBe('failed')
  })

  it('translates common provider errors to plain words', () => {
    expect(plainDeliveryError('63016', 'outside the window')).toBe('outside 24h window')
    expect(plainDeliveryError('21211', 'is not a valid')).toBe('invalid number')
    expect(plainDeliveryError(null, 'bounced')).toBe('email bounced')
  })

  it('ignores out-of-order weaker updates', () => {
    expect(
      shouldApplyStatus({ currentStatus: 'delivered', currentRead: false, next: 'pending' })
    ).toBe(false)
    expect(
      shouldApplyStatus({ currentStatus: 'failed', currentRead: false, next: 'delivered' })
    ).toBe(false)
    expect(
      shouldApplyStatus({ currentStatus: 'delivered', currentRead: true, next: 'delivered', nextRead: false })
    ).toBe(false)
    expect(
      shouldApplyStatus({ currentStatus: 'delivered', currentRead: false, next: 'delivered', nextRead: true })
    ).toBe(true)
    expect(
      shouldApplyStatus({ currentStatus: 'pending', next: 'failed' })
    ).toBe(true)
  })

  it('treats pending past the threshold as stuck', () => {
    const queued = '2026-09-25T00:00:00.000Z'
    expect(isStuckPending('pending', queued, new Date('2026-09-25T00:14:59.000Z'), 15)).toBe(false)
    expect(isStuckPending('pending', queued, new Date('2026-09-25T00:15:00.000Z'), 15)).toBe(true)
    expect(isStuckPending('delivered', queued, new Date('2026-09-25T01:00:00.000Z'), 15)).toBe(false)
  })
})

describe('applyProviderReceipt out-of-order', () => {
  it('does not regress delivered to sent', async () => {
    const { db } = createDb()
    await ensureDeliverySchema(db)
    db.prepare(
      `INSERT INTO inbound_messages (thread_id, message_text, message_timestamp, direction, provider_message_id, delivery_status)
       VALUES (1, 'Hi', '2026-09-25T00:00:00Z', 'outbound', 'SM1', 'delivered')`
    ).run()

    const lateSent = await applyProviderReceipt(db, {
      providerMessageId: 'SM1',
      providerStatus: 'sent',
    })
    expect(lateSent.updated).toBe(false)
    const row = db.prepare(`SELECT delivery_status FROM inbound_messages WHERE provider_message_id = 'SM1'`).get() as {
      delivery_status: string
    }
    expect(row.delivery_status).toBe('delivered')
  })

  it('upgrades delivered to read and keeps the delivered bubble', async () => {
    const { db } = createDb()
    await ensureDeliverySchema(db)
    db.prepare(
      `INSERT INTO inbound_messages (thread_id, message_text, message_timestamp, direction, provider_message_id, delivery_status, delivery_read)
       VALUES (1, 'Hi', '2026-09-25T00:00:00Z', 'outbound', 'SM2', 'delivered', 0)`
    ).run()

    const applied = await applyProviderReceipt(db, {
      providerMessageId: 'SM2',
      providerStatus: 'read',
    })
    expect(applied.updated).toBe(true)
    expect(applied.message?.delivery_status).toBe('delivered')
    expect(applied.message?.delivery_read).toBe(1)
  })
})
