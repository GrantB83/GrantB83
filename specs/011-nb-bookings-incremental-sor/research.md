# Research: Nightsbridge Bookings Incremental SoR

**Feature**: Incremental booking updates with UPSERT and soft-cancel
**Date**: 2026-09-21

## Technical Decisions

### Decision 1: UPSERT Strategy (SQLite/Turso)

**Decision**: Use `INSERT ... ON CONFLICT DO UPDATE` with partial unique index for `nightsbridge_booking_id` and fallback composite unique index for natural key.

**Rationale**:
- SQLite 3.24+ (2018) supports `ON CONFLICT` clause natively
- Turso (libSQL) is SQLite-compatible and supports this syntax
- Partial unique indexes (`WHERE nightsbridge_booking_id IS NOT NULL`) are supported in SQLite 3.8+ (2013)
- This is more explicit and maintainable than `INSERT OR REPLACE` which always creates new rows with new primary keys
- The natural key fallback ensures bookings without nbid can still be deduplicated

**Alternatives Considered**:
- `INSERT OR REPLACE`: Current approach, but this always creates new rows (AUTOINCREMENT id changes)
- Manual SELECT → UPDATE or INSERT: More queries, less atomic
- Using only natural key (no nbid): Fragile if guest names have typos or suite names change

**Turso Compatibility**: Verified that Turso supports:
- `ON CONFLICT` clause ✅
- Partial unique indexes ✅ 
- Multiple unique constraints on same table ✅

### Decision 2: Natural Key Definition

**Decision**: Use composite key `(tenant_id, guest_name_norm, check_in, check_out, suite_or_unit_norm)` where normalized = lowercase, whitespace collapsed.

**Rationale**:
- Guest name and suite can have inconsistent casing or spacing ("Sarah Henderson" vs "sarah  henderson")
- Check-in and check-out dates are stable identifiers for a stay
- Tenant ID prevents cross-tenant collisions
- This covers the case where Nightsbridge booking ID is missing or inconsistent

**Alternatives Considered**:
- Using phone number: Not always present, can change, guests may share phones
- Using email: Not always present, can change
- Using only guest name + dates: Doesn't handle same guest booking multiple suites on same dates

**Trade-offs**:
- If a guest's name is typo-corrected in Nightsbridge, the system will treat it as a new booking (acceptable - admin can manually merge)
- If a suite is renamed, bookings will appear as new (acceptable - suite renames are rare)

### Decision 3: Soft-Cancel Window Logic

**Decision**: Determine the import file's date window from the min/max check_in and check_out dates in the parsed bookings. Only soft-cancel bookings whose (check_in, check_out) overlap with this window.

**Rationale**:
- Nightsbridge exports can be filtered by date range (e.g., "Sept 20-25")
- A booking with dates outside the file's range should NOT be cancelled just because it's missing
- Example: If the file covers Sept 20-25 and a booking for Oct 15 is in the DB but not in the file, that's expected (it's outside the export window)

**Alternatives Considered**:
- Cancel any booking missing from the import: Too aggressive, would cancel future bookings outside the export range
- Require explicit date range in API query param: Adds complexity, SA Ops would need to track the range
- Use only target date ±7 days: Arbitrary and may not match the actual export range

**Implementation**:
```javascript
// Pseudocode
const minDate = min(parsedBookings.map(b => b.checkInDate))
const maxDate = max(parsedBookings.map(b => b.checkOutDate))

// Find existing bookings in window
const existingInWindow = db.query(`
  SELECT * FROM bookings 
  WHERE tenant_id = ? 
  AND check_in >= ? AND check_out <= ?
`, tenantId, minDate, maxDate)

// Soft-cancel any existing bookings not in this import
for (const existing of existingInWindow) {
  if (!parsedBookings.find(p => matchesBooking(p, existing))) {
    db.run(`UPDATE bookings SET status = 'cancelled', last_seen_import_at = ? WHERE id = ?`, 
      existing.last_import_at, existing.id)
  }
}
```

### Decision 4: Field Update Strategy

**Decision**: On conflict, update only: `guest_phone`, `status`, `adults`, `children`, `notes`, `late_check_in`, `property_name`, `updated_at`, `last_import_at`, `import_batch_id`. Never update: `id`, `tenant_id`, `guest_name`, `check_in`, `check_out`, `suite_or_unit`, `created_at`.

**Rationale**:
- The identity fields (guest_name, dates, suite) define the booking and should be immutable
- Mutable fields (phone, status, guest count, notes) can change between exports
- Preserving `id` is critical for foreign key relationships (welcome_drafts, guest_tickets)
- Preserving `created_at` maintains audit history of when the booking first appeared

**Alternatives Considered**:
- Update all fields: Risk breaking foreign keys if id changes
- Never update anything (INSERT only): Doesn't solve the original problem
- Update guest_name: Would break the natural key logic

### Decision 5: Migration & Backfill Strategy

**Decision**: Migration script adds columns, creates indexes, backfills normalization, and deduplicates. Runs synchronously (no async job).

**Rationale**:
- Dataset is small (~50-200 bookings max)
- Backfill can complete in <1 second
- Deduplication by natural key is straightforward: keep newest row by `created_at DESC`
- Idempotent checks (`IF NOT EXISTS`, column existence checks) make it safe to re-run

**Backfill Logic**:
```sql
-- Backfill normalization
UPDATE bookings 
SET guest_name_norm = LOWER(TRIM(REPLACE(REPLACE(guest_name, '  ', ' '), '  ', ' '))),
    suite_or_unit_norm = LOWER(TRIM(REPLACE(REPLACE(suite_or_unit, '  ', ' '), '  ', ' ')))
WHERE guest_name_norm IS NULL;

-- Deduplicate: Find dupes
WITH dupes AS (
  SELECT tenant_id, guest_name_norm, check_in, check_out, suite_or_unit_norm, COUNT(*) as cnt
  FROM bookings
  WHERE guest_name_norm IS NOT NULL
  GROUP BY 1, 2, 3, 4, 5
  HAVING cnt > 1
),
keepers AS (
  SELECT MAX(b.id) as id
  FROM bookings b
  INNER JOIN dupes d USING (tenant_id, guest_name_norm, check_in, check_out, suite_or_unit_norm)
  GROUP BY b.tenant_id, b.guest_name_norm, b.check_in, b.check_out, b.suite_or_unit_norm
)
DELETE FROM bookings WHERE id IN (
  SELECT b.id FROM bookings b
  INNER JOIN dupes d USING (tenant_id, guest_name_norm, check_in, check_out, suite_or_unit_norm)
  WHERE b.id NOT IN (SELECT id FROM keepers)
);
```

**Turso Safety**: 
- Use `ALTER TABLE ADD COLUMN IF NOT EXISTS` pattern (wrap in existence check)
- Use `CREATE INDEX IF NOT EXISTS`
- Backfill and dedupe can run in a transaction

### Decision 6: Testing Strategy

**Decision**: Unit tests for UPSERT logic in isolation, integration tests for full ingest route.

**Test Coverage**:
- Unit tests (`nightsbridge-upsert.test.ts`):
  - UPSERT with nbid (insert, then update same nbid)
  - UPSERT with natural key (insert, then update same guest/dates/suite)
  - Soft-cancel within window
  - No cancel outside window
  - Summary counts (inserted, updated, cancelled, unchanged)
- Integration tests (`route.test.ts`):
  - Full POST with Excel file → verify bookings updated
  - Double import → verify no duplicates
  - Guest contacts upserted correctly

**Fixtures**: Use existing test database setup from `route.test.ts`, add new test cases.

## Open Questions

**Q1**: What happens if Turso doesn't support partial unique indexes?
**A1**: Research shows Turso (libSQL) is SQLite 3.39+ compatible, which includes partial indexes (added in SQLite 3.8.0). No fallback needed.

**Q2**: Should we track individual field changes for audit?
**A2**: Out of scope for P0. The `last_import_at` timestamp is sufficient to know when a booking was last updated. Full audit logging can be added later if needed.

**Q3**: What if a guest books the same suite twice in the same date range?
**A3**: This is a legitimate edge case (e.g., booking Suite 1 for two different parties overlapping). The natural key would treat these as duplicates. Recommendation: If Nightsbridge assigns unique booking IDs, rely on those. If no nbid, this is a data quality issue in the source system (Nightsbridge should not allow double bookings). We can log a warning and keep both bookings.

## References

- SQLite ON CONFLICT: https://www.sqlite.org/lang_conflict.html
- SQLite Partial Indexes: https://www.sqlite.org/partialindex.html
- Turso Documentation: https://docs.turso.tech/
- better-sqlite3 API: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
- Existing migration pattern: `apps/guestflow/scripts/migrate-phase16-bookings.js`
- Existing ingest route: `apps/guestflow/src/app/api/cron/nightsbridge-ingest/route.ts`
