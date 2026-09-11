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

interface DbClient {
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
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    room_number TEXT,
    suite_or_unit TEXT,
    adults INTEGER DEFAULT 2,
    children INTEGER DEFAULT 0,
    notes TEXT,
    late_check_in BOOLEAN DEFAULT 0,
    guest_phone TEXT,
    property_name TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
`

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

function createTursoClient(url: string, authToken: string): DbClient {
  const tursoClient = createClient({
    url,
    authToken,
  })

  return {
    prepare: (sql: string) => {
      let boundArgs: any[] = []
      const statement: DbStatement = {
        run: async (...params: any[]) => {
          const args = boundArgs.length > 0 ? boundArgs : params
          const result = await tursoClient.execute({ sql, args })
          return {
            changes: result.rowsAffected,
            lastInsertRowid: result.lastInsertRowid,
          }
        },
        get: async (...params: any[]) => {
          const args = boundArgs.length > 0 ? boundArgs : params
          const result = await tursoClient.execute({ sql, args })
          return result.rows[0] as any
        },
        all: async (...params: any[]) => {
          const args = boundArgs.length > 0 ? boundArgs : params
          const result = await tursoClient.execute({ sql, args })
          return result.rows as any[]
        },
        bind: (...params: any[]) => {
          boundArgs = params
          return statement
        },
      }
      return statement
    },
    exec: async (sql: string) => {
      await tursoClient.execute(sql)
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
      
      // Initialize schema and seed data (async)
      if (!initPromise) {
        initPromise = (async () => {
          await dbClient!.exec(schema)
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

  const demoTenant = db.prepare('SELECT id FROM tenants WHERE name LIKE ? LIMIT 1').get('%Browns%') as { id: number } | undefined
  const demoTenantId = demoTenant?.id || 1
  
  const propertyCount = db.prepare('SELECT COUNT(*) as count FROM properties').get() as { count: number }
  
  if (propertyCount.count === 0) {
    const insert = db.prepare('INSERT INTO properties (tenant_id, name, location, room_count) VALUES (?, ?, ?, ?)')
    insert.run(demoTenantId, 'Riverside Lodge', 'Dullstroom, SA', 5)
    insert.run(demoTenantId, 'Mountain View Suites', 'Clarens, SA', 3)
    insert.run(demoTenantId, 'Coastal Retreat', 'Hermanus, SA', 4)
  }
}

async function seedDefaultDataAsync(db: DbClient) {
  const tenantCount = await db.prepare('SELECT COUNT(*) as count FROM tenants').get() as { count: number }
  
  if (tenantCount.count === 0) {
    const insertTenant = db.prepare('INSERT INTO tenants (name, location, timezone) VALUES (?, ?, ?)')
    await insertTenant.run('The Browns Luxury Guest Suites (Dullstroom)', 'Dullstroom, Mpumalanga, South Africa', 'Africa/Johannesburg')
  }

  const demoTenant = await db.prepare('SELECT id FROM tenants WHERE name LIKE ? LIMIT 1').get('%Browns%') as { id: number } | undefined
  const demoTenantId = demoTenant?.id || 1
  
  const propertyCount = await db.prepare('SELECT COUNT(*) as count FROM properties').get() as { count: number }
  
  if (propertyCount.count === 0) {
    const insert = db.prepare('INSERT INTO properties (tenant_id, name, location, room_count) VALUES (?, ?, ?, ?)')
    await insert.run(demoTenantId, 'Riverside Lodge', 'Dullstroom, SA', 5)
    await insert.run(demoTenantId, 'Mountain View Suites', 'Clarens, SA', 3)
    await insert.run(demoTenantId, 'Coastal Retreat', 'Hermanus, SA', 4)
  }
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
