# Tasks: GuestFlow Outbound Redirect for Pre-Live Testing

**Input**: Design documents from `/specs/009-outbound-redirect/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks are included per Grant CLEAR requirement (tests must pass before merge).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Next.js app structure: `apps/guestflow/src/`
- Tests: `apps/guestflow/__tests__/` and `apps/guestflow/src/lib/__tests__/`
- Paths relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and TypeScript types for outbound redirect

- [ ] T001 Create TypeScript types and interfaces in apps/guestflow/src/lib/outbound-redirect.ts (OutboundRecipientResolution, OutboundStatus, function signatures - no implementation yet)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core resolver implementation that MUST be complete before ANY integration or UI work

**⚠️ CRITICAL**: No integration tasks (US1, US2, US3) or UI tasks (US4, US5) can begin until this phase is complete

- [ ] T002 Implement resolveOutboundRecipient function in apps/guestflow/src/lib/outbound-redirect.ts (env reading, mode resolution, fail-closed logic, throws on missing sink)
- [ ] T003 Implement getOutboundStatus helper function in apps/guestflow/src/lib/outbound-redirect.ts (returns mode + redirectStatus for health/banner)
- [ ] T004 Add JSDoc documentation to outbound-redirect.ts with go-live checklist and environment variable descriptions

**Checkpoint**: Resolver functions ready - integration and UI work can now begin in parallel

---

## Phase 3: User Story 1 - All Outbound Channels Redirect to Test Sinks (Priority: P1) 🎯 MVP

**Goal**: WhatsApp (Twilio), Resend email, and WhatsApp Web send_jobs all redirect to Grant's sinks when OUTBOUND_MODE=redirect

**Independent Test**: Set redirect mode + sinks in env, approve any draft, click send, verify message arrives at Grant's sink (not real guest). Check send_jobs.to_address is Grant's sink.

### Tests for User Story 1 (Required)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T005 [P] [US1] Create apps/guestflow/src/lib/__tests__/outbound-redirect.test.ts with test suite skeleton and imports
- [ ] T006 [P] [US1] Write resolver unit tests: redirect mode + WA sink set → returns sink as `to` in apps/guestflow/src/lib/__tests__/outbound-redirect.test.ts
- [ ] T007 [P] [US1] Write resolver unit tests: redirect mode + email sink set → returns sink as `to` in apps/guestflow/src/lib/__tests__/outbound-redirect.test.ts
- [ ] T008 [P] [US1] Write resolver unit tests: live mode + LIVE_CLEAR=true → returns original intendedTo as `to` in apps/guestflow/src/lib/__tests__/outbound-redirect.test.ts
- [ ] T009 [US1] Run test suite, confirm tests FAIL (resolver not yet integrated)

### Implementation for User Story 1

- [ ] T010 [P] [US1] Integrate resolver into apps/guestflow/src/lib/whatsapp.ts: import resolveOutboundRecipient, call before provider selection, override params.to with resolution.to, handle throws
- [ ] T011 [P] [US1] Integrate resolver into apps/guestflow/src/lib/email.ts: import resolveOutboundRecipient, call at function start, override input.to with resolution.to, handle throws
- [ ] T012 [US1] Integrate resolver into apps/guestflow/src/lib/send-jobs.ts: import resolveOutboundRecipient, call in createQueuedJob, override toAddress with resolution.to, build metadata JSON with intended_to/redirect_enabled/mode, pass metadata to INSERT
- [ ] T013 [US1] Update send_jobs DDL in apps/guestflow/src/lib/send-jobs.ts: add metadata TEXT column to CREATE TABLE IF NOT EXISTS (or document use of existing metadata column)
- [ ] T014 [US1] Add WhatsApp redirect integration tests to apps/guestflow/__tests__/whatsapp.test.ts: mock Twilio calls, verify redirected `to` when mode=redirect
- [ ] T015 [US1] Add email redirect integration tests to apps/guestflow/src/lib/__tests__/email.test.ts (or apps/guestflow/__tests__/email.test.ts if exists): mock Resend calls, verify redirected `to`
- [ ] T016 [US1] Add send_jobs redirect tests to apps/guestflow/__tests__/send-jobs.test.ts (or apps/guestflow/src/lib/__tests__/send-jobs.test.ts): verify to_address is redirected, metadata includes intended_to
- [ ] T017 [US1] Run all tests for User Story 1, verify PASS

**Checkpoint**: At this point, all three channels redirect to Grant's sinks when mode=redirect. Tests confirm behavior.

---

## Phase 4: User Story 2 - Fail-Closed Missing Sink (Priority: P1)

**Goal**: Send is blocked (HTTP 503) when redirect is on but a channel's sink env is missing. No fallback to guest To.

**Independent Test**: Set mode=redirect, leave OUTBOUND_REDIRECT_TO_WA empty, attempt WhatsApp send, verify HTTP 503 with clear error. Repeat for email.

### Tests for User Story 2 (Required)

- [ ] T018 [P] [US2] Write resolver unit tests: redirect mode + missing WA sink → throws Error with clear message in apps/guestflow/src/lib/__tests__/outbound-redirect.test.ts
- [ ] T019 [P] [US2] Write resolver unit tests: redirect mode + missing email sink → throws Error with clear message in apps/guestflow/src/lib/__tests__/outbound-redirect.test.ts
- [ ] T020 [US2] Run tests, confirm FAIL (error handling not yet implemented)

### Implementation for User Story 2

- [ ] T021 [US2] Add error handling in apps/guestflow/src/lib/whatsapp.ts: catch resolver throws, return { success: false, error: e.message, ... } with HTTP 503 suggestion in JSDoc
- [ ] T022 [US2] Add error handling in apps/guestflow/src/lib/email.ts: catch resolver throws, return { success: false, error: e.message, timestamp }
- [ ] T023 [US2] Add error handling or throw propagation in apps/guestflow/src/lib/send-jobs.ts: document that resolver throws will propagate to caller (API route returns 503)
- [ ] T024 [P] [US2] Add fail-closed integration tests to apps/guestflow/__tests__/whatsapp.test.ts: verify no Twilio call when sink missing
- [ ] T025 [P] [US2] Add fail-closed integration tests to apps/guestflow/src/lib/__tests__/email.test.ts: verify no Resend call when sink missing
- [ ] T026 [US2] Run all tests for User Story 2, verify PASS

**Checkpoint**: Fail-closed behavior confirmed. Missing sinks block sends.

---

## Phase 5: User Story 3 - Live Mode Requires OUTBOUND_LIVE_CLEAR (Priority: P1)

**Goal**: Live mode only sends to real guests when OUTBOUND_LIVE_CLEAR=true. Missing or false CLEAR blocks or redirects.

**Independent Test**: Set mode=live + LIVE_CLEAR=false, attempt send, verify block/redirect. Set CLEAR=true, verify send to real guest (with safe test contact).

### Tests for User Story 3 (Required)

- [ ] T027 [P] [US3] Write resolver unit tests: mode=live + LIVE_CLEAR!=true → blocks or redirects (implementation choice) in apps/guestflow/src/lib/__tests__/outbound-redirect.test.ts
- [ ] T028 [P] [US3] Write resolver unit tests: unknown/missing OUTBOUND_MODE → defaults to redirect in apps/guestflow/src/lib/__tests__/outbound-redirect.test.ts
- [ ] T029 [US3] Run tests, confirm current behavior

### Implementation for User Story 3

- [ ] T030 [US3] Update resolveOutboundRecipient in apps/guestflow/src/lib/outbound-redirect.ts: when mode=live, check OUTBOUND_LIVE_CLEAR exactly equals "true", else block (throw or redirect)
- [ ] T031 [US3] Update resolveOutboundRecipient in apps/guestflow/src/lib/outbound-redirect.ts: when OUTBOUND_MODE is unknown/missing, default to 'redirect' (fail-closed)
- [ ] T032 [US3] Add integration tests for live mode gate: mode=live + CLEAR=true → original To, mode=live + CLEAR=false → blocked
- [ ] T033 [US3] Run all tests for User Story 3, verify PASS

**Checkpoint**: Dual-gate (mode + CLEAR) enforced. Live mode requires explicit CLEAR=true.

---

## Phase 6: User Story 4 - Staff See Banner When Redirect Active (Priority: P2)

**Goal**: Staff UI shows persistent banner when mode=redirect or live mode disabled by CLEAR. Hidden when live mode active.

**Independent Test**: Set mode=redirect, load staff page, see banner. Set mode=live + CLEAR=true, reload, banner hidden.

### Implementation for User Story 4

- [ ] T034 [US4] Create banner Server Component in apps/guestflow/src/components/outbound-redirect-banner.tsx: read getOutboundStatus, conditionally render info-level banner with message "Outbound Redirect Active – All sends go to test sinks"
- [ ] T035 [US4] Integrate banner into apps/guestflow/src/app/layout.tsx: import and render OutboundRedirectBanner component at top of layout, above children
- [ ] T036 [US4] Manual test banner visibility: set redirect mode, verify banner appears; set live mode + CLEAR=true, verify hidden

**Checkpoint**: Staff banner working. Visibility toggles correctly based on mode.

---

## Phase 7: User Story 5 - Health Endpoint Reports Redirect Status (Priority: P2)

**Goal**: /api/health includes outboundMode and outboundRedirect fields. Queryable by Grant/CoS.

**Independent Test**: curl /api/health, verify JSON includes outboundMode and outboundRedirect with correct values for current env.

### Implementation for User Story 5

- [ ] T037 [US5] Update apps/guestflow/src/app/api/health/route.ts: import getOutboundStatus, call in GET handler, add status.mode and status.redirectStatus to response JSON (as outboundMode and outboundRedirect)
- [ ] T038 [US5] Manual test health endpoint: set various mode/CLEAR combinations, curl /api/health, verify fields match expected values (on/off/blocked)

**Checkpoint**: Health endpoint extended. Redirect status exposed for ops monitoring.

---

## Phase 8: User Story 6 - Audit Records Intended and Actual Recipients (Priority: P2)

**Goal**: Metadata/logs include intended_to (original guest) and actual_to (resolved recipient) for every send/job.

**Independent Test**: Send message in redirect mode, query send_jobs or logs, confirm metadata has intended_to, redirect_enabled, mode fields.

### Implementation for User Story 6

- [ ] T039 [US6] Update apps/guestflow/src/lib/whatsapp.ts: log resolution.intendedTo, resolution.redirected, resolution.mode in success/error log messages (console.log structured JSON)
- [ ] T040 [US6] Update apps/guestflow/src/lib/email.ts: log resolution fields in success/error paths
- [ ] T041 [US6] Verify apps/guestflow/src/lib/send-jobs.ts: metadata JSON already includes intended_to, redirect_enabled, mode (implemented in T012)
- [ ] T042 [US6] Manual test audit trail: send WhatsApp/email in redirect mode, check logs for structured JSON with intended/actual fields, query send_jobs.metadata

**Checkpoint**: Audit trail complete. Ops can verify redirect behavior post-send.

---

## Phase 9: User Story 7 - Tests Validate All Scenarios (Priority: P1)

**Goal**: Comprehensive test coverage for redirect rewrite, fail-closed, live gate, mode defaults. All tests pass before merge.

**Independent Test**: Run `npm run test` in apps/guestflow, verify all redirect-related tests pass with no failures.

### Additional Test Coverage (if gaps remain)

- [ ] T043 [US7] Add test for From identities unchanged: verify TWILIO_WHATSAPP_FROM and RESEND_FROM_EMAIL are not modified by resolver in apps/guestflow/src/lib/__tests__/outbound-redirect.test.ts or integration tests
- [ ] T044 [US7] Add test for invalid channel: verify resolver throws when channel is not 'whatsapp' or 'email' in apps/guestflow/src/lib/__tests__/outbound-redirect.test.ts
- [ ] T045 [US7] Run full test suite: `npm run test` in apps/guestflow, verify all tests pass, no new failures introduced
- [ ] T046 [US7] Run build: `npm run build` in apps/guestflow, verify TypeScript compilation succeeds with no errors

**Checkpoint**: All automated tests pass. Build is green. Ready for PR review.

---

## Phase 10: User Story 8 - Documentation Explains Go-Live (Priority: P3)

**Goal**: Clear go-live checklist and instructions for Grant. Forbids auto-flip and Production env changes inside CA.

**Independent Test**: Read JSDoc in outbound-redirect.ts and PR description, verify all go-live steps are documented and forbidden actions are listed.

### Implementation for User Story 8

- [ ] T047 [US8] Verify apps/guestflow/src/lib/outbound-redirect.ts: JSDoc header includes full go-live checklist (smoke test → env set → redeploy → verify health → safe test → monitor) and forbidden list (already done in T004, verify completeness)
- [ ] T048 [US8] Create PR description (outside code): include go-live checklist, link to quickstart.md scenarios, list env vars Grant must set, warn against auto-flip

**Checkpoint**: Documentation complete. Grant has clear instructions.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation before merge

- [ ] T049 [P] Remove any temporary debugging code or console.logs not needed for production
- [ ] T050 [P] Run linter: `npm run lint` in apps/guestflow, fix any new warnings/errors introduced by this feature
- [ ] T051 [P] Run type check: `npx tsc --noEmit` in apps/guestflow (if not covered by build), verify no type errors
- [ ] T052 Run quickstart.md validation scenarios manually in Preview environment: Scenarios 1-12 (redirect WA, redirect email, fail-closed, banner, health, etc.)
- [ ] T053 Final smoke test: Set redirect in Preview, send WhatsApp + email, verify arrival at Grant's sinks, check logs/metadata
- [ ] T054 Review PR diff: ensure no hardcoded test sink values in source (only in env), no accidental secret exposure, no commented-out code left behind

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001) - BLOCKS all user stories
- **User Stories 1-3 (Phase 3-5)**: All depend on Foundational phase completion (T002, T003)
  - US1, US2, US3 are all P1 and can proceed in parallel after Foundational (different files for tests/implementations)
- **User Stories 4-6 (Phase 6-8)**: Depend on Foundational phase, can run in parallel with US1-3 or after
  - US4 (banner) depends on T003 (getOutboundStatus)
  - US5 (health) depends on T003
  - US6 (audit) depends on US1 (T012 already includes metadata)
- **User Story 7 (Phase 9)**: Depends on all prior implementation tasks (runs tests for everything)
- **User Story 8 (Phase 10)**: Can run in parallel with implementation (documentation only)
- **Polish (Phase 11)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1 - All channels redirect)**: Depends on Foundational (T002, T003) only. No dependencies on other stories.
- **US2 (P1 - Fail-closed)**: Depends on Foundational. Extends US1 with error handling. Can be done immediately after US1 or in parallel if coordinated.
- **US3 (P1 - Live gate)**: Depends on Foundational. Extends resolver logic. Can be done in parallel with US1/US2 (same file but different logic paths).
- **US4 (P2 - Banner)**: Depends on T003 (getOutboundStatus). Independent of US1-3 implementation details.
- **US5 (P2 - Health)**: Depends on T003. Independent of US1-3.
- **US6 (P2 - Audit)**: Depends on US1 (T012 metadata), but T012 already implements most audit fields. US6 just adds logging.
- **US7 (P1 - Tests)**: Depends on all implementation complete. Runs last before polish.
- **US8 (P3 - Docs)**: No code dependencies. Can run anytime.

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation (TDD)
- Resolver integration (T010, T011, T012) before integration tests (T014, T015, T016)
- Foundational resolver (T002) before any integration
- Error handling (US2) after basic integration (US1)

### Parallel Opportunities

- **Phase 1**: Only one task (T001), no parallelism
- **Phase 2**: T002, T003, T004 can run in parallel (different parts of same file, but clean separation)
- **Phase 3 (US1) Tests**: T005-T008 can run in parallel (different test cases in same file or separate test files)
- **Phase 3 (US1) Integration**: T010 (whatsapp.ts), T011 (email.ts), T012-T013 (send-jobs.ts) can run in parallel (different files)
- **Phase 3 (US1) Integration Tests**: T014 (whatsapp.test.ts), T015 (email.test.ts), T016 (send-jobs.test.ts) can run in parallel
- **Phase 4 (US2) Tests**: T018-T019 can run in parallel
- **Phase 4 (US2) Implementation**: T021 (whatsapp.ts), T022 (email.ts), T023 (send-jobs.ts doc) can run in parallel
- **Phase 4 (US2) Integration Tests**: T024-T025 can run in parallel
- **Phase 5 (US3) Tests**: T027-T028 can run in parallel
- **Phase 6-8 (US4-US6)**: All three user stories can run in parallel (banner, health, audit - different files)
- **Phase 10 (US8)**: T047-T048 can run in parallel (code docs vs PR docs)
- **Phase 11 Polish**: T049-T051 can run in parallel (independent checks)

---

## Parallel Example: User Story 1 Implementation

```bash
# After Foundational phase (T002, T003) is complete:

# Launch US1 integration tasks together (different files):
Task T010: "Integrate resolver into apps/guestflow/src/lib/whatsapp.ts"
Task T011: "Integrate resolver into apps/guestflow/src/lib/email.ts"
Task T012: "Integrate resolver into apps/guestflow/src/lib/send-jobs.ts"

# Then launch US1 integration tests together (different test files):
Task T014: "WhatsApp redirect integration tests"
Task T015: "Email redirect integration tests"
Task T016: "send_jobs redirect tests"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only - All P1)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002, T003, T004) - CRITICAL
3. Complete Phase 3: User Story 1 (T005-T017) - All channels redirect
4. Complete Phase 4: User Story 2 (T018-T026) - Fail-closed
5. Complete Phase 5: User Story 3 (T027-T033) - Live gate
6. **STOP and VALIDATE**: Run all tests (T045-T046), test in Preview env
7. If US1-3 work, MVP is functional (redirect system operational, safe for Grant smoke testing)

### Incremental Delivery

1. Complete Setup + Foundational → Resolver ready
2. Add US1 (all channels redirect) → Test independently (Scenarios 1-3) → Functional redirect
3. Add US2 (fail-closed) → Test independently (Scenarios 4-5) → Safety guaranteed
4. Add US3 (live gate) → Test independently (Scenarios 6-7) → Dual-gate complete
5. Add US4-5 (banner + health) → Test independently (Scenarios 8-10) → Ops visibility
6. Add US6 (audit) → Test independently (metadata verification) → Full audit trail
7. Add US7-8 (tests + docs) → Final validation → Ready for PR
8. Each phase adds value without breaking previous work

### Parallel Team Strategy

With multiple developers (or sequential single-developer):

1. Developer completes Setup + Foundational (single threaded, ~1 hour)
2. Once Foundational is done:
   - **Path A (parallel)**: Developer splits US1 into parallel tasks (whatsapp.ts, email.ts, send-jobs.ts) if working on 3 integration points simultaneously
   - **Path B (sequential)**: Developer completes US1 → US2 → US3 → US4/5/6 in priority order
3. US4, US5, US6 can run in parallel (banner, health, audit - different files)

**Recommended for Single Developer**: Sequential by priority (Foundational → US1 → US2 → US3 → US4/5/6 → US7 → US8 → Polish)

---

## Task Count Summary

- **Phase 1 Setup**: 1 task
- **Phase 2 Foundational**: 3 tasks
- **Phase 3 US1**: 13 tasks (5 tests + 8 implementation)
- **Phase 4 US2**: 9 tasks (3 tests + 6 implementation)
- **Phase 5 US3**: 7 tasks (3 tests + 4 implementation)
- **Phase 6 US4**: 3 tasks (implementation + manual test)
- **Phase 7 US5**: 2 tasks (implementation + manual test)
- **Phase 8 US6**: 4 tasks (implementation + manual test)
- **Phase 9 US7**: 4 tasks (additional test coverage + full suite run)
- **Phase 10 US8**: 2 tasks (documentation verification)
- **Phase 11 Polish**: 6 tasks (cleanup + validation)

**Total**: 54 tasks

**Parallel Opportunities**: ~20 tasks can run in parallel within their phases (marked [P] or independent files)

**MVP Scope**: Phases 1-5 (US1-3 complete) = ~33 tasks = Core redirect system functional

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label (US1-US8) maps task to specific user story for traceability
- Each user story should be independently testable after its phase completes
- Tests written first (TDD where applicable), must FAIL before implementation
- Commit after each logical task group (e.g., after each user story phase)
- Stop at any checkpoint to validate story independently (use quickstart.md scenarios)
- Grant CLEAR requirement: All tests must pass before PR merge (T045-T046 in Phase 9)
- Production env changes: FORBIDDEN inside this CA. Grant/Coding set env after merge (T048 docs this).
