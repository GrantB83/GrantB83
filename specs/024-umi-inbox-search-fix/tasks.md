# Tasks: UMI Inbox Search & Surface Fix

**Input**: Design documents from `/specs/024-umi-inbox-search-fix/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per user story

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- GuestFlow monorepo: `apps/guestflow/src/`
- Tests: `apps/guestflow/src/lib/__tests__/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new infrastructure needed; using existing GuestFlow monorepo structure

- [x] T001 Review existing `listInboxThreads` implementation in apps/guestflow/src/lib/umi-threads.ts
- [x] T002 Review existing database schema in apps/guestflow/src/lib/umi-schema.ts
- [x] T003 Review existing test setup in apps/guestflow/src/lib/__tests__/ to understand testing patterns

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core helper functions needed for extended search

**⚠️ CRITICAL**: These must be complete before user story implementation

- [x] T004 Create helper function `parseThreadMetadata` to safely extract subject from thread.metadata JSON in apps/guestflow/src/lib/umi-threads.ts
- [x] T005 Create helper function `fetchThreadMessages` to query all messages for a thread from inbound_messages table in apps/guestflow/src/lib/umi-threads.ts
- [x] T006 Create helper function `tokenizeSearchQuery` to split query string on whitespace and normalize tokens in apps/guestflow/src/lib/umi-threads.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Staff Full-Text Thread Search (Priority: P1) 🎯 MVP

**Goal**: Enable staff to search threads by email subject, message preview, and message bodies across all channels with case-insensitive, multi-token AND matching.

**Independent Test**: Create test thread with marker "GF-INBOUND-TEST-DIRECT2", search for "DIRECT2", verify thread appears.

### Tests for User Story 1

- [x] T007 [P] [US1] Create test file apps/guestflow/src/lib/__tests__/umi-inbox-search.test.ts with describe block and test database setup
- [x] T008 [P] [US1] Write test "Search by email subject finds thread" - create thread with metadata.subject "Booking inquiry", search "booking inquiry", expect thread found
- [x] T009 [P] [US1] Write test "Search by message body finds thread" - create thread with message "GF-INBOUND-TEST-DIRECT2", search "DIRECT2", expect thread found
- [x] T010 [P] [US1] Write test "Cross-channel search finds threads" - create threads with WhatsApp and email messages, search common text, expect both found
- [x] T011 [P] [US1] Write test "Multi-token AND requires all tokens" - create thread with "GF-INBOUND-TEST", search "INBOUND TEST", expect found; search "INBOUND FOOBAR", expect not found
- [x] T012 [P] [US1] Write test "Case-insensitive search works" - create thread with "grant830318@gmail.com", search "GrAnT830318", expect found
- [x] T013 [P] [US1] Write test "Partial phrase matching works" - create thread with "20260925", search "2026", expect found
- [x] T014 [P] [US1] Write test "Existing search fields still work" - create thread with bookerName "John Smith", search "John", expect found (backward compatibility)

### Implementation for User Story 1

- [x] T015 [US1] Implement `searchThreadsByMessageBodies` function in apps/guestflow/src/lib/umi-threads.ts that fetches messages for a thread and checks if all query tokens match message_text fields (case-insensitive, uses LIKE or .includes())
- [x] T016 [US1] Implement `searchThreadsBySubject` function in apps/guestflow/src/lib/umi-threads.ts that parses thread.metadata JSON, extracts subject field, and checks if all query tokens match (case-insensitive)
- [x] T017 [US1] Modify `listInboxThreads` function in apps/guestflow/src/lib/umi-threads.ts to extend the existing `options.q` filter logic: after checking existing fields (bookerName, fromNumber, etc.), also check message bodies and subject using new helper functions
- [x] T018 [US1] Ensure multi-token AND logic: split query on whitespace, check that ALL tokens match at least once (can be in different fields/messages)
- [x] T019 [US1] Add error handling for JSON parsing failures in metadata.subject extraction
- [x] T020 [US1] Add logging for search performance (query time) in development mode

**Checkpoint**: Search extension complete - all User Story 1 tests should pass

---

## Phase 4: User Story 2 - Missing Thread Surface Fix (Priority: P2)

**Goal**: Fix staff surface so threads with thread_kind='temp' and status='drafted' appear in inbox list and are retrievable by ID.

**Independent Test**: Verify threads 48 and 49 appear in `GET /api/umi/inbox` and `GET /api/umi/threads/49` returns 200 (not 404).

### Tests for User Story 2

- [x] T021 [P] [US2] Write test "Thread with thread_kind=temp appears in inbox" in apps/guestflow/src/lib/__tests__/umi-inbox-search.test.ts - create temp thread, call listInboxThreads, expect thread in results
- [x] T022 [P] [US2] Write test "Thread with status=drafted appears in inbox" - create drafted thread, call listInboxThreads, expect thread in results
- [x] T023 [P] [US2] Write test "getThreadDetail returns thread for temp/drafted thread" - create thread 49 with temp/drafted, call getThreadDetail(49), expect thread object (not null/404)
- [x] T024 [P] [US2] Write test "Tenant filtering works correctly" - create threads with different tenant_ids, call with tenant_id=1, expect only tenant_id=1 threads

### Implementation for User Story 2

- [x] T025 [US2] Review `listInboxThreads` SQL query in apps/guestflow/src/lib/umi-threads.ts line 843-850: verify query includes thread_kind='temp' and status='drafted' (it should - only excludes status='linked')
- [x] T026 [US2] Review `getThreadDetail` SQL query in apps/guestflow/src/lib/umi-threads.ts line 930-936: verify query correctly filters by tenant_id and does not exclude temp/drafted threads
- [x] T027 [US2] Investigate staff authentication tenant resolution: add logging to verify staff session returns correct tenant_id in apps/guestflow/src/lib/staff-session-edge.ts or equivalent auth middleware
- [x] T028 [US2] If tenant_id mismatch found, fix staff session to map to tenant_id=1 correctly in authentication middleware
- [x] T029 [US2] If query is correct but threads still missing, investigate if BigInt serialization for thread IDs is causing issues in apps/guestflow/src/lib/umi-threads.ts asNumber() helper
- [x] T030 [US2] Add integration test that creates thread 48/49 in test database and verifies they appear in production-like query

**Checkpoint**: Thread surface fix complete - threads 48/49 should be visible and fetchable

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation

- [x] T031 [P] Run all tests to ensure both user stories pass: `cd apps/guestflow && npm test -- umi-inbox-search`
- [x] T032 [P] Verify quickstart.md validation scenarios work on local dev server
- [x] T033 [P] Update apps/guestflow/docs/ with search behavior documentation if such docs directory exists
- [x] T034 Add PR description documenting: (1) search algorithm (multi-token AND, case-insensitive, partial match), (2) root cause of thread 48/49 omission (tenant filtering or other), (3) testing approach
- [x] T035 Verify no production Turso writes occur (read-only feature)
- [x] T036 Performance check: ensure search completes in <2 seconds for typical inbox size

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - review tasks only
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion - Can run in parallel with US1
- **Polish (Phase 5)**: Depends on both user stories being complete

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Helper functions (T015-T016) before main logic modification (T017)
- Search extension (T015-T020) before surface fix (T025-T030)

### Parallel Opportunities

- Phase 1 review tasks (T001-T003) can run in parallel
- Phase 2 helper functions (T004-T006) can run in parallel
- All US1 test tasks (T007-T014) can run in parallel after test file created
- US1 helper functions (T015-T016) can run in parallel
- All US2 test tasks (T021-T024) can run in parallel after test file created
- US2 investigation tasks (T025-T027) can run in parallel
- User Story 1 and User Story 2 can be worked on in parallel by different developers after Phase 2
- Polish tasks (T031-T033) can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (review)
2. Complete Phase 2: Foundational (helper functions)
3. Complete Phase 3: User Story 1 (search extension)
4. **STOP and VALIDATE**: Test search independently
5. Can deploy with just search extension if thread surface fix is blocked

### Incremental Delivery

1. Complete Setup + Foundational → Helpers ready
2. Add User Story 1 → Test search → Deploy (MVP!)
3. Add User Story 2 → Test thread retrieval → Deploy
4. Each story adds value independently

---

## Notes

- All tasks preserve existing functionality (backward compatible)
- No database schema changes required (uses existing columns)
- No production Turso writes (read-only feature)
- Search performance acceptable without FTS index initially
- Thread 48/49 root cause requires investigation (T027-T028)
- Commit after each implementation task or logical group
