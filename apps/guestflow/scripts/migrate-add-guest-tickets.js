#!/usr/bin/env node
/**
 * Migration: Add guest tickets and check-in tracking
 * 
 * Purpose: Support outlier/exception guest messages and late check-in inference
 * 
 * Tables:
 * - guest_tickets: Cases for lost_key, gate_access, maintenance, etc.
 * - guest_checkin_events: Track check-in events from guests group
 * - ticket_playbooks: Templates for each outlier category
 * 
 * Status flow: new → triaged → staff_notified → in_progress → resolved
 */

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const dbDir = path.join(process.cwd(), 'data')

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const dbPath = path.join(dbDir, 'guestflow.db')
const db = new Database(dbPath)

console.log('Running migration: add-guest-tickets')
console.log('Database path:', dbPath)

try {
  // Guest tickets for outlier/exception handling
  db.exec(`
    CREATE TABLE IF NOT EXISTS guest_tickets (
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (thread_id) REFERENCES inbound_threads(id),
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    );

    CREATE INDEX IF NOT EXISTS idx_guest_tickets_tenant ON guest_tickets(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_guest_tickets_status ON guest_tickets(status);
    CREATE INDEX IF NOT EXISTS idx_guest_tickets_category ON guest_tickets(category);
    CREATE INDEX IF NOT EXISTS idx_guest_tickets_booking ON guest_tickets(booking_id);
  `)

  // Check-in events from guests WhatsApp group
  db.exec(`
    CREATE TABLE IF NOT EXISTS guest_checkin_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      booking_id INTEGER,
      guest_name TEXT NOT NULL,
      guest_phone TEXT,
      event_type TEXT NOT NULL,
      event_timestamp DATETIME NOT NULL,
      source TEXT DEFAULT 'guests_group',
      message_text TEXT,
      inferred_status TEXT,
      confidence REAL DEFAULT 0.0,
      verified BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    );

    CREATE INDEX IF NOT EXISTS idx_checkin_events_tenant ON guest_checkin_events(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_checkin_events_booking ON guest_checkin_events(booking_id);
    CREATE INDEX IF NOT EXISTS idx_checkin_events_timestamp ON guest_checkin_events(event_timestamp);
  `)

  // Playbook templates for outlier categories
  db.exec(`
    CREATE TABLE IF NOT EXISTS ticket_playbooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      category TEXT NOT NULL UNIQUE,
      guest_reply_template TEXT NOT NULL,
      staff_brief_template TEXT NOT NULL,
      escalation_contact TEXT,
      auto_priority TEXT DEFAULT 'medium',
      known_facts TEXT,
      ask_staff_flags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE INDEX IF NOT EXISTS idx_playbooks_tenant ON ticket_playbooks(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_playbooks_category ON ticket_playbooks(category);
  `)

  console.log('✅ Migration completed successfully')
  console.log('Created tables:')
  console.log('  - guest_tickets')
  console.log('  - guest_checkin_events')
  console.log('  - ticket_playbooks')

} catch (error) {
  console.error('❌ Migration failed:', error.message)
  process.exit(1)
} finally {
  db.close()
}
