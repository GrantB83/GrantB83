# Feature Specification: Alert Noise Filter for Test and Empty Threads

**Feature Branch**: `026-alert-noise-filter`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "GUESTFLOW — unanswered/overnight alert noise filter. Stop false-positive unanswered / overnight alert fires for test/probe threads and empty BLOCK/booking shells. Rules preferred over hardcoded IDs alone."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Exclude Probe/Test Threads from Alerts (Priority: P1)

Staff should never receive unanswered/overnight alerts for known test and probe threads, such as those with the test phone number +27000000001 or marked with test identifiers like T-44/T-48 or GF-INBOUND-TEST labels.

**Why this priority**: Test threads create noise in the alert system and distract staff from real guest communications. This is the highest priority because it directly reduces false positives that waste staff time.

**Independent Test**: Can be fully tested by creating inbound threads from test phone numbers or with test markers, waiting past the alert threshold, and confirming no alert is sent. Delivers immediate reduction in alert noise.

**Acceptance Scenarios**:

1. **Given** an inbound thread from phone number +27000000001, **When** the unanswered threshold (30 minutes) passes, **Then** no unanswered alert is sent to staff
2. **Given** an inbound thread with guest_name containing "T-44" marker, **When** the thread remains unanswered overnight, **Then** no overnight digest alert includes this thread
3. **Given** an inbound thread with metadata indicating it is a smoke test (GF-INBOUND-TEST), **When** alerts are evaluated, **Then** the thread is excluded from both immediate and digest alerts
4. **Given** a thread from any phone number matching the test pattern (+270000000XX), **When** the alert evaluator runs, **Then** the thread is identified as a test thread and skipped

---

### User Story 2 - Exclude Empty BLOCK/Owner-Block Booking Shells (Priority: P1)

Staff should not receive alerts for booking placeholder threads that were created with guest_name "BLOCK" or similar owner-block markers when those threads have zero actual inbound messages from guests.

**Why this priority**: Empty booking shells are administrative placeholders, not guest communications requiring response. They create significant alert noise and have equal priority with test threads.

**Independent Test**: Can be fully tested by creating inbound_threads linked to bookings with guest_name "BLOCK" (e.g., BLOCK 5376, Nomsa 5464, Sakhile 5630) that have no inbound messages, confirming no alerts fire. Delivers immediate noise reduction.

**Acceptance Scenarios**:

1. **Given** an inbound thread linked to booking with guest_name "BLOCK 5376", **When** the thread has 0 inbound messages from guests, **Then** no unanswered alert is sent
2. **Given** an inbound thread for booking "Nomsa 5464" (owner block), **When** the thread has pending_reply=1 but zero actual guest inbound messages, **Then** the alert evaluator excludes this thread
3. **Given** an inbound thread for booking "Sakhile 5630", **When** checking message count shows 0 inbound messages, **Then** this thread does not appear in overnight digest
4. **Given** multiple empty BLOCK threads exist, **When** evaluating unanswered alerts, **Then** the system correctly counts inbound messages and excludes all with count=0

---

### User Story 3 - Exclude Inbound-Smoke Test Threads (Priority: P2)

Staff should not receive alerts for threads explicitly marked as inbound smoke tests, identified by markers like GF-INBOUND-TEST, T-48, or "thread 48" style smoke labels.

**Why this priority**: Smoke test threads are used for testing the inbound message flow and should never trigger production alerts. This is P2 because it's similar to P1 test threads but less common in production.

**Independent Test**: Can be fully tested by creating threads with smoke test markers in metadata or guest_name fields, confirming they are excluded from alerts independent of other filters.

**Acceptance Scenarios**:

1. **Given** an inbound thread with metadata containing "GF-INBOUND-TEST", **When** the alert evaluator runs, **Then** this thread is identified as a smoke test and excluded
2. **Given** an inbound thread with guest_name "T-48", **When** the thread remains unanswered, **Then** no alert is sent
3. **Given** an inbound thread with subject or identifier matching smoke test pattern, **When** overnight digest is compiled, **Then** this thread is excluded from the digest

---

### Edge Cases

- What happens when a thread transitions from test/BLOCK status to a real guest thread? (Should start triggering alerts once it becomes legitimate)
- How does the system handle BLOCK bookings that later receive actual guest messages? (Should start alerting after first real inbound message)
- What if a guest has a name that accidentally matches a test pattern like "T-44"? (Use multiple signals: phone number pattern, metadata markers, not just guest_name alone)
- How does the system distinguish between phone number +27000000001 (test) and +27000000010 (potentially real)? (Exact match on known test numbers)
- What happens when thread metadata is missing or null? (Should not exclude based on missing data; only positive matches on test/block criteria should exclude)
- How are booking shells with guest_name "BLOCK" but non-zero messages handled? (Should alert normally if there are actual guest messages)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST identify and exclude threads from test phone number +27000000001 from unanswered and overnight alerts
- **FR-002**: System MUST identify and exclude threads with test markers (T-44, T-48, thread 44, thread 48, GF-INBOUND-TEST) from alert evaluation
- **FR-003**: System MUST identify booking-linked threads with guest_name patterns matching "BLOCK", owner-block formats (e.g., "BLOCK 5376", "Nomsa 5464", "Sakhile 5630")
- **FR-004**: System MUST count actual inbound messages (not outbound or system messages) for each thread during alert evaluation
- **FR-005**: System MUST exclude threads with 0 inbound messages from guests when linked to BLOCK/owner-block bookings from alert triggers
- **FR-006**: System MUST use rule-based pattern matching rather than hardcoded thread IDs to identify exclusions (thread IDs are examples only)
- **FR-007**: System MUST check thread metadata for smoke test indicators (e.g., "GF-INBOUND-TEST" marker)
- **FR-008**: System MUST apply exclusion rules to both immediate unanswered alerts (30-minute threshold during 07:00-21:00 SAST) and overnight digest alerts (07:00 SAST)
- **FR-009**: System MUST support test phone number patterns beyond exact match (e.g., +270000000XX range for future test numbers)
- **FR-010**: System MUST preserve existing alert functionality for all non-excluded threads (no regression in legitimate alert behavior)
- **FR-011**: System MUST log or track when threads are excluded from alerts for debugging and verification purposes

### Key Entities *(include if feature involves data)*

- **InboundThread**: Represents a conversation thread with fields including `from_number`, `guest_name`, `booking_id`, `pending_reply`, `thread_kind`, `metadata`
- **InboundMessage**: Represents individual messages within a thread, with fields including `thread_id`, `direction` (inbound/outbound), `is_spam`, `message_timestamp`
- **Booking**: Represents reservations with fields including `guest_name`, `nightsbridge_booking_id`, `status`
- **StaffAlert**: Represents alert records with fields including `dedupe_key`, `kind` (unanswered/unanswered_digest), `status`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff receive zero unanswered alerts for threads from test phone number +27000000001
- **SC-002**: Staff receive zero unanswered alerts for empty BLOCK booking shells (those with 0 actual inbound guest messages)
- **SC-003**: Staff receive zero alerts for threads marked with smoke test identifiers (T-44, T-48, GF-INBOUND-TEST)
- **SC-004**: Alert exclusion rules are applied consistently to both immediate (30-minute) and overnight digest alerts
- **SC-005**: All legitimate guest threads continue to trigger alerts as expected (zero regression in real alert delivery)
- **SC-006**: Thread exclusion can be verified through test scenarios covering all three exclusion categories (test phone, smoke markers, empty BLOCK shells)
- **SC-007**: Implementation uses pattern-based rules rather than hardcoded thread IDs, making the solution durable and maintainable

## Assumptions

- The existing alert system's `isStaffOrTestPeer` function and `TEST_SINK_PHONES` set provide the foundation for test phone exclusion
- Thread metadata field can store structured data like smoke test markers
- The `inbound_messages` table accurately tracks message direction (inbound vs outbound)
- BLOCK bookings are identifiable by guest_name patterns matching "BLOCK" (case-insensitive), potentially with additional identifiers
- Thread IDs 37, 40, 42, 44, 48 referenced in requirements are examples from staging/test environments; production should use rule-based matching
- The existing spam filter (`latestInboundIsSpam`) is independent and should continue to function alongside these exclusions
- Staff want clear verification that exclusions are working (test plan required in PR, as stated in requirements)
- The solution must not modify WhatsApp send paths, auto-send settings, or OUTBOUND/Redirect/Approve&Send functionality
- Implementation will be in the existing `evaluateUnanswered` function within `staff-alerts.ts`
