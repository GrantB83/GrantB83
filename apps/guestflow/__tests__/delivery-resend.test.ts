import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import { NextRequest } from 'next/server'
import { POST as resendPost } from '@/app/api/inbound/resend/route'
import { consumeConfirmToken, issueConfirmToken } from '@/lib/confirm-token'
import { ensureDeliverySchema } from '@/lib/delivery-schema'
import { ensurePhase0Schema } from '@/lib/phase0-schema'
import { isStuckPending } from '@/lib/delivery-status'
import type { DbClient } from '@/lib/db'

const sendWhatsAppMessage = vi.fn()
const getWindowState = vi.fn()
const findApprovedTemplateFor = vi.fn()

vi.mock('@/lib/whatsapp', () => ({
  sendWhatsAppMessage: (...args: unknown[]) => sendWhatsAppMessage(...args),
}))

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
  isEmailAddress: () => true,
  extractEmailAddress: (value: string) => value,
}))

vi.mock('@/lib/sms', () => ({
  sendSms: vi.fn(),
}))

vi.mock('@/lib/send-jobs', () => ({
  createQueuedJob: vi.fn(),
}))

vi.mock('@/lib/umi-threads', () => ({
  markThreadOutbound: vi.fn(async () => {}),
}))

vi.mock('@/lib/umi-schema', () => ({
  ensureUmiSchema: vi.fn(async () => {}),
}))

vi.mock('@/lib/wa-window', () => ({
  getWindowState: (...args: unknown[]) => getWindowState(...args),
  findApprovedTemplateFor: (...args: unknown[]) => findApprovedTemplateFor(...args),
}))

vi.mock('@/lib/staff-identity', () => ({
  getStaffIdentityFromRequest: async () => ({
    actor: 'Grant',
    email: 'grant@thebrowns.co.za',
    source: 'staff-session',
  }),
  getStaffIdentity: () => ({ actor: 'Grant', source: 'legacy-staff' }),
}))

let testDb: ReturnType<typeof createDb>['db']

vi.mock('@/lib/db', () => ({
  getDbAsync: vi.fn(async () => testDb),
}))

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
      whatsapp_provider TEXT,
      whatsapp_message_id TEXT,
      send_error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE inbound_threads (
      id INTEGER PRIMARY KEY,
      guest_name TEXT
    );
    CREATE TABLE send_confirm_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      thread_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      consumed_at DATETIME,
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

async function seedFailed(db: ReturnType<typeof createDb>['db'], id = 1) {
  await ensurePhase0Schema(db)
  await ensureDeliverySchema(db)
  db.prepare(`INSERT OR IGNORE INTO inbound_threads (id, guest_name) VALUES (7, 'Test Guest')`).run()
  db.prepare(
    `INSERT INTO inbound_messages (
      id, thread_id, message_text, message_timestamp, direction, channel, from_number,
      delivery_status, queued_at, provider_message_id
    ) VALUES (?, 7, 'Same body', '2026-09-25T00:00:00Z', 'outbound', 'whatsapp_cloud', '+27820000000', 'failed', '2026-09-25T00:00:00Z', 'SM-orig')`
  ).run(id)
}

describe('resend confirmToken + idempotency + window', () => {
  beforeEach(async () => {
    const created = createDb()
    testDb = created.db
    sendWhatsAppMessage.mockReset()
    getWindowState.mockReset()
    findApprovedTemplateFor.mockReset()
    getWindowState.mockResolvedValue({ open: true })
    findApprovedTemplateFor.mockResolvedValue(null)
    sendWhatsAppMessage.mockResolvedValue({
      success: true,
      messageId: 'SM-resend',
      timestamp: '2026-09-25T01:00:00Z',
      provider: 'sandbox',
      redirected: true,
    })
    await seedFailed(testDb)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('rejects a missing confirmToken and does not send', async () => {
    const request = new NextRequest('https://guestflow.example/api/inbound/resend', {
      method: 'POST',
      body: JSON.stringify({ messageId: 1 }),
    })
    const response = await resendPost(request)
    const data = await response.json()
    expect(response.status).toBe(400)
    expect(data.error).toContain('confirmToken')
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
  })

  it('rejects confirmToken reuse', async () => {
    const issued = await issueConfirmToken(testDb, { threadId: 7 })
    const first = await consumeConfirmToken(testDb, { threadId: 7, confirmToken: issued.confirmToken })
    expect(first.ok).toBe(true)
    const request = new NextRequest('https://guestflow.example/api/inbound/resend', {
      method: 'POST',
      body: JSON.stringify({ messageId: 1, confirmToken: issued.confirmToken }),
    })
    const response = await resendPost(request)
    const data = await response.json()
    expect(response.status).toBe(400)
    expect(data.error).toContain('confirmToken')
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
  })

  it('sends once and rejects a second in-flight resend', async () => {
    const firstToken = await issueConfirmToken(testDb, { threadId: 7 })
    const first = await resendPost(
      new NextRequest('https://guestflow.example/api/inbound/resend', {
        method: 'POST',
        body: JSON.stringify({ messageId: 1, confirmToken: firstToken.confirmToken }),
      })
    )
    const firstData = await first.json()
    expect(first.ok).toBe(true)
    expect(firstData.success).toBe(true)
    expect(firstData.data.resendOf).toBe(1)
    expect(firstData.data.resentBy).toBe('Grant')
    expect(sendWhatsAppMessage).toHaveBeenCalledTimes(1)

    const secondToken = await issueConfirmToken(testDb, { threadId: 7 })
    const second = await resendPost(
      new NextRequest('https://guestflow.example/api/inbound/resend', {
        method: 'POST',
        body: JSON.stringify({ messageId: 1, confirmToken: secondToken.confirmToken }),
      })
    )
    expect(second.status).toBe(409)
    expect(sendWhatsAppMessage).toHaveBeenCalledTimes(1)
  })

  it('offers a template and does not send when the window interface is closed', async () => {
    getWindowState.mockResolvedValue({ open: false })
    findApprovedTemplateFor.mockResolvedValue({ name: 'stay_packet_link', language: 'en' })
    const token = await issueConfirmToken(testDb, { threadId: 7 })
    const response = await resendPost(
      new NextRequest('https://guestflow.example/api/inbound/resend', {
        method: 'POST',
        body: JSON.stringify({ messageId: 1, confirmToken: token.confirmToken }),
      })
    )
    const data = await response.json()
    expect(response.status).toBe(409)
    expect(data.windowClosed).toBe(true)
    expect(data.template).toEqual({ name: 'stay_packet_link', language: 'en' })
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
    expect(getWindowState).toHaveBeenCalledWith(expect.anything(), 7)
    expect(findApprovedTemplateFor).toHaveBeenCalled()
  })

  it('requires acknowledgeDuplicate for stuck pending', async () => {
    testDb
      .prepare(`UPDATE inbound_messages SET delivery_status = 'pending', queued_at = '2026-09-24T00:00:00Z' WHERE id = 1`)
      .run()
    expect(isStuckPending('pending', '2026-09-24T00:00:00Z', new Date('2026-09-25T00:00:00Z'), 15)).toBe(true)
    const token = await issueConfirmToken(testDb, { threadId: 7 })
    const response = await resendPost(
      new NextRequest('https://guestflow.example/api/inbound/resend', {
        method: 'POST',
        body: JSON.stringify({ messageId: 1, confirmToken: token.confirmToken }),
      })
    )
    const data = await response.json()
    expect(response.status).toBe(400)
    expect(data.duplicateWarning).toBe(true)
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
  })
})
