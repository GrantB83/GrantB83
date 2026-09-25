# Feature Specification: UMI Inbox Search & Surface Fix

**Feature Branch**: `024-umi-inbox-search-fix`

**Created**: September 25, 2026

**Status**: Draft

**Input**: User description: "Make staff inbox `GET /api/umi/inbox?q=` significantly more flexible so staff can find threads that already exist in Turso. Also fix staff surface so ingested threads appear in the inbox list AND are fetchable by id when they exist."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Staff Full-Text Thread Search (Priority: P1)

Staff need to quickly find existing guest threads by searching any text that appears in the conversation - whether it's in the email subject, message preview, or full message body across all communication channels (WhatsApp, email, SMS).

**Why this priority**: This is the highest priority because it directly addresses the production failure where threads 48/49 exist in Turso but staff cannot find them. The current search only matches against bookerName, fromNumber, suite, nbid, and bookingId, making it impossible to find threads by their content.

**Independent Test**: Can be fully tested by creating threads with known marker text (like "GF-INBOUND-TEST-20260925-DIRECT2"), searching for that marker via `GET /api/umi/inbox?q=DIRECT2`, and verifying the thread appears in results.

**Acceptance Scenarios**:

1. **Given** a thread exists with subject "Booking inquiry for Main House", **When** staff searches for "booking inquiry", **Then** the thread appears in search results
2. **Given** a thread has a WhatsApp message containing "GF-INBOUND-TEST-20260925-DIRECT2", **When** staff searches for "DIRECT2", **Then** the thread appears in search results
3. **Given** a thread has multiple messages across email and WhatsApp, **When** staff searches for text in any message body, **Then** the thread appears if any message matches
4. **Given** staff searches for "grant830318", **When** a thread has sender "grant830318@gmail.com", **Then** the thread appears in results (existing functionality maintained)
5. **Given** staff searches for "GrAnT830318" (mixed case), **When** matching against "grant830318@gmail.com", **Then** the thread appears (case-insensitive matching)
6. **Given** staff searches for "INBOUND TEST" (multi-token), **When** a message contains "GF-INBOUND-TEST-20260925", **Then** the thread appears (partial phrase matching)

---

### User Story 2 - Missing Thread Surface Fix (Priority: P2)

Staff need all existing threads to appear in the inbox list and be retrievable by ID, regardless of thread kind, status, or tenant configuration.

**Why this priority**: This is secondary to search functionality but critical for completeness. Threads 48/49 exist in Turso (tenant_id=1, thread_kind=temp, status=drafted) but return 404 or are omitted from the inbox list, indicating a filtering or tenant resolution issue.

**Independent Test**: Can be fully tested by verifying threads 48 and 49 appear in `GET /api/umi/inbox` results and that `GET /api/umi/threads/48` and `GET /api/umi/threads/49` return thread data instead of 404.

**Acceptance Scenarios**:

1. **Given** thread 48 exists in Turso with thread_kind=temp and status=drafted, **When** staff calls `GET /api/umi/inbox`, **Then** thread 48 appears in the results
2. **Given** thread 49 exists in Turso, **When** staff calls `GET /api/umi/threads/49`, **Then** the thread details are returned (not 404)
3. **Given** threads have thread_kind=temp, **When** fetching inbox, **Then** temp threads are included in results
4. **Given** threads have status=drafted, **When** fetching inbox, **Then** drafted threads are included in results
5. **Given** threads belong to tenant_id=1, **When** staff is authenticated, **Then** tenant filtering matches correctly

---

### Edge Cases

- What happens when a search query contains special characters or SQL injection attempts? (System must safely escape/parameterize queries)
- What happens when searching with an empty query string? (Return all threads, or handle gracefully)
- What happens when a thread has no messages? (Thread should still be searchable by metadata like bookerName, fromNumber)
- What happens when a message body is very large (>10KB)? (Search should still work, possibly with indexed fields)
- What happens when searching for extremely common words? (May return many results - consider pagination)
- What happens when thread exists but tenant_id doesn't match authenticated user? (Respect auth boundaries)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST extend `GET /api/umi/inbox?q=` to search across thread metadata.subject field
- **FR-002**: System MUST extend `GET /api/umi/inbox?q=` to search across message preview text
- **FR-003**: System MUST extend `GET /api/umi/inbox?q=` to search across full message body content for all channels (email, WhatsApp, SMS)
- **FR-004**: System MUST perform case-insensitive search matching
- **FR-005**: System MUST support partial word and phrase matching (e.g., searching "DIRECT2" matches "GF-INBOUND-TEST-20260925-DIRECT2")
- **FR-006**: System MUST tokenize multi-word queries on whitespace and AND tokens together (e.g., "INBOUND TEST" requires both tokens present)
- **FR-007**: System MUST maintain existing search functionality for bookerName, fromNumber, suite, nbid, bookingId
- **FR-008**: System MUST include threads with thread_kind=temp in inbox list results
- **FR-009**: System MUST include threads with status=drafted in inbox list results
- **FR-010**: System MUST correctly resolve tenant_id matching for authenticated staff users
- **FR-011**: `GET /api/umi/threads/:id` MUST return thread data for any thread that exists in Turso (not 404) when staff is authorized
- **FR-012**: System MUST safely handle search queries to prevent SQL injection or other security issues

### Key Entities

- **Thread**: Represents a guest communication thread with tenant_id, thread_kind, status, from_number, and associated messages
- **InboundMessage**: Messages within a thread, containing external_message_id, sender, body, channel (email/WhatsApp/SMS), and metadata (e.g., subject for email)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff can find thread 49 by searching for "DIRECT2" marker in the inbox search
- **SC-002**: Staff can find thread 49 by searching for "grant830318" sender email
- **SC-003**: Thread 48 appears in the `GET /api/umi/inbox` response (not omitted)
- **SC-004**: `GET /api/umi/threads/49` returns thread data (not 404)
- **SC-005**: Search matches are case-insensitive (e.g., "DIRECT2" matches "direct2")
- **SC-006**: Search supports partial phrases (e.g., "INBOUND TEST" matches messages containing both tokens)
- **SC-007**: All test cases covering subject hit, preview hit, body hit, cross-channel body, case-insensitive, partial phrase, and existing thread retrieval pass

## Assumptions

- The root cause of thread 48/49 omission is in the inbox/thread detail query logic (LIMIT, filter, tenant, status, BigInt, UI client cap, temp-kind filter, or auth tenant mismatch) rather than the ingest/webhook path
- The current implementation of `listInboxThreads` in `apps/guestflow/src/lib/umi-threads.ts` filters only against bookerName, fromNumber, suite, nbid, bookingId (to be verified during planning)
- Turso database contains threads 48 and 49 with tenant_id=1 as described
- Staff authentication provides a tenant context that should match tenant_id=1
- The search implementation will use Turso's SQL capabilities for pattern matching
- Performance is acceptable for partial matching across message bodies (no full-text search index required initially)
- Tests will use synthetic markers (like GF-INBOUND-TEST-*) and will not invent real guest PII
