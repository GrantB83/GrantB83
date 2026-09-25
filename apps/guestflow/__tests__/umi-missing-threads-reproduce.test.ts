import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { listInboxThreads, getThreadDetail } from '@/lib/umi-threads'
import { ensureUmiSchema } from '@/lib/umi-schema'

describe('Missing threads reproduction (48-50)', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    ensureUmiSchema(db)

    // Create bookings table
    db.exec(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        guest_name TEXT,
        guest_phone TEXT,
        guest_email TEXT,
        check_in TEXT,
        check_out TEXT,
        suite_or_unit TEXT,
        nightsbridge_booking_id TEXT,
        status TEXT
      )
    `)

    // Create a booking for thread 50
    db.prepare(`
      INSERT INTO bookings (id, tenant_id, guest_name, check_in, check_out, status)
      VALUES (10, 1, 'Test Guest', '2026-10-01', '2026-10-03', 'confirmed')
    `).run()
  })

  it('returns threads 48-50 even when they have NO messages', async () => {
    // Create threads 1-51, but specifically test 48-50 with status='drafted'
    // and NO messages in inbound_messages table

    // Create threads 1-47 (normal threads with messages)
    for (let i = 1; i <= 47; i++) {
      db.prepare(`
        INSERT INTO inbound_threads (
          id, tenant_id, source, from_number, guest_name, status,
          first_message_at, last_message_at, thread_kind,
          last_channel, last_inbound_channel, last_inbound_at, pending_reply
        ) VALUES (?, 1, 'whatsapp', '+27821234567', 'Guest ${i}', 'new',
                  '2026-09-01T10:00:00Z', '2026-09-01T10:00:00Z', 'temp',
                  'whatsapp_cloud', 'whatsapp_cloud', '2026-09-01T10:00:00Z', 1)
      `).run(i)

      // Add a message for each thread
      db.prepare(`
        INSERT INTO inbound_messages (
          thread_id, tenant_id, direction, channel, from_number,
          message_text, message_timestamp
        ) VALUES (?, 1, 'inbound', 'whatsapp_cloud', '+27821234567',
                  'Test message ${i}', '2026-09-01T10:00:00Z')
      `).run(i)
    }

    // Create thread 48: temp thread, status='drafted', NO messages
    db.prepare(`
      INSERT INTO inbound_threads (
        id, tenant_id, source, from_number, guest_name, status,
        first_message_at, last_message_at, thread_kind,
        last_channel, last_inbound_channel, last_inbound_at, pending_reply
      ) VALUES (48, 1, 'email', 'ops@example.com', null, 'drafted',
                '2026-09-25T08:00:00Z', '2026-09-25T08:00:00Z', 'temp',
                'email', 'email', '2026-09-25T08:00:00Z', 1)
    `).run()

    // Create thread 49: temp thread, status='drafted', NO messages, with metadata
    db.prepare(`
      INSERT INTO inbound_threads (
        id, tenant_id, source, from_number, guest_name, status,
        first_message_at, last_message_at, thread_kind,
        last_channel, last_inbound_channel, last_inbound_at, pending_reply, metadata
      ) VALUES (49, 1, 'email', 'grant830318@gmail.com', null, 'drafted',
                '2026-09-25T08:00:00Z', '2026-09-25T08:00:00Z', 'temp',
                'email', 'email', '2026-09-25T08:00:00Z', 1, '{"subject":"DIRECT2 test"}')
    `).run()

    // Create thread 50: booking thread, status='drafted', booking_id=10, NO messages
    db.prepare(`
      INSERT INTO inbound_threads (
        id, tenant_id, source, from_number, guest_name, status, booking_id,
        first_message_at, last_message_at, thread_kind,
        last_channel, last_inbound_channel, last_inbound_at, pending_reply
      ) VALUES (50, 1, 'whatsapp', '+27821111111', 'Test Guest', 'drafted', 10,
                '2026-09-25T09:00:00Z', '2026-09-25T09:00:00Z', 'booking',
                'whatsapp_cloud', 'whatsapp_cloud', '2026-09-25T09:00:00Z', 1)
    `).run()

    // Create thread 51 (to test that we don't stop at 50)
    db.prepare(`
      INSERT INTO inbound_threads (
        id, tenant_id, source, from_number, guest_name, status,
        first_message_at, last_message_at, thread_kind,
        last_channel, last_inbound_channel, last_inbound_at, pending_reply
      ) VALUES (51, 1, 'whatsapp', '+27821234568', 'Guest 51', 'new',
                '2026-09-01T10:00:00Z', '2026-09-01T10:00:00Z', 'temp',
                'whatsapp_cloud', 'whatsapp_cloud', '2026-09-01T10:00:00Z', 1)
    `).run()

    db.prepare(`
      INSERT INTO inbound_messages (
        thread_id, tenant_id, direction, channel, from_number,
        message_text, message_timestamp
      ) VALUES (51, 1, 'inbound', 'whatsapp_cloud', '+27821234568',
                'Test message 51', '2026-09-01T10:00:00Z')
    `).run()

    // Test 1: Raw query should return all 51 threads
    const rawRows = db
      .prepare(
        `SELECT COUNT(*) as count FROM inbound_threads WHERE tenant_id = 1 AND COALESCE(status, '') <> 'linked'`
      )
      .get() as { count: number }
    expect(rawRows.count).toBe(51)

    const rawMaxId = db
      .prepare(`SELECT MAX(id) as max_id FROM inbound_threads WHERE tenant_id = 1`)
      .get() as { max_id: number }
    expect(rawMaxId.max_id).toBe(51)

    // Test 2: LEFT JOIN query should return all 51 threads
    const joinRows = db
      .prepare(
        `SELECT t.id, t.thread_kind, t.status, t.booking_id
         FROM inbound_threads t
         LEFT JOIN bookings b ON b.id = t.booking_id
         WHERE t.tenant_id = 1
           AND COALESCE(t.status, '') <> 'linked'`
      )
      .all() as Array<{ id: number }>
    expect(joinRows.length).toBe(51)
    expect(joinRows.map((r) => r.id)).toContain(48)
    expect(joinRows.map((r) => r.id)).toContain(49)
    expect(joinRows.map((r) => r.id)).toContain(50)
    expect(joinRows.map((r) => r.id)).toContain(51)

    // Test 3: listInboxThreads should return all 51 threads
    const threads = await listInboxThreads(db, 1)
    expect(threads.length).toBe(51)

    const threadIds = threads.map((t) => t.id)
    expect(threadIds).toContain(48)
    expect(threadIds).toContain(49)
    expect(threadIds).toContain(50)
    expect(threadIds).toContain(51)

    // Test 4: Verify thread 48 properties
    const thread48 = threads.find((t) => t.id === 48)
    expect(thread48).toBeDefined()
    expect(thread48?.threadKind).toBe('temp')
    expect(thread48?.fromNumber).toBe('ops@example.com')
    expect(thread48?.preview).toBe('') // No messages

    // Test 5: Verify thread 49 properties
    const thread49 = threads.find((t) => t.id === 49)
    expect(thread49).toBeDefined()
    expect(thread49?.threadKind).toBe('temp')
    expect(thread49?.fromNumber).toBe('grant830318@gmail.com')
    expect(thread49?.preview).toBe('') // No messages

    // Test 6: Verify thread 50 properties
    const thread50 = threads.find((t) => t.id === 50)
    expect(thread50).toBeDefined()
    expect(thread50?.threadKind).toBe('booking')
    expect(thread50?.bookingId).toBe(10)
    expect(thread50?.bookerName).toBe('Test Guest')
    expect(thread50?.preview).toBe('') // No messages

    // Test 7: getThreadDetail should work for thread 49
    const detail49 = await getThreadDetail(db, 1, 49)
    expect(detail49).not.toBeNull()
    expect(detail49?.id).toBe(49)
    expect(detail49?.messages).toEqual([])
  })

  it('handles threads with draft_jobs but no inbound_messages', async () => {
    // Create thread 48 with a draft_job but no messages
    db.prepare(`
      INSERT INTO inbound_threads (
        id, tenant_id, source, from_number, guest_name, status,
        first_message_at, last_message_at, thread_kind,
        last_channel, last_inbound_channel, last_inbound_at, pending_reply
      ) VALUES (48, 1, 'email', 'ops@example.com', null, 'drafted',
                '2026-09-25T08:00:00Z', '2026-09-25T08:00:00Z', 'temp',
                'email', 'email', '2026-09-25T08:00:00Z', 1)
    `).run()

    // Create draft_jobs table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS draft_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        thread_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        draft_body TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Add a draft job for thread 48
    db.prepare(`
      INSERT INTO draft_jobs (tenant_id, thread_id, status, draft_body)
      VALUES (1, 48, 'pending', 'This is a draft message')
    `).run()

    const threads = await listInboxThreads(db, 1)
    const thread48 = threads.find((t) => t.id === 48)
    expect(thread48).toBeDefined()
    expect(thread48?.preview).toBe('')
  })
})
