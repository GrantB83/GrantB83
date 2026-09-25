# Tasks: GuestFlow Sprint 2 Data Fixes

**Input**: Design documents from `/specs/017-sprint2-data-fixes/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required by the feature spec. Write tests first where marked; synthetic fixtures only.

**Organization**: Tasks are grouped by user story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. US1, US2, US3)

## Phase 1: Setup

**Purpose**: Point Spec Kit at this feature and keep the diff in GuestFlow + this spec dir

- [x] T001 Persist `.specify/feature.json` to `specs/017-sprint2-data-fixes` and confirm branch `cursor/sprint2-data-fixes-27a6` is based on `main@a224cf5`
- [x] T002 Verify `apps/guestflow/.gitignore` already covers `node_modules/`, `dist/`, `build/`, `*.log`, `.env*` without widening ignore files

---

## Phase 2: Foundational

**Purpose**: Shared predicates and lockbox resolver that every story uses

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Add `isOwnerBlock`, `isCancelledStatus`, `isActiveGuestBooking`, and `ACTIVE_GUEST_BOOKING_SQL` in `apps/guestflow/src/lib/booking-filters.ts` using `upper(trim(guest_name)) = 'BLOCK'` and case-insensitive cancelled / canceled / no show
- [x] T004 [P] Export `normalizeSuiteName` and `suiteMatches` from `apps/guestflow/src/lib/access-codes.ts` without changing match rules
- [x] T005 Add `resolvePropertyForSuite`, `propertyDisplayName`, `CODES_UNRESOLVED_REASON`, and `resolveAccessCodesForSuite` in `apps/guestflow/src/lib/property-resolve.ts` (lockbox `property` only; fail closed)
- [x] T006 [P] Add lockbox SoR fixture `apps/guestflow/src/lib/__tests__/lockbox-sor-suites.fixture.ts` mirroring 3 Cottage + 5 Main House lockboxes using suite strings already present in GuestFlow tests (no live codes)
- [x] T007 Add read-only count script `apps/guestflow/scripts/count-owner-blocks.js` (counts only, dry-run, never prints names)

**Checkpoint**: Foundation ready

---

## Phase 3: User Story 1 - Daily brief and check-in show only real guests (Priority: P1) 🎯 MVP

**Goal**: Brief, enqueue, and check-in status list only active guests; SAST dates; unknown when no events

**Independent Test**: Mixed fixture → only active guest counted; check-in default date is SAST; no events → `unknown`

### Tests for User Story 1

- [x] T008 [P] [US1] Write `apps/guestflow/src/lib/__tests__/booking-filters.test.ts` for cancelled variants, no-show, BLOCK, and a normal booking
- [x] T009 [P] [US1] Extend `apps/guestflow/src/lib/__tests__/daily-brief.test.ts` with cancelled + BLOCK rows: counts, missing-data, empty-suite, no “Property TBD”
- [x] T010 [P] [US1] Add `apps/guestflow/__tests__/checkin-status.test.ts` for cancelled/BLOCK excluded, SAST default date, and `unknown` when no events

### Implementation for User Story 1

- [x] T011 [US1] Select `status` / `guest_name` and apply `ACTIVE_GUEST_BOOKING_SQL` in `apps/guestflow/src/app/api/daily-brief/route.ts` and `apps/guestflow/src/app/api/daily-brief/enqueue/route.ts`
- [x] T012 [US1] Add optional `status?` on `RawBookingRow` and filter with `isActiveGuestBooking` in `apps/guestflow/src/lib/daily-brief.ts` (`buildDailyBriefSnapshot`, `flattenBookingsForDate`, `detectEmptySuites`); optional “Owner blocks: N” occupancy line
- [x] T013 [US1] Apply the same filter and `johannesburgTodayIso()` default in `apps/guestflow/src/app/api/checkin-status/route.ts`
- [x] T014 [US1] Return `checkinStatus: 'unknown'` and `needsLateCheckinInstructions: false` when there are no events in `apps/guestflow/src/lib/checkin-inference.ts`

**Checkpoint**: US1 independently testable

---

## Phase 4: User Story 2 - Property is honest, never demo or guessed (Priority: P1)

**Goal**: Lockbox-derived display names; no demo seed; NB upsert only when resolved

**Independent Test**: Resolver unit tests + seed grep + upsert tests

### Tests for User Story 2

- [x] T015 [P] [US2] Write `apps/guestflow/src/lib/__tests__/property-resolve.test.ts` for exact match, prefixed NB name, ambiguous → null, unknown → null, SoR fixture every suite resolves
- [x] T016 [P] [US2] Extend `apps/guestflow/src/lib/__tests__/nightsbridge-upsert.test.ts` so `property_name` is set when resolved and left NULL otherwise
- [x] T017 [P] [US2] Add a grep-style assertion that `apps/guestflow/src/lib/db.ts` seed no longer contains Riverside Lodge / Mountain View Suites / Coastal Retreat

### Implementation for User Story 2

- [x] T018 [US2] Resolve property for brief rows in `apps/guestflow/src/lib/daily-brief.ts` / daily-brief routes so display never uses “Property TBD”
- [x] T019 [US2] Remove demo property inserts from `seedDefaultData` and `seedDefaultDataAsync` in `apps/guestflow/src/lib/db.ts`
- [x] T020 [US2] Set `bookings.property_name` in `apps/guestflow/src/lib/nightsbridge-upsert.ts` insert and update only when `resolvePropertyForSuite` returns a value
- [x] T021 [US2] Add dry-run `apps/guestflow/scripts/migrate-gap1-properties.js` (counts only; `--apply` replaces unreferenced demo rows only)

**Checkpoint**: US2 independently testable

---

## Phase 5: User Story 3 - Owner blocks are never treated as guests (Priority: P1)

**Goal**: BLOCK excluded from ingest auto-drafts and UMI read filters; still stored

**Independent Test**: BLOCK row creates no arriving thread and no link candidate

### Tests for User Story 3

- [x] T022 [P] [US3] Extend `apps/guestflow/src/lib/__tests__/umi-threads.test.ts` and `apps/guestflow/__tests__/umi-inbox.test.ts` so a BLOCK row yields no arriving thread and no link candidate

### Implementation for User Story 3

- [x] T023 [US3] Skip owner blocks in welcome and late-check-in auto-draft filters in `apps/guestflow/src/app/api/cron/nightsbridge-ingest/route.ts`
- [x] T024 [US3] Apply `isActiveGuestBooking` / `isOwnerBlock` in `loadBookings`, `ensureArrivingBookingThreads`, and `listLinkCandidates` in `apps/guestflow/src/lib/umi-threads.ts` (read filters only)

**Checkpoint**: US3 independently testable

---

## Phase 6: User Story 4 - Exceptions load; Today endpoint gone (Priority: P1)

**Goal**: Exceptions 200 on live schema; webhook inserts safe; today-stats deleted

**Independent Test**: GET exceptions 200; PATCH ok without audit_log; no src reference to today-stats

### Tests for User Story 4

- [x] T025 [P] [US4] Add `apps/guestflow/__tests__/exceptions-api.test.ts` GET 200 against `db.ts` schema and PATCH success when `audit_log` is absent
- [x] T026 [P] [US4] Extend `apps/guestflow/__tests__/inbound-webhook-twilio.test.ts` so timeout and missing-rate-card paths insert tickets without error on the `db.ts` schema
- [x] T027 [P] [US4] Add grep-style test that nothing in `apps/guestflow/src/` references `/api/today-stats`

### Implementation for User Story 4

- [x] T028 [US4] Rewrite GET/PATCH in `apps/guestflow/src/app/api/exceptions/route.ts` to live columns and guarded audit_log
- [x] T029 [US4] Fix `guest_tickets` inserts near lines 260 and 481 in `apps/guestflow/src/app/api/inbound/webhook/route.ts` to live columns only
- [x] T030 [US4] Delete `apps/guestflow/src/app/api/today-stats/route.ts` and do not restore the Today board

**Checkpoint**: US4 independently testable

---

## Phase 7: User Story 5 - Codes follow lockbox property only (Priority: P1)

**Goal**: Repo-wide replace of suite-name property picks; fail closed

**Independent Test**: Cottage-in-name + Main House lockbox → Main House codes; missing row → no codes

### Tests for User Story 5

- [x] T031 [P] [US5] Extend `apps/guestflow/src/lib/__tests__/property-resolve.test.ts` with (1) every SoR fixture suite, (2) suite name contains cottage but lockbox property Main House, (3) missing row → no codes

### Implementation for User Story 5

- [x] T032 [US5] Replace substring property picks in `apps/guestflow/src/app/api/guest-portal/[code]/route.ts` with `resolveAccessCodesForSuite`
- [x] T033 [US5] Replace substring property picks in `apps/guestflow/src/app/api/welcome-drafts/route.ts` with `resolveAccessCodesForSuite`; draft without codes + `codes: property unresolved` when fail-closed
- [x] T034 [US5] Replace substring property picks in `apps/guestflow/src/app/api/packs/welcome-late/route.ts` and `apps/guestflow/src/app/api/late-checkin/export/route.ts`
- [x] T035 [US5] Replace substring property picks in `apps/guestflow/src/lib/ticket-playbooks.ts`
- [x] T036 [US5] Grep the repo for remaining `includes('cottage')` property picks and replace any guestflow call site; list every changed site for the PR body

**Checkpoint**: US5 independently testable

---

## Phase 8: User Story 6 - Opening the Inbox writes nothing (Priority: P1)

**Goal**: Inbox/thread GET read-only; needs-attention = unanswered inbound; cleanup script dry-run

**Independent Test**: Inbox open = 0 writes; empty thread not flagged; unanswered inbound flagged

### Tests for User Story 6

- [x] T037 [P] [US6] Extend `apps/guestflow/__tests__/umi-inbox.test.ts` and `apps/guestflow/src/lib/__tests__/umi-threads.test.ts`: opening Inbox makes zero DB writes; empty thread never flagged; real unanswered inbound flagged

### Implementation for User Story 6

- [x] T038 [US6] Make `listInboxThreads` and `getThreadDetail` read-only in `apps/guestflow/src/lib/umi-threads.ts` (no `ensureArrivingBookingThreads`, no `applyTempHygiene`); create threads only from inbound/outbound message paths
- [x] T039 [US6] Set `needsAttention` true only for unanswered inbound in `apps/guestflow/src/lib/umi-threads.ts`; never flag empty threads
- [x] T040 [US6] Add `apps/guestflow/scripts/cleanup-umi-empty-threads.js` dry-run by default, not referenced from deploy: clear false needs-attention on zero-message threads when `--apply`; LIST empty auto-created threads without deleting

**Checkpoint**: US6 independently testable

---

## Phase 9: Polish & Cross-Cutting

- [x] T041 [P] Update `docs/automation/STATUS.md` and `docs/automation/labor-ledger.md` with this package’s ritual removed and artefact (Preview brief + Exceptions)
- [x] T042 Confirm no edits to `/api/rate-cards` or rate-card pages (item Q dropped)
- [x] T043 Run `npm run lint`, `npx tsc --noEmit`, and `npm test` in `apps/guestflow` and record output for the PR
- [x] T044 Existing UMI tests still pass, including `apps/guestflow/__tests__/umi-nav-slim.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1–US6**: Depend on Foundational; US1/US4/US6 can proceed in parallel after T007
- **US2** uses T005 resolver; **US5** uses T005 + T006
- **US3** uses T003 and umi-threads
- **Polish**: After all stories

### User Story Dependencies

- **US1**: After Foundational
- **US2**: After Foundational (T005)
- **US3**: After Foundational (T003)
- **US4**: After Foundational (independent files)
- **US5**: After T005/T006
- **US6**: After Foundational; umi-threads also touched by US3 — sequence US3 then US6 on that file

### Parallel Opportunities

- T003/T004/T006/T007 in parallel after T001
- US1 tests T008–T010 in parallel
- US4 tests T025–T027 in parallel
- Do not parallel-edit `umi-threads.ts` across US3 and US6

---

## Parallel Example: User Story 1

```bash
# Tests first
Task: "booking-filters.test.ts"
Task: "daily-brief.test.ts cancelled+BLOCK"
Task: "checkin-status.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1–2 foundation
2. Phase 3 US1
3. Validate brief + check-in fixtures

### Incremental Delivery

1. Foundation
2. US1 brief/check-in
3. US2 property/seed
4. US3 BLOCK filters
5. US4 exceptions / delete today-stats
6. US5 lockbox codes
7. US6 inbox read-only
8. Polish + quality gates

### Parallel Team Strategy

Not used. One Cloud Agent, one PR.

---

## Notes

- [P] tasks = different files, no dependencies
- Never invent codes or PII
- Scripts are committed, not run on deploy or Production
