/**
 * Tests for staff alert exclusion filters
 */

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import type { DbClient } from '@/lib/db'
import {
  isTestPhoneThread,
  isSmokeTestThread,
  isEmptyBlockBooking,
  shouldExcludeFromAlerts,
} from '@/lib/staff-alert-filters'
import { TEST_SINK_PHONES } from '@/lib/staff-alerts'

// Test utilities for creating threads, bookings, messages
function createTestDb(): DbClient {
  const db = new Database(':memory:')
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      guest_name TEXT,
      nightsbridge_booking_id TEXT,
      status TEXT
    );
    
    CREATE TABLE IF NOT EXISTS inbound_threads (
      id INTEGER PRIMARY KEY,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      from_number TEXT,
      guest_name TEXT,
      booking_id INTEGER,
      metadata TEXT,
      pending_reply INTEGER DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS inbound_messages (
      id INTEGER PRIMARY KEY,
      thread_id INTEGER NOT NULL,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      direction TEXT,
      is_spam INTEGER DEFAULT 0,
      message_text TEXT,
      message_timestamp TEXT
    );
  `)
  
  return db as unknown as DbClient
}

describe('staff-alert-filters', () => {
  let db: DbClient
  
  beforeEach(() => {
    db = createTestDb()
  })
  
  describe('isTestPhoneThread', () => {
    it('should detect exact test phone matches', () => {
      expect(isTestPhoneThread('+27000000001', new Set(['+27000000001']))).toBe(true)
      expect(isTestPhoneThread('+15124064300', TEST_SINK_PHONES)).toBe(true)
    })
    
    it('should detect test phones with normalization', () => {
      const testPhones = new Set(['+27000000001', '27000000001'])
      expect(isTestPhoneThread('27000000001', testPhones)).toBe(true)
      expect(isTestPhoneThread('+27000000001', testPhones)).toBe(true)
    })
    
    it('should return false for legitimate guest numbers', () => {
      const testPhones = new Set(['+27000000001'])
      expect(isTestPhoneThread('+27821234567', testPhones)).toBe(false)
      expect(isTestPhoneThread('guest@example.com', testPhones)).toBe(false)
    })
    
    it('should handle null and empty values', () => {
      expect(isTestPhoneThread(null, TEST_SINK_PHONES)).toBe(false)
      expect(isTestPhoneThread(undefined, TEST_SINK_PHONES)).toBe(false)
      expect(isTestPhoneThread('', TEST_SINK_PHONES)).toBe(false)
    })
  })
  
  describe('isSmokeTestThread', () => {
    it('should detect T-XX markers in guest_name', () => {
      expect(isSmokeTestThread({ guest_name: 'T-44' })).toBe(true)
      expect(isSmokeTestThread({ guest_name: 'T-48' })).toBe(true)
      expect(isSmokeTestThread({ guest_name: 't-99' })).toBe(true) // case-insensitive
    })
    
    it('should detect thread XX markers in guest_name', () => {
      expect(isSmokeTestThread({ guest_name: 'thread 44' })).toBe(true)
      expect(isSmokeTestThread({ guest_name: 'THREAD 48' })).toBe(true)
    })
    
    it('should detect GF-INBOUND-TEST marker', () => {
      expect(isSmokeTestThread({ guest_name: 'GF-INBOUND-TEST' })).toBe(true)
      expect(isSmokeTestThread({ guest_name: 'gf-inbound-test' })).toBe(true)
    })
    
    it('should detect smoke markers in metadata subject', () => {
      expect(isSmokeTestThread({ metadata: '{"subject":"GF-INBOUND-TEST"}' })).toBe(true)
      expect(isSmokeTestThread({ metadata: '{"subject":"SMOKE test"}' })).toBe(true)
      expect(isSmokeTestThread({ metadata: '{"subject":"TEST message"}' })).toBe(true)
    })
    
    it('should handle invalid JSON in metadata', () => {
      expect(isSmokeTestThread({ metadata: 'invalid json' })).toBe(false)
      expect(isSmokeTestThread({ metadata: '{"other":"field"}' })).toBe(false)
    })
    
    it('should return false for legitimate guest names', () => {
      expect(isSmokeTestThread({ guest_name: 'John Smith' })).toBe(false)
      expect(isSmokeTestThread({ guest_name: 'Jane Doe' })).toBe(false)
    })
    
    it('should handle null and missing fields', () => {
      expect(isSmokeTestThread({ guest_name: null, metadata: null })).toBe(false)
      expect(isSmokeTestThread({})).toBe(false)
    })
  })
  
  describe('isEmptyBlockBooking', () => {
    it('should detect BLOCK booking with 0 messages', async () => {
      // Create BLOCK booking
      db.prepare('INSERT INTO bookings (id, guest_name) VALUES (1, "BLOCK 5376")').run()
      
      // Create thread linked to booking
      db.prepare('INSERT INTO inbound_threads (id, booking_id) VALUES (1, 1)').run()
      
      // No messages created - count is 0
      const result = await isEmptyBlockBooking(db, { id: 1, booking_id: 1 })
      expect(result).toBe(true)
    })
    
    it('should detect owner-block patterns (Nomsa, Sakhile)', async () => {
      // Nomsa owner block
      db.prepare('INSERT INTO bookings (id, guest_name) VALUES (1, "Nomsa 5464")').run()
      db.prepare('INSERT INTO inbound_threads (id, booking_id) VALUES (1, 1)').run()
      expect(await isEmptyBlockBooking(db, { id: 1, booking_id: 1 })).toBe(true)
      
      // Sakhile owner block
      db.prepare('INSERT INTO bookings (id, guest_name) VALUES (2, "Sakhile 5630")').run()
      db.prepare('INSERT INTO inbound_threads (id, booking_id) VALUES (2, 2)').run()
      expect(await isEmptyBlockBooking(db, { id: 2, booking_id: 2 })).toBe(true)
    })
    
    it('should return false for BLOCK booking with messages', async () => {
      db.prepare('INSERT INTO bookings (id, guest_name) VALUES (1, "BLOCK 5376")').run()
      db.prepare('INSERT INTO inbound_threads (id, booking_id) VALUES (1, 1)').run()
      
      // Add inbound message
      db.prepare(`
        INSERT INTO inbound_messages (thread_id, direction, message_text, message_timestamp)
        VALUES (1, 'inbound', 'Test message', '2026-09-25T10:00:00Z')
      `).run()
      
      const result = await isEmptyBlockBooking(db, { id: 1, booking_id: 1 })
      expect(result).toBe(false) // Has messages, should NOT be excluded
    })
    
    it('should exclude spam and outbound messages from count', async () => {
      db.prepare('INSERT INTO bookings (id, guest_name) VALUES (1, "BLOCK")').run()
      db.prepare('INSERT INTO inbound_threads (id, booking_id) VALUES (1, 1)').run()
      
      // Add spam message (should not count)
      db.prepare(`
        INSERT INTO inbound_messages (thread_id, direction, is_spam, message_text, message_timestamp)
        VALUES (1, 'inbound', 1, 'Spam', '2026-09-25T10:00:00Z')
      `).run()
      
      // Add outbound message (should not count)
      db.prepare(`
        INSERT INTO inbound_messages (thread_id, direction, message_text, message_timestamp)
        VALUES (1, 'outbound', 'Staff reply', '2026-09-25T10:01:00Z')
      `).run()
      
      const result = await isEmptyBlockBooking(db, { id: 1, booking_id: 1 })
      expect(result).toBe(true) // Still empty (no valid inbound messages)
    })
    
    it('should return false for non-BLOCK bookings', async () => {
      db.prepare('INSERT INTO bookings (id, guest_name) VALUES (1, "John Smith")').run()
      db.prepare('INSERT INTO inbound_threads (id, booking_id) VALUES (1, 1)').run()
      
      const result = await isEmptyBlockBooking(db, { id: 1, booking_id: 1 })
      expect(result).toBe(false)
    })
    
    it('should return false for threads without booking_id', async () => {
      db.prepare('INSERT INTO inbound_threads (id, booking_id) VALUES (1, NULL)').run()
      
      const result = await isEmptyBlockBooking(db, { id: 1, booking_id: null })
      expect(result).toBe(false)
    })
  })
  
  describe('shouldExcludeFromAlerts (combined)', () => {
    const testPhones = new Set(['+27000000001', '27000000001'])
    
    it('should exclude test phone threads', async () => {
      db.prepare('INSERT INTO inbound_threads (id, from_number) VALUES (1, "+27000000001")').run()
      
      const result = await shouldExcludeFromAlerts(
        db,
        { id: 1, from_number: '+27000000001' },
        testPhones
      )
      expect(result).toBe(true)
    })
    
    it('should exclude smoke test threads', async () => {
      db.prepare('INSERT INTO inbound_threads (id, guest_name) VALUES (1, "T-48")').run()
      
      const result = await shouldExcludeFromAlerts(
        db,
        { id: 1, guest_name: 'T-48' },
        testPhones
      )
      expect(result).toBe(true)
    })
    
    it('should exclude empty BLOCK bookings', async () => {
      db.prepare('INSERT INTO bookings (id, guest_name) VALUES (1, "BLOCK 5376")').run()
      db.prepare('INSERT INTO inbound_threads (id, booking_id) VALUES (1, 1)').run()
      
      const result = await shouldExcludeFromAlerts(
        db,
        { id: 1, booking_id: 1 },
        testPhones
      )
      expect(result).toBe(true)
    })
    
    it('should NOT exclude legitimate guest threads', async () => {
      db.prepare('INSERT INTO inbound_threads (id, from_number, guest_name) VALUES (1, "+27821234567", "Jane Doe")').run()
      
      const result = await shouldExcludeFromAlerts(
        db,
        { id: 1, from_number: '+27821234567', guest_name: 'Jane Doe' },
        testPhones
      )
      expect(result).toBe(false)
    })
  })
})
