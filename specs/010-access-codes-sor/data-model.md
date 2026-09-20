# Data Model: Access Codes Source of Record

**Feature**: Access Codes SoR | **Date**: 2026-09-20

## Database Schema

### Table: `property_access_codes`

**Purpose**: Store active access codes for gate pinpads and lockboxes, scoped by property and optionally by suite

```sql
CREATE TABLE IF NOT EXISTS property_access_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant TEXT NOT NULL DEFAULT 'browns-dullstroom',
  property TEXT NOT NULL,           -- 'cottage' | 'main-house' | etc.
  code_type TEXT NOT NULL,          -- 'gate_pinpad' | 'lockbox'
  suite TEXT NOT NULL DEFAULT '',   -- Empty string '' for gates, actual suite name for lockboxes
  code_value TEXT NOT NULL,         -- The actual access code (encrypted at rest by Turso)
  last_updated_at TEXT NOT NULL,    -- ISO 8601 timestamp
  last_updated_by TEXT NOT NULL,    -- Staff ID or email
  created_at TEXT NOT NULL,         -- ISO 8601 timestamp
  UNIQUE(tenant, property, code_type, suite)  -- One code per property+type+suite combo
);

CREATE INDEX IF NOT EXISTS idx_access_codes_lookup
  ON property_access_codes(tenant, property, code_type, suite);
```

**Notes**:
- `tenant` always `'browns-dullstroom'` for now, future-proofs multi-tenant
- `property` examples: `'cottage'` (278 Blue Crane), `'main-house'` (279 Blue Crane)
- `code_type` enum: `'gate_pinpad'` for gate entry, `'lockbox'` for suite key lockboxes
- `suite` **empty string `''` for gates** (NOT NULL to avoid SQLite UNIQUE+NULL multiple-row issue), actual suite name for lockboxes (e.g., `'Suite 1'`, `'Suite 2'`, etc.)
- Suite names are **free-text staff-entered**, not hardcoded dropdown, must exactly match `booking.room` or `booking.suite` strings
- `code_value` stored in plain text (Turso encrypts at rest), or optionally AES-encrypted with app-level key if Grant requires
- `UNIQUE` constraint ensures one active code per property+type+suite combination (empty string for gates prevents duplicate gate rows)
- Last write wins if multiple staff edit simultaneously
- No soft deletes; row update is atomic replace

**Sample rows**:

```sql
-- Cottage gate (suite = empty string '')
INSERT INTO property_access_codes (tenant, property, code_type, suite, code_value, last_updated_at, last_updated_by, created_at)
VALUES ('browns-dullstroom', 'cottage', 'gate_pinpad', '', 'REDACTED', '2026-09-20T15:30:00Z', 'staff@example.com', '2026-09-20T15:30:00Z');

-- Main house gate (suite = empty string '')
INSERT INTO property_access_codes (tenant, property, code_type, suite, code_value, last_updated_at, last_updated_by, created_at)
VALUES ('browns-dullstroom', 'main-house', 'gate_pinpad', '', 'REDACTED', '2026-09-20T15:30:00Z', 'staff@example.com', '2026-09-20T15:30:00Z');

-- Main house Suite 1 lockbox (suite = actual room name)
INSERT INTO property_access_codes (tenant, property, code_type, suite, code_value, last_updated_at, last_updated_by, created_at)
VALUES ('browns-dullstroom', 'main-house', 'lockbox', 'Suite 1', 'REDACTED', '2026-09-20T15:30:00Z', 'staff@example.com', '2026-09-20T15:30:00Z');

-- Main house Suite 2 lockbox (suite = actual room name)
INSERT INTO property_access_codes (tenant, property, code_type, suite, code_value, last_updated_at, last_updated_by, created_at)
VALUES ('browns-dullstroom', 'main-house', 'lockbox', 'Suite 2', 'REDACTED', '2026-09-20T15:30:00Z', 'staff@example.com', '2026-09-20T15:30:00Z');
```

**NOT stored**: old code values, expiration dates, rotation schedules (out of scope for this phase)

**IMPORTANT - Empty string sentinel**: Gates use `suite=''` (empty string), NOT `NULL`, to avoid SQLite UNIQUE constraint issue where multiple NULL values are allowed. This ensures only one gate row per property+type.

---

### Table: `access_code_audit_log`

**Purpose**: Immutable log of access code changes for accountability and security auditing

```sql
CREATE TABLE IF NOT EXISTS access_code_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant TEXT NOT NULL DEFAULT 'browns-dullstroom',
  property TEXT NOT NULL,
  code_type TEXT NOT NULL,
  suite TEXT,
  changed_at TEXT NOT NULL,         -- ISO 8601 timestamp
  changed_by TEXT NOT NULL,         -- Staff ID or email
  action TEXT NOT NULL DEFAULT 'update',  -- 'create' | 'update' (no delete in this phase)
  notes TEXT                        -- Optional staff note about why change was made
);

CREATE INDEX IF NOT EXISTS idx_audit_log_recent
  ON access_code_audit_log(tenant, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_property
  ON access_code_audit_log(tenant, property, code_type, suite, changed_at DESC);
```

**Notes**:
- **Does NOT store old or new code values** (security: no point in logging secrets)
- `action` will be `'update'` for most changes; `'create'` for initial seed
- `notes` optional, staff can add context (e.g., "Guest reported code not working")
- Immutable: INSERTs only, no UPDATEs or DELETEs
- Default query: last 90 days, sorted DESC by `changed_at`
- Longer retention in DB for compliance (exact policy TBD, default: keep indefinitely)

**Sample rows**:

```sql
-- Initial seed from env vars
INSERT INTO access_code_audit_log (tenant, property, code_type, suite, changed_at, changed_by, action, notes)
VALUES ('browns-dullstroom', 'cottage', 'gate_pinpad', NULL, '2026-09-20T15:30:00Z', 'system', 'create', 'Seeded from PROPERTY_GATE_CODE env var');

-- Staff change
INSERT INTO access_code_audit_log (tenant, property, code_type, suite, changed_at, changed_by, action, notes)
VALUES ('browns-dullstroom', 'main-house', 'lockbox', 'Suite 1', '2026-09-21T10:15:00Z', 'liana@thebrowns.co.za', 'update', 'Guest lost key, rotated lockbox code');
```

---

## Environment Variables (Fallback)

**Existing env vars** (global fallback for migration continuity ONLY when NO DB row exists for that property+type):

```bash
# Gate codes (global fallback, not per-property)
PROPERTY_GATE_CODE=****         # Fallback ONLY if NO DB row exists for property+gate

# Door/lockbox codes (global fallback, not suite-specific)
PROPERTY_DOOR_CODE=****         # Fallback ONLY if NO DB row exists for property+lockbox

# WARNING: Single global env vars cannot safely back both cottage and main-house long-term.
# Once DB rows exist for a property, env vars are ignored for that property (no cross-property bleed).
```

**New env vars** (optional, for app-level encryption):

```bash
# Access code encryption key (if app-level encryption is implemented)
ACCESS_CODE_ENCRYPTION_KEY=****  # AES-256 key, never log
```

**Resolution order** (per property+type+suite):
1. **DB query** for specific property+type+suite → if **row exists**, return `code_value` (even if empty → `'[ASK STAFF]'`)
2. **Env var fallback** → if **NO DB row exists** for that key, return global `process.env.PROPERTY_GATE_CODE` or `PROPERTY_DOOR_CODE` (migration continuity only)
3. **Fail-closed** → if both empty, return `'[ASK STAFF]'`

**CRITICAL**: Once a DB row exists for a property+type, that property NEVER falls back to env vars. Env vars do NOT bleed across properties. Example: If cottage has a gate row in DB, cottage uses DB (even if code_value is empty). If main-house has NO gate row, main-house falls back to global env var.

---

## Property Mapping

**Properties in scope**:

| Property Identifier | Physical Address / Label | Gate Pinpad? | Lockbox Suites |
|---------------------|--------------------------|--------------|----------------|
| `cottage` | 278 Blue Crane | Yes (Cottage entrance) | (TBD, may have lockbox too) |
| `main-house` | 279 Blue Crane | Yes (Main house entrance) | Suite 1, Suite 2, Suite 3, ... (exact count TBD) |

**Future-proofing**: If more properties added (e.g., Rivendell), same schema applies with different `property` values

---

## Suite Mapping

**Suite identifiers** must match booking data. Examples:
- `'Suite 1'`, `'Suite 2'`, `'Suite 3'` (Main House)
- `'Cottage'` (if cottage is single suite with lockbox)
- `''` (empty string for gate codes, which are not suite-specific - NOT NULL)

**Source of truth for suite names**: Existing booking schema (`booking.room` or `booking.suite` field). Must match exactly for resolution to work.

**Staff UI**: Suite field is **free-text input** (not hardcoded dropdown of Suite 1/2/3 only) so staff can enter exact strings that match booking data. Staff-addable, not pre-seeded.

---

## Code Value Format

**Assumptions**:
- Codes are short alphanumeric strings (typically 4-6 digits)
- Examples: `1234`, `5678`, `A1B2C3` (redacted as `****` in all examples)
- No special characters, no spaces
- Staff UI trims whitespace before save
- Empty or whitespace-only codes are rejected

**Validation rules**:
- Non-empty after trim
- Length: 4-10 characters (reasonable range for pinpad/lockbox)
- Alphanumeric only (no special chars except hyphen/underscore if needed)
- Case-insensitive storage (normalize to uppercase or lowercase for consistency)

---

## Migration Script

**File**: `apps/guestflow/scripts/migrate-access-codes-sor.js`

**Pseudocode**:

```javascript
// Idempotent: check if tables exist before creating
const db = getDb(); // local SQLite or Turso

// Create property_access_codes table
db.exec(`CREATE TABLE IF NOT EXISTS property_access_codes (...)`);

// Create access_code_audit_log table
db.exec(`CREATE TABLE IF NOT EXISTS access_code_audit_log (...)`);

// Create indexes
db.exec(`CREATE INDEX IF NOT EXISTS idx_access_codes_lookup ...`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_log_recent ...`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_log_property ...`);

console.log('✅ Access codes SoR migration complete');
```

**Seed script** (optional, separate file or same with flag):

```javascript
// Run ONLY with APPROVE SEED FROM ENV
// WARNING: Do NOT blindly insert same PROPERTY_GATE_CODE into both cottage and main-house.
// Prefer empty tables + staff manual entry.

if (process.env.SEED_ACCESS_CODES === 'APPROVE') {
  // Option 1: Per-property env vars (preferred if seeding)
  const cottageGateCode = process.env.COTTAGE_GATE_CODE;
  const mainHouseGateCode = process.env.MAIN_HOUSE_GATE_CODE;
  
  if (cottageGateCode) {
    db.run(`INSERT OR IGNORE INTO property_access_codes (tenant, property, code_type, suite, code_value, last_updated_at, last_updated_by, created_at) 
            VALUES ('browns-dullstroom', 'cottage', 'gate_pinpad', '', ?, datetime('now'), 'system', datetime('now'))`, [cottageGateCode]);
    db.run(`INSERT INTO access_code_audit_log (tenant, property, code_type, suite, changed_at, changed_by, action, notes) 
            VALUES ('browns-dullstroom', 'cottage', 'gate_pinpad', '', datetime('now'), 'system', 'create', 'Seeded from COTTAGE_GATE_CODE env var')`);
  }
  
  if (mainHouseGateCode) {
    db.run(`INSERT OR IGNORE INTO property_access_codes (tenant, property, code_type, suite, code_value, last_updated_at, last_updated_by, created_at) 
            VALUES ('browns-dullstroom', 'main-house', 'gate_pinpad', '', ?, datetime('now'), 'system', datetime('now'))`, [mainHouseGateCode]);
    db.run(`INSERT INTO access_code_audit_log (tenant, property, code_type, suite, changed_at, changed_by, action, notes) 
            VALUES ('browns-dullstroom', 'main-house', 'gate_pinpad', '', datetime('now'), 'system', 'create', 'Seeded from MAIN_HOUSE_GATE_CODE env var')`);
  }
  
  // Option 2: No seed, staff enter manually via /ops/access-codes (preferred)
  console.log('Seed complete. Staff should verify codes at /ops/access-codes');
}
```

**IMPORTANT**: Do NOT use single global `PROPERTY_GATE_CODE` to seed both gates. Prefer per-property env vars or empty tables with staff manual entry.

**Rollback**: If migration fails, drop tables and retry (idempotent, safe to re-run)

---

## TypeScript Interfaces

**File**: `apps/guestflow/src/lib/access-codes-schema.ts`

```typescript
export interface PropertyAccessCode {
  id: number;
  tenant: string;
  property: string;
  code_type: 'gate_pinpad' | 'lockbox';
  suite: string | null;
  code_value: string;
  last_updated_at: string; // ISO 8601
  last_updated_by: string;
  created_at: string; // ISO 8601
}

export interface AccessCodeAuditLog {
  id: number;
  tenant: string;
  property: string;
  code_type: 'gate_pinpad' | 'lockbox';
  suite: string | null;
  changed_at: string; // ISO 8601
  changed_by: string;
  action: 'create' | 'update';
  notes: string | null;
}

export interface ResolvedAccessCodes {
  gateCode: string;      // Actual code or '[ASK STAFF]'
  doorCode: string;      // Actual code or '[ASK STAFF]'
  lockboxCode?: string;  // Suite-specific, optional
}
```

---

## Query Examples

### Get gate code for a property

```sql
SELECT code_value
FROM property_access_codes
WHERE tenant = 'browns-dullstroom'
  AND property = 'cottage'
  AND code_type = 'gate_pinpad'
  AND suite = ''  -- Empty string, not NULL
LIMIT 1;
```

### Get lockbox code for a specific suite

```sql
SELECT code_value
FROM property_access_codes
WHERE tenant = 'browns-dullstroom'
  AND property = 'main-house'
  AND code_type = 'lockbox'
  AND suite = 'Suite 2'
LIMIT 1;
```

### Upsert (INSERT OR REPLACE)

```sql
INSERT INTO property_access_codes (tenant, property, code_type, suite, code_value, last_updated_at, last_updated_by, created_at)
VALUES ('browns-dullstroom', 'main-house', 'gate_pinpad', '', 'NEW_CODE', '2026-09-21T10:00:00Z', 'staff@example.com', '2026-09-21T10:00:00Z')
ON CONFLICT(tenant, property, code_type, suite)
DO UPDATE SET
  code_value = excluded.code_value,
  last_updated_at = excluded.last_updated_at,
  last_updated_by = excluded.last_updated_by;
```

**Note**: Gates use `suite=''` (empty string), lockboxes use actual suite name.

### Recent audit log (last 90 days)

```sql
SELECT property, code_type, suite, changed_at, changed_by, action, notes
FROM access_code_audit_log
WHERE tenant = 'browns-dullstroom'
  AND changed_at >= datetime('now', '-90 days')
ORDER BY changed_at DESC
LIMIT 100;
```

---

## Security Considerations

1. **At-rest encryption**: Turso encrypts data at rest. If app-level encryption is required, use `crypto.createCipheriv` with `ACCESS_CODE_ENCRYPTION_KEY` env var.
2. **In-transit encryption**: All API routes are HTTPS (Vercel enforces).
3. **Redaction**: Server logs, CI output, PR descriptions, chat messages, test fixtures, and console.log statements never print actual code values. Authorized staff edit API responses and time-gated guest portal API responses over HTTPS MAY contain plaintext codes as required for edit/display functionality.
4. **Staff auth**: `/ops/access-codes` route requires authenticated staff session (middleware check).
5. **No code values in audit log**: Audit log stores metadata only, never the actual codes.
6. **Test fixtures**: All test data uses `'REDACTED'` or `'****'` as placeholder code values, never real codes.

---

## Diagram: Resolution Flow

```text
Guest Portal / Template Request
         |
         v
  resolveAccessCodes(property, suite)
         |
         v
   Query DB: property_access_codes
   WHERE property=? AND code_type=? AND suite=?
         |
    +----+----+
    |         |
  Row      NO row
  exists   exists
    |         |
    v         v
 Return    Global Env Vars
 code_val (PROPERTY_GATE_CODE, etc.)
 (even if  (fallback ONLY)
  empty)      |
    |    +----+----+
    |    |         |
    | Found    Empty
    |    |         |
    |    v         v
    | Return    Return
    | Env code '[ASK STAFF]'
    |    |         |
    +----+----+----+
         |
         v
  Apply time-gate
  (if guest portal)
         |
         v
  Return to caller
```

**CRITICAL**: Once a DB row exists for property+type+suite, env vars are NEVER used for that key. Env fallback is ONLY for keys that have NO DB row.

---

## Future Enhancements (Out of Scope)

- Code expiration dates
- Rotation reminders
- Role-based access control (who can edit which codes)
- Bulk import via CSV
- Integration with physical pinpad APIs
- Version history with revert capability
- Real-time notifications to staff on code changes
- Multi-property tenant support (already schema-ready)
