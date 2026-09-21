# Feature Specification: Nightsbridge Bookings Incremental Source of Record

**Feature Branch**: `011-nb-bookings-incremental-sor`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "P0 Incremental Nightsbridge bookings Source of Record"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Incremental Booking Updates (Priority: P1)

When SA Ops uploads a fresh `arr_and_dep.xlsx` export from Nightsbridge at 05:00 or 19:00 SAST, the system **updates** existing bookings instead of creating duplicates, allowing the bookings count to reflect reality and enabling staff to see accurate arrivals and departures.

**Why this priority**: This is P1 because production currently has 0 bookings visible in the Arrivals/Departures dashboard due to duplicate insertions. This makes the entire GuestFlow system non-functional for its primary purpose.

**Independent Test**: Upload the same Nightsbridge file twice. Verify that the bookings count remains stable (e.g., 12 bookings after first upload, still 12 bookings after second upload, not 24).

**Acceptance Scenarios**:

1. **Given** a booking "Sarah Henderson, Suite 1, 2026-09-20 to 2026-09-22" exists in the database, **When** the same booking appears in a new Nightsbridge import with updated notes "Late arrival ~19:00", **Then** the existing booking is updated with the new notes instead of creating a duplicate
2. **Given** a booking has `nightsbridge_booking_id = "NB12345"`, **When** a new import includes the same booking with the same nbid, **Then** the system performs an UPDATE on phone, status, adults, children, notes, late_check_in fields
3. **Given** a booking has no `nightsbridge_booking_id` but matches on natural key (tenant, guest_name_norm, check_in, check_out, suite_or_unit_norm), **When** a new import includes the same booking, **Then** the system performs an UPDATE instead of INSERT

---

### User Story 2 - Soft-Cancel for Disappeared Bookings (Priority: P1)

When a booking that appeared in yesterday's Nightsbridge file is missing from today's file (within the report's date window), the system marks it as `cancelled` or `no_show` instead of leaving it as `arriving` forever, allowing staff to see accurate departure/arrival lists.

**Why this priority**: This is P1 because without soft-cancel, cancelled bookings remain in the "arriving" list forever, creating confusion for housekeeping and front desk operations.

**Independent Test**: Import a file with bookings for Sept 20-25. Then import a second file for Sept 20-25 that omits one of the original bookings. Verify the omitted booking is marked `status=cancelled` with `last_seen_import_at` timestamp.

**Acceptance Scenarios**:

1. **Given** a booking "Emma Thompson, Suite 2, 2026-09-20 to 2026-09-22" exists with `check_in` and `check_out` dates inside the import window, **When** a new import for the same date range does not include Emma Thompson, **Then** the booking status is set to `cancelled` and `last_seen_import_at` is set to the previous import timestamp
2. **Given** a booking "James Wilson, Suite 3, 2026-10-15 to 2026-10-18" exists with dates **outside** the current import window (Sept 20-25), **When** a new import for Sept 20-25 does not include James Wilson, **Then** the booking status remains unchanged (do not cancel bookings outside the file's date window)
3. **Given** a booking was marked `cancelled` by a previous import, **When** the booking reappears in a subsequent import, **Then** the status is updated back to `arriving` or `inhouse` based on current date

---

### User Story 3 - Import Summary Report (Priority: P2)

When an import completes, SA Ops receives a detailed summary showing `{parsed, inserted, updated, cancelled, unchanged, errors}` counts, allowing them to verify the import worked correctly and troubleshoot any issues.

**Why this priority**: This is P2 because it's needed for operational visibility and debugging, but the core update/cancel logic (P1) can work without it.

**Independent Test**: Upload a file with 10 bookings (5 new, 3 updates, 2 disappeared). Verify the response JSON shows `{inserted: 5, updated: 3, cancelled: 2, unchanged: 0}`.

**Acceptance Scenarios**:

1. **Given** an import of 12 bookings where 5 are new, 4 match existing bookings with changes, 2 match existing bookings without changes, and 1 booking in the DB is missing from the file, **When** the import completes, **Then** the response shows `{parsed: 12, inserted: 5, updated: 4, cancelled: 1, unchanged: 2, errors: 0}`
2. **Given** an import with one booking that fails validation (missing guest_name), **When** the import completes, **Then** the response includes `errors: ["Row 5: guest_name is required"]`

---

### User Story 4 - Preserve Guest Contacts (Priority: P2)

When bookings are updated or soft-cancelled, the `guest_contacts` table continues to track each guest's phone and email with 5-year retention, allowing the system to send portal links and welcome messages even after their stay is complete.

**Why this priority**: This is P2 because guest contacts are already being upserted correctly in the current code, but we must ensure the new UPSERT logic preserves this behavior.

**Independent Test**: Import a booking for "Sarah Henderson" with phone "+27123456789". Update the same booking with phone "+27987654321". Verify `guest_contacts` shows the latest phone and `last_stay_at` is updated.

**Acceptance Scenarios**:

1. **Given** a guest contact exists for "Sarah Henderson" with `last_stay_at = 2026-08-15`, **When** a booking for Sarah with `check_out = 2026-09-22` is imported, **Then** the guest contact's `last_stay_at` is updated to `2026-09-22`
2. **Given** a booking is soft-cancelled, **When** the guest contact record exists, **Then** the contact record is preserved (not deleted) with `last_stay_at` unchanged

---

### Edge Cases

- What happens when a booking has a `nightsbridge_booking_id` on first import but the ID is missing in a subsequent import? (Should match on natural key as fallback)
- What happens when two bookings in the same file have the same natural key (same guest, same dates, same suite)? (Should insert both and log a warning about potential duplicate)
- What happens when the import file's date window is ambiguous (no check-in/check-out dates)? (Should not perform any soft-cancels; log warning)
- What happens when a booking is updated from "arriving" to "departing" on the same day? (Should update status correctly based on target date)
- What happens when the database has leftover test bookings with no `nightsbridge_booking_id` and non-normalized names? (Migration script should backfill normalization and deduplicate where possible)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST add a `nightsbridge_booking_id` TEXT column to the `bookings` table to store the external booking ID from Nightsbridge
- **FR-002**: System MUST create a partial unique index `UNIQUE(tenant_id, nightsbridge_booking_id) WHERE nightsbridge_booking_id IS NOT NULL` to prevent duplicate insertions with the same nbid (if Turso/SQLite supports partial indexes; otherwise document the constraint)
- **FR-003**: System MUST add `guest_name_norm` and `suite_or_unit_norm` TEXT columns to store lowercased, whitespace-collapsed versions of the guest name and suite for natural key matching
- **FR-004**: System MUST create a unique index `UNIQUE(tenant_id, guest_name_norm, check_in, check_out, suite_or_unit_norm)` as a fallback natural key for bookings without a `nightsbridge_booking_id`
- **FR-005**: System MUST add tracking columns: `last_import_at` DATETIME, `import_batch_id` TEXT (UUID per import run), `source` TEXT (default 'nb'), `last_seen_import_at` DATETIME
- **FR-006**: System MUST replace the current `INSERT OR REPLACE` logic with UPSERT logic using `INSERT ... ON CONFLICT DO UPDATE SET`
- **FR-007**: System MUST update the following fields on conflict: phone, status, adults, children, notes, late_check_in, property_name, updated_at, last_import_at, import_batch_id
- **FR-008**: System MUST preserve the `id` (primary key), `created_at`, `tenant_id`, `guest_name`, `check_in`, `check_out`, and `suite_or_unit` fields on conflict (never overwrite these)
- **FR-009**: System MUST implement window-based soft-cancel: for all bookings in the database where `check_in` and `check_out` fall inside the import file's date window, if the booking is missing from the current import, set `status = 'cancelled'` and record the previous `last_import_at` as `last_seen_import_at`
- **FR-010**: System MUST NOT cancel bookings whose dates fall outside the import file's date window (to avoid false cancellations)
- **FR-011**: System MUST return a summary JSON with `{parsed, inserted, updated, cancelled, unchanged, errors}` counts
- **FR-012**: System MUST continue to upsert `guest_contacts` for each booking with null-tolerant handling (do not fail if phone or email is missing)
- **FR-013**: Migration script MUST be idempotent (safe to run multiple times) and Turso-safe (no CREATE INDEX IF NOT EXISTS issues)
- **FR-014**: Migration script MUST backfill `guest_name_norm` and `suite_or_unit_norm` for existing bookings
- **FR-015**: Migration script MUST deduplicate existing bookings by natural key, keeping the newest row (by `created_at` or `id`) when duplicates are found
- **FR-016**: System MUST NOT truncate or DELETE ALL from the bookings table (never wipe all data)
- **FR-017**: System MUST NOT auto-invent PII (phone numbers, emails) when missing from the import file

### Key Entities *(include if feature involves data)*

- **Booking**: Represents a guest stay with check-in/check-out dates, suite assignment, guest details, and status. Core fields include `id` (autoincrement), `tenant_id`, `nightsbridge_booking_id` (external ID), `guest_name`, `guest_name_norm`, `suite_or_unit`, `suite_or_unit_norm`, `check_in`, `check_out`, `status`, `adults`, `children`, `notes`, `late_check_in`, `guest_phone`, `created_at`, `updated_at`, `last_import_at`, `import_batch_id`, `source`, `last_seen_import_at`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After importing the same Nightsbridge file twice, the bookings count in the database remains stable (no duplicates)
- **SC-002**: When a booking is updated in Nightsbridge (e.g., notes change from "" to "Late arrival"), the next import updates the existing row instead of inserting a new row
- **SC-003**: When a booking disappears from the Nightsbridge file within the report's date window, the booking is marked `status=cancelled` within the same import
- **SC-004**: Import completes in under 5 seconds for files with up to 50 bookings
- **SC-005**: Migration script completes successfully on existing production Turso database without data loss
- **SC-006**: Vercel Preview build passes all tests after schema changes
- **SC-007**: The API response includes a detailed summary JSON showing counts for parsed, inserted, updated, cancelled, and unchanged bookings
- **SC-008**: Guest contacts continue to be upserted correctly with the new UPSERT logic (no regression)

## Assumptions

- The Nightsbridge export format (Excel with headers "Room Name", "Guest Name", "Booking ID", "Check In", "Check Out", etc.) remains stable
- The `arr_and_dep.xlsx` file always includes a date range (check_in and check_out dates) so the system can determine the import window
- Turso database supports `ON CONFLICT` clauses and partial unique indexes (or we document the workaround if not)
- The existing `guest_contacts` upsert logic is already working correctly and should be preserved
- SA Ops will continue to drop files manually or via the `nightsbridge:upload` script at 05:00 and 19:00 SAST
- The system of record is Nightsbridge (GuestFlow is read-only for booking data)
- The Browns Dullstroom tenant ID is already in the database and remains stable
- Migration backfill and deduplication can run synchronously during the migration (no async job required for small dataset)
- The `phase16` migration already added the necessary columns (adults, children, notes, late_check_in, suite_or_unit)
- No OpenAI or LLM calls are required for this feature (pure data processing)
- Staff auth on `/ops/nightsbridge-import` and `/api/cron/nightsbridge-ingest` remains unchanged (no new auth logic needed)
