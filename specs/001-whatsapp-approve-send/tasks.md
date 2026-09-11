# Tasks: WhatsApp Approve & Send for Inbound Queue

**Input**: Design documents from `/specs/001-whatsapp-approve-send/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Tests are included where practical for the send action handler (as specified in spec.md Success Criteria)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **GuestFlow Next.js App**: `apps/guestflow/src/` for source code
- **API Routes**: `apps/guestflow/src/app/api/inbound/`
- **UI Pages**: `apps/guestflow/src/app/ops/inbound-queue/`
- **Libraries**: `apps/guestflow/src/lib/`
- **Tests**: `apps/guestflow/__tests__/`
- **Scripts**: `apps/guestflow/scripts/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema extension and type definitions for outbound messages

- [x] T001 Create database migration script at `apps/guestflow/scripts/migrate-add-inbound-send.js` to add `direction`, `whatsapp_provider`, `whatsapp_message_id`, and `send_error` columns to `inbound_messages` table (see data-model.md for SQL)
- [x] T002 [P] Create TypeScript types file at `apps/guestflow/src/types/inbound.ts` with SendMessageRequest, SendMessageResponse, SendHistoryEntry, and OutboundMessage interfaces (see contracts/send-api.md for schema)
- [x] T003 [P] Add migration script to `package.json` scripts: `"db:migrate:send": "node scripts/migrate-add-inbound-send.js"`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Run database migration locally (`npm run db:migrate:send`) to verify schema changes apply successfully and existing data is preserved with `direction = 'inbound'` default

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Staff Reviews and Sends Draft Reply (Priority: P1) 🎯 MVP

**Goal**: Enable staff to send approved WhatsApp replies from the inbound queue UI with a single click, respecting sandbox/live modes and persisting send outcomes.

**Independent Test**: Create test thread via webhook → Open in queue UI → Click "Send via WhatsApp (Sandbox Mode)" → Confirm → Verify sandbox log entry and thread status updates to "sent"

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T005 [P] [US1] Create test file `apps/guestflow/__tests__/inbound-send-handler.test.ts` with test suite for send API route, mocking `sendWhatsAppMessage()` from `@/lib/whatsapp`
- [x] T006 [P] [US1] Add test case: "returns 400 when threadId is missing" (validate request body)
- [x] T007 [P] [US1] Add test case: "returns 400 when thread not found" (validate thread existence)
- [x] T008 [P] [US1] Add test case: "returns 400 when thread has no draft reply" (validate draft exists)
- [x] T009 [P] [US1] Add test case: "successfully sends message in sandbox mode" (mock sendWhatsAppMessage to return sandbox result, verify outbound message created, thread status updated)
- [x] T010 [P] [US1] Add test case: "handles WhatsApp API errors gracefully" (mock sendWhatsAppMessage to throw error, verify thread status = 'failed', error stored)
- [ ] T011 [P] [US1] Run `npm test` to verify all tests fail (red state) before implementing

### Implementation for User Story 1

- [x] T012 [US1] Create API route file at `apps/guestflow/src/app/api/inbound/send/route.ts` with `export const dynamic = 'force-dynamic'` and empty POST handler skeleton
- [x] T013 [US1] Implement request validation in send API route: check for `threadId` in body, return 400 if missing (reference: contracts/send-api.md)
- [x] T014 [US1] Implement thread lookup in send API route: query `inbound_threads` and latest message, return 400 if thread not found or no draft reply (constraint: `draft_reply` must be non-null and non-empty per FR-011)
- [x] T015 [US1] Implement WhatsApp send call in send API route: call `sendWhatsAppMessage({ to: thread.from_number, message: draftReply })` from `@/lib/whatsapp` and capture result (reuse existing library, no changes to whatsapp.ts)
- [x] T016 [US1] Implement success path in send API route: on successful send, insert outbound message into `inbound_messages` with `direction = 'outbound'`, `whatsapp_provider`, `whatsapp_message_id` (constraint: message_text = draft_reply per FR-004), then update thread status to 'sent', then return 200 with SendMessageResponse (use `db.batch()` for transaction per research.md)
- [x] T017 [US1] Implement error path in send API route: on send failure, insert outbound message with `send_error` populated (constraint: error message from WhatsApp API per FR-009), update thread status to 'failed', return 500 with error details (see contracts/send-api.md error response schema)
- [x] T018 [US1] Add logging in send API route: console.log on send attempt with threadId/phone/provider/sandbox flag, console.log on success with messageId/provider, console.error on failure with full error (per FR-012 audit trail requirement)
- [x] T019 [US1] Modify inbound queue UI page at `apps/guestflow/src/app/ops/inbound-queue/page.tsx`: add `sending` state hook (boolean) and `sendMessage` async function that calls POST /api/inbound/send (reference: contracts/send-api.md client example)
- [x] T020 [US1] Add send confirmation logic in `sendMessage` function: show `window.confirm()` dialog with recipient phone, WHATSAPP_MODE indicator (sandbox/live), and first 100 chars of draft message (constraint: never send without confirmation per FR-002)
- [x] T021 [US1] Add double-send prevention in `sendMessage` function: set `sending = true` before API call, set `sending = false` in finally block, disable button when `sending === true` (constraint: prevent double-sends per FR-006)
- [x] T022 [US1] Add "Send via WhatsApp" button in thread detail modal: show when thread status is 'drafted' or 'approved' AND draft reply exists (per FR-001), button text includes "(Sandbox Mode)" when `WHATSAPP_MODE=sandbox` is detected (constraint: clear mode indicator per research.md), button has yellow background with ⚠️ icon for sandbox, green background for live mode
- [x] T023 [US1] Add result handling in `sendMessage` function: on success, show alert with sandbox/live indicator and provider name, refresh queue to show updated status (per FR-007 clear outcome display); on error, show alert with error message from API response (per FR-009)
- [ ] T024 [US1] Run `npm test` to verify all tests now pass (green state)
- [ ] T025 [US1] Run manual smoke test per quickstart.md Steps 1-5: verify sandbox send creates outbound message, updates thread status, and shows success alert

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently (staff can send messages in sandbox mode)

---

## Phase 4: User Story 2 - View Send History and Outcomes (Priority: P2)

**Goal**: Enable staff to see send history (all send attempts, timestamps, providers, outcomes) for each thread in the detail modal.

**Independent Test**: Send a message (US1) → Close and re-open thread detail modal → Verify send history section shows timestamp, provider, message ID (or error message)

### Implementation for User Story 2

- [ ] T026 [P] [US2] Create helper function `fetchSendHistory(threadId: number)` in `apps/guestflow/src/app/ops/inbound-queue/page.tsx`: query GET /api/inbound/queue to get thread details, extract all outbound messages from database (alternatively, create new GET /api/inbound/send/history?threadId=X endpoint if needed)
- [x] T027 [US2] Extend GET /api/inbound/queue route at `apps/guestflow/src/app/api/inbound/queue/route.ts`: when returning thread details, include array of outbound messages with fields: message_timestamp, whatsapp_provider, whatsapp_message_id, send_error (query: `SELECT * FROM inbound_messages WHERE thread_id = ? AND direction = 'outbound' ORDER BY message_timestamp DESC`)
- [x] T028 [US2] Add "Send History" section in thread detail modal at `apps/guestflow/src/app/ops/inbound-queue/page.tsx`: render below draft reply section, show list of all send attempts with timestamp formatted via date-fns (e.g., "Sep 11, 2:30 PM"), provider badge (color-coded: sandbox=gray, meta=blue, twilio=green), and outcome (✓ Success with message ID OR ✗ Failed with error message per FR-010)
- [x] T029 [US2] Add "Retry" button in send history section: show next to failed send entries when thread status is 'failed', button calls `sendMessage()` function from US1 (reuse existing send logic)
- [x] T030 [US2] Add visual distinction for multiple send attempts: if thread has >1 outbound message, show "Attempt 1", "Attempt 2", etc. labels, highlight most recent attempt (constraint: show chronological history per FR-010)
- [ ] T031 [US2] Run manual smoke test per quickstart.md Step 7: verify send history displays correctly after sandbox send, verify error message displays correctly after test error (Step 6)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently (send + view history)

---

## Phase 5: User Story 3 - Bulk Status Updates After Sends (Priority: P3)

**Goal**: Enable staff to bulk-close sent threads or filter by "sent" status to keep the queue clean.

**Independent Test**: Send multiple messages (US1) → Select multiple threads with status "sent" → Click "Bulk Close" → Verify all selected threads update to status "closed"

### Implementation for User Story 3

- [ ] T032 [P] [US3] Add `selectedThreadIds` state hook (Set<number>) in `apps/guestflow/src/app/ops/inbound-queue/page.tsx` for tracking bulk selection
- [ ] T033 [P] [US3] Add checkbox to each thread card: render checkbox in top-left corner, bind to `selectedThreadIds.has(threadId)`, toggle selection on click (stop propagation to prevent opening modal)
- [ ] T034 [US3] Add "Select All" / "Deselect All" toggle button in header: show when threads.length > 0, updates `selectedThreadIds` to include/exclude all visible threads based on current filter
- [ ] T035 [US3] Add "Bulk Close" button in header: show when `selectedThreadIds.size > 0`, disabled when no selection, onClick calls PATCH /api/inbound/queue for each selected thread with `status: 'closed'` (use Promise.all for parallel updates)
- [ ] T036 [US3] Add bulk action feedback: show loading spinner during bulk update, show success toast with count (e.g., "3 threads closed"), refresh queue after completion, clear selection
- [ ] T037 [US3] Extend status filter tabs: add "(N)" count next to each status including "sent" status, verify "sent" filter shows only threads with status = 'sent' (reuse existing filter logic)
- [ ] T038 [US3] Run manual smoke test: send 3 test messages → verify "sent" filter shows 3 threads → select all → bulk close → verify status updates to "closed" → verify "closed" filter shows 3 threads

**Checkpoint**: All user stories should now be independently functional (send + history + bulk actions)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T039 [P] Add phone number redaction in console logs at `apps/guestflow/src/app/api/inbound/send/route.ts`: replace phone number with `${phone.slice(0, -4).replace(/./g, '*')}${phone.slice(-4)}` (e.g., "+27***4567") for non-error logs (constraint: security per contracts/send-api.md)
- [x] T040 [P] Add environment variable documentation in `apps/guestflow/README.md`: document `WHATSAPP_MODE` (sandbox|live) and required credentials (`TWILIO_*` or `WHATSAPP_*`) for send feature
- [ ] T041 Code review and refactoring: extract send confirmation dialog to reusable function, extract send history rendering to separate component if needed, remove any debug console.logs
- [ ] T042 [P] Verify existing inbound webhook, classifier, and welcome-draft flows still work: run existing tests at `apps/guestflow/__tests__/inbound-classifier.test.ts`, manually test webhook POST with classification
- [ ] T043 Run full quickstart.md validation: execute all steps 1-8, verify success criteria (all checkboxes), document any deviations or issues
- [x] T044 Update INBOUND-WHATSAPP-BUILD-SUMMARY.md at `apps/guestflow/docs/INBOUND-WHATSAPP-BUILD-SUMMARY.md`: add section "Outbound Send (Phase 2)" with summary of send feature, files changed, and smoke test notes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T003) - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion (T004)
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2 - T004) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2 - T004) - Integrates with US1 send logic but send history can be implemented independently
- **User Story 3 (P3)**: Can start after Foundational (Phase 2 - T004) - Uses existing queue filtering, independently testable

### Within Each User Story

- Tests (T005-T011) MUST be written and FAIL before implementation (T012-T025)
- API route (T012-T018) before UI changes (T019-T023) within US1
- US1 send logic (T012-T023) before US2 history display (T026-T031) - US2 queries outbound messages created by US1
- US1 send functionality working before US3 bulk actions (T032-T038) - US3 operates on threads with status "sent" from US1

### Parallel Opportunities

- All Setup tasks (T001-T003) can run in parallel [P]
- All US1 tests (T005-T010) can run in parallel [P] before implementation
- API route implementation (T012-T018) and test writing (T005-T011) can overlap (tests first, then implement)
- US2 tasks T026 (fetch helper) and T027 (API extension) can run in parallel [P]
- US3 tasks T032 (state hook) and T033 (checkbox UI) can run in parallel [P]
- Polish tasks T039 (phone redaction), T040 (docs), and T042 (test verification) can run in parallel [P]

---

## Parallel Example: User Story 1 Tests

```bash
# Launch all tests for User Story 1 together (before implementation):
Task: "Create test file with test suite" (T005)
Task: "Add test case: returns 400 when threadId missing" (T006)
Task: "Add test case: returns 400 when thread not found" (T007)
Task: "Add test case: returns 400 when no draft reply" (T008)
Task: "Add test case: successfully sends in sandbox mode" (T009)
Task: "Add test case: handles WhatsApp API errors" (T010)
# Then run npm test to verify all fail (T011)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003) — Database migration + types
2. Complete Phase 2: Foundational (T004) — Run migration locally
3. Complete Phase 3: User Story 1 (T005-T025) — Send button + API route + tests
4. **STOP and VALIDATE**: Run quickstart.md smoke test (T025)
5. Deploy to preview / production if ready (staff can send messages in sandbox mode)

### Incremental Delivery

1. Complete Setup + Foundational (T001-T004) → Foundation ready
2. Add User Story 1 (T005-T025) → Test independently (T025) → Deploy/Demo (MVP! ✅)
3. Add User Story 2 (T026-T031) → Test independently (T031) → Deploy/Demo
4. Add User Story 3 (T032-T038) → Test independently (T038) → Deploy/Demo
5. Polish (T039-T044) → Final validation (T043) → Production-ready
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T004)
2. Once Foundational is done:
   - Developer A: User Story 1 (T005-T025) — Critical path, highest priority
   - Developer B: User Story 2 (T026-T031) — Can start after T004, will integrate with US1 API/DB
   - Developer C: User Story 3 (T032-T038) — Can start after T004, UI-only changes
3. Stories complete and integrate independently, then Polish tasks run in parallel

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability (US1, US2, US3)
- Each user story should be independently completable and testable
- Verify tests fail (red) before implementing (T011), then verify tests pass (green) after implementing (T024)
- Commit after each task or logical group (e.g., after T018 API route complete, after T023 UI complete)
- Stop at any checkpoint (end of Phase 3/4/5) to validate story independently
- Constraints from spec.md are quoted in task descriptions (e.g., "never send without confirmation per FR-002")
- All file paths are absolute from repository root: `apps/guestflow/...`
- Database schema constraints from data-model.md are enforced in implementation tasks
