# Access Codes Source of Record

**Status**: Implemented  
**Created**: 2026-09-20  
**Branch**: `cursor/access-codes-sor-5cf1`

---

## Overview

Access codes for property gates and lockboxes are now managed via database source of record with staff UI at `/ops/access-codes`. This removes the need for emergency Vercel deploys when codes need to be rotated.

**Ritual removed**: "Emergency Vercel deploy to rotate compromised code" → "Staff edit in UI, save, done"

---

## Features

### Staff Management UI

Navigate to `/ops/access-codes` to:
- View all gate pinpad and lockbox codes grouped by property
- Edit codes inline (masked by default, toggle to reveal)
- Add new suite-specific lockbox codes (free-text suite field)
- View change history (last 90 days, metadata only)

**Security**: All changes are logged with who/when metadata. Actual code values are never stored in audit log.

### Access Code Resolution

The system uses **DB-first with env fallback** resolution:

1. **Query DB** for specific property+type+suite
2. **If DB row exists** → use code_value (even if empty → `[ASK STAFF]`)
3. **If NO DB row exists** → check global env vars (`PROPERTY_GATE_CODE` / `PROPERTY_DOOR_CODE`)
4. **If both empty** → return `[ASK STAFF]` (fail-closed, never invent codes)

**Critical**: Once a DB row exists for property+type+suite, env vars are NEVER used for that key.

### Integration Points

1. **Guest Portal** (`/api/guest-portal/[code]`) - Time-gated access code display
2. **Template Engine** (ticket-playbooks) - Gate access issue templates
3. **Welcome Drafts** - Codes accessible via portal link

---

## Database Schema

### `property_access_codes`

```sql
CREATE TABLE property_access_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL DEFAULT 1,
  property TEXT NOT NULL,
  code_type TEXT NOT NULL CHECK(code_type IN ('gate_pinpad', 'lockbox')),
  suite TEXT NOT NULL DEFAULT '',  -- empty string for gates, actual name for lockboxes
  code_value TEXT NOT NULL,
  last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_updated_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, property, code_type, suite)
);
```

### `access_code_audit_log`

```sql
CREATE TABLE access_code_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL DEFAULT 1,
  property TEXT NOT NULL,
  code_type TEXT NOT NULL,
  suite TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL CHECK(action IN ('create', 'update')),
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  changed_by TEXT,
  notes TEXT
);
```

**Note**: Audit log stores metadata only. Actual code values are never logged.

---

## Migration

Run the migration script locally or in production:

```bash
cd apps/guestflow
node scripts/migrate-access-codes-sor.js
```

**Idempotent**: Safe to run multiple times.

---

## Environment Variables

Access codes now have **optional** env var fallback:

```bash
# Global fallback if NO DB row exists for that property+type+suite
PROPERTY_GATE_CODE=****    # Fallback only
PROPERTY_DOOR_CODE=****    # Fallback only
```

**Recommended**: Prefer empty tables + staff manual entry via `/ops/access-codes`. Do NOT seed both gates from one env var.

---

## API Routes

### POST `/api/ops/access-codes/upsert`

Update or create an access code.

**Request**:
```json
{
  "property": "cottage",
  "code_type": "gate_pinpad",
  "suite": "",
  "code": "1234"
}
```

**Response**:
```json
{
  "success": true,
  "updated_at": "2026-09-20T23:54:00.000Z",
  "redacted_code": "****"
}
```

### GET `/api/ops/access-codes`

List all access codes for tenant (codes masked for display).

### GET `/api/ops/access-codes/audit?days=90`

Fetch audit log entries (metadata only, no code values).

---

## Security

### Redaction Enforcement

- ✅ **Server logs**: Never print actual codes (use `REDACTED` / `****`)
- ✅ **Test fixtures**: Use obvious fake patterns (`TEST_GATE_9876`)
- ✅ **Audit log**: Metadata only, no code values stored
- ✅ **Staff UI**: Codes masked by default, toggle to reveal
- ✅ **PR descriptions**: Never paste live codes

### Authorized Display

Actual code values MAY be returned in:
- Authorized staff edit API responses over HTTPS
- Time-gated guest portal API responses over HTTPS

---

## Usage Examples

### Staff: Edit a gate code

1. Navigate to `/ops/access-codes`
2. Find property (Cottage or Main House)
3. Click "Edit" on gate pinpad row
4. Enter new code
5. Click "Save"
6. Change is logged with your staff ID

### Staff: Add a lockbox code

1. Navigate to `/ops/access-codes`
2. Find property section
3. Click "Add Lockbox Code"
4. Enter suite name (free-text, e.g., "Suite 1", "Master Bedroom")
5. Enter code
6. Click "Save"

### Guest: View access codes

1. Receive portal link via welcome message
2. Navigate to portal (time-gated: 24h before check-in through checkout)
3. Access codes section shows gate, door, and suite-specific lockbox codes
4. Outside time-gate window: "Access codes will be available 24 hours before your check-in date"

---

## Troubleshooting

**Codes not showing in portal**:
1. Check time-gate: guest must be within 24h of check-in or during stay
2. Check DB: `SELECT * FROM property_access_codes WHERE property = 'cottage'`
3. Check env fallback: `PROPERTY_GATE_CODE` set?
4. If both empty: system correctly returns `[ASK STAFF]`

**Migration failed**:
- Ensure `better-sqlite3` installed: `npm install`
- Check DB path: `data/guestflow.db` (local) or `TURSO_AUTH_TOKEN` (prod)
- Run migration again (idempotent)

**Cross-property code bleed**:
- This CANNOT happen: resolution is scoped by property+type+suite
- Cottage with DB row uses DB; main-house without DB row uses env (no bleed)

---

## Files Changed

### Core Logic
- `apps/guestflow/src/lib/access-codes.ts` - Resolution logic
- `apps/guestflow/src/lib/access-codes-schema.ts` - TypeScript types
- `apps/guestflow/src/lib/__tests__/access-codes.test.ts` - 19 tests

### API Routes
- `apps/guestflow/src/app/api/ops/access-codes/upsert/route.ts`
- `apps/guestflow/src/app/api/ops/access-codes/audit/route.ts`
- `apps/guestflow/src/app/api/ops/access-codes/route.ts`

### Staff UI
- `apps/guestflow/src/app/ops/access-codes/page.tsx`
- `apps/guestflow/src/app/ops/access-codes/AccessCodesManager.tsx`

### Integration
- `apps/guestflow/src/app/api/guest-portal/[code]/route.ts` - DB-first resolution
- `apps/guestflow/src/lib/ticket-playbooks.ts` - Async gate access template

### Migration
- `apps/guestflow/scripts/migrate-access-codes-sor.js`

---

## Testing

Run access codes tests:

```bash
cd apps/guestflow
npm test -- access-codes.test.ts
```

All 19 tests pass:
- DB row exists → returns DB code
- NO DB row, env set → returns env
- NO DB row, NO env → returns `[ASK STAFF]`
- Multiple properties → correct scoping
- Suite-specific lockbox → returns only that suite's code
- Redaction enforcement
- Upsert + audit log

---

## Next Steps (Future Enhancements)

- [ ] Role-based access control (currently all staff can edit)
- [ ] Code expiration reminders
- [ ] Auto-rotation schedules
- [ ] Integration with physical pinpad APIs
- [ ] Bulk import via CSV
- [ ] Real-time notifications when codes change

---

**For questions**: See [spec.md](../../../specs/010-access-codes-sor/spec.md) for full feature specification.
