# Quickstart: Nightsbridge Bookings Incremental SoR

**Feature**: Incremental booking updates with UPSERT and soft-cancel
**Date**: 2026-09-21

## Purpose

This guide provides runnable validation scenarios to prove the incremental booking update feature works end-to-end.

## Prerequisites

- GuestFlow repository cloned
- Node.js 18+ installed
- Local SQLite database initialized (`npm run db:init`)
- `CRON_SECRET` set in `.env.local`

## Setup Commands

```bash
# 1. Install dependencies
cd apps/guestflow
npm install

# 2. Initialize database with Phase 17 migration
npm run db:migrate:phase17

# 3. Seed test tenant (if not already present)
npm run db:seed

# 4. Start dev server
npm run dev
```

**Expected outcome**: Dev server running at `http://localhost:3100`

## Validation Scenarios

### Scenario 1: Stable Booking Count (No Duplicates)

**Purpose**: Verify that importing the same file twice does NOT create duplicates.

**Test Commands**:

```bash
# Create test file with 3 bookings
cat > /tmp/test-bookings.xlsx << 'EOF'
[Excel file with 3 bookings: Sarah Henderson, Emma Thompson, James Wilson]
EOF

# First import
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  -F "file=@/tmp/test-bookings.xlsx" \
  "http://localhost:3100/api/cron/nightsbridge-ingest?date=2026-09-20"

# Expected: {"inserted": 3, "updated": 0, "cancelled": 0, "unchanged": 0}

# Second import (same file)
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  -F "file=@/tmp/test-bookings.xlsx" \
  "http://localhost:3100/api/cron/nightsbridge-ingest?date=2026-09-20"

# Expected: {"inserted": 0, "updated": 0, "cancelled": 0, "unchanged": 3}

# Verify count
npm run db:query "SELECT COUNT(*) FROM bookings WHERE guest_name IN ('Sarah Henderson', 'Emma Thompson', 'James Wilson')"

# Expected: 3 (not 6!)
```

**Expected Outcome**: 
- First import: `inserted: 3`
- Second import: `unchanged: 3`
- Database count: 3 bookings (stable)

### Scenario 2: Update Existing Booking

**Purpose**: Verify that changes in Nightsbridge export update existing rows.

**Test Commands**:

```bash
# First import: Sarah has notes = ""
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  -F "file=@/tmp/test-bookings-v1.xlsx" \
  "http://localhost:3100/api/cron/nightsbridge-ingest?date=2026-09-20"

# Verify notes are empty
npm run db:query "SELECT notes FROM bookings WHERE guest_name = 'Sarah Henderson'"
# Expected: ""

# Second import: Sarah has notes = "Late arrival ~19:00"
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  -F "file=@/tmp/test-bookings-v2.xlsx" \
  "http://localhost:3100/api/cron/nightsbridge-ingest?date=2026-09-20"

# Expected: {"inserted": 0, "updated": 1, "cancelled": 0, "unchanged": 2}

# Verify notes updated
npm run db:query "SELECT notes FROM bookings WHERE guest_name = 'Sarah Henderson'"
# Expected: "Late arrival ~19:00"
```

**Expected Outcome**:
- Second import: `updated: 1`
- Sarah's notes field updated
- Booking ID unchanged (same row updated, not new row inserted)

### Scenario 3: Soft-Cancel Disappeared Booking

**Purpose**: Verify that bookings missing from the import window are marked as cancelled.

**Test Commands**:

```bash
# First import: 3 bookings for Sept 20-22
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  -F "file=@/tmp/test-bookings-3.xlsx" \
  "http://localhost:3100/api/cron/nightsbridge-ingest?date=2026-09-20"

# Second import: Only 2 bookings (Emma Thompson missing, dates within window)
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  -F "file=@/tmp/test-bookings-2.xlsx" \
  "http://localhost:3100/api/cron/nightsbridge-ingest?date=2026-09-20"

# Expected: {"inserted": 0, "updated": 0, "cancelled": 1, "unchanged": 2}

# Verify Emma is cancelled
npm run db:query "SELECT status, last_seen_import_at FROM bookings WHERE guest_name = 'Emma Thompson'"
# Expected: status = 'cancelled', last_seen_import_at = <timestamp of first import>
```

**Expected Outcome**:
- Second import: `cancelled: 1`
- Emma Thompson status = 'cancelled'
- Emma's `last_seen_import_at` records when she was last in an import

### Scenario 4: No Cancel Outside Window

**Purpose**: Verify that bookings with dates outside the import window are NOT cancelled.

**Test Commands**:

```bash
# First import: James Wilson check-in Oct 15 (outside Sept 20-22 window)
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  -F "file=@/tmp/test-bookings-mixed-dates.xlsx" \
  "http://localhost:3100/api/cron/nightsbridge-ingest?date=2026-09-20"

# Second import: Only Sept 20-22 bookings (James is NOT in this file, dates outside window)
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  -F "file=@/tmp/test-bookings-sept-only.xlsx" \
  "http://localhost:3100/api/cron/nightsbridge-ingest?date=2026-09-20"

# Verify James is NOT cancelled
npm run db:query "SELECT status FROM bookings WHERE guest_name = 'James Wilson'"
# Expected: status = 'arriving' (or original status, NOT cancelled)
```

**Expected Outcome**:
- James Wilson status unchanged (not cancelled)
- Only bookings within the Sept 20-22 window are subject to soft-cancel

### Scenario 5: UPSERT with Nightsbridge ID

**Purpose**: Verify that bookings with `nightsbridge_booking_id` are matched correctly.

**Test Commands**:

```bash
# First import: Sarah has nbid = "NB12345"
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  -F "file=@/tmp/test-bookings-with-nbid.xlsx" \
  "http://localhost:3100/api/cron/nightsbridge-ingest?date=2026-09-20"

# Verify nbid stored
npm run db:query "SELECT nightsbridge_booking_id FROM bookings WHERE guest_name = 'Sarah Henderson'"
# Expected: "NB12345"

# Second import: Sarah's phone changes but nbid same
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  -F "file=@/tmp/test-bookings-with-nbid-updated.xlsx" \
  "http://localhost:3100/api/cron/nightsbridge-ingest?date=2026-09-20"

# Expected: {"inserted": 0, "updated": 1, "cancelled": 0}

# Verify phone updated, id unchanged
npm run db:query "SELECT id, guest_phone FROM bookings WHERE nightsbridge_booking_id = 'NB12345'"
# Expected: same id, new phone number
```

**Expected Outcome**:
- Booking matched by `nightsbridge_booking_id`
- Phone updated, same row (id unchanged)

### Scenario 6: UPSERT with Natural Key (No nbid)

**Purpose**: Verify that bookings without `nightsbridge_booking_id` are matched by natural key.

**Test Commands**:

```bash
# Import booking without nbid
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  -F "file=@/tmp/test-bookings-no-nbid.xlsx" \
  "http://localhost:3100/api/cron/nightsbridge-ingest?date=2026-09-20"

# Verify natural key fields
npm run db:query "SELECT guest_name_norm, suite_or_unit_norm FROM bookings WHERE guest_name = 'Sarah Henderson'"
# Expected: guest_name_norm = 'sarah henderson', suite_or_unit_norm = 'luxury suite 1'

# Import same booking with updated notes (no nbid, matches natural key)
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  -F "file=@/tmp/test-bookings-no-nbid-updated.xlsx" \
  "http://localhost:3100/api/cron/nightsbridge-ingest?date=2026-09-20"

# Expected: {"inserted": 0, "updated": 1, "cancelled": 0}
```

**Expected Outcome**:
- Booking matched by natural key (tenant, guest_name_norm, check_in, check_out, suite_or_unit_norm)
- Notes updated, same row

### Scenario 7: Guest Contacts Preserved

**Purpose**: Verify that `guest_contacts` upsert continues to work correctly.

**Test Commands**:

```bash
# Import booking with phone
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  -F "file=@/tmp/test-bookings-with-phone.xlsx" \
  "http://localhost:3100/api/cron/nightsbridge-ingest?date=2026-09-20"

# Verify guest contact created
npm run db:query "SELECT phone, display_name FROM guest_contacts WHERE phone = '+27123456789'"
# Expected: phone = '+27123456789', display_name = 'Sarah Henderson'

# Import same booking with updated phone
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  -F "file=@/tmp/test-bookings-updated-phone.xlsx" \
  "http://localhost:3100/api/cron/nightsbridge-ingest?date=2026-09-20"

# Verify guest contact updated
npm run db:query "SELECT phone, display_name FROM guest_contacts WHERE display_name = 'Sarah Henderson'"
# Expected: phone = '+27987654321' (updated)
```

**Expected Outcome**:
- Guest contact created on first import
- Guest contact updated on second import
- No regression in guest contacts behavior

## Automated Test Commands

```bash
# Run unit tests
npm test nightsbridge-upsert.test.ts

# Run integration tests
npm test route.test.ts

# Run full test suite
npm test

# Expected: All tests pass
```

## Cleanup Commands

```bash
# Reset database to clean state
npm run db:reset

# Remove test files
rm /tmp/test-bookings*.xlsx
```

## Success Criteria

✅ **Scenario 1**: Booking count remains stable after double import (3, not 6)
✅ **Scenario 2**: Updated fields reflect changes from second import
✅ **Scenario 3**: Missing booking within window is marked `cancelled`
✅ **Scenario 4**: Booking outside window is NOT cancelled
✅ **Scenario 5**: Booking with nbid is correctly updated (not duplicated)
✅ **Scenario 6**: Booking without nbid is matched by natural key
✅ **Scenario 7**: Guest contacts continue to upsert correctly

## References

- [API Contract](./contracts/api-nightsbridge-ingest.md)
- [Data Model](./data-model.md)
- [Research](./research.md)
