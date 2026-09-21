# Tasks: Nightsbridge Bookings Incremental Source of Record

**Input**: Design documents from `/specs/011-nb-bookings-incremental-sor/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are included as this is a data integrity feature requiring validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Repository: `/workspace/apps/guestflow/`
- Scripts: `scripts/`
- Source: `src/lib/`, `src/app/api/`
- Tests: `src/**/__tests__/`, `__tests__/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create migration script template at `apps/guestflow/scripts/migrate-phase17-incremental-bookings.js`
- [ ] T002 Create core UPSERT library at `apps/guestflow/src/lib/nightsbridge-upsert.ts`
- [ ] T003 [P] Create test fixtures directory at `apps/guestflow/__tests__/fixtures/bookings/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema changes that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Add `nightsbridge_booking_id` TEXT column to `bookings` table in migration script
- [ ] T005 [P] Add `guest_name_norm` TEXT column to `bookings` table in migration script
- [ ] T006 [P] Add `suite_or_unit_norm` TEXT column to `bookings` table in migration script
- [ ] T007 [P] Add `last_import_at` DATETIME column to `bookings` table in migration script
- [ ] T008 [P] Add `import_batch_id` TEXT column to `bookings` table in migration script
- [ ] T009 [P] Add `source` TEXT column with DEFAULT 'nb' to `bookings` table in migration script
- [ ] T010 [P] Add `last_seen_import_at` DATETIME column to `bookings` table in migration script
- [ ] T011 Create partial unique index `idx_bookings_nbid` on `(tenant_id, nightsbridge_booking_id) WHERE nightsbridge_booking_id IS NOT NULL` in migration script
- [ ] T012 Create unique index `idx_bookings_natural_key` on `(tenant_id, guest_name_norm, check_in, check_out, suite_or_unit_norm)` in migration script
- [ ] T013 Add backfill logic for `guest_name_norm` and `suite_or_unit_norm` using `LOWER(TRIM(REPLACE(...)))` normalization in migration script
- [ ] T014 Add deduplication logic using CTE to find duplicates by natural key and delete all except newest (`MAX(id)`) in migration script
- [ ] T015 Test migration script on local SQLite database with seed data
- [ ] T016 Verify migration is idempotent (safe to run multiple times) by running twice on test database

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Incremental Booking Updates (Priority: P1) 🎯 MVP

**Goal**: Replace INSERT OR REPLACE with UPSERT logic using durable identity (nbid + natural key fallback)

**Independent Test**: Upload same Nightsbridge file twice, verify booking count remains stable (12, not 24)

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T017 [P] [US1] Create unit test `nightsbridge-upsert.test.ts` for UPSERT with nbid (insert new, then update same nbid)
- [ ] T018 [P] [US1] Add unit test case for UPSERT with natural key (no nbid, matches by guest/dates/suite)
- [ ] T019 [P] [US1] Add unit test case for INSERT when no match found (new booking)
- [ ] T020 [P] [US1] Add unit test case for preserving `id`, `tenant_id`, `guest_name`, `check_in`, `check_out`, `suite_or_unit`, `created_at` on conflict
- [ ] T021 [P] [US1] Add unit test case for updating `guest_phone`, `status`, `adults`, `children`, `notes`, `late_check_in`, `updated_at`, `last_import_at`, `import_batch_id` on conflict

### Implementation for User Story 1

- [ ] T022 [P] [US1] Implement `normalizeGuestName(name: string): string` function in `src/lib/nightsbridge-upsert.ts` using `toLowerCase().trim().replace(/\s+/g, ' ')`
- [ ] T023 [P] [US1] Implement `normalizeSuite(suite: string): string` function in `src/lib/nightsbridge-upsert.ts` using same normalization as guest name
- [ ] T024 [US1] Implement `upsertBooking(db, booking, tenantId, batchId)` function in `src/lib/nightsbridge-upsert.ts` with logic: set normalized fields, try INSERT with ON CONFLICT clause targeting nbid index first, fallback to natural key index, UPDATE mutable fields only
- [ ] T025 [US1] Modify `POST /api/cron/nightsbridge-ingest/route.ts` to generate UUID for `import_batch_id` at start of import using `crypto.randomUUID()`
- [ ] T026 [US1] Replace `INSERT OR REPLACE` logic in route.ts with call to `upsertBooking()` for each parsed booking
- [ ] T027 [US1] Add tracking of `inserted` vs `updated` counts based on return value from `upsertBooking()`
- [ ] T028 [US1] Update response JSON to include `{inserted, updated}` counts in addition to existing fields

**Checkpoint**: At this point, User Story 1 should be fully functional - double import produces stable booking count

---

## Phase 4: User Story 2 - Soft-Cancel for Disappeared Bookings (Priority: P1)

**Goal**: Mark bookings as cancelled when they disappear from import window

**Independent Test**: Import file with 3 bookings for Sept 20-25, then import file omitting 1 booking, verify omitted booking has status='cancelled'

### Tests for User Story 2

- [ ] T029 [P] [US2] Add unit test case for soft-cancel logic in `nightsbridge-upsert.test.ts`: booking within window, missing from import → status=cancelled
- [ ] T030 [P] [US2] Add unit test case for NO cancel when booking dates outside import window
- [ ] T031 [P] [US2] Add unit test case for reactivation: cancelled booking reappears in import → status recalculated based on date

### Implementation for User Story 2

- [ ] T032 [P] [US2] Implement `determineImportWindow(parsedBookings)` function in `src/lib/nightsbridge-upsert.ts` returning `{minDate, maxDate}` from min check_in and max check_out
- [ ] T033 [US2] Implement `softCancelDisappearedBookings(db, tenantId, importWindow, batchId, existingBookings)` function in `src/lib/nightsbridge-upsert.ts` with logic: query bookings where (check_in >= minDate AND check_out <= maxDate), for each existing booking not in current parsed list, UPDATE status='cancelled' and last_seen_import_at=previous last_import_at
- [ ] T034 [US2] Add call to `determineImportWindow()` in route.ts after parsing completes
- [ ] T035 [US2] Add call to `softCancelDisappearedBookings()` in route.ts after all upserts complete
- [ ] T036 [US2] Add `cancelled` count to response tracking
- [ ] T037 [US2] Update response JSON to include `{cancelled}` count

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - stable count + soft-cancel

---

## Phase 5: User Story 3 - Import Summary Report (Priority: P2)

**Goal**: Return detailed summary with `{parsed, inserted, updated, cancelled, unchanged, errors}`

**Independent Test**: Upload file with mixed operations (5 new, 3 updates, 2 unchanged), verify response shows correct counts

### Tests for User Story 3

- [ ] T038 [P] [US3] Add integration test in `src/app/api/cron/nightsbridge-ingest/__tests__/route.test.ts` for full import with summary validation
- [ ] T039 [P] [US3] Add test case for error handling: booking with missing guest_name → included in errors array

### Implementation for User Story 3

- [ ] T040 [P] [US3] Add `unchanged` count tracking in route.ts by detecting when upsertBooking() returns 'unchanged' status
- [ ] T041 [P] [US3] Modify `upsertBooking()` to return `{action: 'inserted' | 'updated' | 'unchanged', id}` instead of just id
- [ ] T042 [US3] Add `summary` object to response with `{importBatchId, importWindow: {minDate, maxDate}}`
- [ ] T043 [US3] Update response JSON to include all counts: `{parsed, inserted, updated, cancelled, unchanged, errors, message, summary}`
- [ ] T044 [US3] Update error handling to collect non-fatal errors (e.g., missing optional fields) into `errors` array without stopping import

**Checkpoint**: All user stories should now be independently functional - full summary reporting works

---

## Phase 6: User Story 4 - Preserve Guest Contacts (Priority: P2)

**Goal**: Ensure guest_contacts upsert continues to work correctly with new UPSERT logic

**Independent Test**: Import booking, verify guest_contacts created, update booking phone, verify guest_contacts updated

### Tests for User Story 4

- [ ] T045 [P] [US4] Add integration test in route.test.ts for guest_contacts upsert with new booking
- [ ] T046 [P] [US4] Add test case for guest_contacts update when booking phone changes

### Implementation for User Story 4

- [ ] T047 [US4] Verify existing `upsertGuestContact()` call in route.ts still executes after each booking upsert
- [ ] T048 [US4] Verify `upsertGuestContact()` receives correct `lastStayAt` (check_out date) and `lastSuite` (suite_or_unit) from booking
- [ ] T049 [US4] Add test to verify guest_contacts is NOT deleted when booking is soft-cancelled (preserve 5-year retention)

**Checkpoint**: Guest contacts integration verified - no regression in P1 feature

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, testing, and final validation

- [ ] T050 [P] Update `docs/SA-OPS-NIGHTSBRIDGE-RUNBOOK.md` to document new UPSERT behavior and import summary format
- [ ] T051 [P] Add documentation in runbook for interpreting `{inserted, updated, cancelled, unchanged}` counts
- [ ] T052 [P] Add runbook section on troubleshooting: "Why did my booking get cancelled?" (check import window)
- [ ] T053 Run full test suite: `npm test` in `apps/guestflow/`
- [ ] T054 Run Vercel Preview build to verify all tests pass
- [ ] T055 Execute quickstart.md validation scenarios locally with test fixtures
- [ ] T056 [P] Add package.json script `db:migrate:phase17` for running migration
- [ ] T057 Commit migration script with message: `feat(guestflow): phase 17 - incremental NB bookings schema`
- [ ] T058 Commit UPSERT library with message: `feat(guestflow): add nightsbridge-upsert core logic`
- [ ] T059 Commit route changes with message: `feat(guestflow): replace INSERT OR REPLACE with UPSERT in NB ingest`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 and US2 should be done sequentially (US2 builds on US1's upsert logic)
  - US3 can start after US1+US2 (adds reporting on top)
  - US4 can run in parallel with US3 (independent guest_contacts verification)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Core UPSERT logic
- **User Story 2 (P1)**: Depends on US1 completion - Uses upsertBooking() function
- **User Story 3 (P2)**: Depends on US1+US2 - Adds summary reporting on existing logic
- **User Story 4 (P2)**: Can start after US1 - Verifies no regression, uses existing upsertGuestContact()

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Core library functions before route integration
- Route changes before response formatting
- Unit tests before integration tests
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks (T001-T003) can run in parallel
- All Foundational column additions (T005-T010) can run in parallel after T004
- Within US1: Tests T017-T021 can all run in parallel
- Within US1: Normalization functions T022-T023 can run in parallel
- Within US2: Tests T029-T031 can run in parallel
- Within US2: Window and soft-cancel functions T032-T033 can run in parallel
- Within US3: Tests T038-T039 can run in parallel
- Within US3: Response updates T040-T041 can run in parallel
- Within US4: Tests T045-T046 can run in parallel
- All Polish documentation tasks (T050-T052, T056) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for UPSERT with nbid in nightsbridge-upsert.test.ts"
Task: "Unit test for UPSERT with natural key in nightsbridge-upsert.test.ts"
Task: "Unit test for INSERT when no match in nightsbridge-upsert.test.ts"
Task: "Unit test for preserving immutable fields in nightsbridge-upsert.test.ts"
Task: "Unit test for updating mutable fields in nightsbridge-upsert.test.ts"

# After tests fail, launch normalization functions together:
Task: "Implement normalizeGuestName() in src/lib/nightsbridge-upsert.ts"
Task: "Implement normalizeSuite() in src/lib/nightsbridge-upsert.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 Only - Both P1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - schema changes)
3. Complete Phase 3: User Story 1 (UPSERT logic)
4. Complete Phase 4: User Story 2 (Soft-cancel)
5. **STOP and VALIDATE**: Test double import (stable count) and soft-cancel
6. Deploy to Vercel Preview

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Stable booking counts! (Core fix)
3. Add User Story 2 → Test independently → Soft-cancel works!
4. Add User Story 3 → Test independently → Summary reporting!
5. Add User Story 4 → Test independently → Guest contacts preserved!
6. Each story adds value without breaking previous stories

### Single Developer Strategy

1. Complete Setup + Foundational together (T001-T016)
2. US1: Write tests (T017-T021) → Run and verify FAIL
3. US1: Implement UPSERT logic (T022-T028) → Tests PASS
4. US2: Write tests (T029-T031) → Run and verify FAIL
5. US2: Implement soft-cancel (T032-T037) → Tests PASS
6. US3: Write tests (T038-T039) → Run and verify FAIL
7. US3: Implement summary (T040-T044) → Tests PASS
8. US4: Write tests (T045-T046) → Run and verify FAIL
9. US4: Verify guest contacts (T047-T049) → Tests PASS
10. Polish (T050-T059)

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- US1+US2 are both P1 and form the MVP (stable count + soft-cancel)
- US3+US4 are P2 enhancements (reporting and verification)
- Verify tests fail before implementing
- Commit after each logical group of tasks
- Migration script MUST be tested locally before deploying to Turso
- Stop at any checkpoint to validate story independently
- Follow TDD: Red (tests fail) → Green (implementation) → Refactor
