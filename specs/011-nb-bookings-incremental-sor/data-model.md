# Data Model: Nightsbridge Bookings Incremental SoR

**Feature**: Incremental booking updates with UPSERT and soft-cancel
**Date**: 2026-09-21

## Schema Changes

### Table: `bookings` (MODIFIED)

**New Columns**:

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `nightsbridge_booking_id` | TEXT | NULL allowed | External booking ID from Nightsbridge (e.g., "NB12345") |
| `guest_name_norm` | TEXT | NULL allowed | Normalized guest name for natural key matching (lowercase, collapsed whitespace) |
| `suite_or_unit_norm` | TEXT | NULL allowed | Normalized suite/unit name for natural key matching |
| `last_import_at` | DATETIME | NULL allowed | Timestamp of the most recent import that touched this booking |
| `import_batch_id` | TEXT | NULL allowed | UUID of the import batch that created or last updated this booking |
| `source` | TEXT | DEFAULT 'nb' | Source system identifier ('nb' = Nightsbridge) |
| `last_seen_import_at` | DATETIME | NULL allowed | Timestamp when this booking was last seen in an import (used for soft-cancel tracking) |

**Existing Columns** (unchanged):

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique booking identifier |
| `tenant_id` | INTEGER | NOT NULL, FOREIGN KEY(tenants.id) | Tenant this booking belongs to |
| `guest_name` | TEXT | NOT NULL | Guest name as it appears in Nightsbridge |
| `guest_phone` | TEXT | NULL allowed | Guest phone number |
| `check_in` | DATE | NOT NULL | Check-in date (YYYY-MM-DD) |
| `check_out` | DATE | NOT NULL | Check-out date (YYYY-MM-DD) |
| `suite_or_unit` | TEXT | NULL allowed | Suite/room name |
| `status` | TEXT | NULL allowed | Booking status (arriving, departing, inhouse, cancelled, etc.) |
| `adults` | INTEGER | DEFAULT 2 | Number of adult guests |
| `children` | INTEGER | DEFAULT 0 | Number of child guests |
| `notes` | TEXT | NULL allowed | Booking notes (e.g., "Late arrival ~19:00") |
| `late_check_in` | BOOLEAN | DEFAULT 0 | Whether this is flagged as a late check-in |
| `property_name` | TEXT | NULL allowed | Property name |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | When this booking was first created |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | When this booking was last updated |

### Indexes

**New Indexes**:

1. **Unique index on Nightsbridge booking ID** (partial):
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_nbid 
   ON bookings(tenant_id, nightsbridge_booking_id) 
   WHERE nightsbridge_booking_id IS NOT NULL;
   ```
   - Purpose: Prevent duplicate insertions for bookings with an external ID
   - Partial index ensures NULL nbids don't conflict

2. **Unique index on natural key**:
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_natural_key 
   ON bookings(tenant_id, guest_name_norm, check_in, check_out, suite_or_unit_norm);
   ```
   - Purpose: Prevent duplicate insertions for bookings without an external ID
   - Fallback identity when `nightsbridge_booking_id` is NULL

**Existing Indexes** (unchanged):
- Primary key on `id`
- Foreign key index on `tenant_id`

## Entity Relationships

### Booking → Guest Contacts (unchanged)

- A booking may create or update a guest contact via `upsertGuestContact()`
- Relationship: Booking provides `phone`, `email`, `displayName`, `lastStayAt`, `lastSuite` to update the contact
- No foreign key constraint (contacts are denormalized for 5-year retention)

### Booking → Welcome Drafts (unchanged)

- A booking may trigger auto-creation of a welcome draft (P1 feature)
- Foreign key: `welcome_drafts.booking_id → bookings.id`
- Cascade behavior: Not specified (assumed no cascade delete)

### Booking → Late Check-in Drafts (unchanged)

- A booking may trigger auto-creation of a late check-in draft (P1 feature)
- Foreign key: `late_checkin_drafts.booking_id → bookings.id`
- Cascade behavior: Not specified (assumed no cascade delete)

### Booking → Guest Tickets (unchanged)

- A booking may have associated guest tickets for exceptions
- Foreign key: `guest_tickets.booking_id → bookings.id`
- Cascade behavior: Not specified (assumed no cascade delete)

## Data Validation Rules

### Required Fields (enforced by schema):
- `tenant_id` (NOT NULL)
- `guest_name` (NOT NULL)
- `check_in` (NOT NULL)
- `check_out` (NOT NULL)

### Validation Rules (enforced by application logic):
- `nightsbridge_booking_id`: If present, must be unique per tenant (enforced by partial index)
- `guest_name_norm`: Must be lowercase, whitespace-collapsed version of `guest_name`
- `suite_or_unit_norm`: Must be lowercase, whitespace-collapsed version of `suite_or_unit`
- `check_in` and `check_out`: Must be valid ISO 8601 date strings (YYYY-MM-DD)
- `adults`: If present, must be >= 1 (Nightsbridge requires at least 1 guest)
- `children`: If present, must be >= 0
- `status`: Should be one of: 'arriving', 'departing', 'inhouse', 'cancelled', 'no_show', '' (empty)
- `source`: Should be 'nb' (Nightsbridge) or other future source identifiers

## State Transitions

### Booking Status State Machine

```
           ┌─────────────┐
           │             │
 Import ───▶│  arriving   │◀──── Booking reappears in import
           │             │
           └──────┬──────┘
                  │
                  │ (target date = check_in)
                  ▼
           ┌─────────────┐
           │             │
           │   inhouse   │
           │             │
           └──────┬──────┘
                  │
                  │ (target date = check_out)
                  ▼
           ┌─────────────┐
           │             │
           │  departing  │
           │             │
           └─────────────┘

           ┌─────────────┐
           │             │
 Missing ──▶│  cancelled  │  (soft-cancel if booking disappears from import window)
from import│             │
           └─────────────┘
```

**State Derivation Logic** (in import):
- If `check_in == target_date`: status = 'arriving'
- If `check_in < target_date < check_out`: status = 'inhouse'
- If `check_out == target_date`: status = 'departing'
- If booking is missing from import AND dates overlap import window: status = 'cancelled'

**Re-activation**: If a cancelled booking reappears in a subsequent import, its status is recalculated based on dates (e.g., cancelled → arriving).

## Normalization Rules

### Guest Name Normalization

```javascript
function normalizeGuestName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces to single space
}
```

Examples:
- "Sarah Henderson" → "sarah henderson"
- "Sarah  Henderson" → "sarah henderson"
- "  SARAH HENDERSON  " → "sarah henderson"

### Suite/Unit Normalization

```javascript
function normalizeSuite(suite: string): string {
  return suite
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}
```

Examples:
- "Luxury Suite 1" → "luxury suite 1"
- "GARDEN  SUITE" → "garden suite"

## Migration Strategy

### Phase 1: Add Columns

```sql
ALTER TABLE bookings ADD COLUMN nightsbridge_booking_id TEXT;
ALTER TABLE bookings ADD COLUMN guest_name_norm TEXT;
ALTER TABLE bookings ADD COLUMN suite_or_unit_norm TEXT;
ALTER TABLE bookings ADD COLUMN last_import_at DATETIME;
ALTER TABLE bookings ADD COLUMN import_batch_id TEXT;
ALTER TABLE bookings ADD COLUMN source TEXT DEFAULT 'nb';
ALTER TABLE bookings ADD COLUMN last_seen_import_at DATETIME;
```

### Phase 2: Create Indexes

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_nbid 
ON bookings(tenant_id, nightsbridge_booking_id) 
WHERE nightsbridge_booking_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_natural_key 
ON bookings(tenant_id, guest_name_norm, check_in, check_out, suite_or_unit_norm);
```

### Phase 3: Backfill Normalization

```sql
UPDATE bookings 
SET guest_name_norm = LOWER(TRIM(REPLACE(REPLACE(guest_name, '  ', ' '), '  ', ' '))),
    suite_or_unit_norm = LOWER(TRIM(REPLACE(REPLACE(suite_or_unit, '  ', ' '), '  ', ' ')))
WHERE guest_name_norm IS NULL;
```

### Phase 4: Deduplicate (if needed)

```sql
-- Find duplicates
WITH dupes AS (
  SELECT 
    tenant_id, 
    guest_name_norm, 
    check_in, 
    check_out, 
    suite_or_unit_norm, 
    COUNT(*) as cnt
  FROM bookings
  WHERE guest_name_norm IS NOT NULL AND suite_or_unit_norm IS NOT NULL
  GROUP BY 1, 2, 3, 4, 5
  HAVING cnt > 1
),
-- Keep newest row per duplicate group
keepers AS (
  SELECT MAX(b.id) as keep_id
  FROM bookings b
  INNER JOIN dupes d ON (
    b.tenant_id = d.tenant_id AND
    b.guest_name_norm = d.guest_name_norm AND
    b.check_in = d.check_in AND
    b.check_out = d.check_out AND
    b.suite_or_unit_norm = d.suite_or_unit_norm
  )
  GROUP BY b.tenant_id, b.guest_name_norm, b.check_in, b.check_out, b.suite_or_unit_norm
)
-- Delete all rows except keepers
DELETE FROM bookings WHERE id IN (
  SELECT b.id 
  FROM bookings b
  INNER JOIN dupes d ON (
    b.tenant_id = d.tenant_id AND
    b.guest_name_norm = d.guest_name_norm AND
    b.check_in = d.check_in AND
    b.check_out = d.check_out AND
    b.suite_or_unit_norm = d.suite_or_unit_norm
  )
  WHERE b.id NOT IN (SELECT keep_id FROM keepers)
);
```

**Safety**: Migration script checks for column existence before adding, uses `IF NOT EXISTS` for indexes, and wraps in a transaction (if supported by Turso).
