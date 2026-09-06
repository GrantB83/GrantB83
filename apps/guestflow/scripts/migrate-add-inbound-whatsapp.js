#!/usr/bin/env node
/**
 * Migration: Add inbound WhatsApp message tables
 * 
 * Purpose: Support intake pipeline for old WhatsApp number (+27836458313)
 * 
 * Tables:
 * - inbound_threads: Conversation threads from WhatsApp/SMS/email
 * - inbound_messages: Individual messages within threads
 * 
 * Status flow: new → classified → drafted → approved → sent/failed
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

console.log('Running migration: add-inbound-whatsapp')
console.log('Database path:', dbPath)

try {
  // Inbound conversation threads
  db.exec(`
    CREATE TABLE IF NOT EXISTS inbound_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      external_id TEXT UNIQUE,
      source TEXT NOT NULL DEFAULT 'legacy_wa',
      from_number TEXT NOT NULL,
      guest_name TEXT,
      intent TEXT,
      confidence REAL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'new',
      assigned_to TEXT,
      first_message_at DATETIME,
      last_message_at DATETIME,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE INDEX IF NOT EXISTS idx_inbound_threads_tenant ON inbound_threads(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_inbound_threads_status ON inbound_threads(status);
    CREATE INDEX IF NOT EXISTS idx_inbound_threads_source ON inbound_threads(source);
    CREATE INDEX IF NOT EXISTS idx_inbound_threads_from ON inbound_threads(from_number);
    CREATE INDEX IF NOT EXISTS idx_inbound_threads_intent ON inbound_threads(intent);
  `)

  // Individual messages within threads
  db.exec(`
    CREATE TABLE IF NOT EXISTS inbound_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER NOT NULL,
      tenant_id INTEGER NOT NULL,
      direction TEXT NOT NULL DEFAULT 'inbound',
      from_number TEXT NOT NULL,
      to_number TEXT,
      message_text TEXT NOT NULL,
      media_refs TEXT,
      message_timestamp DATETIME NOT NULL,
      external_message_id TEXT,
      is_classified BOOLEAN DEFAULT 0,
      classification_result TEXT,
      draft_reply TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (thread_id) REFERENCES inbound_threads(id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE INDEX IF NOT EXISTS idx_inbound_messages_thread ON inbound_messages(thread_id);
    CREATE INDEX IF NOT EXISTS idx_inbound_messages_tenant ON inbound_messages(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_inbound_messages_timestamp ON inbound_messages(message_timestamp);
    CREATE INDEX IF NOT EXISTS idx_inbound_messages_direction ON inbound_messages(direction);
  `)

  // Classified intents and extracted data
  db.exec(`
    CREATE TABLE IF NOT EXISTS message_classifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      thread_id INTEGER NOT NULL,
      intent TEXT NOT NULL,
      confidence REAL DEFAULT 0.0,
      extracted_data TEXT,
      missing_fields TEXT,
      classifier_version TEXT DEFAULT 'v1-heuristic',
      classified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES inbound_messages(id),
      FOREIGN KEY (thread_id) REFERENCES inbound_threads(id)
    );

    CREATE INDEX IF NOT EXISTS idx_classifications_message ON message_classifications(message_id);
    CREATE INDEX IF NOT EXISTS idx_classifications_thread ON message_classifications(thread_id);
    CREATE INDEX IF NOT EXISTS idx_classifications_intent ON message_classifications(intent);
  `)

  console.log('✅ Migration completed successfully')
  console.log('Created tables:')
  console.log('  - inbound_threads')
  console.log('  - inbound_messages')
  console.log('  - message_classifications')

} catch (error) {
  console.error('❌ Migration failed:', error.message)
  process.exit(1)
} finally {
  db.close()
}
