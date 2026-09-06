const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const dbDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const dbPath = path.join(dbDir, 'guestflow.db')
const db = new Database(dbPath)

console.log('Running P0+P1 schema migrations...')

db.exec(`
  -- Audit log table
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    content_before TEXT,
    content_after TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  );

  CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON audit_log(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
  CREATE INDEX IF NOT EXISTS idx_audit_log_item ON audit_log(item_type, item_id);

  -- Guest tickets table (for exceptions)
  CREATE TABLE IF NOT EXISTS guest_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    thread_id INTEGER,
    booking_id INTEGER,
    guest_name TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
    problem_description TEXT,
    context_found TEXT,
    reason_stopped TEXT,
    suggested_next_step TEXT,
    guest_draft TEXT,
    staff_brief TEXT,
    staff_brief_ready BOOLEAN DEFAULT 0,
    status TEXT DEFAULT 'new' CHECK(status IN ('new', 'triaged', 'staff_notified', 'in_progress', 'resolved')),
    assigned_to TEXT,
    resolved_at DATETIME,
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (thread_id) REFERENCES inbound_threads(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
  );

  CREATE INDEX IF NOT EXISTS idx_guest_tickets_tenant ON guest_tickets(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_guest_tickets_status ON guest_tickets(status);
  CREATE INDEX IF NOT EXISTS idx_guest_tickets_created ON guest_tickets(created_at);

  -- Inbound messages table (if not exists)
  CREATE TABLE IF NOT EXISTS inbound_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    from_number TEXT NOT NULL,
    from_name TEXT,
    text TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_classified BOOLEAN DEFAULT 0,
    intent TEXT,
    confidence REAL DEFAULT 0,
    draft_reply TEXT,
    status TEXT DEFAULT 'new' CHECK(status IN ('new', 'classified', 'drafted', 'approved', 'rejected', 'escalated', 'sent', 'closed')),
    metadata TEXT DEFAULT '{}',
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  );

  CREATE INDEX IF NOT EXISTS idx_inbound_messages_tenant ON inbound_messages(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_inbound_messages_status ON inbound_messages(status);
  CREATE INDEX IF NOT EXISTS idx_inbound_messages_timestamp ON inbound_messages(timestamp);

  -- Inbound threads table (grouped messages)
  CREATE TABLE IF NOT EXISTS inbound_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    from_number TEXT NOT NULL,
    source TEXT DEFAULT 'whatsapp',
    intent TEXT,
    confidence REAL DEFAULT 0,
    status TEXT DEFAULT 'new',
    assigned_to TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  );

  CREATE INDEX IF NOT EXISTS idx_inbound_threads_tenant ON inbound_threads(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_inbound_threads_status ON inbound_threads(status);

  -- P1: Welcome drafts table (auto-enqueued from NB ingest)
  CREATE TABLE IF NOT EXISTS welcome_drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    booking_id INTEGER,
    guest_name TEXT NOT NULL,
    guest_phone TEXT,
    draft_message TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_approval' CHECK(status IN ('pending_approval', 'approved', 'rejected', 'sent')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    approved_by TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
  );

  CREATE INDEX IF NOT EXISTS idx_welcome_drafts_tenant ON welcome_drafts(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_welcome_drafts_status ON welcome_drafts(status);

  -- P1: Late check-in drafts table (auto-enqueued from NB ingest)
  CREATE TABLE IF NOT EXISTS late_checkin_drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    booking_id INTEGER,
    guest_name TEXT NOT NULL,
    guest_phone TEXT,
    draft_message TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_approval' CHECK(status IN ('pending_approval', 'approved', 'rejected', 'sent')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    approved_by TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
  );

  CREATE INDEX IF NOT EXISTS idx_late_checkin_drafts_tenant ON late_checkin_drafts(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_late_checkin_drafts_status ON late_checkin_drafts(status);

  -- P1: Rate cards table (for booking_inquiry quote generation)
  CREATE TABLE IF NOT EXISTS rate_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    property_name TEXT NOT NULL,
    rate_per_night REAL NOT NULL,
    valid_from DATE,
    valid_to DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  );

  CREATE INDEX IF NOT EXISTS idx_rate_cards_tenant ON rate_cards(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_rate_cards_dates ON rate_cards(valid_from, valid_to);
`)

console.log('✓ P0+P1 schema migrations completed (idempotent)')
console.log('✓ Tables: audit_log, guest_tickets, inbound_messages, inbound_threads')
console.log('✓ P1 Tables: welcome_drafts, late_checkin_drafts, rate_cards')
console.log('')
console.log('📝 Next steps:')
console.log('   1. Document this run in docs/STAFF-RUNBOOK.md')
console.log('   2. Add rate cards via SQL: INSERT INTO rate_cards ...')
console.log('   3. Test approval queue at /needs-approval')
console.log('   4. Test NB ingest cron: POST /api/cron/nightsbridge-ingest')

db.close()
