import Database from 'better-sqlite3'
import { createClient } from '@libsql/client'
import type { Client } from '@libsql/client'
import path from 'path'
import fs from 'fs'

// Unified DB interface for both better-sqlite3 and libsql
interface DbStatement {
  run: (...params: any[]) => any | Promise<any>
  get: (...params: any[]) => any | Promise<any>
  all: (...params: any[]) => any[] | Promise<any[]>
  bind?: (...params: any[]) => DbStatement
}

interface BatchStatement {
  sql: string
  args?: any[]
}

export interface DbClient {
  prepare: (sql: string) => DbStatement
  exec: (sql: string) => void | Promise<void>
  batch: (statements: (BatchStatement | DbStatement)[]) => void | Promise<void>
  close?: () => void
  type: 'sqlite' | 'turso'
}

let dbClient: DbClient | null = null
let initPromise: Promise<void> | null = null

const schema = `
  CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    timezone TEXT DEFAULT 'Africa/Johannesburg',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invite_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    code TEXT NOT NULL UNIQUE,
    max_uses INTEGER DEFAULT 1,
    uses_count INTEGER DEFAULT 0,
    expires_at DATETIME,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  );

  CREATE TABLE IF NOT EXISTS waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    property_name TEXT NOT NULL,
    room_count TEXT NOT NULL,
    current_system TEXT,
    phone TEXT,
    notes TEXT,
    invite_code_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (invite_code_id) REFERENCES invite_codes(id)
  );

  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    room_count INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  );

  CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    property_id INTEGER,
    guest_name TEXT NOT NULL,
    guest_email TEXT,
    guest_phone TEXT,
    check_in DATE,
    check_out DATE,
    adults INTEGER DEFAULT 2,
    children INTEGER DEFAULT 0,
    pets BOOLEAN DEFAULT 0,
    special_requests TEXT,
    raw_inquiry TEXT,
    confidence REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (property_id) REFERENCES properties(id)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    inquiry_id INTEGER,
    property_id INTEGER,
    guest_name TEXT NOT NULL,
    guest_name_norm TEXT,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    room_number TEXT,
    suite_or_unit TEXT,
    suite_or_unit_norm TEXT,
    adults INTEGER DEFAULT 2,
    children INTEGER DEFAULT 0,
    notes TEXT,
    late_check_in BOOLEAN DEFAULT 0,
    guest_phone TEXT,
    property_name TEXT,
    status TEXT DEFAULT 'pending',
    nightsbridge_booking_id TEXT,
    last_import_at DATETIME,
    import_batch_id TEXT,
    source TEXT DEFAULT 'nb',
    last_seen_import_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (inquiry_id) REFERENCES inquiries(id),
    FOREIGN KEY (property_id) REFERENCES properties(id)
  );

  CREATE TABLE IF NOT EXISTS rate_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    property_id INTEGER,
    room_type TEXT NOT NULL,
    season TEXT DEFAULT 'standard',
    rate_per_night REAL NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    min_nights INTEGER DEFAULT 1,
    valid_from DATE,
    valid_to DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (property_id) REFERENCES properties(id)
  );

  CREATE INDEX IF NOT EXISTS idx_rate_cards_tenant ON rate_cards(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_rate_cards_property ON rate_cards(property_id);
  CREATE INDEX IF NOT EXISTS idx_rate_cards_dates ON rate_cards(valid_from, valid_to);

  CREATE TABLE IF NOT EXISTS lead_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    tenant_id INTEGER NOT NULL,
    note_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES waitlist(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  );

  CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON lead_notes(lead_id);
  CREATE INDEX IF NOT EXISTS idx_lead_notes_tenant ON lead_notes(tenant_id);
  
  CREATE INDEX IF NOT EXISTS idx_invite_codes_tenant ON invite_codes(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
  CREATE INDEX IF NOT EXISTS idx_waitlist_invite_code ON waitlist(invite_code_id);

  CREATE TABLE IF NOT EXISTS guest_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    last_accessed_at DATETIME,
    revoked BOOLEAN DEFAULT 0,
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
  );

  CREATE INDEX IF NOT EXISTS idx_guest_tokens_booking ON guest_tokens(booking_id);
  CREATE INDEX IF NOT EXISTS idx_guest_tokens_hash ON guest_tokens(token_hash);
  CREATE INDEX IF NOT EXISTS idx_guest_tokens_expires ON guest_tokens(expires_at);

  CREATE TABLE IF NOT EXISTS guest_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    normalized_phone TEXT,
    email TEXT,
    display_name TEXT,
    last_stay_at DATETIME,
    last_suite TEXT,
    source TEXT NOT NULL CHECK(source IN ('nb', 'inbound', 'manual')),
    nbid TEXT,
    retention_years INTEGER NOT NULL DEFAULT 5,
    retention_delete_after DATETIME,
    last_activity_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_contacts_tenant_phone
    ON guest_contacts(tenant_id, normalized_phone)
    WHERE normalized_phone IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_guest_contacts_tenant_email
    ON guest_contacts(tenant_id, email);

  CREATE TABLE IF NOT EXISTS draft_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    thread_id INTEGER NOT NULL,
    message_id INTEGER NOT NULL,
    intent TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK(status IN ('pending', 'claimed', 'done', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_draft_jobs_open_message
    ON draft_jobs(message_id)
    WHERE status IN ('pending', 'claimed');

  CREATE TABLE IF NOT EXISTS send_confirm_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    thread_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    consumed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

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
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
  );

  CREATE INDEX IF NOT EXISTS idx_guest_tickets_tenant ON guest_tickets(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_guest_tickets_status ON guest_tickets(status);
  CREATE INDEX IF NOT EXISTS idx_guest_tickets_category ON guest_tickets(category);
  CREATE INDEX IF NOT EXISTS idx_guest_tickets_booking ON guest_tickets(booking_id);

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
`

/**
 * Split a multi-statement SQL string into individual statements.
 * Handles semicolons carefully - skips empty statements and trims whitespace.
 */
function splitSqlStatements(sql: string): string[] {
  return sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0)
}

function createSqliteClient(): DbClient {
  const dbDir = path.join(process.cwd(), 'data')
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  const dbPath = path.join(dbDir, 'guestflow.db')
  const sqliteDb = new Database(dbPath)
  
  return {
    prepare: (sql: string) => {
      const stmt = sqliteDb.prepare(sql)
      return {
        run: (...params: any[]) => stmt.run(...params),
        get: (...params: any[]) => stmt.get(...params),
        all: (...params: any[]) => stmt.all(...params),
        bind: (...params: any[]) => {
          const bound = stmt.bind(...params)
          return {
            run: (...p: any[]) => bound.run(...p),
            get: (...p: any[]) => bound.get(...p),
            all: (...p: any[]) => bound.all(...p),
          }
        },
      }
    },
    exec: (sql: string) => {
      sqliteDb.exec(sql)
    },
    batch: (statements: (BatchStatement | DbStatement)[]) => {
      const transaction = sqliteDb.transaction(() => {
        for (const stmt of statements) {
          if ('sql' in stmt) {
            const prepared = sqliteDb.prepare(stmt.sql)
            if (stmt.args && stmt.args.length > 0) {
              prepared.run(...stmt.args)
            } else {
              prepared.run()
            }
          } else {
            stmt.run()
          }
        }
      })
      transaction()
    },
    close: () => sqliteDb.close(),
    type: 'sqlite' as const,
  }
}

/**
 * Next.js patches global fetch and can cache @libsql/client HTTP pipeline
 * POSTs (same URL + SQL body). Staff GET then keeps serving sentinel
 * message_text after Turso UPDATEs that a box-token client already sees.
 */
export function noStoreFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, cache: 'no-store' })
}

/** Call-site params win so a leftover bind() cannot pin a stale thread id. */
export function resolveExecuteArgs(boundArgs: unknown[], params: unknown[]): unknown[] {
  return params.length > 0 ? params : boundArgs
}

/** Flatten libsql Row (array-like + getters) to a plain column map. */
export function libsqlRowToPlain(row: unknown, columns: string[] = []): Record<string, unknown> {
  if (!row || typeof row !== 'object') return {}
  const record = row as Record<string, unknown> & { length?: number }
  const out: Record<string, unknown> = {}
  if (columns.length > 0) {
    for (let i = 0; i < columns.length; i++) {
      const name = columns[i]
      const named = record[name]
      out[name] = named !== undefined ? named : (row as ArrayLike<unknown>)[i]
    }
    return out
  }
  if (Array.isArray(row)) return out
  for (const key of Object.keys(record)) {
    if (key === 'length' || /^\d+$/.test(key)) continue
    out[key] = record[key]
  }
  return out
}

export function libsqlRowsToPlain(
  result: { columns?: string[]; rows?: unknown[] }
): Record<string, unknown>[] {
  const columns = result.columns || []
  return (result.rows || []).map((row) => libsqlRowToPlain(row, columns))
}

function createTursoClient(url: string, authToken: string): DbClient {
  const tursoClient = createClient({
    url,
    authToken,
    fetch: noStoreFetch,
  } as Parameters<typeof createClient>[0])

  return {
    prepare: (sql: string) => {
      let boundArgs: any[] = []
      const statement: DbStatement = {
        run: async (...params: any[]) => {
          const args = resolveExecuteArgs(boundArgs, params)
          const result = await tursoClient.execute({ sql, args })
          return {
            changes: result.rowsAffected,
            lastInsertRowid: result.lastInsertRowid,
          }
        },
        get: async (...params: any[]) => {
          const args = resolveExecuteArgs(boundArgs, params)
          const result = await tursoClient.execute({ sql, args })
          const rows = libsqlRowsToPlain(result)
          return rows[0] as any
        },
        all: async (...params: any[]) => {
          const args = resolveExecuteArgs(boundArgs, params)
          const result = await tursoClient.execute({ sql, args })
          return libsqlRowsToPlain(result) as any[]
        },
        bind: (...params: any[]) => {
          boundArgs = params
          return statement
        },
      }
      return statement
    },
    exec: async (sql: string) => {
      // Turso rejects multi-statement exec with SQL_MANY_STATEMENTS error.
      // Split and execute statements individually.
      const statements = splitSqlStatements(sql)
      for (const stmt of statements) {
        await tursoClient.execute(stmt)
      }
    },
    batch: async (statements: (BatchStatement | DbStatement)[]) => {
      const batchStatements = []
      for (const stmt of statements) {
        if ('sql' in stmt) {
          batchStatements.push({
            sql: stmt.sql,
            args: stmt.args || [],
          })
        } else {
          throw new Error('Turso batch requires statements with sql and args properties. Use { sql: "...", args: [...] } format.')
        }
      }
      await tursoClient.batch(batchStatements, 'write')
    },
    close: () => tursoClient.close(),
    type: 'turso' as const,
  }
}

export function getDb(): Database.Database {
  if (dbClient && dbClient.type === 'sqlite') {
    return dbClient as any as Database.Database
  }

  if (process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is set, indicating Turso/remote database. ' +
      'Use async API routes instead. Local SQLite is only for development. ' +
      'For production on Vercel, ensure DATABASE_URL and TURSO_AUTH_TOKEN are set.'
    )
  }

  try {
    dbClient = createSqliteClient()
    dbClient.exec(schema)
    seedDefaultData(dbClient)
    return dbClient as any as Database.Database
  } catch (err: any) {
    if (process.env.VERCEL) {
      throw new Error(
        'SQLite file not supported on Vercel serverless. ' +
        'Set DATABASE_URL and TURSO_AUTH_TOKEN for Turso database. ' +
        'See DEPLOY.md for setup instructions.'
      )
    }
    throw err
  }
}

/**
 * Ensure Phase 17 columns exist in bookings table (Turso-safe runtime migration)
 * 
 * Adds missing columns if they don't exist. Idempotent and safe for Production.
 * Pattern: Same as migrate-outbound-redirect.js
 */
async function ensurePhase17Columns(db: DbClient): Promise<void> {
  // Check if bookings table exists
  const tables = await db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='bookings'
  `).all()
  
  if (tables.length === 0) {
    // Table doesn't exist yet, will be created with full schema
    return
  }

  // Get current columns
  const columns = await db.prepare(`PRAGMA table_info(bookings)`).all() as Array<{ name: string }>
  const columnNames = new Set(columns.map(c => c.name))

  // Phase 17 columns to add
  // Critical columns MUST succeed (fail-closed); non-critical MAY fail
  const phase17Columns = [
    { name: 'guest_name_norm', type: 'TEXT', critical: true },
    { name: 'suite_or_unit_norm', type: 'TEXT', critical: true },
    { name: 'nightsbridge_booking_id', type: 'TEXT', critical: true },
    { name: 'last_import_at', type: 'DATETIME', critical: true },
    { name: 'import_batch_id', type: 'TEXT', critical: true },
    { name: 'source', type: 'TEXT', default: "'nb'", critical: true },
    { name: 'last_seen_import_at', type: 'DATETIME', critical: true },
    { name: 'updated_at', type: 'DATETIME', default: 'CURRENT_TIMESTAMP', critical: true },
  ]

  const failedCriticalColumns: string[] = []

  for (const col of phase17Columns) {
    if (!columnNames.has(col.name)) {
      try {
        const defaultClause = col.default ? ` DEFAULT ${col.default}` : ''
        await db.exec(`ALTER TABLE bookings ADD COLUMN ${col.name} ${col.type}${defaultClause}`)
        console.log(`[ensurePhase17Columns] Added column: bookings.${col.name}`)
      } catch (error: any) {
        const message = `Failed to add column ${col.name}: ${error.message}`
        console.error(`[ensurePhase17Columns] ${message}`)
        
        if (col.critical) {
          // Critical column failure: collect error and fail at end
          failedCriticalColumns.push(col.name)
        }
        // Non-critical columns: log but continue
      }
    }
  }

  // Create indexes if they don't exist (Turso supports CREATE INDEX IF NOT EXISTS)
  try {
    await db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_nbid 
      ON bookings(tenant_id, nightsbridge_booking_id) 
      WHERE nightsbridge_booking_id IS NOT NULL
    `)
    
    await db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_natural_key 
      ON bookings(tenant_id, guest_name_norm, check_in, check_out, suite_or_unit_norm)
    `)
  } catch (error: any) {
    console.error('[ensurePhase17Columns] Index creation failed (non-critical):', error.message)
    // Index creation failures are non-critical if columns exist
  }

  // Fail-closed: if any critical column failed, throw
  if (failedCriticalColumns.length > 0) {
    throw new Error(
      `[ensurePhase17Columns] CRITICAL: Failed to add required columns: ${failedCriticalColumns.join(', ')}. ` +
      'Production UPSERT operations will fail without these columns. Check DB permissions and schema state.'
    )
  }

  console.log('[ensurePhase17Columns] Phase 17 schema migration complete')
}

export async function getDbAsync(): Promise<DbClient> {
  if (dbClient) {
    return dbClient
  }

  if (process.env.DATABASE_URL) {
    const tursoUrl = process.env.DATABASE_URL
    const tursoAuthToken = process.env.TURSO_AUTH_TOKEN

    if (!tursoAuthToken) {
      throw new Error(
        'DATABASE_URL is set but TURSO_AUTH_TOKEN is missing. ' +
        'Set TURSO_AUTH_TOKEN environment variable for Turso authentication. ' +
        'See DEPLOY.md for Turso setup instructions.'
      )
    }

    try {
      dbClient = createTursoClient(tursoUrl, tursoAuthToken)
      
      // Initialize schema, ensure Phase 17 columns, and seed data (async)
      if (!initPromise) {
        initPromise = (async () => {
          await dbClient!.exec(schema)
          await ensurePhase17Columns(dbClient!)
          await seedDefaultDataAsync(dbClient!)
        })()
      }
      await initPromise
      
      return dbClient
    } catch (err: any) {
      throw new Error(
        `Failed to connect to Turso database: ${err.message}. ` +
        'Verify DATABASE_URL and TURSO_AUTH_TOKEN are correct. ' +
        'See DEPLOY.md for Turso setup instructions.'
      )
    }
  }

  // Fallback to SQLite for local dev
  try {
    dbClient = createSqliteClient()
    dbClient.exec(schema)
    await ensurePhase17Columns(dbClient)
    seedDefaultData(dbClient)
    return dbClient
  } catch (err: any) {
    if (process.env.VERCEL) {
      throw new Error(
        'SQLite file not supported on Vercel serverless. ' +
        'Set DATABASE_URL and TURSO_AUTH_TOKEN for Turso database. ' +
        'See DEPLOY.md for setup instructions.'
      )
    }
    throw err
  }
}

function seedDefaultData(db: DbClient) {
  const tenantCount = db.prepare('SELECT COUNT(*) as count FROM tenants').get() as { count: number }
  
  if (tenantCount.count === 0) {
    const insertTenant = db.prepare('INSERT INTO tenants (name, location, timezone) VALUES (?, ?, ?)')
    insertTenant.run('The Browns Luxury Guest Suites (Dullstroom)', 'Dullstroom, Mpumalanga, South Africa', 'Africa/Johannesburg')
  }

  // Sprint 2: do not invent demo lodges (Riverside / Mountain View / Coastal).
  // Real property identity lives on access-codes lockbox rows.
}

async function seedDefaultDataAsync(db: DbClient) {
  const tenantCount = await db.prepare('SELECT COUNT(*) as count FROM tenants').get() as { count: number }
  
  if (tenantCount.count === 0) {
    const insertTenant = db.prepare('INSERT INTO tenants (name, location, timezone) VALUES (?, ?, ?)')
    await insertTenant.run('The Browns Luxury Guest Suites (Dullstroom)', 'Dullstroom, Mpumalanga, South Africa', 'Africa/Johannesburg')
  }

  // Sprint 2: do not invent demo lodges (Riverside / Mountain View / Coastal).
}

export function getDefaultTenantId(): number {
  const db = getDb()
  const tenant = db.prepare('SELECT id FROM tenants WHERE name LIKE ? LIMIT 1').get('%Browns%') as { id: number } | undefined
  return tenant?.id || 1
}

export async function getDefaultTenantIdAsync(): Promise<number> {
  const db = await getDbAsync()
  const tenant = await db.prepare('SELECT id FROM tenants WHERE name LIKE ? LIMIT 1').get('%Browns%') as { id: number } | undefined
  return tenant?.id || 1
}
