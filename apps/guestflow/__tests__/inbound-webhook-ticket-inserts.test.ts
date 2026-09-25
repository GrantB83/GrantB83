import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'

/**
 * The live webhook INSERTs at ~260 (timeout) and ~481 (missing rate card)
 * must succeed on the db.ts guest_tickets columns.
 */
const TIMEOUT_SQL = `
  INSERT INTO guest_tickets (
    tenant_id, thread_id, guest_name, guest_phone,
    category, priority, status, subject, description, staff_brief
  ) VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)
`

describe('webhook guest_tickets inserts vs db.ts schema', () => {
  let sqlite: Database.Database

  beforeEach(() => {
    sqlite = new Database(':memory:')
    sqlite.exec(`
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
  })

  afterEach(() => {
    sqlite.close()
  })

  it('timeout path insert uses existing columns only', () => {
    const result = sqlite.prepare(TIMEOUT_SQL).run(
      1,
      10,
      'Unknown Guest',
      '+27821234567',
      'timeout',
      'medium',
      'Classification Timeout - +27821234567',
      'Hello',
      'Classification timeout after 5000ms. Manual review required.'
    )
    expect(Number(result.lastInsertRowid)).toBeGreaterThan(0)
    const row = sqlite.prepare('SELECT category, subject, staff_brief FROM guest_tickets WHERE id = ?').get(
      result.lastInsertRowid
    ) as { category: string; subject: string; staff_brief: string }
    expect(row.category).toBe('timeout')
    expect(row.subject).toContain('Classification Timeout')
    expect(row.staff_brief).toContain('Manual review')
  })

  it('missing-rate-card path insert uses existing columns only', () => {
    const result = sqlite.prepare(TIMEOUT_SQL).run(
      1,
      10,
      'Unknown Guest',
      '+27821234567',
      'missing_rate_card',
      'high',
      'Missing Rate Card - Guest',
      'Dates for next month',
      'No rate card found for requested dates. Manually quote; do not invent rates.'
    )
    expect(Number(result.lastInsertRowid)).toBeGreaterThan(0)
    const row = sqlite.prepare('SELECT category, priority FROM guest_tickets WHERE id = ?').get(
      result.lastInsertRowid
    ) as { category: string; priority: string }
    expect(row.category).toBe('missing_rate_card')
    expect(row.priority).toBe('high')
  })
})
