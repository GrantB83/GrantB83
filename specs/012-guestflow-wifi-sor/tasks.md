# Tasks: GuestFlow WiFi Source of Record

**Input**: Design documents from `/specs/012-guestflow-wifi-sor/`

**Prerequisites**: plan.md, spec.md, data-model.md

**Tests**: Unit tests included for SoR resolution logic and integration

**Organization**: Tasks are grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend existing access-codes schema and types for WiFi support

- [ ] T001 [P] Update `apps/guestflow/src/lib/access-codes-schema.ts` to extend `code_type` enum with `'wifi_network'` and `'wifi_password'` values
- [ ] T002 [P] Update `ResolvedAccessCodes` interface in `apps/guestflow/src/lib/access-codes-schema.ts` to add `wifi: { network: string, password: string }` field
- [ ] T003 [P] Update `AccessCodeUpsertRequest` interface in `apps/guestflow/src/lib/access-codes-schema.ts` to allow new WiFi code types
- [ ] T004 [P] Add documentation comment in `apps/guestflow/src/lib/db.ts` (or create `docs/WIFI-SOR.md`) documenting new `code_type` values for WiFi

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core WiFi resolution logic that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Extend `getAccessCode()` function in `apps/guestflow/src/lib/access-codes.ts` to handle `code_type` values `'wifi_network'` and `'wifi_password'`
- [ ] T006 Extend `resolveAccessCodes()` function in `apps/guestflow/src/lib/access-codes.ts` to query WiFi network and password for property, return `wifi: { network, password }` in result with SoR resolution (DB first, env fallback `WIFI_NETWORK` and `WIFI_PASSWORD` ONLY if NO DB row exists, placeholder `[ASK STAFF]` if both empty)
- [ ] T007 Add unit tests in `apps/guestflow/src/lib/__tests__/access-codes.test.ts` for WiFi resolution: (1) DB row exists → returns DB value, (2) DB row empty → returns `[ASK STAFF]`, (3) NO DB row + env set → returns env fallback, (4) both empty → returns `[ASK STAFF]`, (5) multiple properties → correct scope. All password fixtures use `[REDACTED]` or `****`, never plaintext.

**Checkpoint**: Foundation ready - WiFi resolution works, user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Staff Edit WiFi Credentials (Priority: P1) 🎯 MVP

**Goal**: Staff can edit WiFi network and password per property via `/ops/access-codes` UI with audit trail

**Independent Test**: Log into `/ops/access-codes`, edit cottage WiFi network/password, verify save succeeds, audit log entry created, values persist after refresh

### Implementation for User Story 1

- [ ] T008 [P] [US1] Update `apps/guestflow/src/app/ops/access-codes/page.tsx` to fetch WiFi rows (code_type `wifi_network` and `wifi_password`) for each property alongside existing gate/lockbox codes
- [ ] T009 [US1] Update `apps/guestflow/src/app/ops/access-codes/AccessCodesManager.tsx` (client component) to add WiFi section per property: (1) Network name text input (plaintext, always visible), (2) Password input (masked by default, `type="password"`), (3) Reveal toggle button for password, (4) Save button per WiFi credential or single save per property
- [ ] T010 [US1] Verify `apps/guestflow/src/app/api/ops/access-codes/upsert/route.ts` accepts `code_type='wifi_network'` and `'wifi_password'` (validation: non-empty after trim, max 32 chars for network, min 8 max 63 chars for password)
- [ ] T011 [US1] Verify `upsertAccessCode()` in `apps/guestflow/src/lib/access-codes.ts` handles WiFi code types correctly (upsert into `property_access_codes` with `suite=''`, insert audit log entry with property, code_type, changed_at, changed_by, metadata only no plaintext password)
- [ ] T012 [US1] Verify audit log at `/ops/access-codes` displays WiFi changes with property, code_type, timestamp, staff ID, NO plaintext passwords

**Checkpoint**: Staff can edit WiFi via UI, audit log records changes with metadata only

---

## Phase 4: User Story 2 - Consumers Use WiFi SoR (Priority: P2)

**Goal**: All WiFi consumers (guest portal, welcome-drafts, late-checkin) use DB-first resolution with env fallback

**Independent Test**: Set cottage WiFi in DB, leave main-house empty but set env vars, verify guest portal returns DB for cottage, env fallback for main-house, placeholder if both empty

### Implementation for User Story 2

- [ ] T013 [P] [US2] Update `apps/guestflow/src/app/api/guest-portal/[code]/route.ts` to replace direct env var reads (`process.env.WIFI_NETWORK`, `process.env.WIFI_PASSWORD`) with `const { wifi } = await resolveAccessCodes(db, tenantId, property, suite)` and return `wifi` in `stayPacket` response
- [ ] T014 [P] [US2] Update `apps/guestflow/src/app/api/welcome-drafts/route.ts` to use `resolveAccessCodes()` for WiFi instead of direct env var reads, replace template placeholders `{{wifi.network}}` and `{{wifi.password}}` with resolved values (if `[ASK STAFF]`, show placeholder text in template)
- [ ] T015 [P] [US2] Update `apps/guestflow/src/lib/draft-jobs.ts` (or late-checkin template logic) to use `resolveAccessCodes()` for WiFi, ensure WiFi line only appears when credentials are available (not `[ASK STAFF]`)
- [ ] T016 [P] [US2] Update `apps/guestflow/src/lib/ticket-playbooks.ts` to replace `wifiPassword: '[WIFI PASSWORD - ASK STAFF]'` with dynamic resolution via `resolveAccessCodes()`
- [ ] T017 [US2] Add integration test `apps/guestflow/__tests__/guest-portal-wifi.test.ts` to verify: (1) DB has WiFi → returned in stayPacket, (2) NO DB row + env set → env returned, (3) both empty → `[ASK STAFF]` returned
- [ ] T018 [P] [US2] Add unit tests for welcome-drafts WiFi resolution: DB, env fallback, placeholder cases
- [ ] T019 [P] [US2] Add unit tests for late-checkin WiFi resolution: DB, env fallback, placeholder cases

**Checkpoint**: All WiFi consumers use SoR with consistent resolution flow

---

## Phase 5: User Story 3 - Secure Audit Trail (Priority: P3)

**Goal**: WiFi credential changes logged in audit table with metadata only, passwords redacted everywhere

**Independent Test**: Update WiFi password, query audit log API, verify metadata present (property, timestamp, staff ID) but NO plaintext password, confirm test outputs use `[REDACTED]` or `****`

### Implementation for User Story 3

- [ ] T020 [P] [US3] Verify `apps/guestflow/src/lib/access-codes.ts` `upsertAccessCode()` inserts audit log entry with `action='update'`, property, code_type (`wifi_network` or `wifi_password`), suite (always `''` for WiFi), changed_at, changed_by, notes (optional), but NO plaintext password in any column
- [ ] T021 [P] [US3] Update all test fixtures in `apps/guestflow/src/lib/__tests__/access-codes.test.ts` and `apps/guestflow/__tests__/guest-portal-wifi.test.ts` to use `[REDACTED]` or `****` for WiFi passwords, never plaintext
- [ ] T022 [P] [US3] Grep `apps/guestflow/src/lib/access-codes.ts` and all WiFi-related files to ensure NO `console.log()` or debug statements print plaintext WiFi passwords (use redaction helper if needed)
- [ ] T023 [US3] Add test in `apps/guestflow/__tests__/access-codes-audit.test.ts` (or extend existing suite) to verify audit log query for WiFi changes returns metadata only, NO password field or value
- [ ] T024 [US3] Document redaction rules in `apps/guestflow/docs/WIFI-SOR.md` (or `docs/ACCESS-CODES-SOR.md`): passwords must be `[REDACTED]` in logs, tests, PR bodies, comments, commit messages

**Checkpoint**: Audit trail complete, passwords never leaked in logs or tests

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, final validation, PR readiness

- [ ] T025 [P] Write `apps/guestflow/docs/WIFI-SOR.md` (or update `docs/ACCESS-CODES-SOR.md`) with: (1) How to edit WiFi as staff, (2) Resolution flow diagram (DB first, env fallback, placeholder), (3) Fallback behavior, (4) Redaction rules
- [ ] T026 [P] Update `apps/guestflow/.env.example` with note: `WIFI_NETWORK` and `WIFI_PASSWORD` are optional fallback (DB-first), env vars only used when NO DB row exists
- [ ] T027 Run full test suite `cd apps/guestflow && npm test` and verify all tests pass, NO plaintext passwords in test output (grep for patterns)
- [ ] T028 Run lint `npm run lint` and build `npm run build` in `apps/guestflow` and verify no errors
- [ ] T029 Write PR description using `[REDACTED]` or `****` for all WiFi password examples, never paste live credentials, link to spec + plan + quickstart, include acceptance checklist
- [ ] T030 Manual test: (1) Edit WiFi in staff UI, (2) Verify guest portal shows new values, (3) Test env fallback by deleting DB row, (4) Test placeholder when both empty, (5) Verify audit log shows metadata only

---

## Dependencies

```text
Setup (T001-T004) → must complete before Foundational
Foundational (T005-T007) → must complete before ANY user story
US1 (T008-T012) ← depends on Foundational
US2 (T013-T019) ← depends on Foundational (can run parallel with US1)
US3 (T020-T024) ← depends on US1 (audit log verification) and US2 (consumer tests)
Polish (T025-T030) ← depends on ALL user stories complete
```

## Parallel Execution Opportunities

- **Phase 1 (Setup)**: T001, T002, T003, T004 can all run in parallel (different files)
- **Phase 3 (US1)**: T008 can run parallel with T009 initially (different files), then T010-T012 sequential
- **Phase 4 (US2)**: T013, T014, T015, T016 can run in parallel (different files), T017-T019 tests run in parallel after implementation tasks
- **Phase 5 (US3)**: T020, T021, T022 can run in parallel (different files), T023-T024 sequential
- **Phase 6 (Polish)**: T025, T026 can run in parallel (different files), T027-T030 sequential

## MVP Scope

**Minimum Viable Product = User Story 1 ONLY**
- Staff can edit WiFi network and password via `/ops/access-codes`
- Audit trail logs changes with metadata only
- WiFi credentials stored in database SoR

This alone delivers immediate value: staff can update WiFi without developer intervention.

## Implementation Strategy

1. **Setup + Foundational first** (T001-T007): Establish schema and resolution logic
2. **US1 (Staff UI)** (T008-T012): MVP - staff can edit WiFi
3. **US2 (Consumers)** (T013-T019): Integrate all WiFi consumers with SoR
4. **US3 (Security)** (T020-T024): Verify audit and redaction
5. **Polish** (T025-T030): Documentation and final validation

Each phase builds on the previous, but US2 and US3 can partially overlap if US1 is complete.

## Total Task Count

- Setup: 4 tasks
- Foundational: 3 tasks
- User Story 1: 5 tasks
- User Story 2: 7 tasks
- User Story 3: 5 tasks
- Polish: 6 tasks
- **Total: 30 tasks**

## Success Criteria

- [ ] All 30 tasks completed and marked `[X]`
- [ ] All tests pass (`npm test`)
- [ ] Lint and build succeed (`npm run lint && npm run build`)
- [ ] Manual testing checklist from quickstart.md completed
- [ ] PR body uses `[REDACTED]` / `****`, no live passwords
- [ ] Vercel Preview deployed and staff-tested
- [ ] Grant approval for merge
