# Data Model: GuestFlow WiFi Source of Record

**Feature**: GuestFlow WiFi SoR | **Date**: 2026-09-21

## Database Schema

### Table: `property_access_codes` (Extended)

**Purpose**: Store access codes including WiFi credentials, scoped by property and code type

**Extension**: Add support for `code_type` values `'wifi_network'` and `'wifi_password'`

```sql
-- Existing table from specs/010-access-codes-sor (no ALTER needed, TEXT column accepts new values)
CREATE TABLE IF NOT EXISTS property_access_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  property TEXT NOT NULL,           -- 'cottage' | 'main-house'
  code_type TEXT NOT NULL,          -- 'gate_pinpad' | 'lockbox' | 'wifi_network' | 'wifi_password'
  suite TEXT NOT NULL DEFAULT '',   -- Empty string '' for gates AND WiFi (property-wide)
  code_value TEXT NOT NULL,         -- The actual code or credential
  last_updated_at TEXT NOT NULL,    -- ISO 8601 timestamp
  last_updated_by TEXT,             -- Staff ID or email
  created_at TEXT NOT NULL,         -- ISO 8601 timestamp
  UNIQUE(tenant_id, property, code_type, suite)
);

CREATE INDEX IF NOT EXISTS idx_access_codes_lookup
  ON property_access_codes(tenant_id, property, code_type, suite);
```

**Notes**:
- `code_type` is TEXT, so no schema migration required to add new values
- WiFi uses `suite=''` (empty string) because WiFi is per-property, not per-suite
- Each property has **two WiFi rows**: one for `wifi_network`, one for `wifi_password`
- `UNIQUE(tenant_id, property, code_type, suite)` ensures one WiFi network and one WiFi password per property

**Sample WiFi rows**:

```sql
-- Cottage WiFi network
INSERT INTO property_access_codes (tenant_id, property, code_type, suite, code_value, last_updated_at, last_updated_by, created_at)
VALUES (1, 'cottage', 'wifi_network', '', 'CottageNet', '2026-09-21T10:00:00Z', 'staff@example.com', '2026-09-21T10:00:00Z');

-- Cottage WiFi password
INSERT INTO property_access_codes (tenant_id, property, code_type, suite, code_value, last_updated_at, last_updated_by, created_at)
VALUES (1, 'cottage', 'wifi_password', '', '[REDACTED]', '2026-09-21T10:00:00Z', 'staff@example.com', '2026-09-21T10:00:00Z');

-- Main house WiFi network
INSERT INTO property_access_codes (tenant_id, property, code_type, suite, code_value, last_updated_at, last_updated_by, created_at)
VALUES (1, 'main-house', 'wifi_network', '', 'MainHouseWiFi', '2026-09-21T10:00:00Z', 'staff@example.com', '2026-09-21T10:00:00Z');

-- Main house WiFi password
INSERT INTO property_access_codes (tenant_id, property, code_type, suite, code_value, last_updated_at, last_updated_by, created_at)
VALUES (1, 'main-house', 'wifi_password', '', '[REDACTED]', '2026-09-21T10:00:00Z', 'staff@example.com', '2026-09-21T10:00:00Z');
```

**IMPORTANT - Empty string sentinel**: WiFi credentials use `suite=''` (empty string), NOT `NULL`, for consistency with gate codes. WiFi is property-wide, not suite-specific.

---

### Table: `access_code_audit_log` (Reused)

**Purpose**: Immutable log of all access code changes including WiFi credentials

```sql
-- Existing table from specs/010-access-codes-sor (no changes)
CREATE TABLE IF NOT EXISTS access_code_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  property TEXT NOT NULL,
  code_type TEXT NOT NULL,
  suite TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL DEFAULT 'update',
  changed_at TEXT NOT NULL,
  changed_by TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_recent
  ON access_code_audit_log(tenant_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_property
  ON access_code_audit_log(tenant_id, property, code_type, suite, changed_at DESC);
```

**Notes**:
- **Does NOT store plaintext WiFi passwords** (security: metadata only)
- `code_type` will be `'wifi_network'` or `'wifi_password'` for WiFi changes
- `suite` is always `''` (empty string) for WiFi audit entries
- Staff can view audit log at `/ops/access-codes` to see who changed WiFi when

**Sample WiFi audit rows**:

```sql
-- Staff changes cottage WiFi password
INSERT INTO access_code_audit_log (tenant_id, property, code_type, suite, action, changed_at, changed_by, notes)
VALUES (1, 'cottage', 'wifi_password', '', 'update', '2026-09-21T14:30:00Z', 'liana@thebrowns.co.za', 'ISP upgraded, new router password');

-- Staff changes main house WiFi network name
INSERT INTO access_code_audit_log (tenant_id, property, code_type, suite, action, changed_at, changed_by, notes)
VALUES (1, 'main-house', 'wifi_network', '', 'update', '2026-09-21T14:35:00Z', 'grant@thebrowns.co.za', 'Rebranded WiFi name for guests');
```

---

## Environment Variables (Fallback)

**Existing env vars** (global fallback ONLY when NO DB row exists for WiFi):

```bash
# WiFi credentials (global fallback, not property-specific)
WIFI_NETWORK=****         # Fallback ONLY if NO DB row exists for property+wifi_network
WIFI_PASSWORD=****        # Fallback ONLY if NO DB row exists for property+wifi_password

# WARNING: Single global env vars cannot back both cottage and main-house long-term.
# Once DB rows exist for a property, env vars are ignored for that property.
```

**Resolution order** (per property+code_type):
1. **DB query** for property+code_type+suite → if **row exists**, return `code_value` (even if empty → `'[ASK STAFF]'`)
2. **Env var fallback** → if **NO DB row exists**, return global `process.env.WIFI_NETWORK` or `WIFI_PASSWORD`
3. **Fail-closed** → if both empty, return `'[ASK STAFF]'` or `'[WIFI]'`

**CRITICAL**: Once a DB row exists for a property+wifi_network or property+wifi_password, that property NEVER falls back to env vars. Env vars do NOT bleed across properties.

---

## Property Mapping

**Properties in scope**:

| Property Identifier | WiFi Network Row | WiFi Password Row | Notes |
|---------------------|------------------|-------------------|-------|
| `cottage` | `wifi_network`, `suite=''` | `wifi_password`, `suite=''` | Cottage v1 focus |
| `main-house` | `wifi_network`, `suite=''` | `wifi_password`, `suite=''` | Fields present, may be empty |

**Future-proofing**: If more properties added (e.g., Rivendell), same pattern applies with different `property` values

---

## WiFi Credential Format

**Assumptions**:
- Network name (SSID): typically 1-32 characters, alphanumeric + spaces/hyphens
- Password: typically 8-63 characters for WPA2/WPA3, alphanumeric + special chars
- No format validation beyond non-empty (staff enters as-is)

**Validation rules**:
- Non-empty after trim
- Network name: max 32 characters (SSID limit)
- Password: min 8 characters (WPA2 requirement), max 63 characters

**Redaction**:
- Network name: plaintext (not secret, visible to guests)
- Password: redacted as `****` or `[REDACTED]` in logs, tests, PR bodies, comments
- Staff UI: password masked by default with reveal toggle

---

## TypeScript Interfaces

**File**: `apps/guestflow/src/lib/access-codes-schema.ts` (extended)

```typescript
// Existing interface from specs/010-access-codes-sor
export interface PropertyAccessCode {
  id: number
  tenant_id: number
  property: string
  code_type: 'gate_pinpad' | 'lockbox' | 'wifi_network' | 'wifi_password'  // EXTENDED
  suite: string
  code_value: string
  last_updated_at: string
  last_updated_by: string | null
  created_at: string
}

// Existing interface (no changes)
export interface AccessCodeAuditLog {
  id: number
  tenant_id: number
  property: string
  code_type: 'gate_pinpad' | 'lockbox' | 'wifi_network' | 'wifi_password'  // EXTENDED
  suite: string
  action: 'create' | 'update'
  changed_at: string
  changed_by: string | null
  notes: string | null
}

// EXTENDED: Add wifi field
export interface ResolvedAccessCodes {
  gateCode: string
  doorCode: string
  lockboxCode?: string
  wifi: {
    network: string    // DB value, env fallback, or '[ASK STAFF]'
    password: string   // DB value, env fallback, or '[ASK STAFF]'
  }
}

// New: Guest portal stayPacket wifi field
export interface StayPacketWiFi {
  network: string      // SSID or '[ASK STAFF]' or empty string
  password: string     // Password or '[ASK STAFF]' or empty string
}
```

---

## Query Examples

### Get WiFi network for a property

```sql
SELECT code_value
FROM property_access_codes
WHERE tenant_id = 1
  AND property = 'cottage'
  AND code_type = 'wifi_network'
  AND suite = ''
LIMIT 1;
```

### Get WiFi password for a property

```sql
SELECT code_value
FROM property_access_codes
WHERE tenant_id = 1
  AND property = 'cottage'
  AND code_type = 'wifi_password'
  AND suite = ''
LIMIT 1;
```

### Get both WiFi credentials in one query (optional optimization)

```sql
SELECT code_type, code_value
FROM property_access_codes
WHERE tenant_id = 1
  AND property = 'cottage'
  AND code_type IN ('wifi_network', 'wifi_password')
  AND suite = '';
```

### Upsert WiFi network

```sql
INSERT INTO property_access_codes (tenant_id, property, code_type, suite, code_value, last_updated_at, last_updated_by, created_at)
VALUES (1, 'cottage', 'wifi_network', '', 'NewNetworkName', '2026-09-21T10:00:00Z', 'staff@example.com', '2026-09-21T10:00:00Z')
ON CONFLICT(tenant_id, property, code_type, suite)
DO UPDATE SET
  code_value = excluded.code_value,
  last_updated_at = excluded.last_updated_at,
  last_updated_by = excluded.last_updated_by;
```

### Upsert WiFi password

```sql
INSERT INTO property_access_codes (tenant_id, property, code_type, suite, code_value, last_updated_at, last_updated_by, created_at)
VALUES (1, 'cottage', 'wifi_password', '', 'NewPassword123', '2026-09-21T10:00:00Z', 'staff@example.com', '2026-09-21T10:00:00Z')
ON CONFLICT(tenant_id, property, code_type, suite)
DO UPDATE SET
  code_value = excluded.code_value,
  last_updated_at = excluded.last_updated_at,
  last_updated_by = excluded.last_updated_by;
```

### Recent WiFi audit log (last 90 days)

```sql
SELECT property, code_type, changed_at, changed_by, action, notes
FROM access_code_audit_log
WHERE tenant_id = 1
  AND code_type IN ('wifi_network', 'wifi_password')
  AND changed_at >= datetime('now', '-90 days')
ORDER BY changed_at DESC
LIMIT 100;
```

---

## Security Considerations

1. **At-rest encryption**: Turso encrypts data at rest (same as access codes). No additional app-level encryption required for MVP.
2. **In-transit encryption**: All API routes are HTTPS (Vercel enforces).
3. **Redaction**: Server logs, CI output, PR descriptions, test fixtures, and console.log statements never print plaintext WiFi passwords. Authorized staff edit API responses MAY contain plaintext passwords as required for edit/display functionality over HTTPS.
4. **Staff auth**: `/ops/access-codes` route requires authenticated staff session (middleware check).
5. **No passwords in audit log**: Audit log stores metadata only (property, code_type, timestamp, staff ID), never plaintext passwords.
6. **Test fixtures**: All test data uses `'[REDACTED]'` or `'****'` as placeholder password values, never real passwords.
7. **UI masking**: Staff UI masks WiFi password by default (password input type), with reveal toggle for verification.

---

## Diagram: WiFi Resolution Flow

```text
Guest Portal / Template Request
         |
         v
  resolveAccessCodes(property, suite)
         |
         v
   Query DB for wifi_network and wifi_password
   WHERE property=? AND code_type IN ('wifi_network', 'wifi_password') AND suite=''
         |
    +----+----+
    |         |
  Rows     NO rows
  exist    exist
    |         |
    v         v
 Return    Global Env Vars
 DB values (WIFI_NETWORK, WIFI_PASSWORD)
 (even if  (fallback ONLY)
  empty)      |
    |    +----+----+
    |    |         |
    | Found    Empty
    |    |         |
    |    v         v
    | Return    Return
    | Env vals  '[ASK STAFF]'
    |    |         |
    +----+----+----+
         |
         v
  Return wifi: { network, password }
         |
         v
  Caller uses in stayPacket or template
```

**CRITICAL**: Once DB rows exist for property+wifi_network/wifi_password, env vars are NEVER used. Env fallback is ONLY for keys with NO DB row.

---

## Seed Data

**No live WiFi credentials in seed**:
- Do NOT seed from env vars into DB automatically
- Do NOT invent demo WiFi credentials in seed scripts
- Leave WiFi rows empty or use `[DEMO WIFI]` / `[REDACTED]` placeholders only

**Staff manual entry**:
- Staff enters actual WiFi credentials via `/ops/access-codes` UI after deploy
- OR: CoS provides `/workspace/guestflow-wa-checkin-templates/WIFI-LIVE.txt` with real credentials (Grant pastes into UI)

**Future seed option** (if Grant approves):

```javascript
// Only run with explicit APPROVE SEED WIFI flag
if (process.env.SEED_WIFI === 'APPROVE') {
  const cottageNetwork = process.env.COTTAGE_WIFI_NETWORK || '[DEMO WIFI NETWORK]';
  const cottagePassword = process.env.COTTAGE_WIFI_PASSWORD || '[DEMO WIFI PASSWORD]';
  
  db.run(`INSERT OR IGNORE INTO property_access_codes (tenant_id, property, code_type, suite, code_value, last_updated_at, last_updated_by, created_at) 
          VALUES (1, 'cottage', 'wifi_network', '', ?, datetime('now'), 'system', datetime('now'))`, [cottageNetwork]);
  
  db.run(`INSERT OR IGNORE INTO property_access_codes (tenant_id, property, code_type, suite, code_value, last_updated_at, last_updated_by, created_at) 
          VALUES (1, 'cottage', 'wifi_password', '', ?, datetime('now'), 'system', datetime('now'))`, [cottagePassword]);
  
  // Same for main-house if env vars exist
}
```

---

## Future Enhancements (Out of Scope)

- Multiple WiFi networks per property (guest network + staff network)
- Suite-specific WiFi credentials
- WiFi QR code generation for guest portal
- Guest network bandwidth limits / isolation
- Integration with router APIs for dynamic credential rotation
- WiFi password strength validation / requirements
