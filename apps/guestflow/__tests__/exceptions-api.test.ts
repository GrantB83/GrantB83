import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import { NextRequest } from 'next/server'

function wrapDb(sqlite: Database.Database) {
  return {
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
}

const getDbAsync = vi.fn()

vi.mock('@/lib/db', () => ({
  getDbAsync: (...args: unknown[]) => getDbAsync(...args),
}))

describe('/api/exceptions live schema', () => {
  let sqlite: Database.Database

  beforeEach(() => {
    sqlite = new Database(':memory:')
    sqlite.exec(`
      CREATE TABLE tenants (id INTEGER PRIMARY KEY, name TEXT);
      INSERT INTO tenants (id, name) VALUES (1, 'Browns');
      CREATE TABLE guest_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        thread_id INTEGER,
        booking_id INTEGER,
        guest_name TEXT,
        guest_phone TEXT,
        category TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'new',
        subject TEXT,
        description TEXT,
        guest_draft_reply TEXT,
        staff_brief TEXT,
        staff_brief_ready BOOLEAN DEFAULT 0,
        escalation_contact TEXT,
        assigned_to TEXT,
        resolved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `)
    sqlite
      .prepare(
        `INSERT INTO guest_tickets (tenant_id, category, priority, status, guest_name, subject, description, staff_brief)
         VALUES (1, 'timeout', 'high', 'new', 'Ada Booker', 'Classification Timeout', 'Need review', 'Staff brief')`
      )
      .run()
    getDbAsync.mockResolvedValue(wrapDb(sqlite))
  })

  afterEach(() => {
    sqlite.close()
  })

  it('GET returns 200 against db.ts guest_tickets columns', async () => {
    const { GET } = await import('@/app/api/exceptions/route')
    const response = await GET(new NextRequest('http://localhost:3100/api/exceptions?tenant_id=1'))
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.exceptions).toHaveLength(1)
    expect(data.exceptions[0].whatAsked).toBe('Classification Timeout')
  })

  it('PATCH succeeds when audit_log is absent', async () => {
    const { PATCH } = await import('@/app/api/exceptions/route')
    const response = await PATCH(
      new NextRequest('http://localhost:3100/api/exceptions', {
        method: 'PATCH',
        body: JSON.stringify({ exceptionId: 1, status: 'triaged' }),
      })
    )
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    const row = sqlite.prepare('SELECT status FROM guest_tickets WHERE id = 1').get() as { status: string }
    expect(row.status).toBe('triaged')
  })
})
