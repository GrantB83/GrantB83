# Tasks: Sprint 2 Contact Details

**Input**: Design documents from `/specs/018-sprint2-contacts/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Requested in the launch prompt (A&D parse, relay, Client gap-fill, stay@ no-overwrite, staff/self-fill validation, 5667 multi-room).

## Phase 1: Setup

**Purpose**: Feature directory and provenance constants

- [x] T001 Create contact provenance ranks and relay domain list in `apps/guestflow/src/lib/contact-provenance.ts`
- [x] T002 Create additive schema helper `ensureContactSchema` in `apps/guestflow/src/lib/contact-schema.ts` (`bookings.guest_email`, source/kind columns, `extra_rooms`, `booking_contacts`)
- [x] T003 [P] Write dry-run-only `apps/guestflow/scripts/migrate-sprint2-contacts.js` (refuse Turso unless `ALLOW_TURSO_WRITE=1`)
- [x] T004 [P] Write dry-run-only `apps/guestflow/scripts/backfill-booking-contacts.js`

## Phase 2: Foundational

**Purpose**: Apply rules and parsers used by every story

- [x] T005 Implement `applyBookingContact` precedence (A&D 100 > staff 80 > guest 60 > client_report 40 > stay_at 20; stay@ may replace A&D relay with direct only) in `apps/guestflow/src/lib/contact-apply.ts`
- [x] T006 Extract A&D section parse + multi-room merge in `apps/guestflow/src/lib/arrivals-departures-parse.ts`
- [x] T007 Implement Client report header mapper in `apps/guestflow/src/lib/client-report-parse.ts`
- [x] T008 Implement stay@ name/ref/dates matcher in `apps/guestflow/src/lib/stay-at-match.ts`
- [x] T009 Persist `guest_email` and merge extra rooms in `apps/guestflow/src/lib/nightsbridge-upsert.ts`

## Phase 3: User Story 1 — A&D source of record (P1)

**Goal**: Phone and email land on booking + guest_contacts; relays flagged

**Independent Test**: A&D parse fixture saves email/phone; relay detection

- [x] T010 [P] [US1] Add `apps/guestflow/src/lib/__tests__/contact-provenance.test.ts` (relay domains + ranks)
- [x] T011 [P] [US1] Add `apps/guestflow/src/lib/__tests__/arrivals-departures-parse.test.ts` (email/phone persist mapping, BLOCK skip)
- [x] T012 [US1] Wire ingest to persist email-only contacts and A&D provenance in `apps/guestflow/src/app/api/cron/nightsbridge-ingest/route.ts`
- [x] T013 [US1] Expose `guestEmail` and relay kind on `apps/guestflow/src/app/api/ops/arrivals-departures/route.ts` and `apps/guestflow/src/app/api/bookings/route.ts`

## Phase 4: User Story 5 — Multi-room 5667 (P1)

**Goal**: One booking, both rooms, one thread, one contact set

**Independent Test**: 5667 fixture

- [x] T014 [US5] Add synthetic 5667 two-room fixture + `apps/guestflow/src/lib/__tests__/multi-room-5667.test.ts`
- [x] T015 [US5] Merge same-nbid rooms in `apps/guestflow/src/lib/arrivals-departures-parse.ts` and `apps/guestflow/src/lib/nightsbridge-upsert.ts` so Cove is not dropped
- [x] T016 [US5] Assert one UMI booking thread via `resolveUmiThread` in the 5667 test

## Phase 5: User Story 2 — Client report gap-fill (P2)

**Goal**: Fill missing fields only

**Independent Test**: Client report fills gaps only

- [x] T017 [P] [US2] Add `apps/guestflow/src/lib/__tests__/client-report-parse.test.ts`
- [x] T018 [US2] Add `POST /api/cron/nightsbridge-client-import` in `apps/guestflow/src/app/api/cron/nightsbridge-client-import/route.ts`
- [x] T019 [US2] Cover gap-only apply in `apps/guestflow/src/lib/__tests__/contact-apply.test.ts`

## Phase 6: User Story 3 — stay@ capture (P2)

**Goal**: Unique match stores sender; no overwrite of direct A&D

**Independent Test**: stay@ match with no overwrite

- [x] T020 [P] [US3] Add `apps/guestflow/src/lib/__tests__/stay-at-match.test.ts`
- [x] T021 [US3] Call stay@ apply after inbound ingest in `apps/guestflow/src/app/api/inbound/email/route.ts`

## Phase 7: User Story 4 — Staff and guest self-fill (P2)

**Goal**: Validated entry UI, provenance, no sends

**Independent Test**: staff and self-fill validation

- [x] T022 [P] [US4] Add `POST` `apps/guestflow/src/app/api/ops/bookings/[id]/contacts/route.ts`
- [x] T023 [P] [US4] Add `POST` `apps/guestflow/src/app/api/umi/threads/[id]/contacts/route.ts`
- [x] T024 [P] [US4] Add `POST` `apps/guestflow/src/app/api/guest-portal/[code]/contacts/route.ts`
- [x] T025 [US4] Staff contact form on `apps/guestflow/src/app/ops/bookings/page.tsx` and inbox thread `apps/guestflow/src/app/page.tsx`
- [x] T026 [US4] Guest self-fill form on `apps/guestflow/src/app/guest/[code]/page.tsx`
- [x] T027 [US4] Validation tests in `apps/guestflow/src/lib/__tests__/contact-apply.test.ts`
- [x] T028 [US4] Expose current contacts + provenance on `getThreadDetail` in `apps/guestflow/src/lib/umi-threads.ts`

## Phase 8: Polish

- [x] T029 Write Grant artefact `apps/guestflow/docs/SPRINT2-CONTACTS.md` (precedence table, ritual removed)
- [x] T030 Update `docs/automation/STATUS.md` and `docs/automation/labor-ledger.md`
- [x] T031 Confirm `apps/guestflow/next.config.mjs` has no `typescript.ignoreBuildErrors`

## Dependencies

- Phase 1 → Phase 2 → US1 + US5 (P1) → US2/US3/US4 (P2) → Polish
- US5 depends on US1 ingest merge
- US2–US4 depend on T005 apply rules

## Parallel opportunities

- T003/T004 after T002
- T010/T011 after T001/T006
- T017/T020 after T007/T008
- T022/T023/T024 after T005

## Implementation strategy

MVP is US1 + US5 (A&D persist + multi-room). Then gap-fill and withheld-contact forms. Stop at Preview READY; do not merge or deploy.
